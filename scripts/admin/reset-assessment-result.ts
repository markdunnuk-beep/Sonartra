import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { Pool } from 'pg';

type ResetMode = 'dry-run' | 'export' | 'apply';

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

type ResetOptions = {
  readonly mode: ResetMode;
  readonly email: string;
  readonly userId: string | null;
  readonly assessmentKey: string;
  readonly expectedVersion: string;
  readonly confirmProductionReset: boolean;
  readonly now: Date;
  readonly databaseUrl: string;
};

type UserRow = {
  readonly user_id: string;
  readonly clerk_user_id: string;
  readonly email: string;
  readonly name: string | null;
  readonly role: string;
  readonly status: string;
};

type AssessmentRow = {
  readonly assessment_id: string;
  readonly assessment_key: string;
  readonly title: string;
  readonly description: string | null;
  readonly is_active: boolean;
};

type VersionRow = {
  readonly assessment_version_id: string;
  readonly assessment_id: string;
  readonly version: string;
  readonly lifecycle_status: string;
  readonly mode: string | null;
  readonly result_model_key: string | null;
  readonly published_at: string | null;
  readonly created_at: string;
};

type AttemptAuditRow = {
  readonly attempt_id: string;
  readonly assessment_version_id: string;
  readonly version: string;
  readonly lifecycle_status: string;
  readonly started_at: string;
  readonly submitted_at: string | null;
  readonly completed_at: string | null;
  readonly last_activity_at: string;
  readonly created_at: string;
  readonly updated_at: string;
};

type ResultAuditRow = {
  readonly result_id: string;
  readonly attempt_id: string;
  readonly assessment_version_id: string;
  readonly version: string;
  readonly pipeline_status: string;
  readonly readiness_status: string;
  readonly generated_at: string | null;
  readonly failure_reason: string | null;
  readonly has_canonical_result_payload: boolean;
  readonly created_at: string;
  readonly updated_at: string;
};

type AssignmentAuditRow = {
  readonly assignment_id: string;
  readonly attempt_id: string | null;
  readonly assessment_version_id: string;
  readonly version: string;
  readonly status: string;
  readonly order_index: number;
  readonly assigned_at: string | null;
  readonly started_at: string | null;
  readonly completed_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
};

type RuntimeGroup = {
  readonly assessmentVersionId: string;
  readonly version: string;
  readonly attemptStatus: string;
  readonly resultStatus: string;
  readonly attemptIds: readonly string[];
  readonly resultIds: readonly string[];
  readonly createdAt: string | null;
  readonly submittedAt: string | null;
  readonly completedAt: string | null;
};

type TableName =
  | 'voice_session_events'
  | 'voice_response_resolutions'
  | 'voice_session_turns'
  | 'voice_sessions'
  | 'user_assessment_assignments'
  | 'results'
  | 'responses'
  | 'attempts';

type TablePlan = {
  readonly table: TableName;
  readonly required: boolean;
  readonly selectSql: string;
  readonly deleteSql: string;
  readonly params: (boundary: RuntimeBoundary) => readonly unknown[];
};

type RuntimeBoundary = {
  readonly userId: string;
  readonly assessmentId: string;
  readonly assessmentVersionIds: readonly string[];
  readonly attemptIds: readonly string[];
  readonly voiceSessionIds: readonly string[];
};

type TableSummary = {
  readonly table: TableName;
  readonly exists: boolean;
  readonly rowCount: number;
  readonly deletedCount?: number;
};

type RowsByTable = Partial<Record<TableName, readonly Record<string, unknown>[]>>;

type ResetResult = {
  readonly mode: ResetMode;
  readonly database: string;
  readonly user: UserRow;
  readonly assessment: AssessmentRow;
  readonly publishedVersion: VersionRow;
  readonly attempts: readonly AttemptAuditRow[];
  readonly results: readonly ResultAuditRow[];
  readonly assignments: readonly AssignmentAuditRow[];
  readonly runtimeGroups: readonly RuntimeGroup[];
  readonly tableSummaries: readonly TableSummary[];
  readonly exportPath: string | null;
  readonly after?: {
    readonly attempts: number;
    readonly responses: number;
    readonly results: number;
    readonly assignments: number;
    readonly voiceSessions: number;
  };
};

type ResetAfterCounts = NonNullable<ResetResult['after']>;

function usage(): string {
  return [
    'Usage: npm run admin:reset-assessment-result -- --email <email> --assessment-key <key> [--expected-version 2.00] [--dry-run|--export|--apply] [--confirm-production-reset]',
    'Add --user-id <uuid> when the email resolves to more than one internal user row.',
    'Default mode is --dry-run.',
    'Apply mode always requires --confirm-production-reset.',
  ].join('\n');
}

function readFlagValue(argv: readonly string[], flag: string): string | null {
  const index = argv.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return argv[index + 1] ?? null;
}

function parseMode(argv: readonly string[]): ResetMode {
  const selected = [
    argv.includes('--dry-run') ? 'dry-run' : null,
    argv.includes('--export') ? 'export' : null,
    argv.includes('--apply') ? 'apply' : null,
  ].filter((mode): mode is ResetMode => mode !== null);

  if (selected.length > 1) {
    throw new Error(`RESET_MODE_AMBIGUOUS\n${usage()}`);
  }

  return selected[0] ?? 'dry-run';
}

export function parseResetArgs(argv: readonly string[], env = process.env): ResetOptions {
  const mode = parseMode(argv);
  const email = readFlagValue(argv, '--email')?.trim().toLowerCase() ?? '';
  const userId = readFlagValue(argv, '--user-id')?.trim() ?? null;
  const assessmentKey = readFlagValue(argv, '--assessment-key')?.trim() ?? '';
  const expectedVersion = readFlagValue(argv, '--expected-version')?.trim() ?? '2.00';
  const databaseUrl = env.DATABASE_URL?.trim() ?? '';

  if (!email) {
    throw new Error(`EMAIL_REQUIRED\n${usage()}`);
  }
  if (!assessmentKey) {
    throw new Error(`ASSESSMENT_KEY_REQUIRED\n${usage()}`);
  }
  if (!expectedVersion) {
    throw new Error(`EXPECTED_VERSION_REQUIRED\n${usage()}`);
  }
  if (!databaseUrl) {
    throw new Error('DATABASE_URL_REQUIRED');
  }
  if (mode === 'apply' && !argv.includes('--confirm-production-reset')) {
    throw new Error('CONFIRM_PRODUCTION_RESET_REQUIRED');
  }

  return Object.freeze({
    mode,
    email,
    userId,
    assessmentKey,
    expectedVersion,
    confirmProductionReset: argv.includes('--confirm-production-reset'),
    now: new Date(),
    databaseUrl,
  });
}

export function redactDatabaseUrl(databaseUrl: string): string {
  try {
    const parsed = new URL(databaseUrl);
    if (parsed.username) {
      parsed.username = '***';
    }
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    return databaseUrl.replace(/\/\/([^:/?#]+):([^@]+)@/, '//***:***@');
  }
}

function getPoolSsl(databaseUrl: string): false | { rejectUnauthorized: false } {
  try {
    const parsed = new URL(databaseUrl);
    if (['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)) {
      return false;
    }
  } catch {
    return { rejectUnauthorized: false };
  }
  return { rejectUnauthorized: false };
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

function exportPathFor(options: ResetOptions): string {
  return path.join(
    process.cwd(),
    'tmp',
    'assessment-result-reset',
    `${timestampStamp(options.now)}-${options.assessmentKey}-${options.email.replace(/[^a-z0-9._-]/gi, '_')}.json`,
  );
}

function ids(rows: readonly Record<string, unknown>[], key: string): readonly string[] {
  return Object.freeze(
    rows
      .map((row) => row[key])
      .filter((value): value is string => typeof value === 'string' && value.length > 0),
  );
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

async function maybeSelectRows(
  db: Queryable,
  tableName: TableName,
  selectSql: string,
  params: readonly unknown[],
): Promise<readonly Record<string, unknown>[] | null> {
  if (!(await tableExists(db, tableName))) {
    return null;
  }
  const result = await db.query<Record<string, unknown>>(selectSql, params);
  return Object.freeze(result.rows);
}

function buildTablePlans(): readonly TablePlan[] {
  return Object.freeze([
    {
      table: 'voice_session_events',
      required: false,
      selectSql: 'SELECT * FROM voice_session_events WHERE voice_session_id = ANY($1::uuid[]) ORDER BY id ASC',
      deleteSql: 'DELETE FROM voice_session_events WHERE voice_session_id = ANY($1::uuid[]) RETURNING id',
      params: (boundary) => [boundary.voiceSessionIds],
    },
    {
      table: 'voice_response_resolutions',
      required: false,
      selectSql: 'SELECT * FROM voice_response_resolutions WHERE voice_session_id = ANY($1::uuid[]) ORDER BY id ASC',
      deleteSql: 'DELETE FROM voice_response_resolutions WHERE voice_session_id = ANY($1::uuid[]) RETURNING id',
      params: (boundary) => [boundary.voiceSessionIds],
    },
    {
      table: 'voice_session_turns',
      required: false,
      selectSql: 'SELECT * FROM voice_session_turns WHERE voice_session_id = ANY($1::uuid[]) ORDER BY id ASC',
      deleteSql: 'DELETE FROM voice_session_turns WHERE voice_session_id = ANY($1::uuid[]) RETURNING id',
      params: (boundary) => [boundary.voiceSessionIds],
    },
    {
      table: 'voice_sessions',
      required: false,
      selectSql: 'SELECT * FROM voice_sessions WHERE user_id = $1::uuid AND assessment_id = $2::uuid ORDER BY id ASC',
      deleteSql: 'DELETE FROM voice_sessions WHERE user_id = $1::uuid AND assessment_id = $2::uuid RETURNING id',
      params: (boundary) => [boundary.userId, boundary.assessmentId],
    },
    {
      table: 'user_assessment_assignments',
      required: false,
      selectSql: 'SELECT * FROM user_assessment_assignments WHERE user_id = $1::uuid AND assessment_id = $2::uuid ORDER BY order_index ASC, id ASC',
      deleteSql: 'DELETE FROM user_assessment_assignments WHERE user_id = $1::uuid AND assessment_id = $2::uuid RETURNING id',
      params: (boundary) => [boundary.userId, boundary.assessmentId],
    },
    {
      table: 'results',
      required: true,
      selectSql: 'SELECT r.* FROM results r INNER JOIN attempts t ON t.id = r.attempt_id WHERE t.user_id = $1::uuid AND t.assessment_id = $2::uuid ORDER BY r.created_at ASC, r.id ASC',
      deleteSql: 'DELETE FROM results r USING attempts t WHERE t.id = r.attempt_id AND t.user_id = $1::uuid AND t.assessment_id = $2::uuid RETURNING r.id',
      params: (boundary) => [boundary.userId, boundary.assessmentId],
    },
    {
      table: 'responses',
      required: true,
      selectSql: 'SELECT resp.* FROM responses resp INNER JOIN attempts t ON t.id = resp.attempt_id WHERE t.user_id = $1::uuid AND t.assessment_id = $2::uuid ORDER BY resp.created_at ASC, resp.id ASC',
      deleteSql: 'DELETE FROM responses resp USING attempts t WHERE t.id = resp.attempt_id AND t.user_id = $1::uuid AND t.assessment_id = $2::uuid RETURNING resp.id',
      params: (boundary) => [boundary.userId, boundary.assessmentId],
    },
    {
      table: 'attempts',
      required: true,
      selectSql: 'SELECT * FROM attempts WHERE user_id = $1::uuid AND assessment_id = $2::uuid ORDER BY created_at ASC, id ASC',
      deleteSql: 'DELETE FROM attempts WHERE user_id = $1::uuid AND assessment_id = $2::uuid RETURNING id',
      params: (boundary) => [boundary.userId, boundary.assessmentId],
    },
  ]);
}

function summarizeUserRows(rows: readonly UserRow[]): string {
  return rows
    .map((row) => `${row.user_id} clerk=${row.clerk_user_id} role=${row.role} status=${row.status}`)
    .join('; ');
}

async function resolveUser(db: Queryable, options: Pick<ResetOptions, 'email' | 'userId'>): Promise<UserRow> {
  const result = await db.query<UserRow>(
    `
    SELECT
      id::text AS user_id,
      clerk_user_id,
      email,
      name,
      role,
      status
    FROM users
    WHERE lower(email) = lower($1)
      AND ($2::uuid IS NULL OR id = $2::uuid)
    ORDER BY created_at ASC, id ASC
    `,
    [options.email, options.userId],
  );

  if (result.rows.length === 0) {
    throw new Error(
      options.userId
        ? `USER_NOT_FOUND: ${options.email} with user_id ${options.userId}`
        : `USER_NOT_FOUND: ${options.email}`,
    );
  }
  if (result.rows.length > 1) {
    throw new Error(
      `USER_EMAIL_AMBIGUOUS: ${options.email} resolved ${result.rows.length} rows. Re-run with --user-id. Candidates: ${summarizeUserRows(result.rows)}`,
    );
  }
  return result.rows[0];
}

async function resolveAssessment(db: Queryable, assessmentKey: string): Promise<AssessmentRow> {
  const result = await db.query<AssessmentRow>(
    `
    SELECT
      id::text AS assessment_id,
      assessment_key,
      title,
      description,
      is_active
    FROM assessments
    WHERE assessment_key = $1
    `,
    [assessmentKey],
  );

  if (result.rows.length === 0) {
    throw new Error(`ASSESSMENT_NOT_FOUND: ${assessmentKey}`);
  }
  if (result.rows.length > 1) {
    throw new Error(`ASSESSMENT_KEY_AMBIGUOUS: ${assessmentKey} resolved ${result.rows.length} rows`);
  }
  return result.rows[0];
}

async function resolvePublishedVersion(
  db: Queryable,
  params: { assessmentId: string; expectedVersion: string },
): Promise<VersionRow> {
  const result = await db.query<VersionRow>(
    `
    SELECT
      id::text AS assessment_version_id,
      assessment_id::text AS assessment_id,
      version,
      lifecycle_status,
      mode,
      result_model_key,
      published_at,
      created_at
    FROM assessment_versions
    WHERE assessment_id = $1::uuid
      AND version = $2
      AND lifecycle_status = 'PUBLISHED'
    ORDER BY published_at DESC NULLS LAST, created_at DESC, id DESC
    `,
    [params.assessmentId, params.expectedVersion],
  );

  if (result.rows.length === 0) {
    throw new Error(`PUBLISHED_VERSION_NOT_FOUND: expected published version ${params.expectedVersion}`);
  }
  if (result.rows.length > 1) {
    throw new Error(`PUBLISHED_VERSION_AMBIGUOUS: expected ${params.expectedVersion} resolved ${result.rows.length} rows`);
  }
  return result.rows[0];
}

async function listAssessmentVersionIds(db: Queryable, assessmentId: string): Promise<readonly string[]> {
  const result = await db.query<{ assessment_version_id: string }>(
    `
    SELECT id::text AS assessment_version_id
    FROM assessment_versions
    WHERE assessment_id = $1::uuid
    ORDER BY created_at ASC, id ASC
    `,
    [assessmentId],
  );
  return Object.freeze(result.rows.map((row) => row.assessment_version_id));
}

async function listAttempts(db: Queryable, boundary: RuntimeBoundary): Promise<readonly AttemptAuditRow[]> {
  const result = await db.query<AttemptAuditRow>(
    `
    SELECT
      t.id::text AS attempt_id,
      t.assessment_version_id::text AS assessment_version_id,
      av.version,
      t.lifecycle_status,
      t.started_at,
      t.submitted_at,
      t.completed_at,
      t.last_activity_at,
      t.created_at,
      t.updated_at
    FROM attempts t
    INNER JOIN assessment_versions av ON av.id = t.assessment_version_id
    WHERE t.user_id = $1::uuid
      AND t.assessment_id = $2::uuid
    ORDER BY av.version ASC, t.created_at ASC, t.id ASC
    `,
    [boundary.userId, boundary.assessmentId],
  );
  return Object.freeze(result.rows);
}

async function listResults(db: Queryable, boundary: RuntimeBoundary): Promise<readonly ResultAuditRow[]> {
  const result = await db.query<ResultAuditRow>(
    `
    SELECT
      r.id::text AS result_id,
      r.attempt_id::text AS attempt_id,
      r.assessment_version_id::text AS assessment_version_id,
      av.version,
      r.pipeline_status,
      r.readiness_status,
      r.generated_at,
      r.failure_reason,
      r.canonical_result_payload IS NOT NULL AS has_canonical_result_payload,
      r.created_at,
      r.updated_at
    FROM results r
    INNER JOIN attempts t ON t.id = r.attempt_id
    INNER JOIN assessment_versions av ON av.id = r.assessment_version_id
    WHERE t.user_id = $1::uuid
      AND t.assessment_id = $2::uuid
    ORDER BY av.version ASC, r.created_at ASC, r.id ASC
    `,
    [boundary.userId, boundary.assessmentId],
  );
  return Object.freeze(result.rows);
}

async function listAssignments(db: Queryable, boundary: RuntimeBoundary): Promise<readonly AssignmentAuditRow[]> {
  if (!(await tableExists(db, 'user_assessment_assignments'))) {
    return Object.freeze([]);
  }
  const result = await db.query<AssignmentAuditRow>(
    `
    SELECT
      ua.id::text AS assignment_id,
      ua.attempt_id::text AS attempt_id,
      ua.assessment_version_id::text AS assessment_version_id,
      av.version,
      ua.status,
      ua.order_index,
      ua.assigned_at,
      ua.started_at,
      ua.completed_at,
      ua.created_at,
      ua.updated_at
    FROM user_assessment_assignments ua
    INNER JOIN assessment_versions av ON av.id = ua.assessment_version_id
    WHERE ua.user_id = $1::uuid
      AND ua.assessment_id = $2::uuid
    ORDER BY ua.order_index ASC, ua.created_at ASC, ua.id ASC
    `,
    [boundary.userId, boundary.assessmentId],
  );
  return Object.freeze(result.rows);
}

async function listVoiceSessionIds(db: Queryable, boundary: Omit<RuntimeBoundary, 'voiceSessionIds'>): Promise<readonly string[]> {
  if (!(await tableExists(db, 'voice_sessions'))) {
    return Object.freeze([]);
  }
  const result = await db.query<{ voice_session_id: string }>(
    `
    SELECT id::text AS voice_session_id
    FROM voice_sessions
    WHERE user_id = $1::uuid
      AND assessment_id = $2::uuid
    ORDER BY created_at ASC, id ASC
    `,
    [boundary.userId, boundary.assessmentId],
  );
  return Object.freeze(result.rows.map((row) => row.voice_session_id));
}

function buildRuntimeGroups(
  attempts: readonly AttemptAuditRow[],
  results: readonly ResultAuditRow[],
): readonly RuntimeGroup[] {
  const resultsByAttemptId = new Map(results.map((result) => [result.attempt_id, result]));
  return Object.freeze(
    attempts.map((attempt) => {
      const result = resultsByAttemptId.get(attempt.attempt_id);
      return {
        assessmentVersionId: attempt.assessment_version_id,
        version: attempt.version,
        attemptStatus: attempt.lifecycle_status,
        resultStatus: result?.readiness_status ?? 'none',
        attemptIds: Object.freeze([attempt.attempt_id]),
        resultIds: Object.freeze(result ? [result.result_id] : []),
        createdAt: attempt.created_at,
        submittedAt: attempt.submitted_at,
        completedAt: attempt.completed_at,
      };
    }),
  );
}

async function collectRows(
  db: Queryable,
  boundary: RuntimeBoundary,
): Promise<{ readonly rowsByTable: RowsByTable; readonly summaries: readonly TableSummary[] }> {
  const rowsByTable: RowsByTable = {};
  const summaries: TableSummary[] = [];

  for (const plan of buildTablePlans()) {
    const rows = plan.required
      ? (await db.query<Record<string, unknown>>(plan.selectSql, plan.params(boundary))).rows
      : await maybeSelectRows(db, plan.table, plan.selectSql, plan.params(boundary));

    if (rows === null) {
      rowsByTable[plan.table] = Object.freeze([]);
      summaries.push(Object.freeze({ table: plan.table, exists: false, rowCount: 0 }));
      continue;
    }

    const frozenRows = Object.freeze(rows);
    rowsByTable[plan.table] = frozenRows;
    summaries.push(Object.freeze({ table: plan.table, exists: true, rowCount: frozenRows.length }));
  }

  return Object.freeze({
    rowsByTable: Object.freeze(rowsByTable),
    summaries: Object.freeze(summaries),
  });
}

function writeExport(params: {
  readonly options: ResetOptions;
  readonly result: Omit<ResetResult, 'exportPath' | 'after'>;
  readonly rowsByTable: RowsByTable;
}): string {
  const targetPath = exportPathFor(params.options);
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(
    targetPath,
    JSON.stringify(
      {
        exportedAt: params.options.now.toISOString(),
        mode: params.options.mode,
        database: redactDatabaseUrl(params.options.databaseUrl),
        user: params.result.user,
        assessment: params.result.assessment,
        publishedVersion: params.result.publishedVersion,
        attempts: params.result.attempts,
        results: params.result.results,
        assignments: params.result.assignments,
        runtimeGroups: params.result.runtimeGroups,
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
  boundary: RuntimeBoundary,
  summaries: readonly TableSummary[],
): Promise<readonly TableSummary[]> {
  const existingByTable = new Map(summaries.map((summary) => [summary.table, summary]));
  const deleted: TableSummary[] = [];

  for (const plan of buildTablePlans()) {
    const summary = existingByTable.get(plan.table);
    if (!summary?.exists) {
      deleted.push(Object.freeze({ table: plan.table, exists: false, rowCount: 0, deletedCount: 0 }));
      continue;
    }

    const result = await client.query<Record<string, unknown>>(plan.deleteSql, plan.params(boundary));
    deleted.push(Object.freeze({
      table: plan.table,
      exists: true,
      rowCount: summary.rowCount,
      deletedCount: result.rows.length,
    }));
  }

  return Object.freeze(deleted);
}

async function countAfter(db: Queryable, boundary: RuntimeBoundary): Promise<ResetAfterCounts> {
  const attempts = await db.query<{ count: string | number }>(
    'SELECT COUNT(*) AS count FROM attempts WHERE user_id = $1::uuid AND assessment_id = $2::uuid',
    [boundary.userId, boundary.assessmentId],
  );
  const responses = await db.query<{ count: string | number }>(
    'SELECT COUNT(*) AS count FROM responses resp INNER JOIN attempts t ON t.id = resp.attempt_id WHERE t.user_id = $1::uuid AND t.assessment_id = $2::uuid',
    [boundary.userId, boundary.assessmentId],
  );
  const results = await db.query<{ count: string | number }>(
    'SELECT COUNT(*) AS count FROM results r INNER JOIN attempts t ON t.id = r.attempt_id WHERE t.user_id = $1::uuid AND t.assessment_id = $2::uuid',
    [boundary.userId, boundary.assessmentId],
  );
  const assignments = (await tableExists(db, 'user_assessment_assignments'))
    ? await db.query<{ count: string | number }>(
        'SELECT COUNT(*) AS count FROM user_assessment_assignments WHERE user_id = $1::uuid AND assessment_id = $2::uuid',
        [boundary.userId, boundary.assessmentId],
      )
    : { rows: [{ count: 0 }] };
  const voiceSessions = (await tableExists(db, 'voice_sessions'))
    ? await db.query<{ count: string | number }>(
        'SELECT COUNT(*) AS count FROM voice_sessions WHERE user_id = $1::uuid AND assessment_id = $2::uuid',
        [boundary.userId, boundary.assessmentId],
      )
    : { rows: [{ count: 0 }] };

  return {
    attempts: Number(attempts.rows[0]?.count ?? 0),
    responses: Number(responses.rows[0]?.count ?? 0),
    results: Number(results.rows[0]?.count ?? 0),
    assignments: Number(assignments.rows[0]?.count ?? 0),
    voiceSessions: Number(voiceSessions.rows[0]?.count ?? 0),
  };
}

function assertBoundary(params: {
  readonly options: ResetOptions;
  readonly user: UserRow;
  readonly assessment: AssessmentRow;
  readonly publishedVersion: VersionRow;
}): void {
  if (params.options.mode === 'apply' && !params.options.confirmProductionReset) {
    throw new Error('CONFIRM_PRODUCTION_RESET_REQUIRED');
  }
  if (params.user.email.toLowerCase() !== params.options.email.toLowerCase()) {
    throw new Error(`USER_BOUNDARY_MISMATCH: expected ${params.options.email} resolved ${params.user.email}`);
  }
  if (params.assessment.assessment_key !== params.options.assessmentKey) {
    throw new Error(
      `ASSESSMENT_BOUNDARY_MISMATCH: expected ${params.options.assessmentKey} resolved ${params.assessment.assessment_key}`,
    );
  }
  if (params.publishedVersion.version !== params.options.expectedVersion) {
    throw new Error(
      `VERSION_BOUNDARY_MISMATCH: expected ${params.options.expectedVersion} resolved ${params.publishedVersion.version}`,
    );
  }
  if (params.publishedVersion.lifecycle_status !== 'PUBLISHED') {
    throw new Error(`PUBLISHED_VERSION_NOT_LIVE: ${params.publishedVersion.lifecycle_status}`);
  }
}

async function resolveBoundary(
  db: Queryable,
  options: ResetOptions,
): Promise<{
  readonly user: UserRow;
  readonly assessment: AssessmentRow;
  readonly publishedVersion: VersionRow;
  readonly boundary: RuntimeBoundary;
}> {
  const user = await resolveUser(db, options);
  const assessment = await resolveAssessment(db, options.assessmentKey);
  const publishedVersion = await resolvePublishedVersion(db, {
    assessmentId: assessment.assessment_id,
    expectedVersion: options.expectedVersion,
  });
  assertBoundary({ options, user, assessment, publishedVersion });

  const assessmentVersionIds = await listAssessmentVersionIds(db, assessment.assessment_id);
  const attemptRows = await db.query<{ attempt_id: string }>(
    `
    SELECT id::text AS attempt_id
    FROM attempts
    WHERE user_id = $1::uuid
      AND assessment_id = $2::uuid
    ORDER BY created_at ASC, id ASC
    `,
    [user.user_id, assessment.assessment_id],
  );
  const partialBoundary = {
    userId: user.user_id,
    assessmentId: assessment.assessment_id,
    assessmentVersionIds,
    attemptIds: Object.freeze(attemptRows.rows.map((row) => row.attempt_id)),
  };
  const voiceSessionIds = await listVoiceSessionIds(db, partialBoundary);

  return Object.freeze({
    user,
    assessment,
    publishedVersion,
    boundary: Object.freeze({
      ...partialBoundary,
      voiceSessionIds,
    }),
  });
}

export async function runAssessmentResultReset(
  options: ResetOptions,
  dependencies: { readonly dbPool: DbPool },
): Promise<ResetResult> {
  const client = await dependencies.dbPool.connect();
  try {
    const resolved = await resolveBoundary(client, options);
    const attempts = await listAttempts(client, resolved.boundary);
    const results = await listResults(client, resolved.boundary);
    const assignments = await listAssignments(client, resolved.boundary);
    const collectedRows = await collectRows(client, resolved.boundary);
    const runtimeGroups = buildRuntimeGroups(attempts, results);
    const baseResult = Object.freeze({
      mode: options.mode,
      database: redactDatabaseUrl(options.databaseUrl),
      user: resolved.user,
      assessment: resolved.assessment,
      publishedVersion: resolved.publishedVersion,
      attempts,
      results,
      assignments,
      runtimeGroups,
      tableSummaries: collectedRows.summaries,
    });
    const exportPath = options.mode === 'export' || options.mode === 'apply'
      ? writeExport({
          options,
          result: baseResult,
          rowsByTable: collectedRows.rowsByTable,
        })
      : null;

    if (options.mode !== 'apply') {
      return Object.freeze({
        ...baseResult,
        exportPath,
      });
    }

    await client.query('BEGIN');
    try {
      const deletedSummaries = await deleteRows(client, resolved.boundary, collectedRows.summaries);
      const after = await countAfter(client, resolved.boundary);
      if (after.attempts !== 0 || after.responses !== 0 || after.results !== 0 || after.assignments !== 0 || after.voiceSessions !== 0) {
        throw new Error(`POST_RESET_ROWS_REMAIN: ${JSON.stringify(after)}`);
      }
      await client.query('COMMIT');
      return Object.freeze({
        ...baseResult,
        tableSummaries: deletedSummaries,
        exportPath,
        after,
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    }
  } finally {
    client.release?.();
  }
}

function formatResult(result: ResetResult): string {
  const total = (table: TableName): number =>
    result.tableSummaries.find((summary) => summary.table === table)?.rowCount ?? 0;
  const deleted = (table: TableName): number | null =>
    result.tableSummaries.find((summary) => summary.table === table)?.deletedCount ?? null;
  const formatCount = (table: TableName): string => {
    const deletedCount = deleted(table);
    return deletedCount === null ? String(total(table)) : `${total(table)} (deleted ${deletedCount})`;
  };

  const lines = [
    'Assessment result reset audit',
    '',
    'Target',
    `- Mode: ${result.mode}`,
    `- Database: ${result.database}`,
    `- User: ${result.user.email} (${result.user.user_id})`,
    `- Assessment: ${result.assessment.assessment_key} (${result.assessment.assessment_id})`,
    `- Published version: ${result.publishedVersion.version} (${result.publishedVersion.assessment_version_id}, ${result.publishedVersion.lifecycle_status})`,
    `- Published version mode/result model: ${result.publishedVersion.mode ?? 'null'} / ${result.publishedVersion.result_model_key ?? 'null'}`,
    '',
    'Runtime rows in scope',
    `- attempts: ${formatCount('attempts')}`,
    `- responses: ${formatCount('responses')}`,
    `- results: ${formatCount('results')}`,
    `- user_assessment_assignments: ${formatCount('user_assessment_assignments')}`,
    `- voice_sessions: ${formatCount('voice_sessions')}`,
    '',
    'Attempt/result groups',
    ...(result.runtimeGroups.length === 0
      ? ['- none']
      : result.runtimeGroups.map(
          (group) =>
            `- version ${group.version} (${group.assessmentVersionId}): attempt ${group.attemptStatus}, result ${group.resultStatus}, attempts ${group.attemptIds.join(', ')}, results ${group.resultIds.join(', ') || 'none'}, created ${group.createdAt ?? 'null'}, submitted ${group.submittedAt ?? 'null'}, completed ${group.completedAt ?? 'null'}`,
        )),
    '',
    'Assignments',
    ...(result.assignments.length === 0
      ? ['- none']
      : result.assignments.map(
          (assignment) =>
            `- version ${assignment.version}: ${assignment.status}, order ${assignment.order_index}, assignment ${assignment.assignment_id}, attempt ${assignment.attempt_id ?? 'none'}, assigned ${assignment.assigned_at ?? 'null'}, started ${assignment.started_at ?? 'null'}, completed ${assignment.completed_at ?? 'null'}`,
        )),
    '',
    'Export',
    `- ${result.exportPath ?? 'not written in dry-run mode'}`,
  ];

  if (result.after) {
    lines.push(
      '',
      'Post-reset remaining rows',
      `- attempts: ${result.after.attempts}`,
      `- responses: ${result.after.responses}`,
      `- results: ${result.after.results}`,
      `- user_assessment_assignments: ${result.after.assignments}`,
      `- voice_sessions: ${result.after.voiceSessions}`,
    );
  }

  return lines.join('\n');
}

export async function runAssessmentResultResetCli(argv: readonly string[]): Promise<number> {
  const options = parseResetArgs(argv);
  const pool = new Pool({
    connectionString: options.databaseUrl,
    ssl: getPoolSsl(options.databaseUrl),
  });
  try {
    const result = await runAssessmentResultReset(options, { dbPool: pool });
    console.log(formatResult(result));
    return 0;
  } finally {
    await pool.end();
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';

if (import.meta.url === invokedPath) {
  runAssessmentResultResetCli(process.argv.slice(2))
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
