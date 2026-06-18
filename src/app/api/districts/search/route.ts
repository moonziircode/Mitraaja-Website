import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import districtsStatic from '../../../../lib/districts-static.json';

export const preferredRegion = 'sin1';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 3) {
    return NextResponse.json([]);
  }

  // If DB connection string is missing, immediately return filtered static fallback
  if (!process.env.POSTGRES_URL) {
    console.warn('[GET /api/districts/search] POSTGRES_URL not set, returning static fallback data');
    const filtered = districtsStatic
      .filter(item => item.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 15);
    return NextResponse.json(filtered);
  }

  try {
    const client = await db.connect();
    try {
      // Query joining villages, districts, regencies, and provinces
      const result = await client.query(
        `SELECT 
           d.code as district_code, 
           v.name || ', Kec. ' || d.name || ', ' || r.name || ', ' || p.name as name
         FROM villages v
         JOIN districts d ON v.district_code = d.code
         JOIN regencies r ON d.regency_code = r.code
         JOIN provinces p ON r.province_code = p.code
         WHERE v.name ILIKE $1 OR d.name ILIKE $1
         LIMIT 15`,
        [`%${query}%`]
      );
      
      // If DB has no matches (e.g. not fully seeded), search static list
      if (result.rows.length === 0) {
        const filtered = districtsStatic
          .filter(item => item.name.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 15);
        return NextResponse.json(filtered);
      }
      
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[GET /api/districts/search] DB error, falling back to static data:', error.message);
    const filtered = districtsStatic
      .filter(item => item.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 15);
    return NextResponse.json(filtered);
  }
}
