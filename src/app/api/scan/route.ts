import { type NextRequest } from 'next/server';
import { anterajaClient } from '@/lib/anteraja-client';
import { getSession } from '@/lib/auth';

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

    if (!awb?.trim()) {
      return Response.json(
        { status: 'error', message: 'Nomor AWB harus diisi.' },
        { status: 400 },
      );
    }

    const agentStaffId = session.nia;
    const token = session.token || 'mock-token';

    // ── 2. Step 1 — Search AWB ──────────────────────────────────────
    let maaTask;
    try {
      maaTask = await anterajaClient.searchAWB(awb, agentStaffId, token);
    } catch (searchError) {
      const message =
        searchError instanceof Error ? searchError.message : 'Pencarian AWB gagal';

      return Response.json(
        {
          status: 'error',
          message,
          data: { awb, shipperName: '-' },
        },
        { status: 200 },
      );
    }

    if (!maaTask) {
      return Response.json(
        {
          status: 'error',
          message: 'AWB tidak ditemukan dalam sistem.',
          data: { awb, shipperName: '-' },
        },
        { status: 200 },
      );
    }

    // ── 3. Step 2 — Claim AWB ───────────────────────────────────────
    const claimPayload = {
      agent_staff_id: agentStaffId,
      orders: [
        {
          order_source: maaTask.orderSource,
          claim_key: maaTask.waybill,
        },
      ],
    };

    try {
      await anterajaClient.claimAWB(awb, claimPayload, token);

      return Response.json(
        {
          status: 'success',
          message: 'Berhasil di-claim!',
          data: { awb, shipperName: maaTask.shipperName, receiverName: maaTask.receiverName, destinationCity: maaTask.destinationCity },
        },
        { status: 200 },
      );
    } catch (claimError) {
      const message =
        claimError instanceof Error ? claimError.message : 'Klaim gagal';

      return Response.json(
        {
          status: 'error',
          message,
          data: { awb, shipperName: maaTask.shipperName },
        },
        { status: 200 },
      );
    }
  } catch (error) {
    console.error('[POST /api/scan]', error);

    return Response.json(
      {
        status: 'error',
        message: 'Terjadi kesalahan pada server.',
      },
      { status: 500 },
    );
  }
}
