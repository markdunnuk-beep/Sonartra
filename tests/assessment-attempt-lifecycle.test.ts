import test from 'node:test';
import assert from 'node:assert/strict';

import { createAssessmentAttemptLifecycleService } from '@/lib/server/assessment-attempt-lifecycle';
import type { Queryable } from '@/lib/engine/repository-sql';

type AssessmentFixture = {
  assessmentId: string;
  assessmentKey: string;
  assessmentVersionId: string;
  versionTag: string;
};

type AttemptFixture = {
  attemptId: string;
  userId: string;
  assessmentId: string;
  assessmentVersionId: string;
  lifecycleStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'SCORED' | 'RESULT_READY' | 'FAILED';
  startedAt: string;
  submittedAt: string | null;
  completedAt: string | null;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
};

type ResponseFixture = {
  attemptId: string;
  questionId: string;
};

type ResultFixture = {
  resultId: string;
  attemptId: string;
  pipelineStatus: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  readinessStatus: 'PROCESSING' | 'READY' | 'FAILED';
  generatedAt: string | null;
  failureReason: string | null;
  hasCanonicalResultPayload: boolean;
  createdAt: string;
  updatedAt: string;
};

function createFakeDb(params?: {
  assessment?: AssessmentFixture;
  attempts?: AttemptFixture[];
  responses?: ResponseFixture[];
  results?: ResultFixture[];
  questionCountByVersionId?: Record<string, number>;
}): Queryable {
  const assessment =
    params?.assessment ?? {
      assessmentId: 'assessment-1',
      assessmentKey: 'wplp80',
      assessmentVersionId: 'version-1',
      versionTag: '1.0.0',
    };
  const attempts = [...(params?.attempts ?? [])];
  const responses = [...(params?.responses ?? [])];
  const results = [...(params?.results ?? [])];
  const questionCountByVersionId = {
    [assessment.assessmentVersionId]: 80,
    ...(params?.questionCountByVersionId ?? {}),
  };

  let attemptSequence = attempts.length + 1;

  return {
    async query<T>(text: string, queryParams?: unknown[]) {
      if (text.includes('FROM assessments a') && text.includes("av.lifecycle_status = 'PUBLISHED'")) {
        const assessmentKey = queryParams?.[0];
        if (assessment.assessmentKey !== assessmentKey) {
          return { rows: [] as T[] };
        }

        return {
          rows: ([{
            assessment_id: assessment.assessmentId,
            assessment_key: assessment.assessmentKey,
            assessment_version_id: assessment.assessmentVersionId,
            version_tag: assessment.versionTag,
          }] as unknown[]) as T[],
        };
      }

      if (text.includes('FROM attempts') && text.includes("AND lifecycle_status = 'IN_PROGRESS'")) {
        const [userId, assessmentId] = queryParams as [string, string];
        const row = attempts
          .filter((attempt) => attempt.userId === userId && attempt.assessmentId === assessmentId && attempt.lifecycleStatus === 'IN_PROGRESS')
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

        if (!row) {
          return { rows: [] as T[] };
        }

        return {
          rows: ([{
            attempt_id: row.attemptId,
            user_id: row.userId,
            assessment_id: row.assessmentId,
            assessment_version_id: row.assessmentVersionId,
            lifecycle_status: row.lifecycleStatus,
            started_at: row.startedAt,
            submitted_at: row.submittedAt,
            completed_at: row.completedAt,
            last_activity_at: row.lastActivityAt,
            created_at: row.createdAt,
            updated_at: row.updatedAt,
          }] as unknown[]) as T[],
        };
      }

      if (text.includes('FROM attempts') && !text.includes("AND lifecycle_status = 'IN_PROGRESS'")) {
        const [userId, assessmentId] = queryParams as [string, string];
        const row = attempts
          .filter((attempt) => attempt.userId === userId && attempt.assessmentId === assessmentId)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

        if (!row) {
          return { rows: [] as T[] };
        }

        return {
          rows: ([{
            attempt_id: row.attemptId,
            user_id: row.userId,
            assessment_id: row.assessmentId,
            assessment_version_id: row.assessmentVersionId,
            lifecycle_status: row.lifecycleStatus,
            started_at: row.startedAt,
            submitted_at: row.submittedAt,
            completed_at: row.completedAt,
            last_activity_at: row.lastActivityAt,
            created_at: row.createdAt,
            updated_at: row.updatedAt,
          }] as unknown[]) as T[],
        };
      }

      if (text.includes('COUNT(DISTINCT question_id) AS answered_questions')) {
        const attemptId = queryParams?.[0] as string;
        const answeredQuestions = new Set(
          responses.filter((response) => response.attemptId === attemptId).map((response) => response.questionId),
        ).size;

        return {
          rows: ([{ answered_questions: answeredQuestions }] as unknown[]) as T[],
        };
      }

      if (text.includes('FROM results') && text.includes('canonical_result_payload IS NOT NULL AS has_canonical_result_payload')) {
        const attemptId = queryParams?.[0] as string;
        const row = results
          .filter((result) => result.attemptId === attemptId)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

        if (!row) {
          return { rows: [] as T[] };
        }

        return {
          rows: ([{
            result_id: row.resultId,
            attempt_id: row.attemptId,
            pipeline_status: row.pipelineStatus,
            readiness_status: row.readinessStatus,
            generated_at: row.generatedAt,
            failure_reason: row.failureReason,
            has_canonical_result_payload: row.hasCanonicalResultPayload,
            created_at: row.createdAt,
            updated_at: row.updatedAt,
          }] as unknown[]) as T[],
        };
      }

      if (text.includes('COUNT(*) AS total_questions')) {
        const assessmentVersionId = queryParams?.[0] as string;
        return {
          rows: ([{ total_questions: questionCountByVersionId[assessmentVersionId] ?? 0 }] as unknown[]) as T[],
        };
      }

      if (text.includes('INSERT INTO attempts')) {
        const [userId, assessmentId, assessmentVersionId] = queryParams as [string, string, string];
        const timestamp = `2026-01-01T00:00:0${attemptSequence}.000Z`;
        const attempt: AttemptFixture = {
          attemptId: `attempt-${attemptSequence}`,
          userId,
          assessmentId,
          assessmentVersionId,
          lifecycleStatus: 'IN_PROGRESS',
          startedAt: timestamp,
          submittedAt: null,
          completedAt: null,
          lastActivityAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        attempts.push(attempt);
        attemptSequence += 1;

        return {
          rows: ([{
            attempt_id: attempt.attemptId,
            user_id: attempt.userId,
            assessment_id: attempt.assessmentId,
            assessment_version_id: attempt.assessmentVersionId,
            lifecycle_status: attempt.lifecycleStatus,
            started_at: attempt.startedAt,
            submitted_at: attempt.submittedAt,
            completed_at: attempt.completedAt,
            last_activity_at: attempt.lastActivityAt,
            created_at: attempt.createdAt,
            updated_at: attempt.updatedAt,
          }] as unknown[]) as T[],
        };
      }

      return { rows: [] as T[] };
    },
  };
}

test('no attempt returns not_started', async () => {
  const service = createAssessmentAttemptLifecycleService({
    db: createFakeDb({ questionCountByVersionId: { 'version-1': 42 } }),
  });

  const lifecycle = await service.getAssessmentAttemptLifecycle({
    userId: 'user-1',
    assessmentKey: 'wplp80',
  });

  assert.equal(lifecycle.status, 'not_started');
  assert.equal(lifecycle.attemptId, null);
  assert.equal(lifecycle.totalQuestions, 42);
});

test('existing in-progress attempt returns in_progress', async () => {
  const service = createAssessmentAttemptLifecycleService({
    db: createFakeDb({
      attempts: [
        {
          attemptId: 'attempt-1',
          userId: 'user-1',
          assessmentId: 'assessment-1',
          assessmentVersionId: 'version-1',
          lifecycleStatus: 'IN_PROGRESS',
          startedAt: '2026-01-01T00:00:01.000Z',
          submittedAt: null,
          completedAt: null,
          lastActivityAt: '2026-01-01T00:00:05.000Z',
          createdAt: '2026-01-01T00:00:01.000Z',
          updatedAt: '2026-01-01T00:00:05.000Z',
        },
      ],
    }),
  });

  const lifecycle = await service.getAssessmentAttemptLifecycle({
    userId: 'user-1',
    assessmentKey: 'wplp80',
  });

  assert.equal(lifecycle.status, 'in_progress');
  assert.equal(lifecycle.attemptId, 'attempt-1');
});

test('completed attempt with no result returns completed_processing', async () => {
  const service = createAssessmentAttemptLifecycleService({
    db: createFakeDb({
      attempts: [
        {
          attemptId: 'attempt-1',
          userId: 'user-1',
          assessmentId: 'assessment-1',
          assessmentVersionId: 'version-1',
          lifecycleStatus: 'SUBMITTED',
          startedAt: '2026-01-01T00:00:01.000Z',
          submittedAt: '2026-01-01T00:01:00.000Z',
          completedAt: '2026-01-01T00:01:00.000Z',
          lastActivityAt: '2026-01-01T00:01:00.000Z',
          createdAt: '2026-01-01T00:00:01.000Z',
          updatedAt: '2026-01-01T00:01:00.000Z',
        },
      ],
    }),
  });

  const lifecycle = await service.getAssessmentAttemptLifecycle({
    userId: 'user-1',
    assessmentKey: 'wplp80',
  });

  assert.equal(lifecycle.status, 'completed_processing');
});

test('completed attempt with ready result returns ready', async () => {
  const service = createAssessmentAttemptLifecycleService({
    db: createFakeDb({
      attempts: [
        {
          attemptId: 'attempt-1',
          userId: 'user-1',
          assessmentId: 'assessment-1',
          assessmentVersionId: 'version-1',
          lifecycleStatus: 'RESULT_READY',
          startedAt: '2026-01-01T00:00:01.000Z',
          submittedAt: '2026-01-01T00:01:00.000Z',
          completedAt: '2026-01-01T00:01:10.000Z',
          lastActivityAt: '2026-01-01T00:01:10.000Z',
          createdAt: '2026-01-01T00:00:01.000Z',
          updatedAt: '2026-01-01T00:01:10.000Z',
        },
      ],
      results: [
        {
          resultId: 'result-1',
          attemptId: 'attempt-1',
          pipelineStatus: 'COMPLETED',
          readinessStatus: 'READY',
          generatedAt: '2026-01-01T00:01:10.000Z',
          failureReason: null,
          hasCanonicalResultPayload: true,
          createdAt: '2026-01-01T00:01:10.000Z',
          updatedAt: '2026-01-01T00:01:10.000Z',
        },
      ],
    }),
  });

  const lifecycle = await service.getAssessmentAttemptLifecycle({
    userId: 'user-1',
    assessmentKey: 'wplp80',
  });

  assert.equal(lifecycle.status, 'ready');
  assert.equal(lifecycle.latestResultReady, true);
});

test('completed attempt with failed result returns error', async () => {
  const service = createAssessmentAttemptLifecycleService({
    db: createFakeDb({
      attempts: [
        {
          attemptId: 'attempt-1',
          userId: 'user-1',
          assessmentId: 'assessment-1',
          assessmentVersionId: 'version-1',
          lifecycleStatus: 'SCORED',
          startedAt: '2026-01-01T00:00:01.000Z',
          submittedAt: '2026-01-01T00:01:00.000Z',
          completedAt: '2026-01-01T00:01:10.000Z',
          lastActivityAt: '2026-01-01T00:01:10.000Z',
          createdAt: '2026-01-01T00:00:01.000Z',
          updatedAt: '2026-01-01T00:01:10.000Z',
        },
      ],
      results: [
        {
          resultId: 'result-1',
          attemptId: 'attempt-1',
          pipelineStatus: 'FAILED',
          readinessStatus: 'FAILED',
          generatedAt: null,
          failureReason: 'engine_failed',
          hasCanonicalResultPayload: false,
          createdAt: '2026-01-01T00:01:10.000Z',
          updatedAt: '2026-01-01T00:01:10.000Z',
        },
      ],
    }),
  });

  const lifecycle = await service.getAssessmentAttemptLifecycle({
    userId: 'user-1',
    assessmentKey: 'wplp80',
  });

  assert.equal(lifecycle.status, 'error');
  assert.equal(lifecycle.lastError, 'engine_failed');
});

test('startAssessmentAttempt reuses existing in-progress attempt', async () => {
  const service = createAssessmentAttemptLifecycleService({
    db: createFakeDb({
      attempts: [
        {
          attemptId: 'attempt-1',
          userId: 'user-1',
          assessmentId: 'assessment-1',
          assessmentVersionId: 'version-1',
          lifecycleStatus: 'IN_PROGRESS',
          startedAt: '2026-01-01T00:00:01.000Z',
          submittedAt: null,
          completedAt: null,
          lastActivityAt: '2026-01-01T00:00:05.000Z',
          createdAt: '2026-01-01T00:00:01.000Z',
          updatedAt: '2026-01-01T00:00:05.000Z',
        },
      ],
    }),
  });

  const lifecycle = await service.startAssessmentAttempt({
    userId: 'user-1',
    assessmentKey: 'wplp80',
  });

  assert.equal(lifecycle.attemptId, 'attempt-1');
  assert.equal(lifecycle.status, 'in_progress');
});

test('startAssessmentAttempt creates a new attempt when none exists', async () => {
  const service = createAssessmentAttemptLifecycleService({
    db: createFakeDb(),
  });

  const lifecycle = await service.startAssessmentAttempt({
    userId: 'user-1',
    assessmentKey: 'wplp80',
  });

  assert.equal(lifecycle.attemptId, 'attempt-1');
  assert.equal(lifecycle.status, 'in_progress');
});

test('starting after a completed ready attempt creates a new attempt', async () => {
  const service = createAssessmentAttemptLifecycleService({
    db: createFakeDb({
      attempts: [
        {
          attemptId: 'attempt-1',
          userId: 'user-1',
          assessmentId: 'assessment-1',
          assessmentVersionId: 'version-1',
          lifecycleStatus: 'RESULT_READY',
          startedAt: '2026-01-01T00:00:01.000Z',
          submittedAt: '2026-01-01T00:01:00.000Z',
          completedAt: '2026-01-01T00:01:10.000Z',
          lastActivityAt: '2026-01-01T00:01:10.000Z',
          createdAt: '2026-01-01T00:00:01.000Z',
          updatedAt: '2026-01-01T00:01:10.000Z',
        },
      ],
    }),
  });

  const lifecycle = await service.startAssessmentAttempt({
    userId: 'user-1',
    assessmentKey: 'wplp80',
  });

  assert.equal(lifecycle.attemptId, 'attempt-2');
  assert.equal(lifecycle.status, 'in_progress');
});

test('answered question count respects overwrite semantics via distinct question count', async () => {
  const service = createAssessmentAttemptLifecycleService({
    db: createFakeDb({
      attempts: [
        {
          attemptId: 'attempt-1',
          userId: 'user-1',
          assessmentId: 'assessment-1',
          assessmentVersionId: 'version-1',
          lifecycleStatus: 'IN_PROGRESS',
          startedAt: '2026-01-01T00:00:01.000Z',
          submittedAt: null,
          completedAt: null,
          lastActivityAt: '2026-01-01T00:00:05.000Z',
          createdAt: '2026-01-01T00:00:01.000Z',
          updatedAt: '2026-01-01T00:00:05.000Z',
        },
      ],
      responses: [
        { attemptId: 'attempt-1', questionId: 'q1' },
        { attemptId: 'attempt-1', questionId: 'q1' },
        { attemptId: 'attempt-1', questionId: 'q2' },
      ],
      questionCountByVersionId: { 'version-1': 5 },
    }),
  });

  const lifecycle = await service.getAssessmentAttemptLifecycle({
    userId: 'user-1',
    assessmentKey: 'wplp80',
  });

  assert.equal(lifecycle.answeredQuestions, 2);
});

test('total question count comes from persisted definition data', async () => {
  const service = createAssessmentAttemptLifecycleService({
    db: createFakeDb({
      questionCountByVersionId: { 'version-1': 17 },
    }),
  });

  const lifecycle = await service.getAssessmentAttemptLifecycle({
    userId: 'user-1',
    assessmentKey: 'wplp80',
  });

  assert.equal(lifecycle.totalQuestions, 17);
});

test('completion percentage is computed correctly', async () => {
  const service = createAssessmentAttemptLifecycleService({
    db: createFakeDb({
      attempts: [
        {
          attemptId: 'attempt-1',
          userId: 'user-1',
          assessmentId: 'assessment-1',
          assessmentVersionId: 'version-1',
          lifecycleStatus: 'IN_PROGRESS',
          startedAt: '2026-01-01T00:00:01.000Z',
          submittedAt: null,
          completedAt: null,
          lastActivityAt: '2026-01-01T00:00:05.000Z',
          createdAt: '2026-01-01T00:00:01.000Z',
          updatedAt: '2026-01-01T00:00:05.000Z',
        },
      ],
      responses: [
        { attemptId: 'attempt-1', questionId: 'q1' },
        { attemptId: 'attempt-1', questionId: 'q2' },
      ],
      questionCountByVersionId: { 'version-1': 8 },
    }),
  });

  const lifecycle = await service.getAssessmentAttemptLifecycle({
    userId: 'user-1',
    assessmentKey: 'wplp80',
  });

  assert.equal(lifecycle.completionPercentage, 25);
});

test('deterministic repeated reads return the same lifecycle view model', async () => {
  const service = createAssessmentAttemptLifecycleService({
    db: createFakeDb({
      attempts: [
        {
          attemptId: 'attempt-1',
          userId: 'user-1',
          assessmentId: 'assessment-1',
          assessmentVersionId: 'version-1',
          lifecycleStatus: 'IN_PROGRESS',
          startedAt: '2026-01-01T00:00:01.000Z',
          submittedAt: null,
          completedAt: null,
          lastActivityAt: '2026-01-01T00:00:05.000Z',
          createdAt: '2026-01-01T00:00:01.000Z',
          updatedAt: '2026-01-01T00:00:05.000Z',
        },
      ],
      responses: [
        { attemptId: 'attempt-1', questionId: 'q1' },
      ],
      questionCountByVersionId: { 'version-1': 4 },
    }),
  });

  const first = await service.getAssessmentAttemptLifecycle({
    userId: 'user-1',
    assessmentKey: 'wplp80',
  });
  const second = await service.getAssessmentAttemptLifecycle({
    userId: 'user-1',
    assessmentKey: 'wplp80',
  });

  assert.deepEqual(first, second);
});
