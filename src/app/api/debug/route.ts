import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import '@/lib/firebaseAdmin';

export async function GET() {
  const db = getFirestore();
  const doc = await db.collection('all_regions').limit(5).get();
  return NextResponse.json(doc.docs.map(d => d.data()));
}
