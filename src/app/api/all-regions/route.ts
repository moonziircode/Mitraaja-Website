import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const typeStr = searchParams.get('type');
  const parent = searchParams.get('parent');

  if (!parent && !typeStr) {
    return NextResponse.json({ success: false, message: 'Missing type or parent parameter' }, { status: 400 });
  }

  if (!firestore) {
    return NextResponse.json({ success: false, message: 'Firestore tidak diinisialisasi' }, { status: 500 });
  }

  try {
    let query: FirebaseFirestore.Query = firestore.collection('all_regions_v2');

    if (parent) {
      query = query.where('parent', '==', parent);
    } else if (typeStr) {
      const typeInt = parseInt(typeStr, 10);
      query = query.where('type', '==', typeInt);
    }

    const snapshot = await query.get();
    let results = snapshot.docs.map(doc => doc.data());
    
    results.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error('All-regions fetch error:', error.message);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

