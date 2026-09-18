import { Pool } from 'pg';

const SUPABASE_POOLER_URL =
  process.env.SUPABASE_POSTGRES_URL ||
  process.env.POSTGRES_URL ||
  'postgresql://postgres.wqpomgyktrndktsmojqg:Ftzmt6vN1tZFniyQ@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

let pool: Pool;
const globalWithPool = global as typeof globalThis & {
  pgPoolScan?: Pool;
};

if (!globalWithPool.pgPoolScan) {
  globalWithPool.pgPoolScan = new Pool({
    connectionString: SUPABASE_POOLER_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

pool = globalWithPool.pgPoolScan;

let isScanTableInitialized = false;

/**
 * Format timestamp into standard WIB (UTC+7) string: YYYY-MM-DD HH:mm:ss
 */
export function formatToWibString(dateInput?: Date | string | number | null): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const pad = (n: number) => String(n).padStart(2, '0');
  const utcMs = d.getTime();
  const wibMs = utcMs + 7 * 3600 * 1000;
  const wibDate = new Date(wibMs);

  return `${wibDate.getUTCFullYear()}-${pad(wibDate.getUTCMonth() + 1)}-${pad(wibDate.getUTCDate())} ${pad(wibDate.getUTCHours())}:${pad(wibDate.getUTCMinutes())}:${pad(wibDate.getUTCSeconds())}`;
}

/**
 * Pastikan tabel scan_records dan internal_scan_logs tersedia di database.
 */
export async function ensureScanTables(): Promise<void> {
  if (isScanTableInitialized) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scan_records (
        id BIGSERIAL PRIMARY KEY,
        awb VARCHAR(50) NOT NULL,
        store_name VARCHAR(150),
        service_type VARCHAR(50),
        scan_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        weight NUMERIC(10, 2),
        item_name TEXT,
        status VARCHAR(50),
        package_details JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_scan_records_awb ON scan_records(awb);
      CREATE INDEX IF NOT EXISTS idx_scan_records_scan_time ON scan_records(scan_time);

      CREATE TABLE IF NOT EXISTS internal_scan_logs (
        id BIGSERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        nia VARCHAR(100),
        store_name VARCHAR(150),
        awb VARCHAR(50),
        action VARCHAR(100),
        status VARCHAR(50),
        error_message TEXT,
        device_type VARCHAR(100),
        imei VARCHAR(100),
        browser_info TEXT,
        coordinates JSONB,
        technical_info JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_internal_scan_logs_awb ON internal_scan_logs(awb);
      CREATE INDEX IF NOT EXISTS idx_internal_scan_logs_nia ON internal_scan_logs(nia);
      CREATE INDEX IF NOT EXISTS idx_internal_scan_logs_timestamp ON internal_scan_logs(timestamp);
    `);
    isScanTableInitialized = true;
  } catch (err) {
    console.error('[ensureScanTables] error:', err);
  }
}

/**
 * Otomatis bersihkan scan_records yang usianya sudah lebih dari 48 jam (TTL).
 */
export async function cleanupExpiredScanRecords(): Promise<number> {
  try {
    await ensureScanTables();
    const result = await pool.query(`
      DELETE FROM scan_records
      WHERE scan_time < NOW() - INTERVAL '48 hours'
    `);
    return result.rowCount ?? 0;
  } catch (err) {
    console.error('[cleanupExpiredScanRecords] error:', err);
    return 0;
  }
}

export interface SaveScanRecordInput {
  awb: string;
  storeName?: string;
  serviceType?: string;
  scanTime?: Date | string | number;
  weight?: number;
  itemName?: string;
  status?: string;
  packageDetails?: any;
}

/**
 * Simpan atau perbarui data scan sementara di Supabase.
 */
export async function saveScanRecord(input: SaveScanRecordInput): Promise<boolean> {
  if (!input.awb) return false;
  try {
    await ensureScanTables();
    // Jalankan pembersihan data kedaluwarsa 48 jam di background
    cleanupExpiredScanRecords().catch(() => {});

    const scanTime = input.scanTime ? new Date(input.scanTime) : new Date();

    await pool.query(
      `
      INSERT INTO scan_records (
        awb, store_name, service_type, scan_time, weight, item_name, status, package_details, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `,
      [
        input.awb.trim(),
        input.storeName || 'Mitra',
        input.serviceType || 'REG',
        scanTime,
        input.weight || 0,
        input.itemName || '-',
        input.status || 'WAITING_FOR_HANDOVER_SERAH',
        JSON.stringify(input.packageDetails || {}),
      ]
    );
    return true;
  } catch (err) {
    console.error('[saveScanRecord] error:', err);
    return false;
  }
}

export interface InternalScanLogInput {
  timestamp?: Date | string | number;
  nia?: string;
  storeName?: string;
  awb?: string;
  action: string;
  status: 'SUCCESS' | 'FAILED' | 'ALREADY_CLAIMED' | string;
  errorMessage?: string;
  deviceType?: string;
  imei?: string;
  browserInfo?: string;
  coordinates?: { latitude?: number; longitude?: number } | null;
  technicalInfo?: any;
}

/**
 * Catat internal scan log untuk keperluan audit dan troubleshooting.
 * Pastikan password TIDAK PERNAH disimpan.
 */
export async function saveInternalScanLog(input: InternalScanLogInput): Promise<boolean> {
  try {
    await ensureScanTables();

    const timestamp = input.timestamp ? new Date(input.timestamp) : new Date();

    await pool.query(
      `
      INSERT INTO internal_scan_logs (
        timestamp, nia, store_name, awb, action, status, error_message,
        device_type, imei, browser_info, coordinates, technical_info, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      `,
      [
        timestamp,
        input.nia || '',
        input.storeName || '',
        input.awb || '',
        input.action,
        input.status,
        input.errorMessage || null,
        input.deviceType || 'Web Browser',
        input.imei || null,
        input.browserInfo || null,
        input.coordinates ? JSON.stringify(input.coordinates) : null,
        input.technicalInfo ? JSON.stringify(input.technicalInfo) : null,
      ]
    );
    return true;
  } catch (err) {
    console.error('[saveInternalScanLog] error:', err);
    return false;
  }
}

/**
 * Ambil riwayat scan sementara berdasarkan nomor AWB.
 */
export async function getScanRecordByAwb(awb: string) {
  if (!awb) return null;
  try {
    await ensureScanTables();
    const res = await pool.query(
      `
      SELECT * FROM scan_records
      WHERE awb = $1
      ORDER BY scan_time DESC
      LIMIT 1
      `,
      [awb.trim()]
    );
    return res.rows[0] || null;
  } catch (err) {
    console.error('[getScanRecordByAwb] error:', err);
    return null;
  }
}

/**
 * Ambil map scan_records untuk sejumlah AWB sekaligus.
 */
export async function getScanRecordsByAwbs(awbs: string[]): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  if (!awbs || awbs.length === 0) return map;
  try {
    await ensureScanTables();
    const res = await pool.query(
      `
      SELECT DISTINCT ON (awb) *
      FROM scan_records
      WHERE awb = ANY($1::varchar[])
      ORDER BY awb, scan_time DESC
      `,
      [awbs]
    );
    for (const row of res.rows) {
      if (row.awb) {
        map.set(row.awb.trim(), row);
      }
    }
    return map;
  } catch (err) {
    console.error('[getScanRecordsByAwbs] error:', err);
    return map;
  }
}
