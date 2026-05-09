import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { Pool, type PoolClient } from 'pg';

type CleanupMode = 'dry-run' | 'apply';
type CleanupTarget = 'local' | 'live';

type Queryable = {
  query<T = Record<string, unknown>>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

type TransactionClient = Queryable & {
  release?(): void;
};

type DbPool = {
  connect(): Promise<TransactionClient>;
  end?(): Promise<void>;
};

type CleanupOptions = {
  readonly mode: CleanupMode;
  readonly target: CleanupTarget;
  readonly assessmentKeys: readonly string[];
  readonly allowEmpty: boolean;
  readonly forceRankedPattern: boolean;
  readonly now: Date;
  readonly databaseUrl: string;
};

type CleanupTableName =
  | 'assessments'
  | 'assessment_versions'
  | 'domains'
  | 'signals'
  | 'questions'
  | 'options'
  | 'option_signal_weights'
  | 'attempts'
  | 'responses'
  | 'results'
  | 'assessment_import_batches'
  | 'assessment_import_files'
  | 'assessment_import_audit_items'
  | 'assessment_ranked_patterns'
  | 'assessment_score_shape_rules'
  | 'assessment_result_section_definitions'
  | 'assessment_result_language_rows'
  | 'assessment_report_preview_cases'
  | 'user_assessment_assignments'
  | 'voice_sessions'
  | 'voice_session_turns'
  | 'voice_response_resolutions'
  | 'voice_session_events';

type TablePlan = {
  readonly table: CleanupTableName;
  readonly required: boolean;
  readonly selectSql: string;
  readonly deleteSql: string;
  readonly params: (boundary: CleanupBoundary) => readonly unknown[];
};

type CleanupBoundary = {
  readonly requestedKeys: readonly string[];
  readonly assessmentIds: readonly string[];
  readonly assessmentVersionIds: readonly string[];
  readonly domainIds: readonly string[];
  readonly signalIds: readonly string[];
  readonly questionIds: readonly string[];
  readonly optionIds: readonly string[];
  readonly attemptIds: readonly string[];
  readonly importBatchIds: readonly string[];
  readonly sectionDefinitionIds: readonly string[];
  readonly voiceSessionIds: readonly string[];
};

type CleanupTableSummary = {
  readonly table: CleanupTableName;
  readonly exists: boolean;
  readonly rowCount: number;
  readonly deletedCount?: number;
};

type CleanupResult = {
  readonly mode: CleanupMode;
  readonly target: CleanupTarget;
  readonly database: string;
  readonly requestedKeys: readonly string[];
  readonly resolvedAssessments: readonly {
    readonly assessment_id: string;
    readonly assessment_key: string;
    readonly title: string;
  }[];
  readonly resolvedAssessmentVersions: readonly {
    readonly assessment_version_id: string;
    readonly assessment_id: string;
    readonly version: string;
    readonly lifecycle_status: string;
    readonly result_model_key: string | null;
  }[];
  readonly tableSummaries: readonly CleanupTableSummary[];
  readonly includesRuntimeData: boolean;
  readonly completedResultCount: number;
  readonly exportPath: string | null;
};

type TableRows = Record<string, readonly Record<string, unknown>[]>;

const protectedAssessmentKeys = new Set(['leadership-approach']);
const legacyDefaultKeys = new Set(['sonartra-leadership-approach', 'test']);

function usage(): string {
  return [
    'Usage: npx tsx scripts/database/remove-legacy-builder-assessments.ts [--dry-run|--apply] --target local|live --assessment-key <key> [--assessment-key <key>...] [--allow-empty] [--force-ranked-pattern]',
    'Default mode is --dry-run.',
    'Protected key leadership-approach is always refused.',
  ].join('\n');
}

function readFlagValue(argv: readonly string[], flag: string): string | null {
  const index = argv.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return argv[index + 1] ?? null;
}

function readRepeatedFlagValues(argv: readonly string[], flag: string): readonly string[] {
  const values: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === flag && argv[index + 1]) {
      values.push(argv[index + 1]);
      index += 1;
    }
  }
  return Object.freeze(values);
}

export function parseCleanupArgs(argv: readonly string[], env = process.env): CleanupOptions {
  const mode: CleanupMode = argv.includes('--apply') ? 'apply' : 'dry-run';
  const targetValue = readFlagValue(argv, '--target');
  const target = targetValue === 'local' || targetValue === 'live' ? targetValue : null;
  const assessmentKeys = readRepeatedFlagValues(argv, '--assessment-key')
    .map((key) => key.trim())
    .filter(Boolean);
  const databaseUrl = env.DATABASE_URL?.trim() ?? '';

  if (!target) {
    throw new Error(`TARGET_REQUIRED\n${usage()}`);
  }

  if (assessmentKeys.length === 0) {
    throw new Error(`ASSESSMENT_KEY_REQUIRED\n${usage()}`);
  }

  if (!databaseUrl) {
    throw new Error('DATABASE_URL_REQUIRED');
  }

  return Object.freeze({
    mode,
    target,
    assessmentKeys: Object.freeze([...new Set(assessmentKeys)]),
    allowEmpty: argv.includes('--allow-empty'),
    forceRankedPattern: argv.includes('--force-ranked-pattern'),
    now: new Date(),
    databaseUrl,
  });
}

export function redactDatabaseUrl(databaseUrl: string): string {
  try {
    const parsed = new URL(databaseUrl);
    if (parsed.password) {
      parsed.password = '***';
    }
    if (parsed.username) {
      parsed.username = parsed.username || '***';
    }
    return parsed.toString();
  } catch {
    return databaseUrl.replace(/\/\/([^:/?#]+):([^@]+)@/, '//$1:***@');
  }
}

function isLocalDatabaseUrl(databaseUrl: string): boolean {
  try {
    const parsed = new URL(databaseUrl);
    return ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function assertSafeOptions(options: CleanupOptions): void {
  const protectedKeys = options.assessmentKeys.filter((key) => protectedAssessmentKeys.has(key));
  if (protectedKeys.length > 0) {
    throw new Error(`PROTECTED_ASSESSMENT_KEY_REFUSED: ${protectedKeys.join(', ')}`);
  }

  if (options.target === 'local' && !isLocalDatabaseUrl(options.databaseUrl)) {
    throw new Error(
      `LOCAL_TARGET_DATABASE_URL_REFUSED: --target local requires a localhost database URL. Resolved ${redactDatabaseUrl(options.databaseUrl)}`,
    );
  }

  if (options.target === 'live' && isLocalDatabaseUrl(options.databaseUrl)) {
    throw new Error(
      `LIVE_TARGET_DATABASE_URL_REFUSED: --target live must not point at localhost. Resolved ${redactDatabaseUrl(options.databaseUrl)}`,
    );
  }
}

async function tableExists(db: Queryable, table: string): Promise<boolean> {
  const result = await db.query<{ exists: boolean }>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = $1
    ) AS exists
    `,
    [table],
  );
  return result.rows[0]?.exists === true;
}

function ids(rows: readonly Record<string, unknown>[], key: string): readonly string[] {
  return Object.freeze(
    rows
      .map((row) => row[key])
      .filter((value): value is string => typeof value === 'string' && value.length > 0),
  );
}

function timestampStamp(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    now.getUTCFullYear(),
    pad(now.getUTCMonth() + 1),
    pad(now.getUTCDate()),
    '-',
    pad(now.getUTCHours()),
    pad(now.getUTCMinutes()),
    pad(now.getUTCSeconds()),
  ].join('');
}

function exportPathFor(now: Date): string {
  return path.join(
    process.cwd(),
    'tmp',
    'legacy-builder-cleanup',
    `${timestampStamp(now)}-legacy-builder-assessments-export.json`,
  );
}

const assessmentSelectSql = `
  SELECT id AS assessment_id, assessment_key, title
  FROM assessments
  WHERE assessment_key = ANY($1::text[])
  ORDER BY assessment_key ASC
`;

const assessmentVersionsSelectSql = `
  SELECT
    id AS assessment_version_id,
    assessment_id,
    version,
    lifecycle_status,
    result_model_key
  FROM assessment_versions
  WHERE assessment_id = ANY($1::uuid[])
  ORDER BY assessment_id ASC, version ASC
`;

function buildTablePlans(): readonly TablePlan[] {
  return Object.freeze([
    {
      table: 'assessment_import_audit_items',
      required: false,
      selectSql: 'SELECT * FROM assessment_import_audit_items WHERE import_batch_id = ANY($1::uuid[]) ORDER BY id ASC',
      deleteSql: 'DELETE FROM assessment_import_audit_items WHERE import_batch_id = ANY($1::uuid[])',
      params: (boundary) => [boundary.importBatchIds],
    },
    {
      table: 'assessment_import_files',
      required: false,
      selectSql: 'SELECT * FROM assessment_import_files WHERE import_batch_id = ANY($1::uuid[]) ORDER BY id ASC',
      deleteSql: 'DELETE FROM assessment_import_files WHERE import_batch_id = ANY($1::uuid[])',
      params: (boundary) => [boundary.importBatchIds],
    },
    {
      table: 'assessment_import_batches',
      required: false,
      selectSql: 'SELECT * FROM assessment_import_batches WHERE assessment_id = ANY($1::uuid[]) OR assessment_version_id = ANY($2::uuid[]) ORDER BY id ASC',
      deleteSql: 'DELETE FROM assessment_import_batches WHERE assessment_id = ANY($1::uuid[]) OR assessment_version_id = ANY($2::uuid[])',
      params: (boundary) => [boundary.assessmentIds, boundary.assessmentVersionIds],
    },
    {
      table: 'voice_session_events',
      required: false,
      selectSql: 'SELECT * FROM voice_session_events WHERE voice_session_id = ANY($1::uuid[]) ORDER BY id ASC',
      deleteSql: 'DELETE FROM voice_session_events WHERE voice_session_id = ANY($1::uuid[])',
      params: (boundary) => [boundary.voiceSessionIds],
    },
    {
      table: 'voice_response_resolutions',
      required: false,
      selectSql: 'SELECT * FROM voice_response_resolutions WHERE voice_session_id = ANY($1::uuid[]) OR question_id = ANY($2::uuid[]) OR inferred_option_id = ANY($3::uuid[]) OR final_selected_option_id = ANY($3::uuid[]) ORDER BY id ASC',
      deleteSql: 'DELETE FROM voice_response_resolutions WHERE voice_session_id = ANY($1::uuid[]) OR question_id = ANY($2::uuid[]) OR inferred_option_id = ANY($3::uuid[]) OR final_selected_option_id = ANY($3::uuid[])',
      params: (boundary) => [boundary.voiceSessionIds, boundary.questionIds, boundary.optionIds],
    },
    {
      table: 'voice_session_turns',
      required: false,
      selectSql: 'SELECT * FROM voice_session_turns WHERE voice_session_id = ANY($1::uuid[]) OR question_id = ANY($2::uuid[]) ORDER BY id ASC',
      deleteSql: 'DELETE FROM voice_session_turns WHERE voice_session_id = ANY($1::uuid[]) OR question_id = ANY($2::uuid[])',
      params: (boundary) => [boundary.voiceSessionIds, boundary.questionIds],
    },
    {
      table: 'user_assessment_assignments',
      required: false,
      selectSql: 'SELECT * FROM user_assessment_assignments WHERE assessment_id = ANY($1::uuid[]) OR assessment_version_id = ANY($2::uuid[]) OR attempt_id = ANY($3::uuid[]) ORDER BY id ASC',
      deleteSql: 'DELETE FROM user_assessment_assignments WHERE assessment_id = ANY($1::uuid[]) OR assessment_version_id = ANY($2::uuid[]) OR attempt_id = ANY($3::uuid[])',
      params: (boundary) => [boundary.assessmentIds, boundary.assessmentVersionIds, boundary.attemptIds],
    },
    {
      table: 'results',
      required: true,
      selectSql: 'SELECT * FROM results WHERE attempt_id = ANY($1::uuid[]) OR assessment_id = ANY($2::uuid[]) OR assessment_version_id = ANY($3::uuid[]) ORDER BY id ASC',
      deleteSql: 'DELETE FROM results WHERE attempt_id = ANY($1::uuid[]) OR assessment_id = ANY($2::uuid[]) OR assessment_version_id = ANY($3::uuid[])',
      params: (boundary) => [boundary.attemptIds, boundary.assessmentIds, boundary.assessmentVersionIds],
    },
    {
      table: 'responses',
      required: true,
      selectSql: 'SELECT * FROM responses WHERE attempt_id = ANY($1::uuid[]) OR question_id = ANY($2::uuid[]) OR selected_option_id = ANY($3::uuid[]) ORDER BY id ASC',
      deleteSql: 'DELETE FROM responses WHERE attempt_id = ANY($1::uuid[]) OR question_id = ANY($2::uuid[]) OR selected_option_id = ANY($3::uuid[])',
      params: (boundary) => [boundary.attemptIds, boundary.questionIds, boundary.optionIds],
    },
    {
      table: 'voice_sessions',
      required: false,
      selectSql: 'SELECT * FROM voice_sessions WHERE attempt_id = ANY($1::uuid[]) OR assessment_id = ANY($2::uuid[]) OR assessment_version_id = ANY($3::uuid[]) ORDER BY id ASC',
      deleteSql: 'DELETE FROM voice_sessions WHERE attempt_id = ANY($1::uuid[]) OR assessment_id = ANY($2::uuid[]) OR assessment_version_id = ANY($3::uuid[])',
      params: (boundary) => [boundary.attemptIds, boundary.assessmentIds, boundary.assessmentVersionIds],
    },
    {
      table: 'attempts',
      required: true,
      selectSql: 'SELECT * FROM attempts WHERE assessment_id = ANY($1::uuid[]) OR assessment_version_id = ANY($2::uuid[]) ORDER BY id ASC',
      deleteSql: 'DELETE FROM attempts WHERE assessment_id = ANY($1::uuid[]) OR assessment_version_id = ANY($2::uuid[])',
      params: (boundary) => [boundary.assessmentIds, boundary.assessmentVersionIds],
    },
    {
      table: 'assessment_result_language_rows',
      required: false,
      selectSql: 'SELECT * FROM assessment_result_language_rows WHERE assessment_version_id = ANY($1::uuid[]) ORDER BY id ASC',
      deleteSql: 'DELETE FROM assessment_result_language_rows WHERE assessment_version_id = ANY($1::uuid[])',
      params: (boundary) => [boundary.assessmentVersionIds],
    },
    {
      table: 'assessment_result_section_definitions',
      required: false,
      selectSql: 'SELECT * FROM assessment_result_section_definitions WHERE assessment_version_id = ANY($1::uuid[]) ORDER BY id ASC',
      deleteSql: 'DELETE FROM assessment_result_section_definitions WHERE assessment_version_id = ANY($1::uuid[])',
      params: (boundary) => [boundary.assessmentVersionIds],
    },
    {
      table: 'assessment_report_preview_cases',
      required: false,
      selectSql: 'SELECT * FROM assessment_report_preview_cases WHERE assessment_version_id = ANY($1::uuid[]) ORDER BY id ASC',
      deleteSql: 'DELETE FROM assessment_report_preview_cases WHERE assessment_version_id = ANY($1::uuid[])',
      params: (boundary) => [boundary.assessmentVersionIds],
    },
    {
      table: 'assessment_score_shape_rules',
      required: false,
      selectSql: 'SELECT * FROM assessment_score_shape_rules WHERE assessment_version_id = ANY($1::uuid[]) ORDER BY id ASC',
      deleteSql: 'DELETE FROM assessment_score_shape_rules WHERE assessment_version_id = ANY($1::uuid[])',
      params: (boundary) => [boundary.assessmentVersionIds],
    },
    {
      table: 'assessment_ranked_patterns',
      required: false,
      selectSql: 'SELECT * FROM assessment_ranked_patterns WHERE assessment_version_id = ANY($1::uuid[]) ORDER BY id ASC',
      deleteSql: 'DELETE FROM assessment_ranked_patterns WHERE assessment_version_id = ANY($1::uuid[])',
      params: (boundary) => [boundary.assessmentVersionIds],
    },
    {
      table: 'option_signal_weights',
      required: true,
      selectSql: 'SELECT * FROM option_signal_weights WHERE option_id = ANY($1::uuid[]) OR signal_id = ANY($2::uuid[]) ORDER BY id ASC',
      deleteSql: 'DELETE FROM option_signal_weights WHERE option_id = ANY($1::uuid[]) OR signal_id = ANY($2::uuid[])',
      params: (boundary) => [boundary.optionIds, boundary.signalIds],
    },
    {
      table: 'options',
      required: true,
      selectSql: 'SELECT * FROM options WHERE question_id = ANY($1::uuid[]) ORDER BY id ASC',
      deleteSql: 'DELETE FROM options WHERE question_id = ANY($1::uuid[])',
      params: (boundary) => [boundary.questionIds],
    },
    {
      table: 'questions',
      required: true,
      selectSql: 'SELECT * FROM questions WHERE assessment_version_id = ANY($1::uuid[]) ORDER BY id ASC',
      deleteSql: 'DELETE FROM questions WHERE assessment_version_id = ANY($1::uuid[])',
      params: (boundary) => [boundary.assessmentVersionIds],
    },
    {
      table: 'signals',
      required: true,
      selectSql: 'SELECT * FROM signals WHERE assessment_version_id = ANY($1::uuid[]) ORDER BY id ASC',
      deleteSql: 'DELETE FROM signals WHERE assessment_version_id = ANY($1::uuid[])',
      params: (boundary) => [boundary.assessmentVersionIds],
    },
    {
      table: 'domains',
      required: true,
      selectSql: 'SELECT * FROM domains WHERE assessment_version_id = ANY($1::uuid[]) ORDER BY id ASC',
      deleteSql: 'DELETE FROM domains WHERE assessment_version_id = ANY($1::uuid[])',
      params: (boundary) => [boundary.assessmentVersionIds],
    },
    {
      table: 'assessment_versions',
      required: true,
      selectSql: assessmentVersionsSelectSql,
      deleteSql: 'DELETE FROM assessment_versions WHERE assessment_id = ANY($1::uuid[])',
      params: (boundary) => [boundary.assessmentIds],
    },
    {
      table: 'assessments',
      required: true,
      selectSql: 'SELECT * FROM assessments WHERE id = ANY($1::uuid[]) AND assessment_key = ANY($2::text[]) ORDER BY assessment_key ASC',
      deleteSql: 'DELETE FROM assessments WHERE id = ANY($1::uuid[]) AND assessment_key = ANY($2::text[])',
      params: (boundary) => [boundary.assessmentIds, boundary.requestedKeys],
    },
  ]);
}

async function selectRowsForPlan(
  db: Queryable,
  tablePlan: TablePlan,
  boundary: CleanupBoundary,
): Promise<readonly Record<string, unknown>[] | null> {
  if (!tablePlan.required && !(await tableExists(db, tablePlan.table))) {
    return null;
  }
  const result = await db.query<Record<string, unknown>>(tablePlan.selectSql, tablePlan.params(boundary));
  return Object.freeze(result.rows);
}

async function collectExportRows(
  db: Queryable,
  boundary: CleanupBoundary,
): Promise<{
  readonly rowsByTable: TableRows;
  readonly summaries: readonly CleanupTableSummary[];
}> {
  const rowsByTable: Record<string, readonly Record<string, unknown>[]> = {};
  const summaries: CleanupTableSummary[] = [];

  for (const tablePlan of buildTablePlans()) {
    const rows = await selectRowsForPlan(db, tablePlan, boundary);
    if (rows === null) {
      rowsByTable[tablePlan.table] = Object.freeze([]);
      summaries.push(Object.freeze({ table: tablePlan.table, exists: false, rowCount: 0 }));
      continue;
    }

    rowsByTable[tablePlan.table] = rows;
    summaries.push(Object.freeze({ table: tablePlan.table, exists: true, rowCount: rows.length }));
  }

  return Object.freeze({
    rowsByTable,
    summaries: Object.freeze(summaries),
  });
}

function assertResolvedKeysMatchRequest(params: {
  readonly requestedKeys: readonly string[];
  readonly resolvedRows: readonly { readonly assessment_key: string }[];
}): void {
  const requested = new Set(params.requestedKeys);
  const unexpected = params.resolvedRows
    .map((row) => row.assessment_key)
    .filter((key) => !requested.has(key));

  if (unexpected.length > 0) {
    throw new Error(`RESOLVED_UNREQUESTED_ASSESSMENT_KEYS: ${unexpected.join(', ')}`);
  }
}

function assertRankedPatternSafe(params: {
  readonly options: CleanupOptions;
  readonly versions: readonly { readonly result_model_key: string | null }[];
}): void {
  if (params.options.forceRankedPattern) {
    return;
  }

  const nonDefaultKeys = params.options.assessmentKeys.filter((key) => !legacyDefaultKeys.has(key));
  if (nonDefaultKeys.length > 0) {
    throw new Error(
      `NON_LEGACY_ASSESSMENT_KEY_REFUSED: ${nonDefaultKeys.join(', ')}. Use --force-ranked-pattern only after backup review.`,
    );
  }

  const rankedPatternVersionCount = params.versions.filter(
    (version) => version.result_model_key === 'ranked_pattern',
  ).length;
  if (rankedPatternVersionCount > 0) {
    throw new Error(
      `RANKED_PATTERN_VERSION_REFUSED: ${rankedPatternVersionCount} ranked-pattern version(s) matched. Use --force-ranked-pattern only after backup review.`,
    );
  }
}

async function resolveBoundary(
  db: Queryable,
  options: CleanupOptions,
): Promise<{
  readonly boundary: CleanupBoundary;
  readonly assessments: CleanupResult['resolvedAssessments'];
  readonly versions: CleanupResult['resolvedAssessmentVersions'];
  readonly voiceSessionRows: readonly Record<string, unknown>[];
}> {
  const assessments = (await db.query<CleanupResult['resolvedAssessments'][number]>(
    assessmentSelectSql,
    [options.assessmentKeys],
  )).rows;
  assertResolvedKeysMatchRequest({ requestedKeys: options.assessmentKeys, resolvedRows: assessments });

  const assessmentIds = ids(assessments, 'assessment_id');
  const versions = assessmentIds.length > 0
    ? (await db.query<CleanupResult['resolvedAssessmentVersions'][number]>(
        assessmentVersionsSelectSql,
        [assessmentIds],
      )).rows
    : [];
  assertRankedPatternSafe({ options, versions });

  const assessmentVersionIds = ids(versions, 'assessment_version_id');
  const domains = assessmentVersionIds.length > 0
    ? (await db.query<Record<string, unknown>>(
        'SELECT id AS domain_id FROM domains WHERE assessment_version_id = ANY($1::uuid[]) ORDER BY id ASC',
        [assessmentVersionIds],
      )).rows
    : [];
  const signals = assessmentVersionIds.length > 0
    ? (await db.query<Record<string, unknown>>(
        'SELECT id AS signal_id FROM signals WHERE assessment_version_id = ANY($1::uuid[]) ORDER BY id ASC',
        [assessmentVersionIds],
      )).rows
    : [];
  const questions = assessmentVersionIds.length > 0
    ? (await db.query<Record<string, unknown>>(
        'SELECT id AS question_id FROM questions WHERE assessment_version_id = ANY($1::uuid[]) ORDER BY id ASC',
        [assessmentVersionIds],
      )).rows
    : [];
  const questionIds = ids(questions, 'question_id');
  const optionsRows = questionIds.length > 0
    ? (await db.query<Record<string, unknown>>(
        'SELECT id AS option_id FROM options WHERE question_id = ANY($1::uuid[]) ORDER BY id ASC',
        [questionIds],
      )).rows
    : [];
  const attempts = assessmentIds.length > 0 || assessmentVersionIds.length > 0
    ? (await db.query<Record<string, unknown>>(
        'SELECT id AS attempt_id FROM attempts WHERE assessment_id = ANY($1::uuid[]) OR assessment_version_id = ANY($2::uuid[]) ORDER BY id ASC',
        [assessmentIds, assessmentVersionIds],
      )).rows
    : [];

  const importBatches = await maybeSelectRows(db, 'assessment_import_batches', 'id AS import_batch_id', 'assessment_id = ANY($1::uuid[]) OR assessment_version_id = ANY($2::uuid[])', [assessmentIds, assessmentVersionIds]);
  const sectionDefinitions = await maybeSelectRows(db, 'assessment_result_section_definitions', 'id AS section_definition_id', 'assessment_version_id = ANY($1::uuid[])', [assessmentVersionIds]);
  const voiceSessions = await maybeSelectRows(db, 'voice_sessions', 'id AS voice_session_id', 'attempt_id = ANY($1::uuid[]) OR assessment_id = ANY($2::uuid[]) OR assessment_version_id = ANY($3::uuid[])', [ids(attempts, 'attempt_id'), assessmentIds, assessmentVersionIds]);

  return Object.freeze({
    assessments: Object.freeze(assessments),
    versions: Object.freeze(versions),
    voiceSessionRows: Object.freeze(voiceSessions),
    boundary: Object.freeze({
      requestedKeys: options.assessmentKeys,
      assessmentIds,
      assessmentVersionIds,
      domainIds: ids(domains, 'domain_id'),
      signalIds: ids(signals, 'signal_id'),
      questionIds,
      optionIds: ids(optionsRows, 'option_id'),
      attemptIds: ids(attempts, 'attempt_id'),
      importBatchIds: ids(importBatches, 'import_batch_id'),
      sectionDefinitionIds: ids(sectionDefinitions, 'section_definition_id'),
      voiceSessionIds: ids(voiceSessions, 'voice_session_id'),
    }),
  });
}

async function maybeSelectRows(
  db: Queryable,
  tableName: CleanupTableName,
  columns: string,
  whereSql: string,
  params: readonly unknown[],
): Promise<readonly Record<string, unknown>[]> {
  if (!(await tableExists(db, tableName))) {
    return Object.freeze([]);
  }

  const result = await db.query<Record<string, unknown>>(
    `SELECT ${columns} FROM ${tableName} WHERE ${whereSql} ORDER BY id ASC`,
    params,
  );
  return Object.freeze(result.rows);
}

function writeExport(params: {
  readonly options: CleanupOptions;
  readonly rowsByTable: TableRows;
  readonly assessments: CleanupResult['resolvedAssessments'];
  readonly versions: CleanupResult['resolvedAssessmentVersions'];
}): string {
  const targetPath = exportPathFor(params.options.now);
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(
    targetPath,
    JSON.stringify(
      {
        exportedAt: params.options.now.toISOString(),
        mode: params.options.mode,
        target: params.options.target,
        database: redactDatabaseUrl(params.options.databaseUrl),
        requestedKeys: params.options.assessmentKeys,
        resolvedAssessments: params.assessments,
        resolvedAssessmentVersions: params.versions,
        rowsByTable: params.rowsByTable,
      },
      null,
      2,
    ),
    'utf8',
  );
  return targetPath;
}

async function deleteRows(
  client: TransactionClient,
  boundary: CleanupBoundary,
  summaries: readonly CleanupTableSummary[],
): Promise<readonly CleanupTableSummary[]> {
  const existingByTable = new Map(summaries.map((summary) => [summary.table, summary]));
  const deletedSummaries: CleanupTableSummary[] = [];

  for (const tablePlan of buildTablePlans()) {
    const summary = existingByTable.get(tablePlan.table);
    if (!summary?.exists) {
      deletedSummaries.push(Object.freeze({ table: tablePlan.table, exists: false, rowCount: 0, deletedCount: 0 }));
      continue;
    }
    const result = await client.query<Record<string, unknown>>(
      `${tablePlan.deleteSql} RETURNING id`,
      tablePlan.params(boundary),
    );
    deletedSummaries.push(Object.freeze({
      table: tablePlan.table,
      exists: true,
      rowCount: summary.rowCount,
      deletedCount: result.rows.length,
    }));
  }

  return Object.freeze(deletedSummaries);
}

export async function runLegacyBuilderAssessmentCleanup(
  options: CleanupOptions,
  dependencies: { readonly dbPool: DbPool },
): Promise<CleanupResult> {
  assertSafeOptions(options);
  const client = await dependencies.dbPool.connect();

  try {
    const resolved = await resolveBoundary(client, options);
    if (options.mode === 'apply' && resolved.assessments.length === 0 && !options.allowEmpty) {
      throw new Error('ZERO_ROW_APPLY_REFUSED');
    }

    const exportRows = await collectExportRows(client, resolved.boundary);
    const completedResultCount =
      exportRows.rowsByTable.results?.filter((row) => row.readiness_status === 'READY').length ?? 0;
    const includesRuntimeData =
      (exportRows.rowsByTable.attempts?.length ?? 0) > 0 ||
      (exportRows.rowsByTable.responses?.length ?? 0) > 0 ||
      (exportRows.rowsByTable.results?.length ?? 0) > 0;

    const exportPath = options.mode === 'apply'
      ? writeExport({
          options,
          rowsByTable: exportRows.rowsByTable,
          assessments: resolved.assessments,
          versions: resolved.versions,
        })
      : null;

    if (options.mode === 'dry-run') {
      return Object.freeze({
        mode: options.mode,
        target: options.target,
        database: redactDatabaseUrl(options.databaseUrl),
        requestedKeys: options.assessmentKeys,
        resolvedAssessments: resolved.assessments,
        resolvedAssessmentVersions: resolved.versions,
        tableSummaries: exportRows.summaries,
        includesRuntimeData,
        completedResultCount,
        exportPath,
      });
    }

    await client.query('BEGIN');
    try {
      const deletedSummaries = await deleteRows(client, resolved.boundary, exportRows.summaries);
      await client.query('COMMIT');
      return Object.freeze({
        mode: options.mode,
        target: options.target,
        database: redactDatabaseUrl(options.databaseUrl),
        requestedKeys: options.assessmentKeys,
        resolvedAssessments: resolved.assessments,
        resolvedAssessmentVersions: resolved.versions,
        tableSummaries: deletedSummaries,
        includesRuntimeData,
        completedResultCount,
        exportPath,
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    }
  } finally {
    client.release?.();
  }
}

function formatResult(result: CleanupResult): string {
  const lines = [
    'Legacy builder assessment cleanup',
    '',
    'Target',
    `- Mode: ${result.mode}`,
    `- Target: ${result.target}`,
    `- Database: ${result.database}`,
    `- Requested keys: ${result.requestedKeys.join(', ')}`,
    '',
    'Resolved assessments',
    ...(result.resolvedAssessments.length === 0
      ? ['- none']
      : result.resolvedAssessments.map(
          (assessment) => `- ${assessment.assessment_key}: ${assessment.assessment_id} (${assessment.title})`,
        )),
    '',
    'Resolved versions',
    ...(result.resolvedAssessmentVersions.length === 0
      ? ['- none']
      : result.resolvedAssessmentVersions.map(
          (version) =>
            `- ${version.version}: ${version.assessment_version_id} (${version.lifecycle_status}, result_model=${version.result_model_key ?? 'null'})`,
        )),
    '',
    'Runtime data',
    `- Includes attempts/responses/results: ${result.includesRuntimeData ? 'yes' : 'no'}`,
    `- Completed READY results included: ${result.completedResultCount}`,
    '',
    'Row counts by table',
    ...result.tableSummaries.map((summary) => {
      const suffix = summary.exists ? '' : ' (absent)';
      const deleted = summary.deletedCount === undefined ? '' : `, deleted ${summary.deletedCount}`;
      return `- ${summary.table}: ${summary.rowCount}${deleted}${suffix}`;
    }),
    '',
    'Backup export',
    `- ${result.exportPath ?? 'not written in dry-run mode'}`,
  ];

  return lines.join('\n');
}

export async function runLegacyBuilderAssessmentCleanupCli(argv: readonly string[]): Promise<number> {
  const options = parseCleanupArgs(argv);
  const pool = new Pool({ connectionString: options.databaseUrl });
  try {
    const result = await runLegacyBuilderAssessmentCleanup(options, { dbPool: pool });
    console.log(formatResult(result));
    return 0;
  } finally {
    await pool.end();
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';

if (import.meta.url === invokedPath) {
  runLegacyBuilderAssessmentCleanupCli(process.argv.slice(2))
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
