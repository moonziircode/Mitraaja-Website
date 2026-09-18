import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { anterajaClient } from '@/lib/anteraja-client';
import { logActivity } from '@/lib/scan-records-db';

export const preferredRegion = 'sin1';


export async function POST(request: NextRequest) {
  const session = await getSession();
  const { nia, password } = await request.json();

  // Validasi Input
  if (!nia || !password) {
    return NextResponse.json({ message: 'NIA dan password harus diisi' }, { status: 400 });
  }

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

    // Catat log sukses login ke Supabase
    try {
      await logActivity({
        action: 'USER_LOGIN',
        status: 'SUCCESS',
        userNia: result.user.agentStaffId,
        userName: result.user.name,
        storeName: result.user.storeName,
        description: `User ${result.user.name} (${result.user.agentStaffId}) berhasil login ke toko ${result.user.storeName}`,
        userAgent: request.headers.get('user-agent') || 'Unknown',
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

    // Catat log gagal login ke Supabase
    try {
      await logActivity({
        action: 'USER_LOGIN',
        status: 'FAILED',
        userNia: nia,
        description: `Percobaan login gagal untuk NIA: ${nia}`,
        errorMessage: err.message || 'Login gagal',
        userAgent: request.headers.get('user-agent') || 'Unknown',
      });
    } catch (logErr) {
      console.error('[login fail log error]:', logErr);
    }

    return NextResponse.json({ 
      message: err.message || 'Login gagal. Periksa kembali NIA dan password Anda.' 
    }, { status: 401 });
  }
}
