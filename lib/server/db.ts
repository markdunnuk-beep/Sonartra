import { Pool } from 'pg';

const globalForDb = globalThis as typeof globalThis & {
  sonartraDbPool?: Pool;
};

export function getDbPool(): Pool {
  if (!globalForDb.sonartraDbPool) {
    globalForDb.sonartraDbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  return globalForDb.sonartraDbPool;
}
