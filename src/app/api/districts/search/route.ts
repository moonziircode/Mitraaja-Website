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
    console.error('Firestore not initialized');
    return NextResponse.json({ message: 'Database error' }, { status: 500 });
  }

  const db = firestore;

  try {
    const regionsRef = db.collection('regions');
    // Firestore tidak mendukung pencarian parsial (LIKE) secara native.
    // Kita gunakan trik dengan >= dan <= untuk memfilter berdasarkan awalan.
    // Karena data dist_all bervariasi huruf besar/kecil, pastikan seed data menggunakan lowercase atau konsisten.
    // Untuk ini, asumsikan query dikonversi huruf kapital karena `dist_all` biasanya "Kel. X, Kec. Y"
    // Namun Firestore case-sensitive, jadi ini adalah limitasi sederhana. 
    // Untuk lebih baik, asumsikan awalan (prefix).
    const upperQuery = query.toUpperCase();

    // Query untuk awalan (case-sensitive) - kita coba UPPERCASE dulu
    const snapshot = await regionsRef
      .where('dist_all', '>=', upperQuery)
      .where('dist_all', '<=', upperQuery + '\uf8ff')
      .limit(10)
      .get();

    // Jika kosong, mungkin huruf awal Kapital?
    let finalDocs = snapshot.docs;
    
    // Sebagai alternatif, kita ambil semua limit(10) tanpa filter strict jika tidak bisa full-text search,
    // tapi karena prompt mengharuskan trik >= dan <=, kita ikuti.
    // Jika tidak ditemukan dengan UPPERCASE, mari coba Title Case atau huruf pertama kapital
    if (finalDocs.length === 0) {
       const titleCaseQuery = query.charAt(0).toUpperCase() + query.slice(1).toLowerCase();
       const snap2 = await regionsRef
        .where('dist_all', '>=', titleCaseQuery)
        .where('dist_all', '<=', titleCaseQuery + '\uf8ff')
        .limit(10)
        .get();
       finalDocs = snap2.docs;
    }

    if (finalDocs.length === 0) {
       // Coba prefix lowercase
       const lowerCaseQuery = query.toLowerCase();
       const snap3 = await regionsRef
        .where('dist_all', '>=', lowerCaseQuery)
        .where('dist_all', '<=', lowerCaseQuery + '\uf8ff')
        .limit(10)
        .get();
       finalDocs = snap3.docs;
    }

    if (finalDocs.length === 0) {
      return NextResponse.json([]);
    }

    const results = finalDocs.map((doc: any) => {
      const data = doc.data();
      return {
        district_code: data.dist_code,
        postal_code: data.postal_code,
        name: data.dist_all,
        district: data.dist_all,
        code: data.dist_code // for prompt compatibility
      };
    });
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Firestore search error:', error);
    return NextResponse.json({ message: 'Gagal mencari data wilayah' }, { status: 500 });
  }
}
