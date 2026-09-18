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
 * Pastikan tabel scan_records, internal_scan_logs, dan activity_logs tersedia di database Supabase.
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
        latitude NUMERIC(10, 7),
        longitude NUMERIC(10, 7),
        accuracy NUMERIC(10, 2),
        is_mock_detected BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_internal_scan_logs_awb ON internal_scan_logs(awb);
      CREATE INDEX IF NOT EXISTS idx_internal_scan_logs_nia ON internal_scan_logs(nia);
      CREATE INDEX IF NOT EXISTS idx_internal_scan_logs_timestamp ON internal_scan_logs(timestamp);

      CREATE TABLE IF NOT EXISTS activity_logs (
        id BIGSERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        user_nia VARCHAR(100),
        user_name VARCHAR(150),
        store_name VARCHAR(150),
        action VARCHAR(100) NOT NULL,
        awb VARCHAR(50),
        status VARCHAR(50) NOT NULL,
        description TEXT,
        ip_address VARCHAR(50),
        user_agent TEXT,
        coordinates JSONB,
        latitude NUMERIC(10, 7),
        longitude NUMERIC(10, 7),
        accuracy NUMERIC(10, 2),
        is_mock_detected BOOLEAN DEFAULT FALSE,
        metadata JSONB
      );
      CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_awb ON activity_logs(awb);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_user_nia ON activity_logs(user_nia);

      ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS coordinates JSONB;
      ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7);
      ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);
      ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS accuracy NUMERIC(10, 2);
      ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS is_mock_detected BOOLEAN DEFAULT FALSE;

      ALTER TABLE internal_scan_logs ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7);
      ALTER TABLE internal_scan_logs ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);
      ALTER TABLE internal_scan_logs ADD COLUMN IF NOT EXISTS accuracy NUMERIC(10, 2);
      ALTER TABLE internal_scan_logs ADD COLUMN IF NOT EXISTS is_mock_detected BOOLEAN DEFAULT FALSE;
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

export interface CoordinateData {
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  isMockDetected?: boolean;
}

export interface ActivityLogInput {
  action: string;
  status: 'SUCCESS' | 'FAILED' | 'ALREADY_CLAIMED' | 'WARNING' | 'INFO' | string;
  awb?: string;
  userNia?: string;
  userName?: string;
  storeName?: string;
  description?: string;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  coordinates?: CoordinateData | null;
  metadata?: any;
}

/**
 * Catat aktivitas ke Supabase (menulis ke tabel activity_logs DAN internal_scan_logs secara bersamaan).
 */
export async function logActivity(input: ActivityLogInput): Promise<boolean> {
  try {
    await ensureScanTables();

    const timestamp = new Date();
    const cleanAwb = (input.awb || '').trim();
    const cleanNia = (input.userNia || '').trim();
    const cleanStore = (input.storeName || '').trim();
    const cleanUser = (input.userName || '').trim();
    const desc = input.description || input.errorMessage || null;

    const coords = input.coordinates || null;
    const lat = coords?.latitude != null ? coords.latitude : null;
    const lng = coords?.longitude != null ? coords.longitude : null;
    const accuracy = coords?.accuracy != null ? coords.accuracy : null;
    const isMock = coords?.isMockDetected != null ? Boolean(coords.isMockDetected) : false;
    const coordsJson = coords ? JSON.stringify(coords) : null;

    // Insert into activity_logs
    const insertActivity = pool.query(
      `
      INSERT INTO activity_logs (
        created_at, user_nia, user_name, store_name, action, awb, status, description,
        ip_address, user_agent, coordinates, latitude, longitude, accuracy, is_mock_detected, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `,
      [
        timestamp,
        cleanNia || null,
        cleanUser || null,
        cleanStore || null,
        input.action,
        cleanAwb || null,
        input.status,
        desc,
        input.ipAddress || null,
        input.userAgent || null,
        coordsJson,
        lat,
        lng,
        accuracy,
        isMock,
        input.metadata ? JSON.stringify(input.metadata) : null,
      ]
    );

    // Insert into internal_scan_logs for dual-table compatibility
    const insertInternalScan = pool.query(
      `
      INSERT INTO internal_scan_logs (
        timestamp, nia, store_name, awb, action, status, error_message,
        device_type, browser_info, technical_info, coordinates, latitude, longitude, accuracy, is_mock_detected, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
      `,
      [
        timestamp,
        cleanNia,
        cleanStore,
        cleanAwb,
        input.action,
        input.status,
        input.errorMessage || null,
        input.userAgent && /mobile|android|iphone/i.test(input.userAgent) ? 'Mobile' : 'Web Browser',
        input.userAgent || null,
        input.metadata ? JSON.stringify(input.metadata) : null,
        coordsJson,
        lat,
        lng,
        accuracy,
        isMock,
      ]
    );

    await Promise.all([insertActivity, insertInternalScan]);
    return true;
  } catch (err) {
    console.error('[logActivity] error:', err);
    return false;
  }
}

export type InternalScanLogInput = {
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
  coordinates?: CoordinateData | null;
  technicalInfo?: any;
};

/**
 * Catat internal scan log untuk keperluan audit dan troubleshooting.
 * Memanggil logActivity secara otomatis.
 */
export async function saveInternalScanLog(input: InternalScanLogInput): Promise<boolean> {
  return logActivity({
    action: input.action,
    status: input.status,
    awb: input.awb,
    userNia: input.nia,
    storeName: input.storeName,
    errorMessage: input.errorMessage,
    userAgent: input.browserInfo,
    coordinates: input.coordinates,
    metadata: {
      deviceType: input.deviceType,
      imei: input.imei,
      coordinates: input.coordinates,
      technicalInfo: input.technicalInfo,
    },
  });
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

