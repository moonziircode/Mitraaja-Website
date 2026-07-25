import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { anterajaClient } from '@/lib/anteraja-client';

export const preferredRegion = 'sin1';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ awb: string }> }
) {
  try {
    const session = await getSession();

    if (!session || !session.isLoggedIn) {
      return NextResponse.json({ success: false, message: 'Tidak terautentikasi' }, { status: 401 });
    }

    const { awb } = await params;
    
    if (!awb) {
      return NextResponse.json({ success: false, message: 'AWB harus disertakan' }, { status: 400 });
    }

    const agentStaffId = session.nia;
    const token = session.token || 'mock-token';

    let maaTask = null;
    let searchErrorMsg = '';
    let isFallback = false;
    let lastHistory = null;

    try {
      maaTask = await anterajaClient.searchAWB(awb, agentStaffId, token);
    } catch (err: any) {
      searchErrorMsg = err.message || 'Error searching MAA task';
    }

    // Fallback if not found in MAA Task (e.g. already claimed by someone else or dropped off)
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
              // Construct a simulated MaaTask from public tracking data
              
              const history = content.history || [];
              if (history.length > 0) {
                lastHistory = {
                  message: history[0].message?.id || '-',
                  timestamp: history[0].timestamp || '-'
                };
              }

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
              
              maaTask = {
                waybill: detail.waybill || awb,
                sourceOrderNo: detail.booking_id || awb,
                orderSource: 'Public Tracking',
                shipperName: detail.sender?.name || '-',
                receiverName: detail.receiver?.name || '-',
                destinationCity: extractedDest !== '-' ? extractedDest : (detail.receiver?.address || '-'),
                serviceCode: detail.service_code || 'REG',
                weight: detail.weight ? (detail.weight / 1000) : 1, // Convert gram to kg
                codAmount: detail.actual_amount || 0,
                invoice: detail.invoice || '',
                shippedDate: detail.shipped_date || '',
                estimatedDate: detail.estimated_date || '',
                items: [],
                shipperInfo: {
                  name: detail.sender?.name || '-',
                  address: detail.sender?.address || '-',
                  phone: detail.sender?.phone || '-'
                },
                receiverInfo: {
                  name: detail.receiver?.name || '-',
                  address: detail.receiver?.address || '-',
                  phone: detail.receiver?.phone || '-'
                }
              } as any;
              isFallback = true;
            }
          }
        }
      } catch (fallbackError) {
        console.error('[GET /api/awb/[awb]] Fallback failed:', fallbackError);
      }
    }

    if (!maaTask) {
      return NextResponse.json({ 
        success: false, 
        message: 'Nomor AWB tidak ditemukan di sistem maupun di tracking publik.' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data: maaTask,
      isFallback,
      lastHistory
    });

  } catch (err: any) {
    const message = err instanceof Error ? err.message : 'Gagal mengambil detail AWB';
    console.error('[GET /api/awb/[awb]] Error:', message);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
