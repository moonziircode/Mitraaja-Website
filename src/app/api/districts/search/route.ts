import { NextRequest, NextResponse } from 'next/server';
import { searchDistricts } from '@/lib/districts-db';

export const preferredRegion = 'sin1';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.trim().length < 2) {
    return NextResponse.json([]);
  }

  try {
    const districts = await searchDistricts(query, 20);

    const results = districts.map((data) => {
      const displayName = data.dist_all || `${data.dist_name}, ${data.city_name}, ${data.province_name}`;
      return {
        district_code: data.dist_code,
        postal_code: data.postal_code || '',
        name: displayName,
        district: data.dist_name,
        code: data.dist_code,
        city_code: data.city_code,
        city_name: data.city_name,
        province_code: data.province_code,
        province_name: data.province_name,
      };
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('[GET /api/districts/search] Search error:', error);
    return NextResponse.json({ message: 'Gagal mencari data wilayah' }, { status: 500 });
  }
}

