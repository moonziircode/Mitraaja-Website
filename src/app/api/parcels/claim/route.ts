import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { anterajaClient } from '@/lib/anteraja-client';

export const preferredRegion = 'sin1';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    // Check authentication
    if (!session.isLoggedIn || !session.token) {
      return NextResponse.json({ success: false, message: 'Tidak terautentikasi' }, { status: 401 });
    }
    
    const { awb } = await request.json();
    if (!awb || typeof awb !== 'string' || !awb.trim()) {
      return NextResponse.json({ success: false, message: 'Nomor AWB tidak valid.' }, { status: 400 });
    }

    const trimmedAwb = awb.trim();

    // === Real Integration to Anteraja Claim API ===
    // Build the claim payload matching Anteraja specifications
    const claimPayload = {
      agent_staff_id: session.nia,
      orders: [
        {
          order_source: 'MOCK', // Usually resolved from search, or fallback to default
          claim_key: trimmedAwb,
        },
      ],
    };

    try {
      // Perform the claim action
      const result = await anterajaClient.claimAWB(trimmedAwb, claimPayload, session.token);
      return NextResponse.json({ success: true, message: result.message || `AWB ${trimmedAwb} berhasil diklaim.` }, { status: 200 });
    } catch (apiError: any) {
      const errorMsg = apiError.message || 'Gagal mengklaim AWB.';
      return NextResponse.json({ success: false, message: errorMsg }, { status: 400 });
    }

  } catch (err: any) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan internal server';
    console.error('[POST /api/parcels/claim] Error:', message);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
