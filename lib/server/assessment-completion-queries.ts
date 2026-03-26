import type { Queryable } from '@/lib/engine/repository-sql';
import type { CanonicalResultPayload } from '@/lib/engine/types';
import type {
  AssessmentCompletionAttemptSummary,
  AssessmentCompletionPersistedResponse,
} from '@/lib/server/assessment-completion-types';
import type { AssessmentResultRecordSummary } from '@/lib/server/assessment-attempt-lifecycle-types';

type AttemptCompletionRow = {
  attempt_id: string;
  user_id: string;
  assessment_id: string;
  assessment_version_id: string;
  assessment_key: string;
  version_tag: string;
  lifecycle_status: AssessmentCompletionAttemptSummary['lifecycleStatus'];
  started_at: string;
  submitted_at: string | null;
  completed_at: string | null;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
};

type ResultRow = {
  result_id: string;
  attempt_id: string;
  pipeline_status: AssessmentResultRecordSummary['pipelineStatus'];
  readiness_status: AssessmentResultRecordSummary['readinessStatus'];
  generated_at: string | null;
  failure_reason: string | null;
  has_canonical_result_payload: boolean;
  canonical_result_payload: CanonicalResultPayload | null;
  created_at: string;
  updated_at: string;
};

type PersistedResponseRow = {
  response_id: string;
  attempt_id: string;
  question_id: string;
  selected_option_id: string;
  responded_at: string;
  updated_at: string;
};

function mapAttemptCompletionRow(row: AttemptCompletionRow): AssessmentCompletionAttemptSummary {
  return {
    attemptId: row.attempt_id,
    userId: row.user_id,
    assessmentId: row.assessment_id,
    assessmentVersionId: row.assessment_version_id,
    assessmentKey: row.assessment_key,
    versionTag: row.version_tag,
    lifecycleStatus: row.lifecycle_status,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
    completedAt: row.completed_at,
    lastActivityAt: row.last_activity_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapResultRow(
  row: ResultRow,
): AssessmentResultRecordSummary & { canonicalResultPayload: CanonicalResultPayload | null } {
  return {
    resultId: row.result_id,
    attemptId: row.attempt_id,
    pipelineStatus: row.pipeline_status,
    readinessStatus: row.readiness_status,
    generatedAt: row.generated_at,
    failureReason: row.failure_reason,
    hasCanonicalResultPayload: row.has_canonical_result_payload,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    canonicalResultPayload: row.canonical_result_payload,
  };
}

function mapPersistedResponseRow(row: PersistedResponseRow): AssessmentCompletionPersistedResponse {
  return {
    responseId: row.response_id,
    attemptId: row.attempt_id,
    questionId: row.question_id,
    selectedOptionId: row.selected_option_id,
    respondedAt: row.responded_at,
    updatedAt: row.updated_at,
  };
}

export async function getAttemptForCompletion(
  db: Queryable,
  attemptId: string,
): Promise<AssessmentCompletionAttemptSummary | null> {
  const result = await db.query<AttemptCompletionRow>(
    `
    SELECT
      t.id AS attempt_id,
      t.user_id,
      t.assessment_id,
      t.assessment_version_id,
      a.assessment_key,
      av.version AS version_tag,
      t.lifecycle_status,
      t.started_at,
      t.submitted_at,
      t.completed_at,
      t.last_activity_at,
      t.created_at,
      t.updated_at
    FROM attempts t
    INNER JOIN assessments a ON a.id = t.assessment_id
    INNER JOIN assessment_versions av ON av.id = t.assessment_version_id
    WHERE t.id = $1
    `,
    [attemptId],
  );

  const row = result.rows[0];
  return row ? mapAttemptCompletionRow(row) : null;
}

export async function getExistingResultForAttempt(
  db: Queryable,
  attemptId: string,
): Promise<(AssessmentResultRecordSummary & { canonicalResultPayload: CanonicalResultPayload | null }) | null> {
  const result = await db.query<ResultRow>(
    `
    SELECT
      id AS result_id,
      attempt_id,
      pipeline_status,
      readiness_status,
      generated_at,
      failure_reason,
      canonical_result_payload IS NOT NULL AS has_canonical_result_payload,
      canonical_result_payload,
      created_at,
      updated_at
    FROM results
    WHERE attempt_id = $1
    ORDER BY created_at DESC, id DESC
    `,
    [attemptId],
  );

  const row = result.rows[0];
  return row ? mapResultRow(row) : null;
}

export async function loadPersistedResponsesForAttempt(
  db: Queryable,
  attemptId: string,
): Promise<readonly AssessmentCompletionPersistedResponse[]> {
  const result = await db.query<PersistedResponseRow>(
    `
    SELECT DISTINCT ON (r.question_id)
      r.id AS response_id,
      r.attempt_id,
      r.question_id,
      r.selected_option_id,
      r.responded_at,
      r.updated_at
    FROM responses r
    WHERE r.attempt_id = $1
    ORDER BY r.question_id ASC, r.updated_at DESC, r.id DESC
    `,
    [attemptId],
  );

  return Object.freeze(result.rows.map(mapPersistedResponseRow));
}

export async function markAttemptSubmitted(
  db: Queryable,
  attemptId: string,
): Promise<void> {
  await db.query(
    `
    UPDATE attempts
    SET
      lifecycle_status = 'SUBMITTED',
      submitted_at = COALESCE(submitted_at, NOW()),
      completed_at = COALESCE(completed_at, NOW()),
      last_activity_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
    `,
    [attemptId],
  );
}

export async function markAttemptReady(
  db: Queryable,
  attemptId: string,
): Promise<void> {
  await db.query(
    `
    UPDATE attempts
    SET
      lifecycle_status = 'RESULT_READY',
      completed_at = COALESCE(completed_at, NOW()),
      last_activity_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
    `,
    [attemptId],
  );
}

export async function markAttemptFailed(
  db: Queryable,
  attemptId: string,
): Promise<void> {
  await db.query(
    `
    UPDATE attempts
    SET
      lifecycle_status = 'FAILED',
      completed_at = COALESCE(completed_at, NOW()),
      last_activity_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
    `,
    [attemptId],
  );
}

export async function upsertProcessingResult(
  db: Queryable,
  params: {
    attemptId: string;
    assessmentId: string;
    assessmentVersionId: string;
  },
): Promise<string> {
  const result = await db.query<{ result_id: string }>(
    `
    INSERT INTO results (
      attempt_id,
      assessment_id,
      assessment_version_id,
      pipeline_status,
      readiness_status,
      canonical_result_payload,
      failure_reason
    )
    VALUES ($1, $2, $3, 'RUNNING', 'PROCESSING', NULL, NULL)
    ON CONFLICT (attempt_id) DO UPDATE
    SET
      pipeline_status = 'RUNNING',
      readiness_status = 'PROCESSING',
      canonical_result_payload = NULL,
      failure_reason = NULL,
      updated_at = NOW()
    RETURNING id AS result_id
    `,
    [params.attemptId, params.assessmentId, params.assessmentVersionId],
  );

  return result.rows[0]?.result_id ?? '';
}

export async function upsertReadyResult(
  db: Queryable,
  params: {
    attemptId: string;
    assessmentId: string;
    assessmentVersionId: string;
    payload: CanonicalResultPayload;
  },
): Promise<string> {
  const result = await db.query<{ result_id: string }>(
    `
    INSERT INTO results (
      attempt_id,
      assessment_id,
      assessment_version_id,
      pipeline_status,
      readiness_status,
      canonical_result_payload,
      failure_reason,
      generated_at
    )
    VALUES ($1, $2, $3, 'COMPLETED', 'READY', $4::jsonb, NULL, NOW())
    ON CONFLICT (attempt_id) DO UPDATE
    SET
      pipeline_status = 'COMPLETED',
      readiness_status = 'READY',
      canonical_result_payload = $4::jsonb,
      failure_reason = NULL,
      generated_at = NOW(),
      updated_at = NOW()
    RETURNING id AS result_id
    `,
    [
      params.attemptId,
      params.assessmentId,
      params.assessmentVersionId,
      JSON.stringify(params.payload),
    ],
  );

  return result.rows[0]?.result_id ?? '';
}

export async function upsertFailedResult(
  db: Queryable,
  params: {
    attemptId: string;
    assessmentId: string;
    assessmentVersionId: string;
    failureReason: string;
  },
): Promise<string> {
  const result = await db.query<{ result_id: string }>(
    `
    INSERT INTO results (
      attempt_id,
      assessment_id,
      assessment_version_id,
      pipeline_status,
      readiness_status,
      canonical_result_payload,
      failure_reason,
      generated_at
    )
    VALUES ($1, $2, $3, 'FAILED', 'FAILED', NULL, $4, NULL)
    ON CONFLICT (attempt_id) DO UPDATE
    SET
      pipeline_status = 'FAILED',
      readiness_status = 'FAILED',
      canonical_result_payload = NULL,
      failure_reason = $4,
      generated_at = NULL,
      updated_at = NOW()
    RETURNING id AS result_id
    `,
    [params.attemptId, params.assessmentId, params.assessmentVersionId, params.failureReason],
  );

  return result.rows[0]?.result_id ?? '';
}
