import { NextResponse } from 'next/server';
import { getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import '@/lib/firebaseAdmin'; // Initialize firebase admin

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const typeStr = searchParams.get('type');
  const parent = searchParams.get('parent');
  
  if (!getApps().length) {
    return NextResponse.json({ success: false, message: 'Firebase Admin not initialized' }, { status: 500 });
  }

  const db = getFirestore();
  
  try {
    let regionsRef: FirebaseFirestore.Query = db.collection('all_regions');
    
    if (parent) {
      regionsRef = regionsRef.where('parent_dist_code', '==', parent);
    } else if (typeStr) {
      regionsRef = regionsRef.where('dist_type', '==', parseInt(typeStr, 10));
    } else {
      return NextResponse.json({ success: false, message: 'Missing type or parent parameter' }, { status: 400 });
    }
    
    // Limit to prevent massive payload. Sort in memory to avoid composite index requirement.
    regionsRef = regionsRef.limit(1000);
    
    const snapshot = await regionsRef.get();
    
    if (snapshot.empty) {
      return NextResponse.json({ success: true, data: [] });
    }
    
    let results = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: data.id,
        code: data.dist_code,
        name: data.dist_name,
        type: data.dist_type,
        parent: data.parent_dist_code
      };
    });
    
    results.sort((a, b) => a.name.localeCompare(b.name));
    
    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error('All-regions fetch error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
