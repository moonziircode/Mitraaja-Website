import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const preferredRegion = 'sin1';

let cachedTree: any = null;

function getRegionsTree() {
  if (cachedTree) return cachedTree;
  try {
    const filePath = path.resolve(process.cwd(), 'src/lib/regions-tree.json');
    const content = fs.readFileSync(filePath, 'utf8');
    cachedTree = JSON.parse(content);
    return cachedTree;
  } catch (err: any) {
    console.error('Failed to read regions-tree.json in search route:', err.message);
    return {};
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 3) {
      return NextResponse.json([]);
    }

    const tree = getRegionsTree();
    const results: any[] = [];
    const upperQuery = query.toUpperCase();

    // Iterate through tree to find matching kelurahans or kecamatans
    outerLoop:
    for (const provName of Object.keys(tree)) {
      const provData = tree[provName];
      for (const cityName of Object.keys(provData.cities)) {
        const cityData = provData.cities[cityName];
        for (const kecName of Object.keys(cityData.kecamatans)) {
          const kecData = cityData.kecamatans[kecName];
          
          // Check if kecamatan matches query
          const kecMatches = kecName.includes(upperQuery);
          
          for (const kelName of Object.keys(kecData.kelurahans)) {
            const postalCode = kecData.kelurahans[kelName];
            
            // Check if kelurahan matches OR if the parent kecamatan matched
            if (kelName.includes(upperQuery) || kecMatches) {
              results.push({
                district_code: kecData.code,
                postal_code: postalCode,
                name: `Kel. ${kelName}, Kec. ${kecName}, ${cityName}, ${provName}`,
                // Keep compatibility with original fields
                district: `Kel. ${kelName}, Kec. ${kecName}, ${cityName}, ${provName}`,
              });
              
              if (results.length >= 25) {
                break outerLoop;
              }
            }
          }
        }
      }
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('[GET /api/districts/search] Error:', error.message);
    return NextResponse.json([], { status: 500 });
  }
}
