import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

type MigrationRow = {
  filename: string;
};

export type DatabaseMigration = {
  filename: string;
  sql: string;
};

export function compareMigrationFilenames(left: string, right: string): number {
  return left.localeCompare(right);
}

export async function loadMigrationsFromDirectory(
  migrationsDirectory: string,
): Promise<readonly DatabaseMigration[]> {
  const entries = await readdir(migrationsDirectory, { withFileTypes: true });
  const filenames = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort(compareMigrationFilenames);

  const migrations = await Promise.all(
    filenames.map(async (filename) => ({
      filename,
      sql: await readFile(join(migrationsDirectory, filename), 'utf8'),
    })),
  );

  return Object.freeze(migrations);
}

export async function ensureSchemaMigrationsTable(db: Queryable): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function getAppliedMigrationFilenames(db: Queryable): Promise<readonly string[]> {
  const result = await db.query<MigrationRow>(`
    SELECT filename
    FROM schema_migrations
    ORDER BY filename ASC
  `);

  return Object.freeze(result.rows.map((row) => row.filename));
}

export async function recordAppliedMigration(
  db: Queryable,
  filename: string,
): Promise<void> {
  await db.query(
    `
    INSERT INTO schema_migrations (filename)
    VALUES ($1)
    ON CONFLICT (filename) DO NOTHING
    `,
    [filename],
  );
}

async function tableExists(db: Queryable, tableName: string): Promise<boolean> {
  const result = await db.query<{ present: boolean }>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = $1
    ) AS present
    `,
    [tableName],
  );

  return result.rows[0]?.present === true;
}

async function columnExists(
  db: Queryable,
  tableName: string,
  columnName: string,
): Promise<boolean> {
  const result = await db.query<{ present: boolean }>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
    ) AS present
    `,
    [tableName, columnName],
  );

  return result.rows[0]?.present === true;
}

async function indexExists(db: Queryable, indexName: string): Promise<boolean> {
  const result = await db.query<{ present: boolean }>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = $1
    ) AS present
    `,
    [indexName],
  );

  return result.rows[0]?.present === true;
}

export async function reconcileKnownMigrations(params: {
  db: Queryable;
  migrations: readonly DatabaseMigration[];
}): Promise<readonly string[]> {
  await ensureSchemaMigrationsTable(params.db);

  const appliedMigrationFilenames = new Set(
    await getAppliedMigrationFilenames(params.db),
  );
  const reconciled: string[] = [];

  for (const migration of params.migrations) {
    if (appliedMigrationFilenames.has(migration.filename)) {
      continue;
    }

    if (migration.filename === '202603260001_mvp_canonical_schema.sql') {
      const baselineTablesExist: boolean[] = [];
      for (const tableName of [
        'assessments',
        'assessment_versions',
        'domains',
        'signals',
        'questions',
        'options',
      ]) {
        baselineTablesExist.push(await tableExists(params.db, tableName));
      }

      if (baselineTablesExist.every(Boolean)) {
        await recordAppliedMigration(params.db, migration.filename);
        reconciled.push(migration.filename);
        appliedMigrationFilenames.add(migration.filename);
      }

      continue;
    }

    if (migration.filename === '202603290001_option_version_key_scope.sql') {
      const hasAssessmentVersionColumn = await columnExists(
        params.db,
        'options',
        'assessment_version_id',
      );
      const hasScopedOptionKeyIndex = await indexExists(
        params.db,
        'options_assessment_version_option_key_idx',
      );

      if (hasAssessmentVersionColumn && hasScopedOptionKeyIndex) {
        await recordAppliedMigration(params.db, migration.filename);
        reconciled.push(migration.filename);
        appliedMigrationFilenames.add(migration.filename);
      }

      continue;
    }

    if (migration.filename === '202604010001_assessment_version_language_tables.sql') {
      const languageTablesExist: boolean[] = [];
      for (const tableName of [
        'assessment_version_language_signals',
        'assessment_version_language_pairs',
        'assessment_version_language_domains',
        'assessment_version_language_overview',
      ]) {
        languageTablesExist.push(await tableExists(params.db, tableName));
      }

      const hasSignalsVersionIndex = await indexExists(
        params.db,
        'assessment_version_language_signals_version_idx',
      );
      const hasPairsVersionIndex = await indexExists(
        params.db,
        'assessment_version_language_pairs_version_idx',
      );
      const hasDomainsVersionIndex = await indexExists(
        params.db,
        'assessment_version_language_domains_version_idx',
      );
      const hasOverviewVersionIndex = await indexExists(
        params.db,
        'assessment_version_language_overview_version_idx',
      );

      if (
        languageTablesExist.every(Boolean)
        && hasSignalsVersionIndex
        && hasPairsVersionIndex
        && hasDomainsVersionIndex
        && hasOverviewVersionIndex
      ) {
        await recordAppliedMigration(params.db, migration.filename);
        reconciled.push(migration.filename);
        appliedMigrationFilenames.add(migration.filename);
      }
    }
  }

  return Object.freeze(reconciled);
}

export async function applyPendingMigrations(params: {
  db: Queryable;
  migrations: readonly DatabaseMigration[];
}): Promise<readonly string[]> {
  await ensureSchemaMigrationsTable(params.db);

  const appliedMigrationFilenames = new Set(
    await getAppliedMigrationFilenames(params.db),
  );
  const pendingMigrations = params.migrations.filter(
    (migration) => !appliedMigrationFilenames.has(migration.filename),
  );

  if (pendingMigrations.length === 0) {
    return Object.freeze([]);
  }

  await params.db.query('BEGIN');

  try {
    for (const migration of pendingMigrations) {
      await params.db.query(migration.sql);
      await params.db.query(
        `
        INSERT INTO schema_migrations (filename)
        VALUES ($1)
        `,
        [migration.filename],
      );
    }

    await params.db.query('COMMIT');
    return Object.freeze(pendingMigrations.map((migration) => migration.filename));
  } catch (error) {
    await params.db.query('ROLLBACK').catch(() => undefined);
    throw error;
  }
}
