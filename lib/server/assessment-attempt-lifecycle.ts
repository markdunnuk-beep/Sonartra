import type { Queryable } from '@/lib/engine/repository-sql';
import {
  countAnsweredQuestionsForAttempt,
  countQuestionsForAssessmentVersion,
  getLatestAttemptForUserAndAssessment,
  getLatestInProgressAttemptForUserAndAssessment,
  getLatestResultSummaryForAttempt,
  getPublishedAssessmentSummaryByKey,
} from '@/lib/server/assessment-attempt-lifecycle-queries';
import type {
  AssessmentAttemptLifecycleViewModel,
  AssessmentAttemptRecordSummary,
  AssessmentLifecycleStatus,
  AssessmentProgressSummary,
  AssessmentRecordSummary,
  AssessmentResultRecordSummary,
} from '@/lib/server/assessment-attempt-lifecycle-types';

type AttemptInsertRow = {
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

export class AssessmentLifecycleNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssessmentLifecycleNotFoundError';
  }
}

export class InvalidAssessmentLifecycleDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAssessmentLifecycleDataError';
  }
}

export type AssessmentAttemptLifecycleServiceDeps = {
  db: Queryable;
};

export type AssessmentAttemptLifecycleService = {
  getAssessmentAttemptLifecycle(params: {
    userId: string;
    assessmentKey: string;
  }): Promise<AssessmentAttemptLifecycleViewModel>;
  startAssessmentAttempt(params: {
    userId: string;
    assessmentKey: string;
  }): Promise<AssessmentAttemptLifecycleViewModel>;
  getOrCreateInProgressAttempt(params: {
    userId: string;
    assessmentKey: string;
  }): Promise<AssessmentAttemptLifecycleViewModel>;
};

function mapAttemptInsertRow(row: AttemptInsertRow): AssessmentAttemptRecordSummary {
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

function computeCompletionPercentage(progress: {
  answeredQuestions: number;
  totalQuestions: number;
}): number {
  if (progress.totalQuestions <= 0) {
    return 0;
  }

  return Math.floor((progress.answeredQuestions / progress.totalQuestions) * 100);
}

function resolveLifecycleStatus(params: {
  attempt: AssessmentAttemptRecordSummary | null;
  result: AssessmentResultRecordSummary | null;
}): AssessmentLifecycleStatus {
  if (!params.attempt) {
    return 'not_started';
  }

  if (params.attempt.lifecycleStatus === 'IN_PROGRESS' || params.attempt.completedAt === null) {
    return 'in_progress';
  }

  if (
    params.result &&
    params.result.readinessStatus === 'READY' &&
    params.result.hasCanonicalResultPayload
  ) {
    return 'ready';
  }

  if (
    params.attempt.lifecycleStatus === 'FAILED' ||
    params.result?.readinessStatus === 'FAILED' ||
    params.result?.pipelineStatus === 'FAILED'
  ) {
    return 'error';
  }

  return 'completed_processing';
}

async function getAssessmentSummaryOrThrow(
  db: Queryable,
  assessmentKey: string,
): Promise<AssessmentRecordSummary> {
  const assessment = await getPublishedAssessmentSummaryByKey(db, assessmentKey);
  if (!assessment) {
    throw new AssessmentLifecycleNotFoundError(
      `Published assessment not found for key ${assessmentKey}`,
    );
  }

  return assessment;
}

async function getProgressSummary(
  db: Queryable,
  params: {
    attempt: AssessmentAttemptRecordSummary | null;
    assessmentVersionId: string;
  },
): Promise<AssessmentProgressSummary> {
  const totalQuestions = await countQuestionsForAssessmentVersion(db, params.assessmentVersionId);
  if (totalQuestions <= 0) {
    throw new InvalidAssessmentLifecycleDataError(
      `Assessment version ${params.assessmentVersionId} has no questions`,
    );
  }

  const answeredQuestions = params.attempt
    ? await countAnsweredQuestionsForAttempt(db, params.attempt.attemptId)
    : 0;

  return {
    totalQuestions,
    answeredQuestions,
    completionPercentage: computeCompletionPercentage({
      answeredQuestions,
      totalQuestions,
    }),
  };
}

async function buildLifecycleViewModel(
  db: Queryable,
  params: {
    assessment: AssessmentRecordSummary;
    attempt: AssessmentAttemptRecordSummary | null;
  },
): Promise<AssessmentAttemptLifecycleViewModel> {
  const progress = await getProgressSummary(db, {
    attempt: params.attempt,
    assessmentVersionId: params.attempt?.assessmentVersionId ?? params.assessment.assessmentVersionId,
  });
  const latestResult = params.attempt
    ? await getLatestResultSummaryForAttempt(db, params.attempt.attemptId)
    : null;
  const status = resolveLifecycleStatus({
    attempt: params.attempt,
    result: latestResult,
  });

  return {
    attemptId: params.attempt?.attemptId ?? null,
    assessmentId: params.assessment.assessmentId,
    assessmentKey: params.assessment.assessmentKey,
    assessmentVersionId: params.attempt?.assessmentVersionId ?? params.assessment.assessmentVersionId,
    versionTag: params.assessment.versionTag,
    status,
    startedAt: params.attempt?.startedAt ?? null,
    updatedAt: params.attempt?.updatedAt ?? null,
    completedAt: params.attempt?.completedAt ?? null,
    totalQuestions: progress.totalQuestions,
    answeredQuestions: progress.answeredQuestions,
    completionPercentage: progress.completionPercentage,
    latestResultId: latestResult?.resultId ?? null,
    latestResultReady: latestResult?.readinessStatus === 'READY' && latestResult.hasCanonicalResultPayload,
    latestResultStatus: latestResult?.readinessStatus ?? null,
    lastError: latestResult?.failureReason ?? (status === 'error' ? 'attempt_failed' : null),
  };
}

async function createAttempt(
  db: Queryable,
  params: {
    userId: string;
    assessment: AssessmentRecordSummary;
  },
): Promise<AssessmentAttemptRecordSummary> {
  const result = await db.query<AttemptInsertRow>(
    `
    INSERT INTO attempts (
      user_id,
      assessment_id,
      assessment_version_id,
      lifecycle_status
    )
    VALUES ($1, $2, $3, 'IN_PROGRESS')
    RETURNING
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
    `,
    [params.userId, params.assessment.assessmentId, params.assessment.assessmentVersionId],
  );

  const row = result.rows[0];
  if (!row) {
    throw new InvalidAssessmentLifecycleDataError('Attempt creation did not return a created attempt row');
  }

  return mapAttemptInsertRow(row);
}

export function createAssessmentAttemptLifecycleService(
  deps: AssessmentAttemptLifecycleServiceDeps,
): AssessmentAttemptLifecycleService {
  return {
    async getAssessmentAttemptLifecycle(params) {
      const assessment = await getAssessmentSummaryOrThrow(deps.db, params.assessmentKey);
      const inProgressAttempt = await getLatestInProgressAttemptForUserAndAssessment(deps.db, {
        userId: params.userId,
        assessmentId: assessment.assessmentId,
      });
      const attempt =
        inProgressAttempt ??
        (await getLatestAttemptForUserAndAssessment(deps.db, {
          userId: params.userId,
          assessmentId: assessment.assessmentId,
        }));

      return buildLifecycleViewModel(deps.db, {
        assessment,
        attempt,
      });
    },

    async startAssessmentAttempt(params) {
      const assessment = await getAssessmentSummaryOrThrow(deps.db, params.assessmentKey);
      const inProgressAttempt = await getLatestInProgressAttemptForUserAndAssessment(deps.db, {
        userId: params.userId,
        assessmentId: assessment.assessmentId,
      });
      const attempt = inProgressAttempt ?? (await createAttempt(deps.db, {
        userId: params.userId,
        assessment: assessment,
      }));

      return buildLifecycleViewModel(deps.db, {
        assessment,
        attempt,
      });
    },

    async getOrCreateInProgressAttempt(params) {
      return this.startAssessmentAttempt(params);
    },
  };
}
