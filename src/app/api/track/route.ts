import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { awb } = await request.json();

  if (!awb) {
    return NextResponse.json({ message: 'Nomor AWB harus diisi' }, { status: 400 });
  }

  // === SIMULASI LOGIKA TRACKING API ===
  // Dalam aplikasi nyata, ini akan memanggil API tracking Anteraja
  // Untuk tujuan pengujian, kita hardcode data untuk AWB '11003838770507'.
  if (awb === '11003838770507') {
    const mockTrackingData = {
      awb: '11003838770507',
      status: 'Delivered',
      service: 'Next Day Delivery',
      weight: '2.4 kg',
      sender: 'TechStore JKT',
      receiver: 'Budi Santoso',
      destination: 'South Jakarta',
      history: [
        { opcode: 80, status: 'Paket Sukses Terkirim', time: 'Today, 14:30', detail: 'Paket telah diterima oleh YBS (Yang Bersangkutan).', icon: 'check_circle', color: 'green' },
        { opcode: 70, status: 'Proses Antar Kurir', time: 'Today, 08:15', detail: 'Kurir sedang dalam perjalanan menuju alamat tujuan.', icon: 'two_wheeler', color: 'blue' },
        { opcode: 30, status: 'Paket Diterima di Hub Tujuan', time: 'Yesterday, 18:45', detail: 'Paket telah sampai di Hub Utama Jakarta Selatan.', icon: 'storefront', color: 'gray' },
        { opcode: 43, status: 'Paket Keluar dari Hub Asal', time: 'Yesterday, 14:00', detail: 'Paket sedang dalam perjalanan antar hub.', icon: 'flight_takeoff', color: 'gray' },
        { opcode: 102, status: 'Paket Diterima di Hub Asal', time: 'Oct 24, 11:30', detail: 'Paket telah diserahkan oleh SATRIA ke Hub.', icon: 'warehouse', color: 'gray' },
        { opcode: 54, status: 'Paket Dijemput Kurir', time: 'Oct 24, 09:30', detail: 'Paket telah dijemput oleh SATRIA dari pengirim.', icon: 'hail', color: 'gray_light' },
        { opcode: 96, status: 'Pesanan Dikonfirmasi', time: 'Oct 24, 08:15', detail: 'Data pengiriman telah diterima sistem.', icon: 'receipt_long', color: 'gray_light' },
      ],
    };
    return NextResponse.json(mockTrackingData, { status: 200 });
  } else {
    // Jika AWB lain, kembalikan 'tidak ditemukan'
    return NextResponse.json({ message: 'Nomor resi tidak ditemukan.' }, { status: 404 });
  }
}
