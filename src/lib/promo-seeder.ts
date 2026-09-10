import { upsertPromo, PromoRecord } from './promo-db';

export const INITIAL_PROMOS: PromoRecord[] = [
  {
    code: 'diskonjatabek',
    name: 'Diskon Jatabek 35%',
    description: 'Diskon 35% tanpa maksimum pengiriman Bandung / Bandung Barat ke Jakarta, Tangerang, dan Bekasi.',
    discount_type: 'PERCENTAGE',
    discount_value: 35,
    max_discount: null,
    mitra_scope: 'CITY_OR_REGENCY',
    mitra_cities: ['32.73', '32.17', '32.04', 'BANDUNG', 'BANDUNG_BARAT'],
    origin_scope: 'CITY_OR_REGENCY',
    origin_cities: ['32.73', '32.17', '32.04', 'BANDUNG', 'BANDUNG_BARAT'],
    destination_scope: 'CITY_OR_REGENCY',
    destination_cities: [
      // DKI Jakarta (all cities / codes)
      '31', '31.01', '31.71', '31.72', '31.73', '31.74', '31.75',
      'JAKARTA', 'DKI JAKARTA', 'JAKARTA PUSAT', 'JAKARTA UTARA', 'JAKARTA BARAT', 'JAKARTA SELATAN', 'JAKARTA TIMUR',
      // Tangerang (Kab, Kota, Tangsel)
      '36.03', '36.71', '36.74',
      'TANGERANG', 'TANGERANG SELATAN',
      // Bekasi (Kab, Kota)
      '32.16', '32.75',
      'BEKASI',
    ],
    is_active: true,
  },
  {
    code: 'diskonbdg',
    name: 'Diskon Bandung 35%',
    description: 'Diskon 35% maks. Rp3.000 untuk pengiriman dalam area Bandung dan Bandung Barat.',
    discount_type: 'PERCENTAGE',
    discount_value: 35,
    max_discount: 3000,
    mitra_scope: 'CITY_OR_REGENCY',
    mitra_cities: ['32.73', '32.17', '32.04', 'BANDUNG', 'BANDUNG_BARAT'],
    origin_scope: 'CITY_OR_REGENCY',
    origin_cities: ['32.73', '32.17', '32.04', 'BANDUNG', 'BANDUNG_BARAT'],
    destination_scope: 'CITY_OR_REGENCY',
    destination_cities: ['32.73', '32.17', '32.04', 'BANDUNG', 'BANDUNG_BARAT'],
    is_active: true,
  },
  {
    code: 'diskon10',
    name: 'Diskon 10% Semua Rute',
    description: 'Diskon 10% tanpa maksimum untuk pengiriman dari Bandung / Bandung Barat ke seluruh kota di Indonesia.',
    discount_type: 'PERCENTAGE',
    discount_value: 10,
    max_discount: null,
    mitra_scope: 'CITY_OR_REGENCY',
    mitra_cities: ['32.73', '32.17', '32.04', 'BANDUNG', 'BANDUNG_BARAT'],
    origin_scope: 'CITY_OR_REGENCY',
    origin_cities: ['32.73', '32.17', '32.04', 'BANDUNG', 'BANDUNG_BARAT'],
    destination_scope: 'ALL_CITY',
    destination_cities: [],
    is_active: true,
  },
  {
    code: 'diskonjabar',
    name: 'Diskon Jawa Barat 35%',
    description: 'Diskon 35% maks. Rp3.000 untuk pengiriman dari Bandung / Bandung Barat ke seluruh wilayah Jawa Barat.',
    discount_type: 'PERCENTAGE',
    discount_value: 35,
    max_discount: 3000,
    mitra_scope: 'CITY_OR_REGENCY',
    mitra_cities: ['32.73', '32.17', '32.04', 'BANDUNG', 'BANDUNG_BARAT'],
    origin_scope: 'CITY_OR_REGENCY',
    origin_cities: ['32.73', '32.17', '32.04', 'BANDUNG', 'BANDUNG_BARAT'],
    destination_scope: 'PROVINCE',
    destination_province: '32', // Kode provinsi Jawa Barat
    destination_cities: [],
    is_active: true,
  },
];

/**
 * Seeder Idempotent untuk 4 promo aktif.
 * Menggunakan upsert (ON CONFLICT (code) DO UPDATE) agar aman dieksekusi berkali-kali.
 */
export async function seedPromos(): Promise<PromoRecord[]> {
  const results: PromoRecord[] = [];
  for (const promo of INITIAL_PROMOS) {
    const saved = await upsertPromo(promo);
    results.push(saved);
  }
  return results;
}
