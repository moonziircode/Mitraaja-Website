import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { Pool } from 'pg';

export const preferredRegion = 'sin1';

const SUPABASE_POOLER_URL =
  process.env.SUPABASE_POSTGRES_URL ||
  process.env.POSTGRES_URL ||
  'postgresql://postgres.wqpomgyktrndktsmojqg:Ftzmt6vN1tZFniyQ@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.isLoggedIn) {
      return NextResponse.json({ success: false, message: 'Tidak terautentikasi' }, { status: 401 });
    }

    const pool = new Pool({
      connectionString: SUPABASE_POOLER_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });

    try {
      const activityRes = await pool.query(`
        SELECT * FROM activity_logs
        ORDER BY id DESC
        LIMIT 50
      `);

      const scanLogsRes = await pool.query(`
        SELECT * FROM internal_scan_logs
        ORDER BY id DESC
        LIMIT 50
      `);

      const scanRecordsRes = await pool.query(`
        SELECT * FROM scan_records
        ORDER BY id DESC
        LIMIT 50
      `);

      return NextResponse.json({
        success: true,
        data: {
          activityLogs: activityRes.rows,
          scanLogs: scanLogsRes.rows,
          scanRecords: scanRecordsRes.rows,
        }
      });
    } finally {
      await pool.end();
    }
  } catch (err: any) {
    console.error('[GET /api/logs] Error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
