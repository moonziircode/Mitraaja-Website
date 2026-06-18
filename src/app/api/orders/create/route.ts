import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // Di dunia nyata, di sini akan dilakukan pengecekan status pembayaran
    // dan pemanggilan POST ke API /orders Anteraja yang sesungguhnya.
    const newAwb = `AWB-SIMULASI-${Date.now()}`;

    return NextResponse.json({
      success: true,
      awb: newAwb,
      message: `Order berhasil dibuat dengan nomor resi (simulasi) ${newAwb}`,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Gagal memproses pembuatan order' },
      { status: 500 }
    );
  }
}
