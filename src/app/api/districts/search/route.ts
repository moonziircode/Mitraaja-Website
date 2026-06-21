import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const preferredRegion = 'sin1';

// Global cache for parsed districts to avoid reading from disk on every search query
let cachedDistricts: Array<{
  district_code: string;
  postal_code: string;
  name: string;
  district: string;
  code: string;
}> | null = null;

function loadDistricts() {
  if (cachedDistricts) return cachedDistricts;

  try {
    const filePath = path.join(process.cwd(), 'src/data/regions.csv');
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const results = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const quoteStart = line.indexOf('"');
      const quoteEnd = line.indexOf('"', quoteStart + 1);
      if (quoteStart === -1 || quoteEnd === -1) continue;

      const dist_all = line.substring(quoteStart + 1, quoteEnd);
      const rest = line.substring(quoteEnd + 2);
      const parts = rest.split(',');

      const dist_code = parts[1];
      let postal_code = parts[parts.length - 1];
      if (postal_code) {
        postal_code = postal_code.replace(/['"]/g, '').trim();
      }

      results.push({
        district_code: dist_code,
        postal_code: postal_code,
        name: dist_all,
        district: dist_all,
        code: dist_code,
      });
    }

    cachedDistricts = results;
    return results;
  } catch (error) {
    console.error('Failed to load districts from CSV:', error);
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
    const normalizedQuery = query.toLowerCase().trim();
    const districts = loadDistricts();

    // Filter matches locally
    const filtered = districts
      .filter((d) => d.name.toLowerCase().includes(normalizedQuery))
      .slice(0, 10);

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ message: 'Gagal mencari data wilayah' }, { status: 500 });
  }
}

