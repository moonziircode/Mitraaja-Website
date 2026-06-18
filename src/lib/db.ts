import { Pool } from 'pg';

let pool: Pool;

if (process.env.NODE_ENV === 'production') {
  pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
} else {
  // Prevent duplicate connections during hot-reloads in development
  const globalWithPool = global as typeof globalThis & {
    pool?: Pool;
  };
  if (!globalWithPool.pool) {
    globalWithPool.pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
    });
  }
  pool = globalWithPool.pool;
}

export const db = pool;
