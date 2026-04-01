import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  applyPendingMigrations,
  compareMigrationFilenames,
  loadMigrationsFromDirectory,
  reconcileKnownMigrations,
} from '@/lib/server/db-migrations';

function createFakeMigrationDb(applied: string[] = []) {
  const state = {
    applied: [...applied],
    executedSql: [] as string[],
    inserted: [] as string[],
    began: 0,
    committed: 0,
    rolledBack: 0,
    tables: new Set<string>(),
    columns: new Set<string>(),
    indexes: new Set<string>(),
  };

  return {
    state,
    db: {
      async query<T>(text: string, params?: readonly unknown[]) {
        const sql = text.trim();

        if (sql === 'BEGIN') {
          state.began += 1;
          return { rows: [] as T[] };
        }

        if (sql === 'COMMIT') {
          state.committed += 1;
          return { rows: [] as T[] };
        }

        if (sql === 'ROLLBACK') {
          state.rolledBack += 1;
          return { rows: [] as T[] };
        }

        if (sql.startsWith('CREATE TABLE IF NOT EXISTS schema_migrations')) {
          return { rows: [] as T[] };
        }

        if (sql.startsWith('SELECT filename')) {
          return {
            rows: state.applied.map((filename) => ({ filename })) as T[],
          };
        }

        if (sql.startsWith('SELECT EXISTS (') && sql.includes('FROM information_schema.tables')) {
          const tableName = String(params?.[0] ?? '');
          return {
            rows: [{ present: state.tables.has(tableName) }] as T[],
          };
        }

        if (sql.startsWith('SELECT EXISTS (') && sql.includes('FROM information_schema.columns')) {
          const key = `${String(params?.[0] ?? '')}.${String(params?.[1] ?? '')}`;
          return {
            rows: [{ present: state.columns.has(key) }] as T[],
          };
        }

        if (sql.startsWith('SELECT EXISTS (') && sql.includes('FROM pg_indexes')) {
          const indexName = String(params?.[0] ?? '');
          return {
            rows: [{ present: state.indexes.has(indexName) }] as T[],
          };
        }

        if (sql.startsWith('INSERT INTO schema_migrations')) {
          const filename = String(params?.[0] ?? '');
          if (!state.applied.includes(filename)) {
            state.applied.push(filename);
            state.inserted.push(filename);
          }
          return { rows: [] as T[] };
        }

        state.executedSql.push(sql);
        return { rows: [] as T[] };
      },
    },
  };
}

test('compareMigrationFilenames sorts migration files deterministically', () => {
  assert.deepEqual(
    [
      '202604010001_assessment_version_language_tables.sql',
      '202603290001_option_version_key_scope.sql',
      '202603260001_mvp_canonical_schema.sql',
    ].sort(
      compareMigrationFilenames,
    ),
    [
      '202603260001_mvp_canonical_schema.sql',
      '202603290001_option_version_key_scope.sql',
      '202604010001_assessment_version_language_tables.sql',
    ],
  );
});

test('loadMigrationsFromDirectory loads sorted sql files only', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sonartra-migrations-'));
  await mkdir(join(root, 'nested'));
  await writeFile(join(root, '202604010001_assessment_version_language_tables.sql'), 'SELECT 3;');
  await writeFile(join(root, '202603290001_option_version_key_scope.sql'), 'SELECT 2;');
  await writeFile(join(root, '202603260001_mvp_canonical_schema.sql'), 'SELECT 1;');
  await writeFile(join(root, 'notes.txt'), 'ignored');

  const migrations = await loadMigrationsFromDirectory(root);

  assert.deepEqual(
    migrations.map((migration) => migration.filename),
    [
      '202603260001_mvp_canonical_schema.sql',
      '202603290001_option_version_key_scope.sql',
      '202604010001_assessment_version_language_tables.sql',
    ],
  );
  assert.equal(migrations[0]?.sql, 'SELECT 1;');
  assert.equal(migrations[1]?.sql, 'SELECT 2;');
  assert.equal(migrations[2]?.sql, 'SELECT 3;');
});

test('applyPendingMigrations runs pending migrations once and records them', async () => {
  const fake = createFakeMigrationDb(['202603260001_mvp_canonical_schema.sql']);

  const applied = await applyPendingMigrations({
    db: fake.db,
    migrations: [
      {
        filename: '202603260001_mvp_canonical_schema.sql',
        sql: 'SELECT 1;',
      },
      {
        filename: '202603290001_option_version_key_scope.sql',
        sql: 'ALTER TABLE options ADD COLUMN assessment_version_id UUID;',
      },
      {
        filename: '202604010001_assessment_version_language_tables.sql',
        sql: 'CREATE TABLE assessment_version_language_signals (id UUID);',
      },
    ],
  });

  assert.deepEqual(applied, [
    '202603290001_option_version_key_scope.sql',
    '202604010001_assessment_version_language_tables.sql',
  ]);
  assert.deepEqual(fake.state.executedSql, [
    'ALTER TABLE options ADD COLUMN assessment_version_id UUID;',
    'CREATE TABLE assessment_version_language_signals (id UUID);',
  ]);
  assert.deepEqual(fake.state.inserted, [
    '202603290001_option_version_key_scope.sql',
    '202604010001_assessment_version_language_tables.sql',
  ]);
  assert.equal(fake.state.began, 1);
  assert.equal(fake.state.committed, 1);
  assert.equal(fake.state.rolledBack, 0);
});

test('applyPendingMigrations is idempotent when all migrations are already recorded', async () => {
  const fake = createFakeMigrationDb([
    '202603260001_mvp_canonical_schema.sql',
    '202603290001_option_version_key_scope.sql',
    '202604010001_assessment_version_language_tables.sql',
  ]);

  const applied = await applyPendingMigrations({
    db: fake.db,
    migrations: [
      {
        filename: '202603260001_mvp_canonical_schema.sql',
        sql: 'SELECT 1;',
      },
      {
        filename: '202603290001_option_version_key_scope.sql',
        sql: 'SELECT 2;',
      },
      {
        filename: '202604010001_assessment_version_language_tables.sql',
        sql: 'SELECT 3;',
      },
    ],
  });

  assert.deepEqual(applied, []);
  assert.deepEqual(fake.state.executedSql, []);
  assert.equal(fake.state.began, 0);
  assert.equal(fake.state.committed, 0);
});

test('reconcileKnownMigrations records schema-compatible migrations that were applied outside the runner', async () => {
  const fake = createFakeMigrationDb();
  fake.state.tables = new Set([
    'assessments',
    'assessment_versions',
    'domains',
    'signals',
    'questions',
    'options',
    'assessment_version_language_signals',
    'assessment_version_language_pairs',
    'assessment_version_language_domains',
    'assessment_version_language_overview',
  ]);
  fake.state.columns = new Set(['options.assessment_version_id']);
  fake.state.indexes = new Set([
    'options_assessment_version_option_key_idx',
    'assessment_version_language_signals_version_idx',
    'assessment_version_language_pairs_version_idx',
    'assessment_version_language_domains_version_idx',
    'assessment_version_language_overview_version_idx',
  ]);

  const reconciled = await reconcileKnownMigrations({
    db: fake.db,
    migrations: [
      {
        filename: '202603260001_mvp_canonical_schema.sql',
        sql: 'SELECT 1;',
      },
      {
        filename: '202603290001_option_version_key_scope.sql',
        sql: 'SELECT 2;',
      },
      {
        filename: '202604010001_assessment_version_language_tables.sql',
        sql: 'SELECT 3;',
      },
    ],
  });

  assert.deepEqual(reconciled, [
    '202603260001_mvp_canonical_schema.sql',
    '202603290001_option_version_key_scope.sql',
    '202604010001_assessment_version_language_tables.sql',
  ]);
  assert.deepEqual(fake.state.inserted, [
    '202603260001_mvp_canonical_schema.sql',
    '202603290001_option_version_key_scope.sql',
    '202604010001_assessment_version_language_tables.sql',
  ]);
});
