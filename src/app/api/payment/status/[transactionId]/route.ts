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
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await params; // transactionId is the taskCode (e.g. MAA-xxx)
    const session = await getSession();

    if (!session.isLoggedIn || !session.token || session.token.startsWith('mock-token')) {
      return NextResponse.json({ success: false, message: 'Tidak terautentikasi' }, { status: 401 });
    }

    const apiBase = process.env.ANTERAJA_API_BASE_URL || 'https://api.anteraja.id/maa-task';

    // 1. Direct check: query order detail to see if waybill_no is populated
    const detailUrl = `${apiBase}/order/v2/task/dropoff/detail?task_code=${transactionId}`;
    const detailRes = await fetch(detailUrl, {
      method: 'GET',
      headers: makeMaaHeaders(session.token)
    });

    if (detailRes.ok) {
      const detailBody = await detailRes.json();
      if (detailBody.status === 0 && detailBody.content) {
        const waybillNo = detailBody.content.waybill_no;
        if (waybillNo) {
          return NextResponse.json({
            transactionId,
            status: 'SUCCESS',
            awb: waybillNo,
          }, { status: 200 });
        }
      }
    }

    // 2. Fallback: check order/payment/check status
    const checkUrl = `${apiBase}/order/payment/check`;
    const checkRes = await fetch(checkUrl, {
      method: 'POST',
      headers: makeMaaHeaders(session.token),
      body: JSON.stringify([{ bookingId: transactionId }])
    });

    if (checkRes.ok) {
      const checkBody = await checkRes.json();
      if (checkBody.status === 0 && checkBody.content && checkBody.content.length > 0) {
        const pState = checkBody.content[0];
        if (pState.status === 'SUCCESS') {
          return NextResponse.json({
            transactionId,
            status: 'SUCCESS',
            awb: pState.waybillNo || null,
          }, { status: 200 });
        }
      }
    }

    // Otherwise, still pending
    return NextResponse.json({
      transactionId,
      status: 'PENDING',
    }, { status: 200 });

  } catch (err: any) {
    const message = err instanceof Error ? err.message : 'Gagal memproses pengecekan status';
    console.error('[GET /api/payment/status] Error:', message);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
