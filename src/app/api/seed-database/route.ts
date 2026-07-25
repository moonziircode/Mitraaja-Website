import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebaseAdmin';
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';

// Fungsi untuk membagi array menjadi potongan-potongan kecil
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunkedArr: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunkedArr.push(array.slice(i, i + size));
  }
  return chunkedArr;
}

export async function GET(request: NextRequest) {
  if (!firestore) {
    return NextResponse.json(
      { message: 'Firebase Firestore tidak diinisialisasi. Cek .env.local Anda.' },
      { status: 500 }
    );
  }
  
  const db = firestore;

  console.log('Starting Firestore seeding...');
  
  try {
    // Baca dan parse regions.csv
    const regionsCsvPath = path.join(process.cwd(), 'src/data/regions.csv');
    let regionsCsv = '';
    
    try {
      regionsCsv = await fs.readFile(regionsCsvPath, 'utf8');
    } catch (e) {
      return NextResponse.json(
        { message: 'File src/data/regions.csv tidak ditemukan. Harap masukkan file terlebih dahulu.' },
        { status: 404 }
      );
    }

    const regions = parse(regionsCsv, {
      columns: true,
      skip_empty_lines: true,
    });

    // Firestore batch writes memiliki batas 500 operasi, kita gunakan 400 agar aman
    const regionChunks = chunkArray(regions, 400);
    let count = 0;

    for (const chunk of regionChunks) {
      const batch = db.batch();
      chunk.forEach((region: any) => {
        // Gunakan dist_code sebagai ID dokumen
        const docRef = db.collection('regions').doc(region.dist_code);
        batch.set(docRef, {
          dist_all: region.dist_all,
          parent_dist_code: region.parent_dist_code,
          dist_code: region.dist_code,
          dist_name: region.dist_name,
          city_name: region.city_name,
          province_name: region.province_name,
          postal_code: region.postal_code,
          // Simpan seluruh data tambahan dari CSV juga
          ...region
        });
      });
      await batch.commit();
      count += chunk.length;
      console.log(`Seeded ${count} of ${regions.length} regions.`);
    }

    console.log('Seeding finished.');
    return NextResponse.json({ message: `Database seeded successfully dengan ${count} regions!` });

  } catch (error: any) {
    console.error('Seeding Error:', error);
    return NextResponse.json({ message: 'Failed to seed database', error: error.message }, { status: 500 });
  }
}
