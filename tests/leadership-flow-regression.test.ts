import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { Queryable } from '@/lib/engine/repository-sql';
import { createAssessmentAttemptLifecycleService } from '@/lib/server/assessment-attempt-lifecycle';
import { createAssessmentCompletionService } from '@/lib/server/assessment-completion-service';
import { projectAssessmentWorkspaceItem } from '@/lib/server/dashboard-workspace-view-model';
import { createAssessmentRunnerService } from '@/lib/server/assessment-runner-service';
import {
  AssessmentRunnerForbiddenError,
  AssessmentRunnerNotFoundError,
} from '@/lib/server/assessment-runner-types';

type LifecycleAssessmentFixture = {
  assessmentId: string;
  assessmentKey: string;
  assessmentVersionId: string;
  versionTag: string;
};

type LifecycleAttemptFixture = {
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

type LifecycleHarness = {
  attempts: LifecycleAttemptFixture[];
  db: Queryable;
};

type RunnerAttemptFixture = {
  attemptId: string;
  userId: string;
  assessmentId: string;
  assessmentKey: string;
  assessmentTitle: string;
  assessmentDescription: string | null;
  assessmentVersionId: string;
  versionTag: string;
  lifecycleStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'SCORED' | 'RESULT_READY' | 'FAILED';
  startedAt: string;
  submittedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

type RunnerQuestionFixture = {
  questionId: string;
  questionKey: string;
  prompt: string;
  orderIndex: number;
  domainTitle: string;
  options: Array<{
    optionId: string;
    optionKey: string;
    optionLabel: string | null;
    optionText: string;
    orderIndex: number;
  }>;
};

type RunnerResponseFixture = {
  attemptId: string;
  questionId: string;
  selectedOptionId: string;
};

type RunnerResultFixture = {
  attemptId: string;
  resultId: string;
  readinessStatus: 'PROCESSING' | 'READY' | 'FAILED';
  hasCanonicalResultPayload: boolean;
  failureReason: string | null;
};

function createLifecycleHarness(params?: {
  assessment?: LifecycleAssessmentFixture;
  attempts?: LifecycleAttemptFixture[];
  questionCountByVersionId?: Record<string, number>;
}): LifecycleHarness {
  const assessment =
    params?.assessment ?? {
      assessmentId: 'assessment-leadership',
      assessmentKey: 'leadership',
      assessmentVersionId: 'version-leadership',
      versionTag: '2026.04',
    };
  const attempts = [...(params?.attempts ?? [])];
  const questionCountByVersionId = {
    [assessment.assessmentVersionId]: 40,
    ...(params?.questionCountByVersionId ?? {}),
  };

  let attemptSequence = attempts.length + 1;

  const db: Queryable = {
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
        return {
          rows: ([{ answered_questions: 0 }] as unknown[]) as T[],
        };
      }

      if (text.includes('FROM results') && text.includes('canonical_result_payload IS NOT NULL AS has_canonical_result_payload')) {
        return { rows: [] as T[] };
      }

      if (text.includes('COUNT(*) AS total_questions')) {
        const assessmentVersionId = queryParams?.[0] as string;
        return {
          rows: ([{ total_questions: questionCountByVersionId[assessmentVersionId] ?? 0 }] as unknown[]) as T[],
        };
      }

      if (text.includes('INSERT INTO attempts')) {
        const [userId, assessmentId, assessmentVersionId] = queryParams as [string, string, string];
        const timestamp = `2026-04-18T09:00:0${attemptSequence}.000Z`;
        const attempt: LifecycleAttemptFixture = {
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

  return { attempts, db };
}

function createRunnerDb(params: {
  attempts: RunnerAttemptFixture[];
  questionsByVersionId?: Record<string, RunnerQuestionFixture[]>;
  responses?: RunnerResponseFixture[];
  results?: RunnerResultFixture[];
}): Queryable {
  const attempts = [...params.attempts];
  const questionsByVersionId = { ...(params.questionsByVersionId ?? {}) };
  const responses = [...(params.responses ?? [])];
  const results = [...(params.results ?? [])];

  return {
    async query<T>(text: string, queryParams?: unknown[]) {
      if (
        text.includes('FROM attempts t') &&
        text.includes('WHERE t.id = $1') &&
        text.includes('a.assessment_key')
      ) {
        const attemptId = queryParams?.[0] as string;
        const row = attempts.find((attempt) => attempt.attemptId === attemptId);

        return {
          rows: (row
            ? [({
                attempt_id: row.attemptId,
                user_id: row.userId,
                assessment_id: row.assessmentId,
                assessment_key: row.assessmentKey,
                assessment_title: row.assessmentTitle,
                assessment_description: row.assessmentDescription,
                assessment_version_id: row.assessmentVersionId,
                version_tag: row.versionTag,
                lifecycle_status: row.lifecycleStatus,
                started_at: row.startedAt,
                submitted_at: row.submittedAt,
                completed_at: row.completedAt,
                updated_at: row.updatedAt,
              })]
            : []) as T[],
        };
      }

      if (text.includes('FROM results') && text.includes('readiness_status')) {
        const attemptId = queryParams?.[0] as string;
        const row = results.find((result) => result.attemptId === attemptId);

        return {
          rows: (row
            ? [({
                result_id: row.resultId,
                readiness_status: row.readinessStatus,
                has_canonical_result_payload: row.hasCanonicalResultPayload,
                failure_reason: row.failureReason,
              })]
            : []) as T[],
        };
      }

      if (text.includes('FROM questions q') && text.includes('INNER JOIN options o ON o.question_id = q.id')) {
        const assessmentVersionId = queryParams?.[0] as string;
        const rows = (questionsByVersionId[assessmentVersionId] ?? []).flatMap((question) =>
          question.options.map((option) => ({
            question_id: question.questionId,
            question_key: question.questionKey,
            prompt: question.prompt,
            question_order_index: question.orderIndex,
            domain_title: question.domainTitle,
            option_id: option.optionId,
            option_key: option.optionKey,
            option_label: option.optionLabel,
            option_text: option.optionText,
            option_order_index: option.orderIndex,
          })),
        );

        return { rows: rows as T[] };
      }

      if (text.includes('SELECT COUNT(*) AS total_questions') && text.includes('CROSS JOIN LATERAL')) {
        const [attemptId, assessmentVersionId] = queryParams as [string, string];
        const totalQuestions = (questionsByVersionId[assessmentVersionId] ?? []).length;
        const answeredQuestions = responses.filter((response) => response.attemptId === attemptId).length;

        return {
          rows: ([{
            answered_questions: answeredQuestions,
            total_questions: totalQuestions,
          }] as unknown[]) as T[],
        };
      }

      if (text.includes('SELECT 1 AS valid_row')) {
        const [attemptId, questionId, selectedOptionId] = queryParams as [string, string, string];
        const attempt = attempts.find((entry) => entry.attemptId === attemptId);
        const question = attempt
          ? (questionsByVersionId[attempt.assessmentVersionId] ?? []).find((entry) => entry.questionId === questionId)
          : null;
        const valid = question?.options.some((option) => option.optionId === selectedOptionId) ?? false;

        return {
          rows: (valid ? ([{ valid_row: 1 }] as unknown[]) : []) as T[],
        };
      }

      if (
        text.includes('FROM responses') &&
        text.includes('WHERE attempt_id = $1') &&
        text.includes('selected_option_id')
      ) {
        const attemptId = queryParams?.[0] as string;
        return {
          rows: responses
            .filter((response) => response.attemptId === attemptId)
            .map((response) => ({
              question_id: response.questionId,
              selected_option_id: response.selectedOptionId,
            })) as T[],
        };
      }

      if (text.includes('INSERT INTO responses')) {
        const [attemptId, questionId, selectedOptionId] = queryParams as [string, string, string];
        const existing = responses.find(
          (response) => response.attemptId === attemptId && response.questionId === questionId,
        );

        if (existing) {
          existing.selectedOptionId = selectedOptionId;
        } else {
          responses.push({
            attemptId,
            questionId,
            selectedOptionId,
          });
        }

        return { rows: [] as T[] };
      }

      if (text.includes('UPDATE attempts') && text.includes('last_activity_at = NOW()')) {
        return { rows: [] as T[] };
      }

      return { rows: [] as T[] };
    },
  };
}

function buildRunnerQuestions(): RunnerQuestionFixture[] {
  return [
    {
      questionId: 'question-1',
      questionKey: 'leadership-q1',
      prompt: 'How do you set direction when priorities conflict?',
      orderIndex: 0,
      domainTitle: 'Leadership style',
      options: [
        {
          optionId: 'option-1a',
          optionKey: 'leadership-q1-a',
          optionLabel: 'A',
          optionText: 'Clarify the decision and move quickly.',
          orderIndex: 0,
        },
        {
          optionId: 'option-1b',
          optionKey: 'leadership-q1-b',
          optionLabel: 'B',
          optionText: 'Create alignment before committing.',
          orderIndex: 1,
        },
      ],
    },
  ];
}

test('leadership clean entry exposes a single Start CTA and no resume leak', () => {
  const item = projectAssessmentWorkspaceItem({
    assessment: {
      assessmentId: 'assessment-leadership',
      assessmentKey: 'leadership',
      title: 'Leadership',
      description: 'Leadership assessment',
      versionTag: '2026.04',
    },
    lifecycle: {
      attemptId: null,
      assessmentId: 'assessment-leadership',
      assessmentKey: 'leadership',
      assessmentVersionId: 'version-leadership',
      versionTag: '2026.04',
      status: 'not_started',
      startedAt: null,
      updatedAt: null,
      completedAt: null,
      totalQuestions: 40,
      answeredQuestions: 0,
      completionPercentage: 0,
      latestResultId: null,
      latestResultReady: false,
      latestResultStatus: null,
      lastError: null,
    },
    latestReadyResult: null,
  });

  assert.equal(item.status, 'not_started');
  assert.equal(item.attemptId, null);
  assert.equal(item.cta.action, 'start');
  assert.equal(item.cta.label, 'Start');
  assert.equal(item.cta.href, '/app/assessments/leadership');
  assert.equal(item.cta.disabled, false);
  assert.match(item.statusDetail, /40 questions ready to begin/i);
});

test('leadership entry resolution creates one attempt and repeated entry reuses it', async () => {
  const harness = createLifecycleHarness();
  const lifecycleService = createAssessmentAttemptLifecycleService({
    db: harness.db,
  });
  const service = createAssessmentRunnerService({
    db: harness.db,
    lifecycleService,
  });

  const first = await service.resolveAssessmentEntry({
    userId: 'user-leadership',
    assessmentKey: 'leadership',
  });
  const second = await service.resolveAssessmentEntry({
    userId: 'user-leadership',
    assessmentKey: 'leadership',
  });

  assert.equal(first.kind, 'runner');
  assert.equal(second.kind, 'runner');
  assert.equal(first.attemptId, second.attemptId);
  assert.equal(first.href, `/app/assessments/leadership/attempts/${first.attemptId}`);
  assert.equal(harness.attempts.length, 1);
  assert.equal(harness.attempts[0]?.lifecycleStatus, 'IN_PROGRESS');
});

test('leadership entry and attempt routes keep the starting and processing handoffs explicit', () => {
  const entryPageSource = readFileSync(
    path.join(process.cwd(), 'app', '(user)', 'app', 'assessments', '[assessmentKey]', 'page.tsx'),
    'utf8',
  );
  const entryLoadingSource = readFileSync(
    path.join(process.cwd(), 'app', '(user)', 'app', 'assessments', '[assessmentKey]', 'loading.tsx'),
    'utf8',
  );
  const attemptPageSource = readFileSync(
    path.join(process.cwd(), 'app', '(user)', 'app', 'assessments', '[assessmentKey]', 'attempts', '[attemptId]', 'page.tsx'),
    'utf8',
  );

  assert.match(entryPageSource, /const STARTING_MINIMUM_VISIBLE_MS = 800;/);
  assert.match(entryPageSource, /if \(resolution\.kind === 'runner'\)/);
  assert.match(entryLoadingSource, /title="Preparing your assessment"/);
  assert.match(entryLoadingSource, /variant="initialising"/);
  assert.match(attemptPageSource, /runner\.status === 'completed_processing'/);
  assert.match(attemptPageSource, /<AssessmentProcessingState/);
  assert.match(attemptPageSource, /stage="processing"/);
});

test('leadership submit returns a processing handoff and refresh keeps the same processing attempt', async () => {
  const processingSubmitService = createAssessmentRunnerService({
    db: createRunnerDb({
      attempts: [{
        attemptId: 'attempt-processing',
        userId: 'user-leadership',
        assessmentId: 'assessment-leadership',
        assessmentKey: 'leadership',
        assessmentTitle: 'Leadership',
        assessmentDescription: 'Leadership assessment',
        assessmentVersionId: 'version-leadership',
        versionTag: '2026.04',
        lifecycleStatus: 'IN_PROGRESS',
        startedAt: '2026-04-18T09:00:00.000Z',
        submittedAt: null,
        completedAt: null,
        updatedAt: '2026-04-18T09:00:10.000Z',
      }],
      questionsByVersionId: {
        'version-leadership': buildRunnerQuestions(),
      },
      responses: [{
        attemptId: 'attempt-processing',
        questionId: 'question-1',
        selectedOptionId: 'option-1a',
      }],
    }),
    completionService: {
      async completeAssessmentAttempt() {
        return {
          success: true,
          attemptId: 'attempt-processing',
          resultId: 'result-processing',
          mode: 'multi_domain',
          lifecycleStatus: 'completed_processing',
          resultStatus: 'processing',
          hasResult: true,
          payloadReady: false,
          alreadyCompleted: false,
          error: null,
        };
      },
    } as ReturnType<typeof createAssessmentCompletionService>,
  });

  const submitted = await processingSubmitService.completeAssessmentAttempt({
    userId: 'user-leadership',
    assessmentKey: 'leadership',
    attemptId: 'attempt-processing',
  });

  assert.equal(submitted.kind, 'processing');
  assert.equal(submitted.href, '/app/assessments/leadership/attempts/attempt-processing');

  const processingRunnerService = createAssessmentRunnerService({
    db: createRunnerDb({
      attempts: [{
        attemptId: 'attempt-processing',
        userId: 'user-leadership',
        assessmentId: 'assessment-leadership',
        assessmentKey: 'leadership',
        assessmentTitle: 'Leadership',
        assessmentDescription: 'Leadership assessment',
        assessmentVersionId: 'version-leadership',
        versionTag: '2026.04',
        lifecycleStatus: 'SUBMITTED',
        startedAt: '2026-04-18T09:00:00.000Z',
        submittedAt: '2026-04-18T09:02:00.000Z',
        completedAt: null,
        updatedAt: '2026-04-18T09:02:00.000Z',
      }],
      questionsByVersionId: {
        'version-leadership': buildRunnerQuestions(),
      },
      responses: [{
        attemptId: 'attempt-processing',
        questionId: 'question-1',
        selectedOptionId: 'option-1a',
      }],
      results: [{
        attemptId: 'attempt-processing',
        resultId: 'result-processing',
        readinessStatus: 'PROCESSING',
        hasCanonicalResultPayload: false,
        failureReason: null,
      }],
    }),
    definitionRepository: {
      async getAssessmentDefinitionByVersion() {
        return null;
      },
    },
  });

  const runner = await processingRunnerService.getAssessmentRunnerViewModel({
    userId: 'user-leadership',
    assessmentKey: 'leadership',
    attemptId: 'attempt-processing',
  });

  assert.equal(runner.status, 'completed_processing');
  assert.equal(runner.attemptId, 'attempt-processing');
  assert.equal(runner.answeredQuestions, 1);
  assert.equal(runner.totalQuestions, 1);
});

test('leadership invalid or foreign runner routes fail cleanly', async () => {
  const service = createAssessmentRunnerService({
    db: createRunnerDb({
      attempts: [{
        attemptId: 'attempt-foreign',
        userId: 'owner-1',
        assessmentId: 'assessment-leadership',
        assessmentKey: 'leadership',
        assessmentTitle: 'Leadership',
        assessmentDescription: 'Leadership assessment',
        assessmentVersionId: 'version-leadership',
        versionTag: '2026.04',
        lifecycleStatus: 'IN_PROGRESS',
        startedAt: '2026-04-18T09:00:00.000Z',
        submittedAt: null,
        completedAt: null,
        updatedAt: '2026-04-18T09:00:10.000Z',
      }],
      questionsByVersionId: {
        'version-leadership': buildRunnerQuestions(),
      },
    }),
    definitionRepository: {
      async getAssessmentDefinitionByVersion() {
        return null;
      },
    },
  });

  await assert.rejects(
    () =>
      service.getAssessmentRunnerViewModel({
        userId: 'intruder',
        assessmentKey: 'leadership',
        attemptId: 'attempt-foreign',
      }),
    AssessmentRunnerForbiddenError,
  );

  await assert.rejects(
    () =>
      service.getAssessmentRunnerViewModel({
        userId: 'owner-1',
        assessmentKey: 'leadership',
        attemptId: 'missing-attempt',
      }),
    AssessmentRunnerNotFoundError,
  );
});
