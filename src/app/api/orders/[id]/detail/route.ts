import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

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
    const { id } = await params; // taskCode (e.g. MAA-xxx)
    const session = await getSession();

    if (!session.isLoggedIn || !session.token) {
      return NextResponse.json({ success: false, message: 'Tidak terautentikasi' }, { status: 401 });
    }

    const rawBase = process.env.ANTERAJA_API_BASE_URL || process.env.NEXT_PUBLIC_ANTERAJA_API_URL || 'https://api.anteraja.id/maa-task';
    const apiBase = rawBase.includes('/maa-task') ? rawBase : `${rawBase.replace(/\/$/, '')}/maa-task`;

    // If active session token is present and not mock, fetch real detail
    if (!session.token.startsWith('mock-token')) {
      try {
        const detailUrl = `${apiBase}/order/v2/task/dropoff/detail?task_code=${encodeURIComponent(id)}&booking_id=${encodeURIComponent(id)}`;
        const res = await fetch(detailUrl, {
          method: 'GET',
          headers: makeMaaHeaders(session.token)
        });

        if (res.ok) {
          const body = await res.json();
          if ((body.status === 0 || body.status === '0' || body.info === 'OK') && body.content) {
            const detailData = Array.isArray(body.content) ? body.content[0] : body.content;
            return NextResponse.json({ success: true, data: detailData });
          }
        }
      } catch (err: any) {
        console.error('Gagal mengambil detail order riil dari Anteraja, beralih ke mock:', err.message);
      }
    }

    // Determine product based on prefix/suffix or default to REG
    let productCode = 'REG';
    let productName = 'Anteraja Regular';
    let price = 11500;

    // Simulate details for mock orders without placeholder names
    const mockDetail = {
      waybill_no: id.startsWith('MAA') ? '1000' + id.replace(/\D/g, '').padEnd(8, '0').substring(0, 8) : id,
      booking_id: id,
      task_code: id,
      parcel_total_weight: 1.0,
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
          item_name: 'Paket Pengiriman',
          declared_value: 100000,
          weight: 1.0,
          width: 10,
          length: 10,
          height: 10,
          item_category: 'Lainnya'
        }
      ],
      payment_status: 'NOT_PAID',
      task_status: 'WAITING_FOR_PAYMENT',
      expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    return NextResponse.json({ success: true, data: mockDetail });

  } catch (err: any) {
    const message = err instanceof Error ? err.message : 'Gagal mengambil detail order';
    console.error('[GET /api/orders/[id]/detail] Error:', message);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
