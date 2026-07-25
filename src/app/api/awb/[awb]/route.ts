import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { anterajaClient } from '@/lib/anteraja-client';

export const preferredRegion = 'sin1';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ awb: string }> }
) {
  try {
    const session = await getSession();

    if (!session || !session.isLoggedIn) {
      return NextResponse.json({ success: false, message: 'Tidak terautentikasi' }, { status: 401 });
    }

    const { awb } = await params;
    
    if (!awb) {
      return NextResponse.json({ success: false, message: 'AWB harus disertakan' }, { status: 400 });
    }

    const agentStaffId = session.nia;
    const token = session.token || 'mock-token';

    const maaTask = await anterajaClient.searchAWB(awb, agentStaffId, token);

    if (!maaTask) {
      return NextResponse.json({ 
        success: false, 
        message: 'Nomor AWB tidak ditemukan di sistem. Pastikan AWB valid atau paket tersebut sudah diklaim / dibatalkan.' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data: maaTask 
    });

  } catch (err: any) {
    const message = err instanceof Error ? err.message : 'Gagal mengambil detail AWB';
    console.error('[GET /api/awb/[awb]] Error:', message);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
