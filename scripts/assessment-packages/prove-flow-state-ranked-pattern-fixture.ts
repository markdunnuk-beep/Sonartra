import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { auditRankedPatternWorkbookFile } from '@/content/assessment-packages/import-contract/ranked-pattern-package-audit';
import {
  persistRankedPatternResultLanguage,
  persistRankedPatternRuntimeDefinition,
} from '@/content/assessment-packages/import-contract/ranked-pattern-import-persistence';
import type { RankedPatternImportDiagnostic } from '@/content/assessment-packages/import-contract/ranked-pattern-import-validation';
import { auditRankedPatternAssessmentVersion } from '@/content/assessment-packages/import-contract/ranked-pattern-publish-audit';
import { createAssessmentCompletionService } from '@/lib/server/assessment-completion-service';
import { buildAssessmentWorkspaceViewModel } from '@/lib/server/dashboard-workspace-view-model';
import { getDbPool } from '@/lib/server/db';
import { createResultReadModelService } from '@/lib/server/result-read-model';

export const FLOW_STATE_WORKBOOK_PATH = path.resolve(
  'content/assessment-packages/flow-state/sonartra_reader_first_import_schema_FLOW_STATE_EXAMPLE.xlsx',
);

export const FLOW_STATE_FIXTURE_USER = Object.freeze({
  id: '00000000-0000-4000-8000-000000000701',
  clerkUserId: 'flow-state-ranked-pattern-fixture',
  email: 'flow-state-fixture@sonartra.local',
  name: 'Flow State Fixture User',
});

export const FLOW_STATE_FIXTURE_ATTEMPT_ID = '00000000-0000-4000-8000-000000000702';
export const FLOW_STATE_FIXTURE_ASSIGNMENT_ID = '00000000-0000-4000-8000-000000000703';

export const FLOW_STATE_REQUIRED_PAYLOAD_SECTIONS = Object.freeze([
  'metadata',
  'assessment',
  'attempt',
  'domain',
  'topSignal',
  'rankedSignals',
  'normalizedScores',
  'scoreShape',
  'patternKey',
  'context',
  'orientation',
  'recognition',
  'signalRoles',
  'patternMechanics',
  'patternSynthesis',
  'strengths',
  'narrowing',
  'application',
  'closingIntegration',
  'diagnostics',
] as const);

export type FlowStateFixtureProofArgs = {
  readonly local: boolean;
  readonly allowLocalDbWrite: boolean;
  readonly workbookPath: string;
};

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<{ rows: readonly T[] }>;
};

type AssessmentVersionRow = {
  readonly assessment_id: string;
  readonly assessment_version_id: string;
  readonly assessment_key: string;
  readonly assessment_title: string;
  readonly version: string;
};

type OptionSelectionRow = {
  readonly question_id: string;
  readonly option_id: string;
  readonly question_order_index: number;
};

type UserRow = {
  readonly id: string;
};

type ResultPayloadRow = {
  readonly canonical_result_payload: unknown;
};

function usage(): string {
  return [
    'Usage: npm run prove:flow-state-ranked-pattern -- --local --allow-local-db-write',
    '',
    'Optional:',
    '  --workbook <path-to-xlsx>',
  ].join('\n');
}

export function parseFlowStateFixtureProofArgs(argv: readonly string[]): FlowStateFixtureProofArgs {
  const workbookIndex = argv.indexOf('--workbook');
  const workbookPath = workbookIndex >= 0 && argv[workbookIndex + 1]
    ? path.resolve(argv[workbookIndex + 1]!)
    : FLOW_STATE_WORKBOOK_PATH;

  return Object.freeze({
    local: argv.includes('--local'),
    allowLocalDbWrite: argv.includes('--allow-local-db-write'),
    workbookPath,
  });
}

function isLocalDatabaseUrl(databaseUrl: string): boolean {
  try {
    const url = new URL(databaseUrl);
    return ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
}

export function assertFlowStateFixtureProofEnvironment(
  env: NodeJS.ProcessEnv,
  args: FlowStateFixtureProofArgs,
): void {
  if (!args.local || !args.allowLocalDbWrite) {
    throw new Error('Flow State fixture proof requires --local and --allow-local-db-write.');
  }

  if (env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production') {
    throw new Error('Refusing to run the Flow State fixture proof in a production environment.');
  }

  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set in .env.local.');
  }

  if (!isLocalDatabaseUrl(databaseUrl)) {
    throw new Error('Flow State fixture proof only writes to a localhost database.');
  }
}

function sourceHash(sourcePath: string): string {
  return createHash('sha256').update(readFileSync(sourcePath)).digest('hex');
}

function hasBlockingDiagnostics(diagnostics: readonly RankedPatternImportDiagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === 'error');
}

function formatDiagnostic(diagnostic: RankedPatternImportDiagnostic): string {
  const location = [
    diagnostic.sheetKey,
    diagnostic.rowNumber === undefined ? null : `row ${diagnostic.rowNumber}`,
    diagnostic.fieldKey,
  ].filter(Boolean).join(' / ');
  return `[${diagnostic.code}] ${location ? `${location}: ` : ''}${diagnostic.message}`;
}

function assertNoBlockingDiagnostics(
  label: string,
  diagnostics: readonly RankedPatternImportDiagnostic[],
): void {
  if (!hasBlockingDiagnostics(diagnostics)) {
    return;
  }

  throw new Error([
    `${label} has blocking diagnostics:`,
    ...diagnostics.filter((diagnostic) => diagnostic.severity === 'error').slice(0, 20).map(formatDiagnostic),
  ].join('\n'));
}

export function assertRequiredRankedPatternPayloadSections(payload: unknown): void {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new Error('Ranked-pattern canonical_result_payload is not an object.');
  }

  const record = payload as Record<string, unknown>;
  const missing = FLOW_STATE_REQUIRED_PAYLOAD_SECTIONS.filter((key) => !(key in record));
  if (missing.length > 0) {
    throw new Error(`Ranked-pattern canonical_result_payload is missing required sections: ${missing.join(', ')}`);
  }

  if (!Array.isArray(record.rankedSignals) || record.rankedSignals.length !== 4) {
    throw new Error('Ranked-pattern canonical_result_payload must contain exactly four rankedSignals.');
  }
}

async function loadAssessmentVersion(
  db: Queryable,
  assessmentVersionId: string,
): Promise<AssessmentVersionRow> {
  const result = await db.query<AssessmentVersionRow>(
    `
    SELECT
      a.id::text AS assessment_id,
      av.id::text AS assessment_version_id,
      a.assessment_key,
      a.title AS assessment_title,
      av.version
    FROM assessment_versions av
    INNER JOIN assessments a ON a.id = av.assessment_id
    WHERE av.id = $1::uuid
    `,
    [assessmentVersionId],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error(`Imported assessment version ${assessmentVersionId} was not found.`);
  }
  return row;
}

async function upsertFixtureUser(db: Queryable): Promise<string> {
  const result = await db.query<UserRow>(
    `
    INSERT INTO users (
      id,
      clerk_user_id,
      email,
      name,
      role,
      status
    )
    VALUES ($1::uuid, $2, $3, $4, 'user', 'active')
    ON CONFLICT (clerk_user_id)
    DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      status = EXCLUDED.status,
      updated_at = NOW()
    RETURNING id::text AS id
    `,
    [
      FLOW_STATE_FIXTURE_USER.id,
      FLOW_STATE_FIXTURE_USER.clerkUserId,
      FLOW_STATE_FIXTURE_USER.email,
      FLOW_STATE_FIXTURE_USER.name,
    ],
  );

  const userId = result.rows[0]?.id;
  if (!userId) {
    throw new Error('Unable to upsert Flow State fixture user.');
  }
  if (userId !== FLOW_STATE_FIXTURE_USER.id) {
    throw new Error(`Fixture clerk_user_id is already mapped to a different user (${userId}).`);
  }
  return userId;
}

async function listDeterministicOptionSelections(
  db: Queryable,
  assessmentVersionId: string,
): Promise<readonly OptionSelectionRow[]> {
  const result = await db.query<OptionSelectionRow>(
    `
    SELECT
      q.id::text AS question_id,
      first_option.id::text AS option_id,
      q.order_index AS question_order_index
    FROM questions q
    INNER JOIN LATERAL (
      SELECT o.id
      FROM options o
      WHERE o.question_id = q.id
      ORDER BY o.order_index ASC, o.id ASC
      LIMIT 1
    ) AS first_option ON TRUE
    WHERE q.assessment_version_id = $1::uuid
    ORDER BY q.order_index ASC, q.id ASC
    `,
    [assessmentVersionId],
  );

  if (result.rows.length === 0) {
    throw new Error(`Assessment version ${assessmentVersionId} has no selectable question options.`);
  }

  return Object.freeze([...result.rows]);
}

function responseId(index: number): string {
  return `00000000-0000-4000-8001-${String(index + 1).padStart(12, '0')}`;
}

async function prepareFixtureAttempt(params: {
  readonly db: Queryable;
  readonly userId: string;
  readonly version: AssessmentVersionRow;
  readonly selections: readonly OptionSelectionRow[];
}): Promise<void> {
  await params.db.query('DELETE FROM results WHERE attempt_id = $1::uuid', [FLOW_STATE_FIXTURE_ATTEMPT_ID]);
  await params.db.query('DELETE FROM responses WHERE attempt_id = $1::uuid', [FLOW_STATE_FIXTURE_ATTEMPT_ID]);

  await params.db.query(
    `
    INSERT INTO attempts (
      id,
      user_id,
      assessment_id,
      assessment_version_id,
      lifecycle_status,
      started_at,
      submitted_at,
      completed_at,
      last_activity_at
    )
    VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'IN_PROGRESS', NOW(), NULL, NULL, NOW())
    ON CONFLICT (id)
    DO UPDATE SET
      user_id = EXCLUDED.user_id,
      assessment_id = EXCLUDED.assessment_id,
      assessment_version_id = EXCLUDED.assessment_version_id,
      lifecycle_status = 'IN_PROGRESS',
      submitted_at = NULL,
      completed_at = NULL,
      last_activity_at = NOW(),
      updated_at = NOW()
    `,
    [
      FLOW_STATE_FIXTURE_ATTEMPT_ID,
      params.userId,
      params.version.assessment_id,
      params.version.assessment_version_id,
    ],
  );

  for (const [index, selection] of params.selections.entries()) {
    await params.db.query(
      `
      INSERT INTO responses (
        id,
        attempt_id,
        question_id,
        selected_option_id,
        responded_at,
        created_at,
        updated_at
      )
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, NOW(), NOW(), NOW())
      ON CONFLICT (attempt_id, question_id)
      DO UPDATE SET
        selected_option_id = EXCLUDED.selected_option_id,
        responded_at = EXCLUDED.responded_at,
        updated_at = NOW()
      `,
      [responseId(index), FLOW_STATE_FIXTURE_ATTEMPT_ID, selection.question_id, selection.option_id],
    );
  }
}

async function upsertCompletedAssignment(params: {
  readonly db: Queryable;
  readonly userId: string;
  readonly version: AssessmentVersionRow;
}): Promise<void> {
  await params.db.query(
    `
    INSERT INTO user_assessment_assignments (
      id,
      user_id,
      assessment_id,
      assessment_version_id,
      status,
      order_index,
      assigned_at,
      started_at,
      completed_at,
      attempt_id
    )
    VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'completed', 0, NOW(), NOW(), NOW(), $5::uuid)
    ON CONFLICT (id)
    DO UPDATE SET
      user_id = EXCLUDED.user_id,
      assessment_id = EXCLUDED.assessment_id,
      assessment_version_id = EXCLUDED.assessment_version_id,
      status = EXCLUDED.status,
      order_index = EXCLUDED.order_index,
      assigned_at = EXCLUDED.assigned_at,
      started_at = EXCLUDED.started_at,
      completed_at = EXCLUDED.completed_at,
      attempt_id = EXCLUDED.attempt_id,
      updated_at = NOW()
    `,
    [
      FLOW_STATE_FIXTURE_ASSIGNMENT_ID,
      params.userId,
      params.version.assessment_id,
      params.version.assessment_version_id,
      FLOW_STATE_FIXTURE_ATTEMPT_ID,
    ],
  );
}

async function loadPersistedPayload(db: Queryable, resultId: string): Promise<unknown> {
  const result = await db.query<ResultPayloadRow>(
    `
    SELECT canonical_result_payload
    FROM results
    WHERE id = $1::uuid
      AND readiness_status = 'READY'
      AND canonical_result_payload IS NOT NULL
    `,
    [resultId],
  );

  const payload = result.rows[0]?.canonical_result_payload;
  if (!payload) {
    throw new Error(`Ready persisted canonical_result_payload was not found for result ${resultId}.`);
  }
  return payload;
}

function payloadRecord(payload: unknown): Record<string, unknown> {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new Error('Expected persisted payload object.');
  }
  return payload as Record<string, unknown>;
}

function normalizedSignalLine(entry: unknown): string {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    return '- unknown: n/a';
  }
  const record = entry as Record<string, unknown>;
  return `- ${String(record.signalKey ?? 'unknown')}: ${String(record.normalizedPercentage ?? 'n/a')}%`;
}

export async function runFlowStateRankedPatternFixtureProof(argv: readonly string[]): Promise<number> {
  const args = parseFlowStateFixtureProofArgs(argv);
  assertFlowStateFixtureProofEnvironment(process.env, args);

  if (!existsSync(args.workbookPath)) {
    throw new Error(`Flow State workbook was not found: ${args.workbookPath}`);
  }

  const audit = auditRankedPatternWorkbookFile(args.workbookPath);
  assertNoBlockingDiagnostics('Workbook audit', [
    ...audit.diagnostics,
    ...audit.normalisationDiagnostics,
  ]);

  const hash = sourceHash(args.workbookPath);
  const pool = getDbPool();

  try {
    const runtimeDryRun = await persistRankedPatternRuntimeDefinition({
      normalisedPackage: audit.normalisedPackage,
      sourceName: path.basename(args.workbookPath),
      sourceHash: hash,
      dryRun: true,
    });
    assertNoBlockingDiagnostics('Runtime definition dry-run', runtimeDryRun.diagnostics);

    const runtimeApply = await persistRankedPatternRuntimeDefinition({
      normalisedPackage: audit.normalisedPackage,
      sourceName: path.basename(args.workbookPath),
      sourceHash: hash,
      dryRun: false,
      db: pool,
    });
    assertNoBlockingDiagnostics('Runtime definition apply', runtimeApply.diagnostics);

    if (!runtimeApply.assessmentVersionId) {
      throw new Error('Runtime definition apply did not return an assessment version id.');
    }

    const resultLanguageDryRun = await persistRankedPatternResultLanguage({
      normalisedPackage: audit.normalisedPackage,
      assessmentVersionId: runtimeApply.assessmentVersionId,
      dryRun: true,
    });
    assertNoBlockingDiagnostics('Result-language dry-run', resultLanguageDryRun.diagnostics);

    const resultLanguageApply = await persistRankedPatternResultLanguage({
      normalisedPackage: audit.normalisedPackage,
      assessmentVersionId: runtimeApply.assessmentVersionId,
      dryRun: false,
      db: pool,
    });
    assertNoBlockingDiagnostics('Result-language apply', resultLanguageApply.diagnostics);

    const client = await pool.connect();
    try {
      const publishAudit = await auditRankedPatternAssessmentVersion({
        assessmentVersionId: runtimeApply.assessmentVersionId,
        db: client,
      });
      if (!publishAudit.canPublish) {
        throw new Error([
          'Flow State publish audit did not pass.',
          ...publishAudit.findings
            .filter((finding) => finding.severity === 'blocking')
            .slice(0, 20)
            .map((finding) => `[${finding.code}] ${finding.message}`),
        ].join('\n'));
      }

      const version = await loadAssessmentVersion(client, runtimeApply.assessmentVersionId);
      const userId = await upsertFixtureUser(client);
      const selections = await listDeterministicOptionSelections(client, version.assessment_version_id);
      await prepareFixtureAttempt({ db: client, userId, version, selections });

      const completion = await createAssessmentCompletionService({ db: client }).completeAssessmentAttempt({
        attemptId: FLOW_STATE_FIXTURE_ATTEMPT_ID,
        userId,
      });
      if (!completion.payloadReady || !completion.resultId) {
        throw new Error(`Fixture completion did not produce a ready result: ${completion.error ?? 'unknown error'}`);
      }

      await upsertCompletedAssignment({ db: client, userId, version });

      const payload = await loadPersistedPayload(client, completion.resultId);
      assertRequiredRankedPatternPayloadSections(payload);
      const record = payloadRecord(payload);

      const resultReadModel = createResultReadModelService({ db: client });
      const list = await resultReadModel.listAssessmentResults({ userId });
      const detail = await resultReadModel.getAssessmentResultDetail({ userId, resultId: completion.resultId });
      const workspace = await buildAssessmentWorkspaceViewModel({ db: client, userId });

      if (!list.some((item) => item.resultId === completion.resultId)) {
        throw new Error('Result list did not include the generated Flow State fixture result.');
      }
      if (detail.mode !== 'single_domain' || !detail.singleDomainResult) {
        throw new Error('Result detail did not resolve the generated Flow State single-domain payload.');
      }
      if (!workspace.assessments.some((item) => item.latestReadyResultId === completion.resultId)) {
        throw new Error('Workspace summary did not include the generated Flow State fixture result.');
      }

      console.log('Flow State ranked-pattern fixture proof passed.');
      console.log(`Assessment id: ${version.assessment_id}`);
      console.log(`Assessment key: ${version.assessment_key}`);
      console.log(`Assessment version id: ${version.assessment_version_id}`);
      console.log(`Attempt id: ${completion.attemptId}`);
      console.log(`Result id: ${completion.resultId}`);
      console.log(`Result URL: /app/results/single-domain/${completion.resultId}`);
      console.log(`Score shape: ${String((record.scoreShape as { value?: unknown }).value ?? 'unknown')}`);
      console.log(`Pattern key: ${String(record.patternKey ?? 'unknown')}`);
      console.log('Ranked signal percentages:');
      for (const entry of record.rankedSignals as readonly unknown[]) {
        console.log(normalizedSignalLine(entry));
      }
      console.log(`Publish audit canPublish: ${publishAudit.canPublish}`);
      console.log(`Publish audit blockingCount: ${publishAudit.blockingCount}`);
      console.log(`Publish audit warningCount: ${publishAudit.warningCount}`);
      console.log('Dry-run planned counts:');
      console.log(`- runtime definition: ${runtimeDryRun.plan.operations.length}`);
      console.log(`- result language: ${resultLanguageDryRun.plan.operations.length}`);
      console.log('Applied counts by storage target:');
      console.log(`- runtime definition: ${JSON.stringify(runtimeApply.countsByTable)}`);
      console.log(`- result language: ${JSON.stringify(resultLanguageApply.countsByTable)}`);

      return 0;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';

if (import.meta.url === invokedPath) {
  runFlowStateRankedPatternFixtureProof(process.argv.slice(2))
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      console.error('Flow State ranked-pattern fixture proof failed.');
      console.error(error instanceof Error ? error.message : error);
      console.error('');
      console.error(usage());
      process.exitCode = 1;
    });
}
