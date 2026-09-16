import { Pool } from 'pg';

const SUPABASE_POOLER_URL =
  process.env.SUPABASE_POSTGRES_URL ||
  process.env.POSTGRES_URL ||
  'postgresql://postgres.wqpomgyktrndktsmojqg:Ftzmt6vN1tZFniyQ@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

let pool: Pool;
const globalWithPool = global as typeof globalThis & {
  pgPoolVoided?: Pool;
};

if (!globalWithPool.pgPoolVoided) {
  globalWithPool.pgPoolVoided = new Pool({
    connectionString: SUPABASE_POOLER_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

pool = globalWithPool.pgPoolVoided;

let isTableInitialized = false;

/**
 * Pastikan tabel voided_orders tersedia di database.
 */
export async function ensureVoidedOrdersTable(): Promise<void> {
  if (isTableInitialized) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS voided_orders (
        task_code VARCHAR(100) PRIMARY KEY,
        agent_nia VARCHAR(100),
        reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_voided_orders_agent ON voided_orders (agent_nia);
    `);
    isTableInitialized = true;
  } catch (err) {
    console.error('[ensureVoidedOrdersTable] error:', err);
  }
}

/**
 * Tandai order sebagai dibatalkan/dihapus secara permanen.
 */
export async function markOrderAsVoided(
  taskCode: string,
  agentNia?: string,
  reason?: string
): Promise<boolean> {
  if (!taskCode) return false;
  try {
    await ensureVoidedOrdersTable();
    await pool.query(
      `
      INSERT INTO voided_orders (task_code, agent_nia, reason, created_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (task_code) DO NOTHING;
      `,
      [taskCode.trim(), agentNia || '', reason || 'Batal oleh Agent']
    );
    return true;
  } catch (err) {
    console.error('[markOrderAsVoided] error:', err);
    return false;
  }
}

/**
 * Dapatkan daftar semua kode order yang telah dibatalkan/dihapus.
 */
export async function getVoidedTaskCodes(agentNia?: string): Promise<Set<string>> {
  try {
    await ensureVoidedOrdersTable();
    let query = 'SELECT task_code FROM voided_orders';
    const params: string[] = [];
    if (agentNia) {
      query += ' WHERE agent_nia = $1 OR agent_nia = \'\' OR agent_nia IS NULL';
      params.push(agentNia);
    }
    const res = await pool.query(query, params);
    const set = new Set<string>();
    for (const row of res.rows) {
      if (row.task_code) {
        set.add(row.task_code.trim());
      }
    }
    return set;
  } catch (err) {
    console.error('[getVoidedTaskCodes] error:', err);
    return new Set<string>();
  }
}

/**
 * Periksa apakah suatu order telah dibatalkan/dihapus.
 */
export async function isOrderVoided(taskCode: string): Promise<boolean> {
  if (!taskCode) return false;
  try {
    await ensureVoidedOrdersTable();
    const res = await pool.query(
      'SELECT 1 FROM voided_orders WHERE task_code = $1 LIMIT 1',
      [taskCode.trim()]
    );
    return (res.rowCount ?? 0) > 0;
  } catch (err) {
    console.error('[isOrderVoided] error:', err);
    return false;
  }
}
