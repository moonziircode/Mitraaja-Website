import { Pool } from 'pg';

const SUPABASE_POOLER_URL =
  process.env.SUPABASE_POSTGRES_URL ||
  process.env.POSTGRES_URL ||
  'postgresql://postgres.wqpomgyktrndktsmojqg:Ftzmt6vN1tZFniyQ@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

let pool: Pool;

const globalWithPool = global as typeof globalThis & {
  pgPool?: Pool;
};

if (!globalWithPool.pgPool) {
  globalWithPool.pgPool = new Pool({
    connectionString: SUPABASE_POOLER_URL,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

pool = globalWithPool.pgPool;

export const db = pool;

/**
 * Helper to safely sanitize string input for SQL interpolation when connecting
 * to PgBouncer transaction poolers that do not support named prepared statements.
 */
export function escapeSqlString(val: string): string {
  if (typeof val !== 'string') return "''";
  return `'${val.replace(/'/g, "''")}'`;
}

export interface DistrictRecord {
  id?: string;
  dist_code: string;
  dist_name: string;
  city_code: string;
  city_name: string;
  province_code: string;
  province_name: string;
  country_code?: string;
  country_name?: string;
  dist_type?: string;
  valid_flg?: string;
  postal_code?: string;
  dist_all?: string;
  parent_dist_code?: string;
}

/**
 * Search districts from Supabase database
 */
export async function searchDistricts(
  query: string,
  limit: number = 20
): Promise<DistrictRecord[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const escapedPattern = escapeSqlString(`%${trimmed}%`);
  const escapedPrefix = escapeSqlString(`${trimmed}%`);

  const sql = `
    SELECT 
      dist_code, 
      dist_name, 
      city_code, 
      city_name, 
      province_code, 
      province_name, 
      postal_code, 
      dist_all
    FROM districts
    WHERE 
      dist_name ILIKE ${escapedPattern}
      OR dist_all ILIKE ${escapedPattern}
      OR city_name ILIKE ${escapedPattern}
    ORDER BY 
      CASE 
        WHEN dist_name ILIKE ${escapedPrefix} THEN 1
        WHEN dist_all ILIKE ${escapedPrefix} THEN 2
        WHEN dist_name ILIKE ${escapedPattern} THEN 3
        ELSE 4
      END,
      dist_name ASC
    LIMIT ${Math.min(limit, 50)}
  `;

  const result = await db.query(sql);
  return result.rows;
}

/**
 * Lookup a single district by code (e.g. "31.71.01")
 */
export async function getDistrictByCode(
  distCode: string
): Promise<DistrictRecord | null> {
  const trimmed = distCode.trim();
  if (!trimmed) return null;

  const escaped = escapeSqlString(trimmed);
  const sql = `
    SELECT 
      dist_code, 
      dist_name, 
      city_code, 
      city_name, 
      province_code, 
      province_name, 
      postal_code, 
      dist_all
    FROM districts
    WHERE dist_code = ${escaped}
    LIMIT 1
  `;

  const result = await db.query(sql);
  return result.rows[0] || null;
}
