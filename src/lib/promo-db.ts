import { Pool } from 'pg';

const SUPABASE_POOLER_URL =
  process.env.SUPABASE_POSTGRES_URL ||
  process.env.POSTGRES_URL ||
  'postgresql://postgres.wqpomgyktrndktsmojqg:Ftzmt6vN1tZFniyQ@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

let pool: Pool;

const globalWithPool = global as typeof globalThis & {
  pgPoolPromo?: Pool;
};

if (!globalWithPool.pgPoolPromo) {
  globalWithPool.pgPoolPromo = new Pool({
    connectionString: SUPABASE_POOLER_URL,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

pool = globalWithPool.pgPoolPromo;

export const promoDb = pool;

export interface PromoRecord {
  id?: number | string;
  code: string;
  name: string;
  description?: string;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  max_discount?: number | null;
  mitra_scope: 'CITY_OR_REGENCY' | 'ALL';
  mitra_cities: string[];
  origin_scope: 'CITY_OR_REGENCY' | 'ALL';
  origin_cities: string[];
  destination_scope: 'CITY_OR_REGENCY' | 'PROVINCE' | 'ALL_CITY';
  destination_cities?: string[];
  destination_province?: string | null;
  is_active: boolean;
  start_at?: string | Date;
  end_at?: string | Date;
  created_at?: string | Date;
  updated_at?: string | Date;
}

/**
 * Pastikan tabel promos tersedia dengan seluruh kolom yang dibutuhkan.
 */
export async function ensurePromosTable(): Promise<void> {
  await promoDb.query(`
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

  // Ensure columns exist if table was previously created
  try {
    await promoDb.query(`
      ALTER TABLE promos ADD COLUMN IF NOT EXISTS mitra_scope VARCHAR(50) NOT NULL DEFAULT 'CITY_OR_REGENCY';
      ALTER TABLE promos ADD COLUMN IF NOT EXISTS mitra_cities JSONB NOT NULL DEFAULT '["32.73", "32.17", "32.04"]'::jsonb;
    `);
  } catch (err: any) {
    // Columns might already exist
  }
}

/**
 * Mengambil seluruh promo aktif yang masih berlaku
 */
export async function getAllActivePromos(): Promise<PromoRecord[]> {
  await ensurePromosTable();
  const query = `
    SELECT * FROM promos 
    WHERE is_active = true 
      AND start_at <= NOW() 
      AND end_at >= NOW()
    ORDER BY id ASC;
  `;
  const res = await promoDb.query(query);
  return res.rows.map(mapRowToPromo);
}

/**
 * Mengambil promo berdasarkan kode uniknya (case-insensitive)
 */
export async function getPromoByCode(code: string): Promise<PromoRecord | null> {
  await ensurePromosTable();
  const sanitizedCode = (code || '').trim().toLowerCase();
  const query = `
    SELECT * FROM promos 
    WHERE LOWER(code) = $1
    LIMIT 1;
  `;
  const res = await promoDb.query(query, [sanitizedCode]);
  if (res.rows.length === 0) return null;
  return mapRowToPromo(res.rows[0]);
}

/**
 * Upsert promo (idempotent: insert jika belum ada, update jika sudah ada)
 */
export async function upsertPromo(promo: PromoRecord): Promise<PromoRecord> {
  await ensurePromosTable();
  const query = `
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
    RETURNING *;
  `;

  const values = [
    promo.code.toLowerCase().trim(),
    promo.name,
    promo.description || '',
    promo.discount_type,
    promo.discount_value,
    promo.max_discount ?? null,
    promo.mitra_scope || 'CITY_OR_REGENCY',
    JSON.stringify(promo.mitra_cities || []),
    promo.origin_scope || 'CITY_OR_REGENCY',
    JSON.stringify(promo.origin_cities || []),
    promo.destination_scope,
    JSON.stringify(promo.destination_cities || []),
    promo.destination_province ?? null,
    promo.is_active ?? true,
    promo.start_at ? new Date(promo.start_at) : new Date(),
    promo.end_at ? new Date(promo.end_at) : new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
  ];

  const res = await promoDb.query(query, values);
  return mapRowToPromo(res.rows[0]);
}

function mapRowToPromo(row: any): PromoRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    discount_type: row.discount_type,
    discount_value: Number(row.discount_value),
    max_discount: row.max_discount !== null ? Number(row.max_discount) : null,
    mitra_scope: row.mitra_scope || 'CITY_OR_REGENCY',
    mitra_cities: Array.isArray(row.mitra_cities)
      ? row.mitra_cities
      : typeof row.mitra_cities === 'string'
      ? JSON.parse(row.mitra_cities)
      : [],
    origin_scope: row.origin_scope || 'CITY_OR_REGENCY',
    origin_cities: Array.isArray(row.origin_cities)
      ? row.origin_cities
      : typeof row.origin_cities === 'string'
      ? JSON.parse(row.origin_cities)
      : [],
    destination_scope: row.destination_scope,
    destination_cities: Array.isArray(row.destination_cities)
      ? row.destination_cities
      : typeof row.destination_cities === 'string'
      ? JSON.parse(row.destination_cities)
      : [],
    destination_province: row.destination_province,
    is_active: Boolean(row.is_active),
    start_at: row.start_at,
    end_at: row.end_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
