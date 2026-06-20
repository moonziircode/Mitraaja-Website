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
    const normalizedQuery = query.toLowerCase();
    
    // Firestore prefix search
    const snapshot = await firestore.collection('all_regions_v2')
      .orderBy('dist_all_lowercase')
      .startAt(normalizedQuery)
      .endAt(normalizedQuery + '\uf8ff')
      .limit(30)
      .get();

    if (snapshot.empty) {
      return NextResponse.json([]);
    }

    const results = snapshot.docs
      .map(doc => doc.data())
      .filter(data => data.type === 4) // Filter kelurahans in memory to avoid composite index
      .slice(0, 10)
      .map(data => {
      let pc = data.postal_code || '';
      if (pc.includes(',')) pc = pc.split(',')[0].trim();
      return {
        district_code: data.code,
        postal_code: pc,
        name: data.dist_all,
        district: data.dist_all,
        code: data.code // for prompt compatibility
      };
    });
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ message: 'Gagal mencari data wilayah' }, { status: 500 });
  }
}

