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

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    // Check authentication
    if (!session.isLoggedIn || !session.token || session.token.startsWith('mock-token')) {
      return NextResponse.json(
        { success: false, message: 'Sesi tidak valid. Silakan login kembali.' },
        { status: 401 }
      );
    }

    const payload = await request.json();
    const { taskCode, deliveryPrice, shipperPhone, promoCode, discount } = payload;

    if (!taskCode || !deliveryPrice) {
      return NextResponse.json(
        { success: false, message: 'taskCode dan deliveryPrice wajib diisi.' },
        { status: 400 }
      );
    }

    const basePrice = Number(deliveryPrice);
    const promoAmt = Number(discount || 0);
    const totalPrice = Math.max(0, basePrice - promoAmt);

    // Build the request body for Anteraja payment initiation API
    // Task detail fields are populated with promo details if present.
    const paymentBody = {
      task: [
        {
          task_code: taskCode,
          taskCode: taskCode,
          base_price: basePrice,
          basePrice: basePrice,
          total_price: totalPrice,
          totalPrice: totalPrice,
          promo_amount: promoAmt,
          promoAmount: promoAmt
        }
      ],
      payment_code: '006', // GoPay QR pm_code
      paymentCode: '006',
      payment_phone: shipperPhone || '081234567890',
      paymentPhone: shipperPhone || '081234567890',
      shipperPhoneNumber: shipperPhone || '081234567890',
      promo_code: promoCode || null,
      promoCode: promoCode || null
    };

    const apiBase = process.env.ANTERAJA_API_BASE_URL || 'https://api.anteraja.id/maa-task';
    const url = `${apiBase}/task/dropoff/payment/initiateInApps?agent_staff_id=${session.nia}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: makeMaaHeaders(session.token),
      body: JSON.stringify(paymentBody),
    });

    const body = await res.json();
    if (body.status !== 0 || !body.content) {
      return NextResponse.json(
        { success: false, message: body.info || 'Gagal memulai pembayaran di sistem Anteraja.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      transactionNumber: body.content.transaction_number,
      paymentUrl: body.content.payment_url,
      totalPayment: body.content.total_payment,
    }, { status: 200 });

  } catch (err: any) {
    const message = err instanceof Error ? err.message : 'Gagal memulai pembayaran';
    console.error('[POST /api/payment/initiate] Error:', message);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
