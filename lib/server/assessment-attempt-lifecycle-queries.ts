import type { Queryable } from '@/lib/engine/repository-sql';
import type {
  AssessmentAttemptRecordSummary,
  AssessmentRecordSummary,
  AssessmentResultRecordSummary,
} from '@/lib/server/assessment-attempt-lifecycle-types';

type AssessmentLookupRow = {
  assessment_id: string;
  assessment_key: string;
  assessment_version_id: string;
  version_tag: string;
};

type AttemptLookupRow = {
  attempt_id: string;
  user_id: string;
  assessment_id: string;
  assessment_version_id: string;
  lifecycle_status: AssessmentAttemptRecordSummary['lifecycleStatus'];
  started_at: string;
  submitted_at: string | null;
  completed_at: string | null;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
};

type ResultLookupRow = {
  result_id: string;
  attempt_id: string;
  pipeline_status: AssessmentResultRecordSummary['pipelineStatus'];
  readiness_status: AssessmentResultRecordSummary['readinessStatus'];
  generated_at: string | null;
  failure_reason: string | null;
  has_canonical_result_payload: boolean;
  created_at: string;
  updated_at: string;
};

function mapAssessmentSummary(row: AssessmentLookupRow): AssessmentRecordSummary {
  return {
    assessmentId: row.assessment_id,
    assessmentKey: row.assessment_key,
    assessmentVersionId: row.assessment_version_id,
    versionTag: row.version_tag,
  };
}

function mapAttemptSummary(row: AttemptLookupRow): AssessmentAttemptRecordSummary {
  return {
    attemptId: row.attempt_id,
    userId: row.user_id,
    assessmentId: row.assessment_id,
    assessmentVersionId: row.assessment_version_id,
    lifecycleStatus: row.lifecycle_status,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
    completedAt: row.completed_at,
    lastActivityAt: row.last_activity_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapResultSummary(row: ResultLookupRow): AssessmentResultRecordSummary {
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
  };
}

export async function getPublishedAssessmentSummaryByKey(
  db: Queryable,
  assessmentKey: string,
): Promise<AssessmentRecordSummary | null> {
  const result = await db.query<AssessmentLookupRow>(
    `
    SELECT
      a.id AS assessment_id,
      a.assessment_key,
      av.id AS assessment_version_id,
      av.version AS version_tag
    FROM assessments a
    INNER JOIN assessment_versions av ON av.assessment_id = a.id
    WHERE a.assessment_key = $1
      AND av.lifecycle_status = 'PUBLISHED'
    `,
    [assessmentKey],
  );

  const row = result.rows[0];
  return row ? mapAssessmentSummary(row) : null;
}

export async function getLatestInProgressAttemptForUserAndAssessment(
  db: Queryable,
  params: { userId: string; assessmentId: string },
): Promise<AssessmentAttemptRecordSummary | null> {
  const result = await db.query<AttemptLookupRow>(
    `
    SELECT
      id AS attempt_id,
      user_id,
      assessment_id,
      assessment_version_id,
      lifecycle_status,
      started_at,
      submitted_at,
      completed_at,
      last_activity_at,
      created_at,
      updated_at
    FROM attempts
    WHERE user_id = $1
      AND assessment_id = $2
      AND lifecycle_status = 'IN_PROGRESS'
    ORDER BY created_at DESC, id DESC
    `,
    [params.userId, params.assessmentId],
  );

  const row = result.rows[0];
  return row ? mapAttemptSummary(row) : null;
}

export async function getLatestAttemptForUserAndAssessment(
  db: Queryable,
  params: { userId: string; assessmentId: string },
): Promise<AssessmentAttemptRecordSummary | null> {
  const result = await db.query<AttemptLookupRow>(
    `
    SELECT
      id AS attempt_id,
      user_id,
      assessment_id,
      assessment_version_id,
      lifecycle_status,
      started_at,
      submitted_at,
      completed_at,
      last_activity_at,
      created_at,
      updated_at
    FROM attempts
    WHERE user_id = $1
      AND assessment_id = $2
    ORDER BY created_at DESC, id DESC
    `,
    [params.userId, params.assessmentId],
  );

  const row = result.rows[0];
  return row ? mapAttemptSummary(row) : null;
}

export async function countAnsweredQuestionsForAttempt(
  db: Queryable,
  attemptId: string,
): Promise<number> {
  const result = await db.query<{ answered_questions: string | number }>(
    `
    SELECT COUNT(DISTINCT question_id) AS answered_questions
    FROM responses
    WHERE attempt_id = $1
    `,
    [attemptId],
  );

  const row = result.rows[0];
  return row ? Number(row.answered_questions) : 0;
}

export async function getLatestResultSummaryForAttempt(
  db: Queryable,
  attemptId: string,
): Promise<AssessmentResultRecordSummary | null> {
  const result = await db.query<ResultLookupRow>(
    `
    SELECT
      id AS result_id,
      attempt_id,
      pipeline_status,
      readiness_status,
      generated_at,
      failure_reason,
      canonical_result_payload IS NOT NULL AS has_canonical_result_payload,
      created_at,
      updated_at
    FROM results
    WHERE attempt_id = $1
    ORDER BY created_at DESC, id DESC
    `,
    [attemptId],
  );

  const row = result.rows[0];
  return row ? mapResultSummary(row) : null;
}

export async function countQuestionsForAssessmentVersion(
  db: Queryable,
  assessmentVersionId: string,
): Promise<number> {
  const result = await db.query<{ total_questions: string | number }>(
    `
    SELECT COUNT(*) AS total_questions
    FROM questions
    WHERE assessment_version_id = $1
    `,
    [assessmentVersionId],
  );

  const row = result.rows[0];
  return row ? Number(row.total_questions) : 0;
}
