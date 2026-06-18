import { NextRequest, NextResponse } from 'next/server';

// Database simulasi sederhana disimpan di scope memori proses (in-memory)
const paymentStatuses: { [key: string]: { status: 'PENDING' | 'SUCCESS'; timestamp: number } } = {};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  const { transactionId } = await params;

  if (!paymentStatuses[transactionId]) {
    paymentStatuses[transactionId] = { status: 'PENDING', timestamp: Date.now() };
  }

  // Simulasi: Pembayaran dianggap berhasil setelah 8 detik
  if (Date.now() - paymentStatuses[transactionId].timestamp > 8000) {
    paymentStatuses[transactionId].status = 'SUCCESS';
  }

  return NextResponse.json({
    transactionId,
    status: paymentStatuses[transactionId].status,
  }, { status: 200 });
}
