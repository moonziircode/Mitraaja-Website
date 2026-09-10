const { Pool } = require('pg');

const SUPABASE_POOLER_URL =
  process.env.SUPABASE_POSTGRES_URL ||
  process.env.POSTGRES_URL ||
  'postgresql://postgres.wqpomgyktrndktsmojqg:Ftzmt6vN1tZFniyQ@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString: SUPABASE_POOLER_URL,
  ssl: { rejectUnauthorized: false },
});

const INITIAL_PROMOS = [
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
      '31', '31.01', '31.71', '31.72', '31.73', '31.74', '31.75',
      'JAKARTA', 'DKI JAKARTA', 'JAKARTA PUSAT', 'JAKARTA UTARA', 'JAKARTA BARAT', 'JAKARTA SELATAN', 'JAKARTA TIMUR',
      '36.03', '36.71', '36.74',
      'TANGERANG', 'TANGERANG SELATAN',
      '32.16', '32.75',
      'BEKASI'
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
    destination_province: '32',
    destination_cities: [],
    is_active: true,
  },
];

async function seed() {
  console.log('--- Memulai Seeding Promo ke PostgreSQL ---');

  // Pastikan struktur tabel lengkap
  await pool.query(`
    CREATE TABLE IF NOT EXISTS promos (
      id SERIAL PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(150) NOT NULL,
      description TEXT,
      discount_type VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE',
      discount_value NUMERIC(10, 2) NOT NULL,
      max_discount NUMERIC(10, 2),
      mitra_scope VARCHAR(50) NOT NULL DEFAULT 'CITY_OR_REGENCY',
      mitra_cities JSONB NOT NULL DEFAULT '["32.73", "32.17", "32.04"]'::jsonb,
      origin_scope VARCHAR(50) NOT NULL DEFAULT 'CITY_OR_REGENCY',
      origin_cities JSONB NOT NULL DEFAULT '["32.73", "32.17", "32.04"]'::jsonb,
      destination_scope VARCHAR(50) NOT NULL DEFAULT 'CITY_OR_REGENCY',
      destination_cities JSONB NOT NULL DEFAULT '[]'::jsonb,
      destination_province VARCHAR(50),
      is_active BOOLEAN NOT NULL DEFAULT true,
      start_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      end_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 years'),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  try {
    await pool.query(`
      ALTER TABLE promos ADD COLUMN IF NOT EXISTS mitra_scope VARCHAR(50) NOT NULL DEFAULT 'CITY_OR_REGENCY';
      ALTER TABLE promos ADD COLUMN IF NOT EXISTS mitra_cities JSONB NOT NULL DEFAULT '["32.73", "32.17", "32.04"]'::jsonb;
    `);
  } catch (err) {}

  const upsertSql = `
    INSERT INTO promos (
      code, name, description, discount_type, discount_value, max_discount,
      mitra_scope, mitra_cities, origin_scope, origin_cities,
      destination_scope, destination_cities, destination_province,
      is_active, start_at, end_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10,
      $11, $12, $13,
      $14, $15, $16, NOW()
    )
    ON CONFLICT (code) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      discount_type = EXCLUDED.discount_type,
      discount_value = EXCLUDED.discount_value,
      max_discount = EXCLUDED.max_discount,
      mitra_scope = EXCLUDED.mitra_scope,
      mitra_cities = EXCLUDED.mitra_cities,
      origin_scope = EXCLUDED.origin_scope,
      origin_cities = EXCLUDED.origin_cities,
      destination_scope = EXCLUDED.destination_scope,
      destination_cities = EXCLUDED.destination_cities,
      destination_province = EXCLUDED.destination_province,
      is_active = EXCLUDED.is_active,
      start_at = EXCLUDED.start_at,
      end_at = EXCLUDED.end_at,
      updated_at = NOW()
    RETURNING id, code, name, discount_value, max_discount;
  `;

  for (const promo of INITIAL_PROMOS) {
    const values = [
      promo.code.toLowerCase().trim(),
      promo.name,
      promo.description,
      promo.discount_type,
      promo.discount_value,
      promo.max_discount,
      promo.mitra_scope,
      JSON.stringify(promo.mitra_cities),
      promo.origin_scope,
      JSON.stringify(promo.origin_cities),
      promo.destination_scope,
      JSON.stringify(promo.destination_cities),
      promo.destination_province || null,
      promo.is_active,
      new Date(),
      new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
    ];

    const res = await pool.query(upsertSql, values);
    const row = res.rows[0];
    console.log(`✓ [Seeded] ${row.code} (${row.name}) - Nilai: ${row.discount_value}%, Max: ${row.max_discount || 'Unlimited'}`);
  }

  const total = await pool.query('SELECT COUNT(*) as count FROM promos;');
  console.log(`Total Promo di Database: ${total.rows[0].count}`);
  await pool.end();
}

seed().catch((err) => {
  console.error('Error saat seeding promos:', err);
  pool.end();
  process.exit(1);
});
