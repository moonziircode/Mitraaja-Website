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

    const apiBase = process.env.ANTERAJA_API_BASE_URL || 'https://api.anteraja.id/maa-task';

    // If active session token is present and not mock, fetch real detail
    if (!session.token.startsWith('mock-token')) {
      try {
        const detailUrl = `${apiBase}/order/v2/task/dropoff/detail?task_code=${id}`;
        const res = await fetch(detailUrl, {
          method: 'GET',
          headers: makeMaaHeaders(session.token)
        });

        if (res.ok) {
          const body = await res.json();
          if (body.status === 0 && body.content) {
            return NextResponse.json({ success: true, data: body.content });
          }
        }
      } catch (err: any) {
        console.error('Gagal mengambil detail order riil dari Anteraja, beralih ke mock:', err.message);
      }
    }

    // Determine product based on prefix/suffix or default to REG
    let productCode = 'REG';
    let productName = 'Anteraja Regular';
    let duration = '1-2 Day';
    let price = 11500;

    // Simulate details for mock orders
    const mockDetail = {
      waybill_no: id.startsWith('MAA') ? '1000' + id.replace(/\D/g, '').padEnd(8, '0').substring(0, 8) : id,
      booking_id: id,
      task_code: id,
      parcel_total_weight: 1.0,
      product_code: productCode,
      product_name: productName,
      delivery_price: price,
      shipper_info: {
        name: 'Aqsa Muflihan',
        phone: '081234567890',
        address: 'Jl. Margonda Raya No. 100, RT 02/RW 03, Beji',
        district_code: '32.76.01',
        postcode: '16424',
        district_name: 'Beji',
        city_name: 'Depok',
        provice_name: 'Jawa Barat',
        zip: '16424'
      },
      receiver_info: {
        name: 'Budi Santoso',
        phone: '089876543210',
        address: 'Jl. Palmerah Barat No. 29, RT 01/RW 02, Gelora',
        district_code: '31.73.06',
        postcode: '10270',
        district_name: 'Palmerah',
        city_name: 'Jakarta Barat',
        provice_name: 'DKI Jakarta',
        zip: '10270'
      },
      items: [
        {
          item_name: 'Beras Ramos Premium 25 Kg',
          declared_value: 300000,
          weight: 1.0,
          width: 10,
          length: 10,
          height: 10,
          item_category: 'Makanan'
        }
      ],
      payment_status: 'PAID',
      task_status: 'WAITING_FOR_DROPOFF',
      expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    return NextResponse.json({ success: true, data: mockDetail });

  } catch (err: any) {
    const message = err instanceof Error ? err.message : 'Gagal mengambil detail order';
    console.error('[GET /api/orders/[id]/detail] Error:', message);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
