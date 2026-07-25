import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getSession();
  session.destroy();
  return NextResponse.json({ message: 'Logout berhasil' }, { status: 200 });
}
