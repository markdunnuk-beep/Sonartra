import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
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
      '202604120002_assessment_mode.sql',
      '202604260001_pair_scoped_single_domain_driver_claims.sql',
      '202604290001_full_pattern_single_domain_application.sql',
      '202604120001_assessment_version_single_domain_language.sql',
      '202604080002_application_language_priority.sql',
      '202604080001_assessment_version_application_language.sql',
      '202604050001_assessment_version_hero_engine.sql',
      '202604040002_assessment_version_intro.sql',
      '202604040001_assessment_version_language_hero_headers.sql',
      '202604030001_assessment_language.sql',
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
      '202604030001_assessment_language.sql',
      '202604040001_assessment_version_language_hero_headers.sql',
      '202604040002_assessment_version_intro.sql',
      '202604050001_assessment_version_hero_engine.sql',
      '202604080001_assessment_version_application_language.sql',
      '202604080002_application_language_priority.sql',
      '202604120001_assessment_version_single_domain_language.sql',
      '202604120002_assessment_mode.sql',
      '202604260001_pair_scoped_single_domain_driver_claims.sql',
      '202604290001_full_pattern_single_domain_application.sql',
    ],
  );
});

test('loadMigrationsFromDirectory loads sorted sql files only', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sonartra-migrations-'));
  await mkdir(join(root, 'nested'));
  await writeFile(join(root, '202604030001_assessment_language.sql'), 'SELECT 4;');
  await writeFile(join(root, '202604040001_assessment_version_language_hero_headers.sql'), 'SELECT 5;');
  await writeFile(join(root, '202604040002_assessment_version_intro.sql'), 'SELECT 5;');
  await writeFile(join(root, '202604050001_assessment_version_hero_engine.sql'), 'SELECT 6;');
  await writeFile(join(root, '202604080001_assessment_version_application_language.sql'), 'SELECT 7;');
  await writeFile(join(root, '202604080002_application_language_priority.sql'), 'SELECT 8;');
  await writeFile(join(root, '202604120001_assessment_version_single_domain_language.sql'), 'SELECT 9;');
  await writeFile(join(root, '202604120002_assessment_mode.sql'), 'SELECT 10;');
  await writeFile(join(root, '202604260001_pair_scoped_single_domain_driver_claims.sql'), 'SELECT 11;');
  await writeFile(join(root, '202604290001_full_pattern_single_domain_application.sql'), 'SELECT 12;');
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
      '202604030001_assessment_language.sql',
      '202604040001_assessment_version_language_hero_headers.sql',
      '202604040002_assessment_version_intro.sql',
      '202604050001_assessment_version_hero_engine.sql',
      '202604080001_assessment_version_application_language.sql',
      '202604080002_application_language_priority.sql',
      '202604120001_assessment_version_single_domain_language.sql',
      '202604120002_assessment_mode.sql',
      '202604260001_pair_scoped_single_domain_driver_claims.sql',
      '202604290001_full_pattern_single_domain_application.sql',
    ],
  );
  assert.equal(migrations[0]?.sql, 'SELECT 1;');
  assert.equal(migrations[1]?.sql, 'SELECT 2;');
  assert.equal(migrations[2]?.sql, 'SELECT 3;');
  assert.equal(migrations[3]?.sql, 'SELECT 4;');
  assert.equal(migrations[4]?.sql, 'SELECT 5;');
  assert.equal(migrations[5]?.sql, 'SELECT 5;');
  assert.equal(migrations[6]?.sql, 'SELECT 6;');
  assert.equal(migrations[7]?.sql, 'SELECT 7;');
  assert.equal(migrations[8]?.sql, 'SELECT 8;');
  assert.equal(migrations[9]?.sql, 'SELECT 9;');
  assert.equal(migrations[10]?.sql, 'SELECT 10;');
  assert.equal(migrations[11]?.sql, 'SELECT 11;');
  assert.equal(migrations[12]?.sql, 'SELECT 12;');
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
      {
        filename: '202604030001_assessment_language.sql',
        sql: 'CREATE TABLE assessment_version_language_assessment (id UUID);',
      },
      {
        filename: '202604040001_assessment_version_language_hero_headers.sql',
        sql: 'CREATE TABLE assessment_version_language_hero_headers (id UUID);',
      },
      {
        filename: '202604040002_assessment_version_intro.sql',
        sql: 'CREATE TABLE assessment_version_intro (id UUID);',
      },
      {
        filename: '202604050001_assessment_version_hero_engine.sql',
        sql: 'CREATE TABLE assessment_version_pair_trait_weights (id UUID);',
      },
      {
        filename: '202604080001_assessment_version_application_language.sql',
        sql: 'CREATE TABLE assessment_version_application_thesis (id UUID);',
      },
      {
        filename: '202604080002_application_language_priority.sql',
        sql: 'ALTER TABLE assessment_version_application_contribution ADD COLUMN priority INTEGER;',
      },
      {
        filename: '202604120001_assessment_version_single_domain_language.sql',
        sql: 'CREATE TABLE assessment_version_single_domain_framing (id UUID);',
      },
      {
        filename: '202604120002_assessment_mode.sql',
        sql: 'ALTER TABLE assessments ADD COLUMN mode TEXT;',
      },
      {
        filename: '202604260001_pair_scoped_single_domain_driver_claims.sql',
        sql: 'CREATE TABLE assessment_version_single_domain_driver_claims (id UUID);',
      },
      {
        filename: '202604290001_full_pattern_single_domain_application.sql',
        sql: 'ALTER TABLE assessment_version_single_domain_application_statements ADD COLUMN pattern_key TEXT;',
      },
    ],
  });

  assert.deepEqual(applied, [
    '202603290001_option_version_key_scope.sql',
    '202604010001_assessment_version_language_tables.sql',
    '202604030001_assessment_language.sql',
    '202604040001_assessment_version_language_hero_headers.sql',
    '202604040002_assessment_version_intro.sql',
    '202604050001_assessment_version_hero_engine.sql',
    '202604080001_assessment_version_application_language.sql',
    '202604080002_application_language_priority.sql',
    '202604120001_assessment_version_single_domain_language.sql',
    '202604120002_assessment_mode.sql',
    '202604260001_pair_scoped_single_domain_driver_claims.sql',
    '202604290001_full_pattern_single_domain_application.sql',
  ]);
  assert.deepEqual(fake.state.executedSql, [
    'ALTER TABLE options ADD COLUMN assessment_version_id UUID;',
    'CREATE TABLE assessment_version_language_signals (id UUID);',
    'CREATE TABLE assessment_version_language_assessment (id UUID);',
    'CREATE TABLE assessment_version_language_hero_headers (id UUID);',
    'CREATE TABLE assessment_version_intro (id UUID);',
    'CREATE TABLE assessment_version_pair_trait_weights (id UUID);',
    'CREATE TABLE assessment_version_application_thesis (id UUID);',
    'ALTER TABLE assessment_version_application_contribution ADD COLUMN priority INTEGER;',
    'CREATE TABLE assessment_version_single_domain_framing (id UUID);',
    'ALTER TABLE assessments ADD COLUMN mode TEXT;',
    'CREATE TABLE assessment_version_single_domain_driver_claims (id UUID);',
    'ALTER TABLE assessment_version_single_domain_application_statements ADD COLUMN pattern_key TEXT;',
  ]);
  assert.deepEqual(fake.state.inserted, [
    '202603290001_option_version_key_scope.sql',
    '202604010001_assessment_version_language_tables.sql',
    '202604030001_assessment_language.sql',
    '202604040001_assessment_version_language_hero_headers.sql',
    '202604040002_assessment_version_intro.sql',
    '202604050001_assessment_version_hero_engine.sql',
    '202604080001_assessment_version_application_language.sql',
    '202604080002_application_language_priority.sql',
    '202604120001_assessment_version_single_domain_language.sql',
    '202604120002_assessment_mode.sql',
    '202604260001_pair_scoped_single_domain_driver_claims.sql',
    '202604290001_full_pattern_single_domain_application.sql',
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
    '202604030001_assessment_language.sql',
    '202604040001_assessment_version_language_hero_headers.sql',
    '202604040002_assessment_version_intro.sql',
    '202604050001_assessment_version_hero_engine.sql',
    '202604080001_assessment_version_application_language.sql',
    '202604080002_application_language_priority.sql',
    '202604120001_assessment_version_single_domain_language.sql',
    '202604120002_assessment_mode.sql',
    '202604260001_pair_scoped_single_domain_driver_claims.sql',
    '202604290001_full_pattern_single_domain_application.sql',
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
      {
        filename: '202604030001_assessment_language.sql',
        sql: 'SELECT 4;',
      },
      {
        filename: '202604040001_assessment_version_language_hero_headers.sql',
        sql: 'SELECT 5;',
      },
      {
        filename: '202604040002_assessment_version_intro.sql',
        sql: 'SELECT 6;',
      },
      {
        filename: '202604050001_assessment_version_hero_engine.sql',
        sql: 'SELECT 7;',
      },
      {
        filename: '202604080001_assessment_version_application_language.sql',
        sql: 'SELECT 8;',
      },
      {
        filename: '202604080002_application_language_priority.sql',
        sql: 'SELECT 9;',
      },
      {
        filename: '202604120001_assessment_version_single_domain_language.sql',
        sql: 'SELECT 10;',
      },
      {
        filename: '202604120002_assessment_mode.sql',
        sql: 'SELECT 11;',
      },
      {
        filename: '202604260001_pair_scoped_single_domain_driver_claims.sql',
        sql: 'SELECT 12;',
      },
      {
        filename: '202604290001_full_pattern_single_domain_application.sql',
        sql: 'SELECT 13;',
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
    'assessment_version_language_assessment',
    'assessment_version_language_hero_headers',
    'assessment_version_intro',
    'assessment_version_pair_trait_weights',
    'assessment_version_hero_pattern_rules',
    'assessment_version_hero_pattern_language',
    'assessment_version_application_thesis',
    'assessment_version_application_contribution',
    'assessment_version_application_risk',
    'assessment_version_application_development',
    'assessment_version_application_action_prompts',
    'assessment_version_single_domain_framing',
    'assessment_version_single_domain_hero_pairs',
    'assessment_version_single_domain_signal_chapters',
    'assessment_version_single_domain_balancing_sections',
    'assessment_version_single_domain_pair_summaries',
    'assessment_version_single_domain_application_statements',
    'assessment_version_single_domain_driver_claims',
  ]);
  fake.state.columns = new Set([
    'options.assessment_version_id',
    'assessment_version_application_contribution.priority',
    'assessment_version_application_risk.priority',
    'assessment_version_application_development.priority',
    'assessments.mode',
    'assessment_versions.mode',
    'assessment_version_single_domain_application_statements.domain_key',
    'assessment_version_single_domain_application_statements.pattern_key',
    'assessment_version_single_domain_application_statements.pair_key',
    'assessment_version_single_domain_application_statements.focus_area',
    'assessment_version_single_domain_application_statements.guidance_type',
    'assessment_version_single_domain_application_statements.driver_role',
    'assessment_version_single_domain_application_statements.priority',
    'assessment_version_single_domain_application_statements.guidance_text',
    'assessment_version_single_domain_application_statements.linked_claim_type',
  ]);
  fake.state.indexes = new Set([
    'options_assessment_version_option_key_idx',
    'assessment_version_language_signals_version_idx',
    'assessment_version_language_pairs_version_idx',
    'assessment_version_language_domains_version_idx',
    'assessment_version_language_overview_version_idx',
    'assessment_version_application_thesis_version_idx',
    'assessment_version_application_contribution_version_idx',
    'assessment_version_application_risk_version_idx',
    'assessment_version_application_development_version_idx',
    'assessment_version_application_action_prompts_version_idx',
    'assessment_version_single_domain_framing_version_idx',
    'assessment_version_single_domain_framing_version_domain_idx',
    'assessment_version_single_domain_hero_pairs_version_idx',
    'assessment_version_single_domain_hero_pairs_version_pair_idx',
    'assessment_version_single_domain_signal_chapters_version_idx',
    'avsd_signal_chapters_version_signal_idx',
    'assessment_version_single_domain_balancing_sections_version_idx',
    'avsd_balancing_sections_version_pair_idx',
    'assessment_version_single_domain_pair_summaries_version_idx',
    'avsd_pair_summaries_version_pair_idx',
    'avsd_application_statements_version_idx',
    'avsd_application_statements_version_signal_idx',
    'assessment_versions_assessment_mode_idx',
    'avsd_driver_claims_version_pair_signal_role_idx',
    'assessment_version_single_domain_application_full_pattern_key',
    'assessment_version_single_domain_application_pattern_lookup_idx',
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
      {
        filename: '202604030001_assessment_language.sql',
        sql: 'SELECT 4;',
      },
      {
        filename: '202604040001_assessment_version_language_hero_headers.sql',
        sql: 'SELECT 5;',
      },
      {
        filename: '202604040002_assessment_version_intro.sql',
        sql: 'SELECT 6;',
      },
      {
        filename: '202604050001_assessment_version_hero_engine.sql',
        sql: 'SELECT 7;',
      },
      {
        filename: '202604080001_assessment_version_application_language.sql',
        sql: 'SELECT 8;',
      },
      {
        filename: '202604080002_application_language_priority.sql',
        sql: 'SELECT 9;',
      },
      {
        filename: '202604120001_assessment_version_single_domain_language.sql',
        sql: 'SELECT 10;',
      },
      {
        filename: '202604120002_assessment_mode.sql',
        sql: 'SELECT 11;',
      },
      {
        filename: '202604260001_pair_scoped_single_domain_driver_claims.sql',
        sql: 'SELECT 12;',
      },
      {
        filename: '202604290001_full_pattern_single_domain_application.sql',
        sql: 'SELECT 13;',
      },
    ],
  });

  assert.deepEqual(reconciled, [
    '202603260001_mvp_canonical_schema.sql',
    '202603290001_option_version_key_scope.sql',
    '202604010001_assessment_version_language_tables.sql',
    '202604030001_assessment_language.sql',
    '202604040001_assessment_version_language_hero_headers.sql',
    '202604040002_assessment_version_intro.sql',
    '202604050001_assessment_version_hero_engine.sql',
    '202604080001_assessment_version_application_language.sql',
    '202604080002_application_language_priority.sql',
    '202604120001_assessment_version_single_domain_language.sql',
    '202604120002_assessment_mode.sql',
    '202604260001_pair_scoped_single_domain_driver_claims.sql',
    '202604290001_full_pattern_single_domain_application.sql',
  ]);
  assert.deepEqual(fake.state.inserted, [
    '202603260001_mvp_canonical_schema.sql',
    '202603290001_option_version_key_scope.sql',
    '202604010001_assessment_version_language_tables.sql',
    '202604030001_assessment_language.sql',
    '202604040001_assessment_version_language_hero_headers.sql',
    '202604040002_assessment_version_intro.sql',
    '202604050001_assessment_version_hero_engine.sql',
    '202604080001_assessment_version_application_language.sql',
    '202604080002_application_language_priority.sql',
    '202604120001_assessment_version_single_domain_language.sql',
    '202604120002_assessment_mode.sql',
    '202604260001_pair_scoped_single_domain_driver_claims.sql',
    '202604290001_full_pattern_single_domain_application.sql',
  ]);
});

test('single-domain language migration declares all six tables, unique constraints, and indexes', async () => {
  const sql = await readFile(
    join(process.cwd(), 'db', 'migrations', '202604120001_assessment_version_single_domain_language.sql'),
    'utf8',
  );

  assert.match(sql, /CREATE TABLE assessment_version_single_domain_framing/i);
  assert.match(sql, /CREATE TABLE assessment_version_single_domain_hero_pairs/i);
  assert.match(sql, /CREATE TABLE assessment_version_single_domain_signal_chapters/i);
  assert.match(sql, /CREATE TABLE assessment_version_single_domain_balancing_sections/i);
  assert.match(sql, /CREATE TABLE assessment_version_single_domain_pair_summaries/i);
  assert.match(sql, /CREATE TABLE assessment_version_single_domain_application_statements/i);

  assert.match(sql, /UNIQUE \(assessment_version_id, domain_key\)/i);
  assert.match(sql, /UNIQUE \(assessment_version_id, pair_key\)/i);
  assert.match(sql, /UNIQUE \(assessment_version_id, signal_key\)/i);

  assert.match(sql, /assessment_version_single_domain_framing_version_idx/i);
  assert.match(sql, /assessment_version_single_domain_hero_pairs_version_pair_idx/i);
  assert.match(sql, /avsd_signal_chapters_version_signal_idx/i);
  assert.match(sql, /avsd_balancing_sections_version_pair_idx/i);
  assert.match(sql, /avsd_pair_summaries_version_pair_idx/i);
  assert.match(sql, /avsd_application_statements_version_signal_idx/i);
});

test('pair-scoped single-domain driver claims migration declares table constraints and lookup index', async () => {
  const sql = await readFile(
    join(process.cwd(), 'db', 'migrations', '202604260001_pair_scoped_single_domain_driver_claims.sql'),
    'utf8',
  );

  assert.match(sql, /CREATE TABLE assessment_version_single_domain_driver_claims/i);
  assert.match(sql, /assessment_version_id UUID NOT NULL REFERENCES assessment_versions\(id\) ON DELETE CASCADE/i);
  assert.match(sql, /domain_key TEXT NOT NULL/i);
  assert.match(sql, /pair_key TEXT NOT NULL/i);
  assert.match(sql, /signal_key TEXT NOT NULL/i);
  assert.match(sql, /driver_role TEXT NOT NULL/i);
  assert.match(sql, /claim_type TEXT NOT NULL/i);
  assert.match(sql, /claim_text TEXT NOT NULL/i);
  assert.match(sql, /materiality TEXT NOT NULL/i);
  assert.match(sql, /priority INTEGER NOT NULL/i);
  assert.match(
    sql,
    /UNIQUE \(assessment_version_id, domain_key, pair_key, signal_key, driver_role, priority\)/i,
  );
  assert.match(sql, /driver_role IN \('primary_driver', 'secondary_driver', 'supporting_context', 'range_limitation'\)/i);
  assert.match(
    sql,
    /claim_type IN \('driver_primary', 'driver_secondary', 'driver_supporting_context', 'driver_range_limitation'\)/i,
  );
  assert.match(sql, /materiality IN \('core', 'supporting', 'material_underplay'\)/i);
  assert.match(sql, /CHECK \(priority > 0\)/i);
  assert.match(sql, /avsd_driver_claims_version_pair_signal_role_idx/i);
});

test('full-pattern single-domain application migration declares storage columns and deterministic key', async () => {
  const sql = await readFile(
    join(process.cwd(), 'db', 'migrations', '202604290001_full_pattern_single_domain_application.sql'),
    'utf8',
  );

  assert.match(sql, /ADD COLUMN IF NOT EXISTS domain_key TEXT/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS pattern_key TEXT/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS pair_key TEXT/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS focus_area TEXT/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS guidance_type TEXT/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS driver_role TEXT/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS priority INTEGER/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS guidance_text TEXT/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS linked_claim_type TEXT/i);
  assert.match(sql, /DROP CONSTRAINT IF EXISTS avsd_application_statements_unique_version_signal/i);
  assert.match(sql, /assessment_version_single_domain_application_full_pattern_required_fields_check/i);
  assert.match(sql, /assessment_version_single_domain_application_full_pattern_key/i);
  assert.match(
    sql,
    /assessment_version_id,\s*domain_key,\s*pattern_key,\s*focus_area,\s*guidance_type,\s*driver_role/is,
  );
  assert.match(sql, /assessment_version_single_domain_application_pattern_lookup_idx/i);
  assert.match(sql, /driver_role IN \(\s*'primary_driver',\s*'secondary_driver',\s*'supporting_context',\s*'range_limitation'/is);
});
