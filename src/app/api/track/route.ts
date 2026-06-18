import { NextRequest, NextResponse } from 'next/server';

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
    const { awb } = await request.json();

    if (!awb) {
      return NextResponse.json({ message: 'Nomor AWB harus diisi' }, { status: 400 });
    }

    const cleanAwb = awb.trim();

    // Panggil API pelacakan publik Anteraja secara langsung
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
      return NextResponse.json({ 
        message: `Gagal memanggil API Anteraja (Status: ${response.status})` 
      }, { status: response.status });
    }

    const data = await response.json();
    if (data.status !== 200 || !data.content || data.content.length === 0) {
      return NextResponse.json({ 
        message: data.info || 'Nomor resi tidak ditemukan.' 
      }, { status: 404 });
    }

    const trackingResult = data.content[0];
    if (!trackingResult || !trackingResult.detail) {
      return NextResponse.json({ message: 'Detail tracking tidak ditemukan.' }, { status: 404 });
    }

    // Petakan kode tracking Anteraja ke visualisasi ikon di Frontend
    const mapEvent = (event: RawEvent) => {
      const code = event.tracking_code;
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

      // Format waktu
      const timeStr = event.timestamp; // Format "YYYY-MM-DD HH:mm:ss"

      return {
        opcode: parseInt(code, 10) || 0,
        status,
        time: timeStr,
        detail: event.message.id,
        icon,
        color,
      };
    };

    const mappedHistory = (trackingResult.history || []).map(mapEvent);

    // Kirim hasil pemetaan ke frontend
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
