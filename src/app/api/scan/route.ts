import { type NextRequest } from 'next/server';
import { anterajaClient } from '@/lib/anteraja-client';
import { getSession } from '@/lib/auth';
import { saveScanRecord, logActivity } from '@/lib/scan-records-db';

export const preferredRegion = 'sin1';


export async function POST(request: NextRequest) {
  // ── 1. Authenticate via iron-session ────────────────────────────
  const session = await getSession();

  if (!session || !session.isLoggedIn) {
    return Response.json(
      { status: 'error', message: 'Sesi tidak valid. Silakan login kembali.' },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const { awb, coordinates } = body as {
      awb?: string;
      coordinates?: {
        latitude?: number;
        longitude?: number;
        accuracy?: number;
        isMockDetected?: boolean;
      };
    };

    const trimmedAwb = awb?.trim() || '';

    if (!trimmedAwb) {
      return Response.json(
        { status: 'error', message: 'Nomor AWB harus diisi.' },
        { status: 400 },
      );
    }

    // ── Validasi penegakan koordinat GPS riil & pelarangan Fake GPS ──
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
      return Response.json(
        {
          status: 'error',
          message: 'Titik koordinat lokasi GPS wajib aktif untuk melakukan scan paket. Mohon aktifkan GPS.',
        },
        { status: 400 },
      );
    }

    if (coordinates.isMockDetected || coordinates.accuracy === 0) {
      return Response.json(
        {
          status: 'error',
          message: 'Terdeteksi penggunaan Mock Location / Fake GPS. Sistem melarang keras manipulasi lokasi!',
        },
        { status: 403 },
      );
    }

    if (coordinates.accuracy && coordinates.accuracy > 150) {
      return Response.json(
        {
          status: 'error',
          message: `Akurasi sinyal GPS terlalu rendah (±${Math.round(coordinates.accuracy)}m). Pastikan GPS perangkat aktif dalam mode Akurasi Tinggi (< 150m).`,
        },
        { status: 400 },
      );
    }

    if (!/^[0-9]{14}$/.test(trimmedAwb)) {
      return Response.json(
        {
          status: 'error',
          isAlreadyClaimed: false,
          message: 'AWB gagal di-claim',
          data: {
            awb: trimmedAwb,
            shipperName: '-',
            receiverName: '-',
            destinationCity: '-',
            finalResult: 'FAILED',
          },
        },
        { status: 200 },
      );
    }

    const agentStaffId = session.nia;
    const token = session.token || 'mock-token';

    // Parse technical/device info from headers
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const isMobile = /mobile|iphone|android|ipad/i.test(userAgent);
    const deviceType = isMobile ? 'Mobile' : 'Desktop/Laptop';
    const browserInfo = userAgent;

    // Execute complete claim lifecycle
    const result = await anterajaClient.processFullClaimLifecycle(trimmedAwb, agentStaffId, token);

    // 1. Save scan record to Supabase and log activity reliably
    try {
      const logPromises = [];
      if (result.success || result.isAlreadyClaimed) {
        logPromises.push(
          saveScanRecord({
            awb: result.awb,
            storeName: session.storeName || session.name || 'Mitra',
            serviceType: 'REG',
            scanTime: new Date(),
            weight: 0,
            itemName: '-',
            status: result.finalTaskStatus || (result.success ? 'WAITING_FOR_HANDOVER_SERAH' : 'ALREADY_CLAIMED'),
            packageDetails: {
              taskCode: result.taskCode,
              shipperName: result.shipperName,
              receiverName: result.receiverName,
              destinationCity: result.destinationCity,
              opcode: result.opcode,
              trackingCode: result.trackingCode,
              coordinates,
            },
          })
        );
      }

      logPromises.push(
        logActivity({
          action: 'CLAIM_AND_DROP_OFF',
          status: result.success ? 'SUCCESS' : (result.isAlreadyClaimed ? 'ALREADY_CLAIMED' : 'FAILED'),
          awb: result.awb,
          userNia: session.nia,
          userName: session.name,
          storeName: session.storeName || session.name || 'Mitra',
          errorMessage: result.success ? undefined : result.message,
          userAgent: browserInfo,
          coordinates: {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            accuracy: coordinates.accuracy,
            isMockDetected: coordinates.isMockDetected || false,
          },
          metadata: {
            taskCode: result.taskCode,
            phase1: result.phase1Status,
            phase2: result.phase2Status,
            phase3: result.phase3Status,
            trackingCode: result.trackingCode,
            opcode: result.opcode,
            coordinates,
          },
        })
      );

      await Promise.allSettled(logPromises);
    } catch (dbErr) {
      console.error('[POST /api/scan] DB logging error:', dbErr);
    }

    return Response.json(
      {
        status: result.success ? 'success' : 'error',
        isAlreadyClaimed: result.isAlreadyClaimed || false,
        message: result.message,
        data: {
          awb: result.awb,
          shipperName: maskName(result.shipperName),
          receiverName: maskName(result.receiverName),
          destinationCity: result.destinationCity,
          taskCode: result.taskCode,
          trackingCode: result.trackingCode,
          opcode: result.opcode,
          finalStatus: result.finalTaskStatus,
          finalResult: result.finalResult,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error('[POST /api/scan]', error);

    const errMsg = error?.message || '';
    const isAlreadyClaimed =
      errMsg.toLowerCase().includes('sudah pernah di-claim') ||
      errMsg.toLowerCase().includes('sudah pernah diklaim') ||
      errMsg.toLowerCase().includes('sudah pernah di klaim') ||
      errMsg.toLowerCase().includes('already claimed');

    // Log internal failure
    try {
      await logActivity({
        action: 'CLAIM_AND_DROP_OFF',
        status: isAlreadyClaimed ? 'ALREADY_CLAIMED' : 'FAILED',
        awb: (request as any).awb || '',
        userNia: session?.nia || '',
        userName: session?.name || '',
        storeName: session?.storeName || session?.name || 'Mitra',
        errorMessage: errMsg,
        userAgent: request.headers.get('user-agent') || 'Unknown',
      });
    } catch {}

    return Response.json(
      {
        status: 'error',
        isAlreadyClaimed,
        message: isAlreadyClaimed ? 'Paket sudah pernah di-claim sebelumnya' : 'AWB gagal di-claim',
      },
      { status: 200 },
    );
  }
}

function maskName(name: string): string {
  if (!name || name === '-') return '-';
  const trimmed = name.trim();
  if (trimmed.length <= 2) return trimmed;
  // If already masked, return as-is
  if (trimmed.includes('***')) return trimmed;
  
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  const stars = '*'.repeat(Math.max(3, trimmed.length - 2));
  return `${first}${stars}${last}`;
}
