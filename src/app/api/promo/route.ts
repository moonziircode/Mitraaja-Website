import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebaseAdmin';

export const preferredRegion = 'sin1';

export async function GET(request: NextRequest) {
  if (!firestore) {
    return NextResponse.json({ status: 500, info: 'Firestore tidak diinisialisasi', content: [] });
  }

  try {
    const { searchParams } = new URL(request.url);
    const searchKey = searchParams.get('search_key');

    let query = firestore.collection('promos')
      .where('is_active', '==', true);

    const snapshot = await query.get();

    if (snapshot.empty) {
      return NextResponse.json({
        status: 0,
        info: 'OK',
        content: []
      });
    }

    const now = new Date();
    const list: any[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const validToDate = new Date(data.valid_to);

      // Filter out expired promos
      if (validToDate >= now) {
        // If search_key is provided, filter by code or title/description
        if (searchKey) {
          const key = searchKey.toLowerCase();
          if (
            !data.code.toLowerCase().includes(key) &&
            !data.title.toLowerCase().includes(key) &&
            !data.description.toLowerCase().includes(key)
          ) {
            return;
          }
        }

        list.push({
          title: data.title || '',
          description: data.description || '',
          code: data.code || '',
          valid_to: data.valid_to || ''
        });
      }
    });

    return NextResponse.json({
      status: 0,
      info: 'OK',
      content: list
    });

  } catch (error: any) {
    console.error('Error fetching promos:', error.message);
    return NextResponse.json({
      status: 500,
      info: error.message || 'Gagal memuat promo',
      content: []
    });
  }
}
