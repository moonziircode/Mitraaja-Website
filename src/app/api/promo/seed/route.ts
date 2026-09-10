import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { seedPromos } from '@/lib/promo-seeder';

export const preferredRegion = 'sin1';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) {
      return NextResponse.json({ status: 401, message: 'Unauthorized' }, { status: 401 });
    }

    const seeded = await seedPromos();
    return NextResponse.json({
      success: true,
      message: `Berhasil melakukan seeding ${seeded.length} promo secara idempotent.`,
      content: seeded,
    });
  } catch (error: any) {
    console.error('Error seeding promos:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal seeding promo' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
