import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

export const preferredRegion = 'sin1';

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
      dist_all: record.dist_all || record.dist_name,
      postal_code: record.postal_code || '',
      type: parseInt(record.dist_type, 10),
      parent: record.parent_dist_code || null
    }));
    return cachedAllRegions;
  } catch (error) {
    console.error('Failed to parse fallback CSV:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 3) {
    return NextResponse.json([]);
  }

  try {
    const csvData = getAllRegionsFromCsv();
    const lowerQuery = query.toLowerCase();
    
    // Perform substring match on dist_all
    const finalDocs = csvData.filter(r => r.dist_all.toLowerCase().includes(lowerQuery));

    if (finalDocs.length === 0) {
      return NextResponse.json([]);
    }

    const results = finalDocs.slice(0, 10).map((data: any) => {
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
