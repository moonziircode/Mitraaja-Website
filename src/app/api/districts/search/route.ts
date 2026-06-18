import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const preferredRegion = 'sin1';

// Static fallback data for development/testing when PostgreSQL is not configured or fails
const STATIC_FALLBACKS = [
  { district_code: '36.74.03', name: 'Pamulang Barat, Kec. Pamulang, Kota Tangerang Selatan, Banten' },
  { district_code: '36.74.03', name: 'Pamulang Timur, Kec. Pamulang, Kota Tangerang Selatan, Banten' },
  { district_code: '31.73.06', name: 'Palmerah, Kec. Palmerah, Kota Jakarta Barat, DKI Jakarta' },
  { district_code: '31.74.02', name: 'Kuningan Timur, Kec. Setiabudi, Kota Jakarta Selatan, DKI Jakarta' },
  { district_code: '31.74.07', name: 'Kebayoran Baru, Kec. Kebayoran Baru, Kota Jakarta Selatan, DKI Jakarta' }
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 3) {
    return NextResponse.json([]);
  }

  // If DB connection string is missing, immediately return filtered static fallback
  if (!process.env.POSTGRES_URL) {
    console.warn('[GET /api/districts/search] POSTGRES_URL not set, returning static fallback data');
    const filtered = STATIC_FALLBACKS.filter(item =>
      item.name.toLowerCase().includes(query.toLowerCase())
    );
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
         LIMIT 10`,
        [`%${query}%`]
      );
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[GET /api/districts/search] DB error, falling back to static data:', error.message);
    // Graceful fallback to static data so the frontend doesn't crash during setup
    const filtered = STATIC_FALLBACKS.filter(item =>
      item.name.toLowerCase().includes(query.toLowerCase())
    );
    return NextResponse.json(filtered);
  }
}
