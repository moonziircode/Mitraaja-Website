import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebaseAdmin';

export const preferredRegion = 'sin1';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 3) {
    return NextResponse.json([]);
  }

  if (!firestore) {
    return NextResponse.json({ message: 'Firestore tidak diinisialisasi' }, { status: 500 });
  }

  try {
    const normalizedQuery = query.toLowerCase().trim();

    // Firestore prefix search on regions_v2 name_lowercase field
    const snapshot = await firestore.collection('regions_v2')
      .orderBy('name_lowercase')
      .startAt(normalizedQuery)
      .endAt(normalizedQuery + '\uf8ff')
      .limit(10)
      .get();

    if (snapshot.empty) {
      return NextResponse.json([]);
    }

    const results = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        district_code: data.code,
        postal_code: data.postal_code || '',
        name: data.name,
        district: data.name,
        code: data.code,
      };
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ message: 'Gagal mencari data wilayah' }, { status: 500 });
  }
}

