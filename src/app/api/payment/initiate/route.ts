import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json(); // Menerima data order parsial
    const transactionId = `TRX-MOCK-${Date.now()}`;
    
    // Generate QR code palsu menggunakan QR Server API
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${transactionId}`;

    return NextResponse.json({
      success: true,
      transactionId: transactionId,
      paymentInfo: {
        method: 'GOPAY_QR',
        qrCodeUrl: qrCodeUrl,
      }
    }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Gagal memulai pembayaran' }, { status: 500 });
  }
}
