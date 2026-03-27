import type { Queryable } from '@/lib/engine/repository-sql';
import type {
  AssessmentRunnerOptionViewModel,
  AssessmentRunnerQuestionViewModel,
  AssessmentRunnerStatus,
} from '@/lib/server/assessment-runner-types';

type RunnerAttemptRow = {
  attempt_id: string;
  user_id: string;
  assessment_id: string;
  assessment_key: string;
  assessment_title: string;
  assessment_description: string | null;
  assessment_version_id: string;
  version_tag: string;
  lifecycle_status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'SCORED' | 'RESULT_READY' | 'FAILED';
  started_at: string;
  submitted_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

export type AssessmentRunnerAttemptRecord = {
  attemptId: string;
  userId: string;
  assessmentId: string;
  assessmentKey: string;
  assessmentTitle: string;
  assessmentDescription: string | null;
  assessmentVersionId: string;
  versionTag: string;
  lifecycleStatus: RunnerAttemptRow['lifecycle_status'];
  startedAt: string;
  submittedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

type RunnerQuestionRow = {
  question_id: string;
  question_key: string;
  prompt: string;
  question_order_index: number;
  domain_title: string;
  option_id: string;
  option_key: string;
  option_label: string | null;
  option_text: string;
  option_order_index: number;
};

type PersistedResponseRow = {
  question_id: string;
  selected_option_id: string;
};

type ResultStatusRow = {
  result_id: string;
  readiness_status: 'PROCESSING' | 'READY' | 'FAILED';
  has_canonical_result_payload: boolean;
  failure_reason: string | null;
};

type ProgressCountRow = {
  answered_questions: string | number;
  total_questions: string | number;
};

function mapRunnerAttemptRow(row: RunnerAttemptRow): AssessmentRunnerAttemptRecord {
  return {
    attemptId: row.attempt_id,
    userId: row.user_id,
    assessmentId: row.assessment_id,
    assessmentKey: row.assessment_key,
    assessmentTitle: row.assessment_title,
    assessmentDescription: row.assessment_description,
    assessmentVersionId: row.assessment_version_id,
    versionTag: row.version_tag,
    lifecycleStatus: row.lifecycle_status,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}

function computeCompletionPercentage(params: {
  answeredQuestions: number;
  totalQuestions: number;
}): number {
  if (params.totalQuestions <= 0) {
    return 0;
  }

  return Math.floor((params.answeredQuestions / params.totalQuestions) * 100);
}

export function resolveRunnerStatus(params: {
  attemptLifecycleStatus: AssessmentRunnerAttemptRecord['lifecycleStatus'];
  latestResult: {
    resultId: string;
    readinessStatus: 'PROCESSING' | 'READY' | 'FAILED';
    hasCanonicalResultPayload: boolean;
    failureReason: string | null;
  } | null;
}): {
  status: AssessmentRunnerStatus;
  latestReadyResultId: string | null;
  lastError: string | null;
} {
  if (params.latestResult?.readinessStatus === 'READY' && params.latestResult.hasCanonicalResultPayload) {
    return {
      status: 'ready',
      latestReadyResultId: params.latestResult.resultId,
      lastError: null,
    };
  }

  if (
    params.attemptLifecycleStatus === 'FAILED' ||
    params.latestResult?.readinessStatus === 'FAILED'
  ) {
    return {
      status: 'error',
      latestReadyResultId: null,
      lastError: params.latestResult?.failureReason ?? 'attempt_failed',
    };
  }

  if (params.attemptLifecycleStatus === 'IN_PROGRESS') {
    return {
      status: 'in_progress',
      latestReadyResultId: null,
      lastError: null,
    };
  }

  return {
    status: 'completed_processing',
    latestReadyResultId: null,
    lastError: null,
  };
}

export async function getAttemptForRunner(
  db: Queryable,
  attemptId: string,
): Promise<AssessmentRunnerAttemptRecord | null> {
  const result = await db.query<RunnerAttemptRow>(
    `
    SELECT
      t.id AS attempt_id,
      t.user_id,
      t.assessment_id,
      a.assessment_key,
      a.title AS assessment_title,
      a.description AS assessment_description,
      t.assessment_version_id,
      av.version AS version_tag,
      t.lifecycle_status,
      t.started_at,
      t.submitted_at,
      t.completed_at,
      t.updated_at
    FROM attempts t
    INNER JOIN assessments a ON a.id = t.assessment_id
    INNER JOIN assessment_versions av ON av.id = t.assessment_version_id
    WHERE t.id = $1
    `,
    [attemptId],
  );

  const row = result.rows[0];
  return row ? mapRunnerAttemptRow(row) : null;
}

export async function getLatestResultStatusForAttempt(
  db: Queryable,
  attemptId: string,
): Promise<{
  resultId: string;
  readinessStatus: 'PROCESSING' | 'READY' | 'FAILED';
  hasCanonicalResultPayload: boolean;
  failureReason: string | null;
} | null> {
  const result = await db.query<ResultStatusRow>(
    `
    SELECT
      id AS result_id,
      readiness_status,
      canonical_result_payload IS NOT NULL AS has_canonical_result_payload,
      failure_reason
    FROM results
    WHERE attempt_id = $1
    ORDER BY created_at DESC, id DESC
    `,
    [attemptId],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    resultId: row.result_id,
    readinessStatus: row.readiness_status,
    hasCanonicalResultPayload: row.has_canonical_result_payload,
    failureReason: row.failure_reason,
  };
}

export async function listRunnerQuestions(
  db: Queryable,
  assessmentVersionId: string,
): Promise<readonly AssessmentRunnerQuestionViewModel[]> {
  const result = await db.query<RunnerQuestionRow>(
    `
    SELECT
      q.id AS question_id,
      q.question_key,
      q.prompt,
      q.order_index AS question_order_index,
      d.label AS domain_title,
      o.id AS option_id,
      o.option_key,
      o.option_label,
      o.option_text,
      o.order_index AS option_order_index
    FROM questions q
    INNER JOIN domains d ON d.id = q.domain_id
    INNER JOIN options o ON o.question_id = q.id
    WHERE q.assessment_version_id = $1
    ORDER BY q.order_index ASC, q.id ASC, o.order_index ASC, o.id ASC
    `,
    [assessmentVersionId],
  );

  const questions = new Map<string, {
    questionId: string;
    questionKey: string;
    prompt: string;
    domainTitle: string;
    orderIndex: number;
    options: AssessmentRunnerOptionViewModel[];
  }>();

  for (const row of result.rows) {
    const question = questions.get(row.question_id) ?? {
      questionId: row.question_id,
      questionKey: row.question_key,
      prompt: row.prompt,
      domainTitle: row.domain_title,
      orderIndex: row.question_order_index,
      options: [],
    };

    question.options.push({
      optionId: row.option_id,
      optionKey: row.option_key,
      label: row.option_label,
      text: row.option_text,
      orderIndex: row.option_order_index,
    });

    questions.set(row.question_id, question);
  }

  return Object.freeze(
    [...questions.values()].map((question) => ({
      questionId: question.questionId,
      questionKey: question.questionKey,
      prompt: question.prompt,
      domainTitle: question.domainTitle,
      orderIndex: question.orderIndex,
      selectedOptionId: null,
      options: Object.freeze([...question.options]),
    })),
  );
}

export async function loadPersistedResponsesForRunner(
  db: Queryable,
  attemptId: string,
): Promise<ReadonlyMap<string, string>> {
  const result = await db.query<PersistedResponseRow>(
    `
    SELECT
      question_id,
      selected_option_id
    FROM responses
    WHERE attempt_id = $1
    `,
    [attemptId],
  );

  return new Map(result.rows.map((row) => [row.question_id, row.selected_option_id]));
}

export async function getAttemptProgressCounts(
  db: Queryable,
  attemptId: string,
  assessmentVersionId: string,
): Promise<{
  answeredQuestions: number;
  totalQuestions: number;
  completionPercentage: number;
}> {
  const result = await db.query<ProgressCountRow>(
    `
    SELECT
      COALESCE(r.answered_questions, 0) AS answered_questions,
      q.total_questions
    FROM (
      SELECT COUNT(*) AS total_questions
      FROM questions
      WHERE assessment_version_id = $2
    ) q
    CROSS JOIN LATERAL (
      SELECT COUNT(*) AS answered_questions
      FROM responses
      WHERE attempt_id = $1
    ) r
    `,
    [attemptId, assessmentVersionId],
  );

  const row = result.rows[0];
  const answeredQuestions = row ? Number(row.answered_questions) : 0;
  const totalQuestions = row ? Number(row.total_questions) : 0;

  return {
    answeredQuestions,
    totalQuestions,
    completionPercentage: computeCompletionPercentage({
      answeredQuestions,
      totalQuestions,
    }),
  };
}

export async function validateQuestionOptionForAttempt(
  db: Queryable,
  params: {
    attemptId: string;
    questionId: string;
    selectedOptionId: string;
  },
): Promise<boolean> {
  const result = await db.query<{ valid_row: number }>(
    `
    SELECT 1 AS valid_row
    FROM attempts t
    INNER JOIN questions q ON q.assessment_version_id = t.assessment_version_id
    INNER JOIN options o ON o.question_id = q.id
    WHERE t.id = $1
      AND q.id = $2
      AND o.id = $3
    `,
    [params.attemptId, params.questionId, params.selectedOptionId],
  );

  return Boolean(result.rows[0]);
}

export async function upsertResponseForAttempt(
  db: Queryable,
  params: {
    attemptId: string;
    questionId: string;
    selectedOptionId: string;
  },
): Promise<void> {
  await db.query(
    `
    INSERT INTO responses (
      attempt_id,
      question_id,
      selected_option_id,
      responded_at
    )
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (attempt_id, question_id) DO UPDATE
    SET
      selected_option_id = EXCLUDED.selected_option_id,
      responded_at = NOW(),
      updated_at = NOW()
    `,
    [params.attemptId, params.questionId, params.selectedOptionId],
  );

  await db.query(
    `
    UPDATE attempts
    SET
      last_activity_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
    `,
    [params.attemptId],
  );
}
