import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { join } from 'node:path';
import { Pool } from 'pg';

import {
  applyPendingMigrations,
  loadMigrationsFromDirectory,
  reconcileKnownMigrations,
} from '../lib/server/db-migrations';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set in .env.local');
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();

    try {
      const migrationsDirectory = join(process.cwd(), 'db', 'migrations');
      const migrations = await loadMigrationsFromDirectory(migrationsDirectory);
      const reconciledMigrations = await reconcileKnownMigrations({
        db: client,
        migrations,
      });
      const appliedMigrations = await applyPendingMigrations({
        db: client,
        migrations,
      });

      if (reconciledMigrations.length > 0) {
        console.log(`Reconciled ${reconciledMigrations.length} already-applied migration(s):`);
        for (const filename of reconciledMigrations) {
          console.log(`- ${filename}`);
        }
      }

      if (appliedMigrations.length === 0) {
        console.log('No pending migrations.');
        return;
      }

      console.log(`Applied ${appliedMigrations.length} migration(s):`);
      for (const filename of appliedMigrations) {
        console.log(`- ${filename}`);
      }
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Database migration run failed.');
  console.error(error);
  process.exit(1);
});
