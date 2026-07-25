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
    console.error('Failed to read regions-tree.json:', err.message);
    return {};
  }
}

function normalizeName(str: string) {
  if (!str) return '';
  return str.toUpperCase()
    .replace(/^(KEC\.|KECAMATAN|KABUPATEN|KAB\.|KOTA)\s+/i, '')
    .replace(/\s+(KOTA|KABUPATEN)$/i, '')
    .trim();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const province = searchParams.get('province');
    const city = searchParams.get('city');
    const kecamatan = searchParams.get('kecamatan');

    const tree = getRegionsTree();

    // If code parameter is provided, resolve the full hierarchy
    if (code) {
      const parts = code.split('.');
      if (parts.length >= 1) {
        const provCode = parts[0];
        const provNameMatched = Object.keys(tree).find(p => tree[p].code === provCode);
        if (provNameMatched) {
          const provinceData = tree[provNameMatched];
          for (const cityName of Object.keys(provinceData.cities)) {
            const cityData = provinceData.cities[cityName];
            for (const kecName of Object.keys(cityData.kecamatans)) {
              const kecData = cityData.kecamatans[kecName];
              // Match Kecamatan code
              if (kecData.code === code || kecData.code.split('.').slice(0, 3).join('.') === code.split('.').slice(0, 3).join('.')) {
                return NextResponse.json({
                  success: true,
                  data: {
                    province: provNameMatched,
                    city: cityName,
                    kecamatan: kecName,
                    districtCode: kecData.code
                  }
                });
              }
            }
          }
        }
      }
      return NextResponse.json({ success: false, message: 'Kode wilayah tidak ditemukan.' }, { status: 404 });
    }

    // 1. If no query parameters, return list of provinces
    if (!province) {
      const provinces = Object.keys(tree).map(name => ({
        name,
        code: tree[name].code
      })).sort((a, b) => a.name.localeCompare(b.name));
      return NextResponse.json({ success: true, data: provinces });
    }

    // Find province normalized
    const normProv = normalizeName(province);
    const provNameMatched = Object.keys(tree).find(p => normalizeName(p) === normProv);
    if (!provNameMatched) {
      return NextResponse.json({ success: false, message: 'Provinsi tidak ditemukan.' }, { status: 404 });
    }

    const provinceData = tree[provNameMatched];

    // 2. If province provided but no city, return cities in province
    if (!city) {
      const cities = Object.keys(provinceData.cities).sort((a, b) => a.localeCompare(b));
      return NextResponse.json({ success: true, data: cities });
    }

    // Find city normalized
    const normCity = normalizeName(city);
    const cityNameMatched = Object.keys(provinceData.cities).find(c => normalizeName(c) === normCity);
    if (!cityNameMatched) {
      return NextResponse.json({ success: false, message: 'Kota/Kabupaten tidak ditemukan.' }, { status: 404 });
    }

    const cityData = provinceData.cities[cityNameMatched];

    // 3. If province and city provided but no kecamatan, return kecamatans in city
    if (!kecamatan) {
      const kecamatans = Object.keys(cityData.kecamatans).map(name => ({
        name,
        code: cityData.kecamatans[name].code
      })).sort((a, b) => a.name.localeCompare(b.name));
      return NextResponse.json({ success: true, data: kecamatans });
    }

    // Find kecamatan normalized
    const normKec = normalizeName(kecamatan);
    const kecNameMatched = Object.keys(cityData.kecamatans).find(k => normalizeName(k) === normKec);
    if (!kecNameMatched) {
      return NextResponse.json({ success: false, message: 'Kecamatan tidak ditemukan.' }, { status: 404 });
    }

    const kecData = cityData.kecamatans[kecNameMatched];

    // 4. Return villages (kelurahans) in kecamatan along with their postal codes
    const kelurahans = Object.keys(kecData.kelurahans).map(name => ({
      name,
      postalCode: kecData.kelurahans[name],
      districtCode: kecData.code
    })).sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ success: true, data: kelurahans });

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
