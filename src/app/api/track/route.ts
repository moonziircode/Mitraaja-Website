import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const preferredRegion = 'sin1';

interface RawEvent {
  message: {
    id: string;
    en: string | null;
  };
  timestamp: string;
  tracking_code: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const { awb } = await request.json();

    if (!awb) {
      return NextResponse.json({ message: 'Nomor AWB harus diisi' }, { status: 400 });
    }

    const cleanAwb = awb.trim();

    // Mapping code helper
    const mapEvent = (code: string, timestamp: string, messageId: string) => {
      let status = 'Update Status';
      let icon = 'local_shipping';
      let color = 'gray';

      if (code === '255' || code === '7' || code === '21') {
        status = 'Paket Sukses Terkirim / Retur';
        icon = 'check_circle';
        color = 'green';
      } else if (code === '240' || code === '245' || code === '5' || code === '6') {
        status = 'Proses Antar Kurir';
        icon = 'two_wheeler';
        color = 'blue';
      } else if (code === '201' || code === '10' || code === '11') {
        status = 'Paket Diterima di Drop Point';
        icon = 'storefront';
        color = 'indigo';
      } else if (code === '300' || code === '334' || code === '332' || code === '2' || code === '4') {
        status = 'Paket Tiba di Hub (Transit)';
        icon = 'warehouse';
        color = 'violet';
      } else if (code === '160' || code === '1') {
        status = 'Paket Dijemput Kurir (Pickup)';
        icon = 'hail';
        color = 'orange';
      } else if (code === '0' || code === '96') {
        status = 'Pesanan Dikonfirmasi';
        icon = 'receipt_long';
        color = 'gray_light';
      }

      return {
        opcode: parseInt(code, 10) || 0,
        status,
        time: timestamp,
        detail: messageId,
        icon,
        color,
      };
    };

    // If session exists, use the private Agent Tracking API
    if (session.isLoggedIn && session.token && session.nia && !session.token.startsWith('mock-token')) {
      const apiBase = process.env.ANTERAJA_API_BASE_URL || 'https://api.anteraja.id/maa-task';
      const url = `${apiBase}/tracking?waybill=${cleanAwb}&agent_staff_id=${session.nia}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'token': session.token,
          'appid': 'JV_APP',
          'msgid': Date.now().toString(),
          'imei': 'dev_device_uuid_12345',
          'deviceUuid': 'dev_device_uuid_12345',
          'hardwareSerialNo': 'dev_serial',
          'manufacture': 'Apple',
          'model': 'Macbook',
          'os': 'macOS',
          'osVersion': '14.0',
          'appVersion': '2.2.4',
          'mv': '1.1',
          'source': 'MAA',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        return NextResponse.json({ message: `Gagal memanggil Private Tracking API (Status: ${response.status})` }, { status: response.status });
      }

      const data = await response.json();
      if (data.status !== 0 || !data.content) {
        return NextResponse.json({ message: data.info || 'Nomor resi tidak ditemukan di sistem agen.' }, { status: 404 });
      }

      const trackingResult = data.content;
      // Map MaaHistoryTracking to frontend format
      const mappedHistory = (trackingResult.history || []).map((ev: any) => 
        mapEvent(ev.tracking_code, ev.timestamp, ev.message?.id || 'Update')
      );

      return NextResponse.json({
        awb: trackingResult.waybill || cleanAwb,
        status: trackingResult.status === '255' ? 'Delivered' : 'In Transit',
        service: trackingResult.service_code || 'REG',
        weight: trackingResult.weight ? `${(trackingResult.weight / 1000).toFixed(2)} kg` : '-',
        sender: trackingResult.shipper_name || '-',
        receiver: trackingResult.receiver_name || trackingResult.rec_name || '-',
        destination: trackingResult.receiver_address || trackingResult.rec_address || '-',
        history: mappedHistory
      }, { status: 200 });
    }

    // Fallback: Public Tracking API (for customers or not logged in)
    const response = await fetch('https://api.anteraja.id/order/tracking', {
      method: 'POST',
      headers: {
        'mv': '1.2',
        'source': 'aca_android',
        'Content-Type': 'application/json; charset=UTF-8',
        'User-Agent': 'okhttp/3.10.0',
      },
      body: JSON.stringify([{ codes: cleanAwb }]),
      keepalive: true,
    });

    if (!response.ok) {
      return NextResponse.json({ message: `Gagal memanggil Public API Anteraja (Status: ${response.status})` }, { status: response.status });
    }

    const data = await response.json();
    if (data.status !== 200 || !data.content || data.content.length === 0) {
      return NextResponse.json({ message: data.info || 'Nomor resi tidak ditemukan.' }, { status: 404 });
    }

    const trackingResult = data.content[0];
    if (!trackingResult || !trackingResult.detail) {
      return NextResponse.json({ message: 'Detail tracking tidak ditemukan.' }, { status: 404 });
    }

    const mappedHistory = (trackingResult.history || []).map((ev: RawEvent) => 
      mapEvent(ev.tracking_code, ev.timestamp, ev.message.id)
    );

    return NextResponse.json({
      awb: trackingResult.awb,
      status: trackingResult.detail.final_status === '255' ? 'Delivered' : 'In Transit',
      service: trackingResult.detail.service_code || 'REG',
      weight: `${(trackingResult.detail.weight / 1000).toFixed(2)} kg`,
      sender: trackingResult.detail.sender?.name || '-',
      receiver: trackingResult.detail.receiver?.name || '-',
      destination: trackingResult.detail.receiver?.address || '-',
      history: mappedHistory
    }, { status: 200 });

  } catch (error: any) {
    console.error('[POST /api/track] Error:', error);
    return NextResponse.json({ message: error.message || 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
