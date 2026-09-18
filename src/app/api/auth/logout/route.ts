import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/scan-records-db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  const nia = session?.nia || '';
  const name = session?.name || '';
  const store = session?.storeName || '';

  try {
    await logActivity({
      action: 'USER_LOGOUT',
      status: 'SUCCESS',
      userNia: nia,
      userName: name,
      storeName: store,
      description: `User ${name} (${nia}) melakukan logout`,
      userAgent: request.headers.get('user-agent') || 'Unknown',
    });
  } catch {}

  session.destroy();
  return NextResponse.json({ message: 'Logout berhasil' }, { status: 200 });
}

