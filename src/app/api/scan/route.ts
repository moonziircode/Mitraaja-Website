import { type NextRequest } from 'next/server';
import { anterajaClient } from '@/lib/anteraja-client';
import { getSession } from '@/lib/auth';

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
    const { awb } = body as { awb?: string };

    const trimmedAwb = awb?.trim() || '';

    if (!trimmedAwb) {
      return Response.json(
        { status: 'error', message: 'Nomor AWB harus diisi.' },
        { status: 400 },
      );
    }

    if (!/^[0-9]{14}$/.test(trimmedAwb)) {
      return Response.json(
        {
          status: 'error',
          message: 'Nomor AWB tidak valid. Harus tepat 14 digit angka numerik.',
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

    // Execute complete 5-phase claim lifecycle
    const result = await anterajaClient.processFullClaimLifecycle(trimmedAwb, agentStaffId, token);

    return Response.json(
      {
        status: result.success ? 'success' : 'error',
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

    return Response.json(
      {
        status: 'error',
        message: error.message || 'Terjadi kesalahan pada server.',
      },
      { status: 500 },
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
