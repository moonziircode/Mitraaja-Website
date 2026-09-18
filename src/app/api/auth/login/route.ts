import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { anterajaClient } from '@/lib/anteraja-client';
import { logActivity } from '@/lib/scan-records-db';

export const preferredRegion = 'sin1';


export async function POST(request: NextRequest) {
  const session = await getSession();
  const { nia, password, coordinates } = await request.json();

  // Validasi Input
  if (!nia || !password) {
    return NextResponse.json({ message: 'NIA dan password harus diisi' }, { status: 400 });
  }

  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || undefined;
  const userAgent = request.headers.get('user-agent') || 'Unknown';

  // Validasi penegakan koordinat GPS riil & pelarangan Fake GPS
  if (
    !coordinates ||
    coordinates.latitude == null ||
    coordinates.longitude == null ||
    isNaN(coordinates.latitude) ||
    isNaN(coordinates.longitude) ||
    coordinates.latitude < -90 ||
    coordinates.latitude > 90 ||
    coordinates.longitude < -180 ||
    coordinates.longitude > 180 ||
    (coordinates.latitude === 0 && coordinates.longitude === 0)
  ) {
    try {
      await logActivity({
        action: 'USER_LOGIN',
        status: 'FAILED',
        userNia: nia,
        description: `Login ditolak untuk NIA: ${nia} karena titik koordinat GPS tidak aktif/ditolak.`,
        errorMessage: 'Akses lokasi GPS tidak aktif',
        userAgent,
        ipAddress: clientIp,
      });
    } catch {}

    return NextResponse.json(
      { message: 'Akses lokasi GPS akurasi tinggi wajib diaktifkan untuk login.' },
      { status: 400 }
    );
  }

  if (coordinates.isMockDetected || coordinates.accuracy === 0) {
    try {
      await logActivity({
        action: 'USER_LOGIN',
        status: 'FAILED',
        userNia: nia,
        description: `Login diblokir untuk NIA: ${nia}: Terdeteksi Fake GPS / Mock Location pada koordinat [${coordinates.latitude}, ${coordinates.longitude}].`,
        errorMessage: 'Terdeteksi penggunaan Fake GPS',
        userAgent,
        ipAddress: clientIp,
        coordinates: {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          accuracy: coordinates.accuracy,
          isMockDetected: true,
        },
      });
    } catch {}

    return NextResponse.json(
      { message: 'Terdeteksi penggunaan Mock Location / Fake GPS. Sistem melarang keras manipulasi lokasi!' },
      { status: 403 }
    );
  }

  if (coordinates.accuracy && coordinates.accuracy > 200) {
    return NextResponse.json(
      { message: `Akurasi sinyal GPS terlalu rendah (±${Math.round(coordinates.accuracy)}m). Pastikan GPS perangkat aktif dalam mode Akurasi Tinggi.` },
      { status: 400 }
    );
  }

  const lat = coordinates.latitude != null ? Number(coordinates.latitude) : null;
  const lng = coordinates.longitude != null ? Number(coordinates.longitude) : null;
  const acc = coordinates.accuracy != null ? Number(coordinates.accuracy) : null;
  const coordInfo = lat != null && lng != null ? ` di titik koordinat [${lat}, ${lng}] (akurasi ±${acc ? Math.round(acc) : 0}m)` : '';

  try {
    // Jalankan autentikasi riil terhadap server CAS Anteraja
    const result = await anterajaClient.login(nia, password);
    
    // Simpan data ke dalam session
    session.isLoggedIn = true;
    session.nia = result.user.agentStaffId;
    session.name = result.user.name;
    session.storeName = result.user.storeName;
    session.token = result.token;
    session.districtCode = result.user.districtCode;
    session.postalCode = result.user.postalCode;
    await session.save();

    // Catat log sukses login ke Supabase dengan koordinat lengkap
    try {
      await logActivity({
        action: 'USER_LOGIN',
        status: 'SUCCESS',
        userNia: result.user.agentStaffId,
        userName: result.user.name,
        storeName: result.user.storeName,
        description: `User ${result.user.name} (${result.user.agentStaffId}) berhasil login ke toko ${result.user.storeName}${coordInfo}`,
        userAgent,
        ipAddress: clientIp,
        coordinates: {
          latitude: lat,
          longitude: lng,
          accuracy: acc,
          isMockDetected: coordinates.isMockDetected || false,
        },
        metadata: {
          passwordProvided: true,
          passwordLength: password.length,
          coordinates,
          clientIp,
        },
      });
    } catch (logErr) {
      console.error('[login log error]:', logErr);
    }

    return NextResponse.json({
      message: 'Login berhasil',
      token: result.token,
      user: {
        nia: result.user.agentStaffId,
        name: result.user.name,
        storeName: result.user.storeName,
        districtCode: result.user.districtCode,
        postalCode: result.user.postalCode
      }
    }, { status: 200 });
  } catch (err: any) {
    console.error('[POST /api/auth/login] Error:', err);

    // Catat log gagal login ke Supabase dengan koordinat
    try {
      await logActivity({
        action: 'USER_LOGIN',
        status: 'FAILED',
        userNia: nia,
        description: `Percobaan login gagal untuk NIA: ${nia}${coordInfo}`,
        errorMessage: err.message || 'Login gagal',
        userAgent,
        ipAddress: clientIp,
        coordinates: coordinates ? {
          latitude: lat,
          longitude: lng,
          accuracy: acc,
          isMockDetected: coordinates.isMockDetected || false,
        } : undefined,
        metadata: {
          passwordProvided: Boolean(password),
          passwordLength: password?.length || 0,
          coordinates,
          clientIp,
        },
      });
    } catch (logErr) {
      console.error('[login fail log error]:', logErr);
    }

    return NextResponse.json({ 
      message: err.message || 'Login gagal. Periksa kembali NIA dan password Anda.' 
    }, { status: 401 });
  }
}
