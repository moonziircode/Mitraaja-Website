import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getScanRecordByAwb, formatToWibString } from '@/lib/scan-records-db';

export const preferredRegion = 'sin1';

function makeMaaHeaders(token: string) {
  return {
    token,
    appid: 'JV_APP',
    msgid: Date.now().toString(),
    imei: 'dev_device_uuid_12345',
    deviceUuid: 'dev_device_uuid_12345',
    hardwareSerialNo: 'dev_serial',
    manufacture: 'Apple',
    model: 'Macbook',
    os: 'macOS',
    osVersion: '14.0',
    appVersion: '2.2.4',
    mv: '1.1',
    source: 'MAA',
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // taskCode or waybill (e.g. 11004385407467)
    const session = await getSession();

    if (!session.isLoggedIn || !session.token) {
      return NextResponse.json({ success: false, message: 'Tidak terautentikasi' }, { status: 401 });
    }

    const cleanId = (id || '').trim();

    // 1. Check if scan record exists in Supabase
    let scanRec: any = null;
    try {
      scanRec = await getScanRecordByAwb(cleanId);
    } catch (e) {
      console.warn('[GET /api/orders/[id]/detail] Error reading scan_record:', e);
    }

    const rawBase = process.env.ANTERAJA_API_BASE_URL || process.env.NEXT_PUBLIC_ANTERAJA_API_URL || 'https://api.anteraja.id/maa-task';
    const apiBase = rawBase.includes('/maa-task') ? rawBase : `${rawBase.replace(/\/$/, '')}/maa-task`;

    // If active session token is present and not mock, fetch real detail
    if (!session.token.startsWith('mock-token')) {
      try {
        const detailUrl = `${apiBase}/order/v2/task/dropoff/detail?task_code=${encodeURIComponent(cleanId)}&booking_id=${encodeURIComponent(cleanId)}`;
        const res = await fetch(detailUrl, {
          method: 'GET',
          headers: makeMaaHeaders(session.token)
        });

        if (res.ok) {
          const body = await res.json();
          if ((body.status === 0 || body.status === '0' || body.info === 'OK') && body.content) {
            const detailData = Array.isArray(body.content) ? body.content[0] : body.content;
            if (scanRec) {
              if (scanRec.scan_time) detailData.scan_time = formatToWibString(scanRec.scan_time);
              if (scanRec.store_name) detailData.store_name = scanRec.store_name;
              if (scanRec.item_name && scanRec.item_name !== '-') detailData.item_name = scanRec.item_name;
              if (scanRec.weight) detailData.weight = Number(scanRec.weight);
            }
            return NextResponse.json({ success: true, data: detailData });
          }
        }
      } catch (err: any) {
        console.error('Gagal mengambil detail order riil dari Anteraja, beralih ke fallback:', err.message);
      }

      // If id is 14 digits (AWB) or task not found in dropoff/detail, query Anteraja tracking endpoint
      if (/^[0-9]{14}$/.test(cleanId)) {
        try {
          const trackUrl = `${apiBase}/tracking?waybill=${encodeURIComponent(cleanId)}&agent_staff_id=${encodeURIComponent(session.nia || '')}`;
          const trackRes = await fetch(trackUrl, {
            method: 'GET',
            headers: makeMaaHeaders(session.token),
          });
          if (trackRes.ok) {
            const trackBody = await trackRes.json();
            if (trackBody.status === 0 && trackBody.content) {
              const tc = trackBody.content;
              const history = tc.history || [];
              const ev201 = history.find((h: any) => h.tracking_code === 201 || h.tracking_code === '201');
              const scanTimestamp = ev201?.timestamp || history[0]?.timestamp || null;
              const formattedScanTime = formatToWibString(scanRec?.scan_time || scanTimestamp);

              const realStoreName = tc.shipper_name || tc.client_name || scanRec?.store_name || session.storeName || session.name || 'Mitra';
              const trackingDetail = {
                waybill_no: tc.waybill || cleanId,
                booking_id: tc.booking_id || cleanId,
                task_code: tc.booking_id || cleanId,
                product_code: tc.service_code || scanRec?.service_type || 'REG',
                product_name: `Anteraja ${tc.service_code || 'Regular'}`,
                delivery_price: tc.service_fee || 0,
                parcel_total_weight: tc.weight ? tc.weight / 1000 : (scanRec?.weight ? Number(scanRec.weight) : 1.0),
                weight: tc.weight ? tc.weight / 1000 : (scanRec?.weight ? Number(scanRec.weight) : 1.0),
                scan_time: formattedScanTime,
                scanTime: formattedScanTime,
                store_name: realStoreName,
                storeName: realStoreName,
                item_name: scanRec?.item_name || (tc.items?.[0]?.name) || 'Paket Pengiriman',
                items: tc.items && tc.items.length > 0 ? tc.items.map((it: any) => ({
                  item_name: it.name || it.item_name || scanRec?.item_name || 'Paket Pengiriman',
                  itemName: it.name || it.item_name || scanRec?.item_name || 'Paket Pengiriman',
                  declared_value: it.price || it.declared_value || 0,
                  weight: it.weight ? it.weight / 1000 : (scanRec?.weight ? Number(scanRec.weight) : 1.0),
                  item_category: it.category || 'Lainnya',
                })) : [
                  {
                    item_name: scanRec?.item_name || 'Paket Pengiriman',
                    itemName: scanRec?.item_name || 'Paket Pengiriman',
                    declared_value: 0,
                    weight: scanRec?.weight ? Number(scanRec.weight) : (tc.weight ? tc.weight / 1000 : 1.0),
                    item_category: 'Lainnya',
                  }
                ],
                order_status: 'WAITING_FOR_HANDOVER_SERAH',
                task_status: 'WAITING_FOR_HANDOVER_SERAH',
                order_state: 'ACTIVE',
              };

              return NextResponse.json({ success: true, data: trackingDetail });
            }
          }
        } catch (trackErr: any) {
          console.warn('[GET /api/orders/[id]/detail] tracking fallback error:', trackErr.message);
        }
      }
    }

    // Determine product based on prefix/suffix or default to REG
    let productCode = scanRec?.service_type || 'REG';
    let productName = `Anteraja ${productCode}`;
    let price = 11500;

    const formattedScanTime = formatToWibString(scanRec?.scan_time || new Date());
    const storeName = (scanRec?.store_name && scanRec.store_name !== 'Pengusaha Tandes') ? scanRec.store_name : (session.storeName || session.name || 'Mitra');
    const itemName = scanRec?.item_name || 'Paket Pengiriman';
    const weight = scanRec?.weight ? Number(scanRec.weight) : 1.0;

    const mockDetail = {
      waybill_no: cleanId.startsWith('MAA') ? '1000' + cleanId.replace(/\D/g, '').padEnd(8, '0').substring(0, 8) : cleanId,
      booking_id: cleanId,
      task_code: cleanId,
      parcel_total_weight: weight,
      weight: weight,
      scan_time: formattedScanTime,
      scanTime: formattedScanTime,
      store_name: storeName,
      storeName: storeName,
      item_name: itemName,
      itemName: itemName,
      product_code: productCode,
      product_name: productName,
      delivery_price: price,
      shipper_info: {
        name: '',
        phone: '',
        address: '',
        district_code: '',
        postcode: '',
        district_name: '',
        city_name: '',
        provice_name: '',
        zip: ''
      },
      receiver_info: {
        name: '',
        phone: '',
        address: '',
        district_code: '',
        postcode: '',
        district_name: '',
        city_name: '',
        provice_name: '',
        zip: ''
      },
      items: [
        {
          item_name: itemName,
          declared_value: 100000,
          weight: weight,
          width: 10,
          length: 10,
          height: 10,
          item_category: 'Lainnya'
        }
      ],
      payment_status: 'NOT_PAID',
      task_status: 'WAITING_FOR_HANDOVER_SERAH',
      order_status: 'WAITING_FOR_HANDOVER_SERAH',
      order_state: 'ACTIVE',
      expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    return NextResponse.json({ success: true, data: mockDetail });

  } catch (err: any) {
    const message = err instanceof Error ? err.message : 'Gagal mengambil detail order';
    console.error('[GET /api/orders/[id]/detail] Error:', message);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
