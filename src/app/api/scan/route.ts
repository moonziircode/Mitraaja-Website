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

    let shipperName = '-';
    let receiverName = '-';
    let destinationCity = '-';
    let searchErrorMsg = '';

    // ── 2. Step 1 — Search AWB ──────────────────────────────────────
    let maaTask = null;
    try {
      maaTask = await anterajaClient.searchAWB(awb, agentStaffId, token);
      if (maaTask) {
        shipperName = maaTask.shipperName;
        receiverName = maaTask.receiverName;
        destinationCity = maaTask.destinationCity;
      }
    } catch (searchError: any) {
      searchErrorMsg = searchError.message || 'Pencarian AWB gagal';
    }

    // Fallback to public tracking API if search failed (e.g. already claimed)
    if (!maaTask) {
      try {
        const trackingResponse = await fetch('https://api.anteraja.id/order/tracking', {
          method: 'POST',
          headers: {
            'mv': '1.2',
            'source': 'aca_android',
            'Content-Type': 'application/json; charset=UTF-8',
            'User-Agent': 'okhttp/3.10.0',
          },
          body: JSON.stringify([{ codes: awb.trim() }]),
        });

        if (trackingResponse.ok) {
          const trackData = await trackingResponse.json();
          if (trackData.status === 200 && trackData.content && trackData.content.length > 0) {
            const content = trackData.content[0];
            const detail = content.detail;
            if (detail) {
              shipperName = detail.sender?.name || '-';
              receiverName = detail.receiver?.name || '-';
              
              // Extract destination from history if address is masked
              const history = content.history || [];
              let extractedDest = '-';
              for (const event of history) {
                const msg = event.message?.id || '';
                const ssMatch = msg.match(/SS\s+([^-\s]+(?:\s+[^-\s]+)*)/i);
                if (ssMatch) {
                  extractedDest = ssMatch[1].trim();
                  break;
                }
              }
              if (extractedDest === '-') {
                for (const event of history) {
                  const msg = event.message?.id || '';
                  const hubMatch = msg.match(/Hub\s+([^-\s]+(?:\s+[^-\s]+)*)/i);
                  if (hubMatch) {
                    extractedDest = hubMatch[1].trim();
                    break;
                  }
                }
              }
              
              destinationCity = extractedDest !== '-' ? extractedDest : (detail.receiver?.address || '-');
            }
          }
        }
      } catch (fallbackError) {
        console.error('[POST /api/scan] Fallback tracking failed:', fallbackError);
      }
    }

    // If the search failed, return error response but with resolved details
    if (!maaTask) {
      const isAlreadyClaimed = searchErrorMsg.includes('sudah pernah di klaim') || searchErrorMsg.includes('already claimed');
      return Response.json(
        {
          status: 'error',
          message: searchErrorMsg || 'AWB tidak ditemukan dalam sistem.',
          data: {
            awb,
            shipperName: maskName(shipperName),
            receiverName: maskName(receiverName),
            destinationCity: destinationCity
          },
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
          data: {
            awb,
            shipperName: maskName(shipperName),
            receiverName: maskName(receiverName),
            destinationCity: destinationCity
          },
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
          data: {
            awb,
            shipperName: maskName(shipperName),
            receiverName: maskName(receiverName),
            destinationCity: destinationCity
          },
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
