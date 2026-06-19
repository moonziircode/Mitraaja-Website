import { NextResponse } from 'next/server';
import { getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import '@/lib/firebaseAdmin'; // Initialize firebase admin
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

let cachedAllRegions: any[] | null = null;

function getAllRegionsFromCsv() {
  if (cachedAllRegions) return cachedAllRegions;
  try {
    const filePath = path.join(process.cwd(), 'src/data/all_regions.csv');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ','
    });
    cachedAllRegions = records.map((record: any) => ({
      id: record.id,
      code: record.dist_code,
      name: record.dist_name,
      type: parseInt(record.dist_type, 10),
      parent: record.parent_dist_code || null
    }));
    return cachedAllRegions;
  } catch (error) {
    console.error('Failed to parse fallback CSV:', error);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const typeStr = searchParams.get('type');
  const parent = searchParams.get('parent');

  if (!parent && !typeStr) {
    return NextResponse.json({ success: false, message: 'Missing type or parent parameter' }, { status: 400 });
  }

  // Fallback function using local CSV
  const getFromCsvFallback = () => {
    console.log('Using local CSV fallback for regions lookup');
    const csvData = getAllRegionsFromCsv();
    let results: any[] = [];
    if (parent) {
      results = csvData.filter(r => r.parent === parent);
    } else if (typeStr) {
      const typeInt = parseInt(typeStr, 10);
      results = csvData.filter(r => r.type === typeInt);
    }
    results.sort((a, b) => a.name.localeCompare(b.name));
    return results;
  };
  
  if (!getApps().length) {
    console.warn('Firebase Admin not initialized, falling back to CSV');
    return NextResponse.json({ success: true, data: getFromCsvFallback() });
  }

  const db = getFirestore();
  
  try {
    let regionsRef: FirebaseFirestore.Query = db.collection('all_regions');
    
    if (parent) {
      regionsRef = regionsRef.where('parent_dist_code', '==', parent);
    } else if (typeStr) {
      regionsRef = regionsRef.where('dist_type', '==', parseInt(typeStr, 10));
    }
    
    // Limit to prevent massive payload. Sort in memory to avoid composite index requirement.
    regionsRef = regionsRef.limit(1000);
    
    const snapshot = await regionsRef.get();
    
    // If the snapshot is empty but we requested something like West Java/Central Java (which hasn't been seeded due to quota),
    // or if Firestore query returned nothing, use CSV fallback.
    if (snapshot.empty) {
      return NextResponse.json({ success: true, data: getFromCsvFallback() });
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
    console.warn('All-regions fetch error, falling back to CSV:', error.message);
    try {
      return NextResponse.json({ success: true, data: getFromCsvFallback() });
    } catch (csvError: any) {
      return NextResponse.json({ success: false, message: csvError.message }, { status: 500 });
    }
  }
}
