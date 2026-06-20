import { NextResponse } from 'next/server';
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

  try {
    const csvData = getAllRegionsFromCsv();
    let results: any[] = [];
    if (parent) {
      results = csvData.filter(r => r.parent === parent);
    } else if (typeStr) {
      const typeInt = parseInt(typeStr, 10);
      results = csvData.filter(r => r.type === typeInt);
    }
    results.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error('All-regions fetch error:', error.message);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
