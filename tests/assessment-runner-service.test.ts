import test from 'node:test';
import assert from 'node:assert/strict';

import type { Queryable } from '@/lib/engine/repository-sql';
import type { RuntimeAssessmentDefinition } from '@/lib/engine/types';
import { createAssessmentRunnerService } from '@/lib/server/assessment-runner-service';
import {
  AssessmentRunnerForbiddenError,
  AssessmentRunnerValidationError,
} from '@/lib/server/assessment-runner-types';

type AttemptFixture = {
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

type QuestionFixture = {
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

type ResponseFixture = {
  attemptId: string;
  questionId: string;
  selectedOptionId: string;
};

type ResultFixture = {
  attemptId: string;
  resultId: string;
  readinessStatus: 'PROCESSING' | 'READY' | 'FAILED';
  hasCanonicalResultPayload: boolean;
  failureReason: string | null;
};

function buildDefinition(params?: {
  assessmentIntro?: RuntimeAssessmentDefinition['assessmentIntro'];
}): RuntimeAssessmentDefinition {
  return {
    assessment: {
      id: 'assessment-1',
      key: 'wplp80',
      title: 'WPLP-80',
      description: 'Signals',
      estimatedTimeMinutes: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    version: {
      id: 'version-1',
      assessmentId: 'assessment-1',
      versionTag: '1.0.0',
      status: 'published',
      isPublished: true,
      publishedAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    assessmentIntro: params?.assessmentIntro ?? null,
    domains: [],
    signals: [],
    questions: [],
  };
}

function createFakeDb(params: {
  attempts: AttemptFixture[];
  questionsByVersionId?: Record<string, QuestionFixture[]>;
  responses?: ResponseFixture[];
  results?: ResultFixture[];
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
            ? [{
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
              }]
            : []) as T[],
        };
      }

      if (text.includes('FROM results') && text.includes('readiness_status')) {
        const attemptId = queryParams?.[0] as string;
        const row = results.find((result) => result.attemptId === attemptId);

        return {
          rows: (row
            ? [{
                result_id: row.resultId,
                readiness_status: row.readinessStatus,
                has_canonical_result_payload: row.hasCanonicalResultPayload,
                failure_reason: row.failureReason,
              }]
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
        const question = attempt ? (questionsByVersionId[attempt.assessmentVersionId] ?? []).find((entry) => entry.questionId === questionId) : null;
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

test('entry resolution creates or reuses runner path for start and resume states', async () => {
  const service = createAssessmentRunnerService({
    db: createFakeDb({ attempts: [] }),
    lifecycleService: {
      async getAssessmentAttemptLifecycle() {
        return {
          attemptId: null,
          assessmentId: 'assessment-1',
          assessmentKey: 'wplp80',
          assessmentVersionId: 'version-1',
          versionTag: '1.0.0',
          status: 'not_started',
          startedAt: null,
          updatedAt: null,
          completedAt: null,
          totalQuestions: 10,
          answeredQuestions: 0,
          completionPercentage: 0,
          latestResultId: null,
          latestResultReady: false,
          latestResultStatus: null,
          lastError: null,
        };
      },
      async startAssessmentAttempt() {
        return {
          attemptId: 'attempt-1',
          assessmentId: 'assessment-1',
          assessmentKey: 'wplp80',
          assessmentVersionId: 'version-1',
          versionTag: '1.0.0',
          status: 'in_progress',
          startedAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          completedAt: null,
          totalQuestions: 10,
          answeredQuestions: 0,
          completionPercentage: 0,
          latestResultId: null,
          latestResultReady: false,
          latestResultStatus: null,
          lastError: null,
        };
      },
      async getOrCreateInProgressAttempt() {
        throw new Error('not_used');
      },
    },
  });

  const resolution = await service.resolveAssessmentEntry({
    userId: 'user-1',
    assessmentKey: 'wplp80',
  });

  assert.deepEqual(resolution, {
    kind: 'runner',
    assessmentKey: 'wplp80',
    attemptId: 'attempt-1',
    href: '/app/assessments/wplp80/attempts/attempt-1',
  });
});

test('runner view model loads ordered questions and saved responses for owned attempt', async () => {
  const service = createAssessmentRunnerService({
    db: createFakeDb({
      attempts: [{
        attemptId: 'attempt-1',
        userId: 'user-1',
        assessmentId: 'assessment-1',
        assessmentKey: 'wplp80',
        assessmentTitle: 'WPLP-80',
        assessmentDescription: 'Signals',
        assessmentVersionId: 'version-1',
        versionTag: '1.0.0',
        lifecycleStatus: 'IN_PROGRESS',
        startedAt: '2026-01-01T00:00:00.000Z',
        submittedAt: null,
        completedAt: null,
        updatedAt: '2026-01-01T00:00:00.000Z',
      }],
      questionsByVersionId: {
        'version-1': [
          {
            questionId: 'question-1',
            questionKey: 'q1',
            prompt: 'Question one?',
            orderIndex: 1,
            domainTitle: 'Section A',
            options: [
              { optionId: 'option-1', optionKey: 'q1_a', optionLabel: 'A', optionText: 'First', orderIndex: 1 },
              { optionId: 'option-2', optionKey: 'q1_b', optionLabel: 'B', optionText: 'Second', orderIndex: 2 },
            ],
          },
          {
            questionId: 'question-2',
            questionKey: 'q2',
            prompt: 'Question two?',
            orderIndex: 2,
            domainTitle: 'Section B',
            options: [
              { optionId: 'option-3', optionKey: 'q2_a', optionLabel: 'A', optionText: 'Third', orderIndex: 1 },
            ],
          },
        ],
      },
      responses: [{
        attemptId: 'attempt-1',
        questionId: 'question-2',
        selectedOptionId: 'option-3',
      }],
    }),
    definitionRepository: {
      async getAssessmentDefinitionByVersion() {
        return buildDefinition({
          assessmentIntro: {
            introTitle: 'Welcome to WPLP-80',
            introSummary: 'Measure the patterns that shape how you work.',
            introHowItWorks: 'Work through each prompt in order.',
            estimatedTimeOverride: 'About 18 minutes',
            instructions: 'Answer honestly.',
            confidentialityNote: 'Responses remain confidential.',
          },
        });
      },
    },
  });

  const runner = await service.getAssessmentRunnerViewModel({
    userId: 'user-1',
    assessmentKey: 'wplp80',
    attemptId: 'attempt-1',
  });

  assert.equal(runner.status, 'in_progress');
  assert.equal(runner.questions.length, 2);
  assert.equal(runner.questions[0]?.questionId, 'question-1');
  assert.equal(runner.questions[1]?.selectedOptionId, 'option-3');
  assert.equal(runner.assessmentIntro?.introTitle, 'Welcome to WPLP-80');
  assert.equal(runner.answeredQuestions, 1);
  assert.equal(runner.totalQuestions, 2);
  assert.equal(runner.completionPercentage, 50);
});

test('runner view model serves the question structure linked to the attempt version only', async () => {
  const service = createAssessmentRunnerService({
    db: createFakeDb({
      attempts: [{
        attemptId: 'attempt-2',
        userId: 'user-1',
        assessmentId: 'assessment-1',
        assessmentKey: 'wplp80',
        assessmentTitle: 'WPLP-80',
        assessmentDescription: 'Signals',
        assessmentVersionId: 'version-2',
        versionTag: '2.0.0',
        lifecycleStatus: 'IN_PROGRESS',
        startedAt: '2026-01-01T00:00:00.000Z',
        submittedAt: null,
        completedAt: null,
        updatedAt: '2026-01-01T00:00:00.000Z',
      }],
      questionsByVersionId: {
        'version-1': [
          {
            questionId: 'question-legacy',
            questionKey: 'legacy',
            prompt: 'Legacy question?',
            orderIndex: 1,
            domainTitle: 'Legacy',
            options: [
              { optionId: 'option-legacy', optionKey: 'legacy_a', optionLabel: 'A', optionText: 'Legacy', orderIndex: 1 },
            ],
          },
        ],
        'version-2': [
          {
            questionId: 'question-live',
            questionKey: 'live',
            prompt: 'Live question?',
            orderIndex: 1,
            domainTitle: 'Published',
            options: [
              { optionId: 'option-live', optionKey: 'live_a', optionLabel: 'A', optionText: 'Live', orderIndex: 1 },
            ],
          },
        ],
      },
    }),
    definitionRepository: {
      async getAssessmentDefinitionByVersion(params) {
        return buildDefinition({
          assessmentIntro:
            params.assessmentVersionId === 'version-2'
              ? {
                  introTitle: 'Published intro for version 2',
                  introSummary: 'Version 2 summary.',
                  introHowItWorks: 'Version 2 flow.',
                  estimatedTimeOverride: null,
                  instructions: null,
                  confidentialityNote: null,
                }
              : {
                  introTitle: 'Wrong version intro',
                  introSummary: 'Wrong version summary.',
                  introHowItWorks: 'Wrong version flow.',
                  estimatedTimeOverride: null,
                  instructions: null,
                  confidentialityNote: null,
                },
        });
      },
    },
  });

  const runner = await service.getAssessmentRunnerViewModel({
    userId: 'user-1',
    assessmentKey: 'wplp80',
    attemptId: 'attempt-2',
  });

  assert.equal(runner.assessmentVersionId, 'version-2');
  assert.equal(runner.assessmentIntro?.introTitle, 'Published intro for version 2');
  assert.deepEqual(runner.questions.map((question) => question.questionId), ['question-live']);
});

test('runner view model returns null intro cleanly when the canonical runtime definition has no intro content', async () => {
  const service = createAssessmentRunnerService({
    db: createFakeDb({
      attempts: [{
        attemptId: 'attempt-3',
        userId: 'user-1',
        assessmentId: 'assessment-1',
        assessmentKey: 'wplp80',
        assessmentTitle: 'WPLP-80',
        assessmentDescription: 'Signals',
        assessmentVersionId: 'version-1',
        versionTag: '1.0.0',
        lifecycleStatus: 'IN_PROGRESS',
        startedAt: '2026-01-01T00:00:00.000Z',
        submittedAt: null,
        completedAt: null,
        updatedAt: '2026-01-01T00:00:00.000Z',
      }],
      questionsByVersionId: {
        'version-1': [{
          questionId: 'question-1',
          questionKey: 'q1',
          prompt: 'Question one?',
          orderIndex: 1,
          domainTitle: 'Section A',
          options: [
            { optionId: 'option-1', optionKey: 'q1_a', optionLabel: 'A', optionText: 'First', orderIndex: 1 },
          ],
        }],
      },
    }),
    definitionRepository: {
      async getAssessmentDefinitionByVersion() {
        return buildDefinition({ assessmentIntro: null });
      },
    },
  });

  const runner = await service.getAssessmentRunnerViewModel({
    userId: 'user-1',
    assessmentKey: 'wplp80',
    attemptId: 'attempt-3',
  });

  assert.equal(runner.assessmentIntro, null);
});

test('save response preserves overwrite semantics and returns updated progress', async () => {
  const db = createFakeDb({
    attempts: [{
      attemptId: 'attempt-1',
      userId: 'user-1',
      assessmentId: 'assessment-1',
      assessmentKey: 'wplp80',
      assessmentTitle: 'WPLP-80',
      assessmentDescription: 'Signals',
      assessmentVersionId: 'version-1',
      versionTag: '1.0.0',
      lifecycleStatus: 'IN_PROGRESS',
      startedAt: '2026-01-01T00:00:00.000Z',
      submittedAt: null,
      completedAt: null,
      updatedAt: '2026-01-01T00:00:00.000Z',
    }],
    questionsByVersionId: {
      'version-1': [{
        questionId: 'question-1',
        questionKey: 'q1',
        prompt: 'Question one?',
        orderIndex: 1,
        domainTitle: 'Section A',
        options: [
          { optionId: 'option-1', optionKey: 'q1_a', optionLabel: 'A', optionText: 'First', orderIndex: 1 },
          { optionId: 'option-2', optionKey: 'q1_b', optionLabel: 'B', optionText: 'Second', orderIndex: 2 },
        ],
      }],
    },
    responses: [{
      attemptId: 'attempt-1',
      questionId: 'question-1',
      selectedOptionId: 'option-1',
    }],
  });
  const service = createAssessmentRunnerService({ db });

  const saved = await service.saveAssessmentResponse({
    userId: 'user-1',
    assessmentKey: 'wplp80',
    attemptId: 'attempt-1',
    questionId: 'question-1',
    selectedOptionId: 'option-2',
  });
  const runner = await service.getAssessmentRunnerViewModel({
    userId: 'user-1',
    assessmentKey: 'wplp80',
    attemptId: 'attempt-1',
  });

  assert.equal(saved.selectedOptionId, 'option-2');
  assert.equal(saved.answeredQuestions, 1);
  assert.equal(runner.questions[0]?.selectedOptionId, 'option-2');
});

test('non-owned attempt access fails cleanly', async () => {
  const service = createAssessmentRunnerService({
    db: createFakeDb({
      attempts: [{
        attemptId: 'attempt-1',
        userId: 'user-2',
        assessmentId: 'assessment-1',
        assessmentKey: 'wplp80',
        assessmentTitle: 'WPLP-80',
        assessmentDescription: null,
        assessmentVersionId: 'version-1',
        versionTag: '1.0.0',
        lifecycleStatus: 'IN_PROGRESS',
        startedAt: '2026-01-01T00:00:00.000Z',
        submittedAt: null,
        completedAt: null,
        updatedAt: '2026-01-01T00:00:00.000Z',
      }],
    }),
  });

  await assert.rejects(
    () =>
      service.getAssessmentRunnerViewModel({
        userId: 'user-1',
        assessmentKey: 'wplp80',
        attemptId: 'attempt-1',
      }),
    AssessmentRunnerForbiddenError,
  );
});

test('invalid option save is rejected explicitly', async () => {
  const service = createAssessmentRunnerService({
    db: createFakeDb({
      attempts: [{
        attemptId: 'attempt-1',
        userId: 'user-1',
        assessmentId: 'assessment-1',
        assessmentKey: 'wplp80',
        assessmentTitle: 'WPLP-80',
        assessmentDescription: null,
        assessmentVersionId: 'version-1',
        versionTag: '1.0.0',
        lifecycleStatus: 'IN_PROGRESS',
        startedAt: '2026-01-01T00:00:00.000Z',
        submittedAt: null,
        completedAt: null,
        updatedAt: '2026-01-01T00:00:00.000Z',
      }],
      questionsByVersionId: {
        'version-1': [{
          questionId: 'question-1',
          questionKey: 'q1',
          prompt: 'Question one?',
          orderIndex: 1,
          domainTitle: 'Section A',
          options: [
            { optionId: 'option-1', optionKey: 'q1_a', optionLabel: 'A', optionText: 'First', orderIndex: 1 },
          ],
        }],
      },
    }),
  });

  await assert.rejects(
    () =>
      service.saveAssessmentResponse({
        userId: 'user-1',
        assessmentKey: 'wplp80',
        attemptId: 'attempt-1',
        questionId: 'question-1',
        selectedOptionId: 'option-missing',
      }),
    AssessmentRunnerValidationError,
  );
});

test('completion handoff returns deterministic ready route', async () => {
  const service = createAssessmentRunnerService({
    db: createFakeDb({
      attempts: [{
        attemptId: 'attempt-1',
        userId: 'user-1',
        assessmentId: 'assessment-1',
        assessmentKey: 'wplp80',
        assessmentTitle: 'WPLP-80',
        assessmentDescription: null,
        assessmentVersionId: 'version-1',
        versionTag: '1.0.0',
        lifecycleStatus: 'IN_PROGRESS',
        startedAt: '2026-01-01T00:00:00.000Z',
        submittedAt: null,
        completedAt: null,
        updatedAt: '2026-01-01T00:00:00.000Z',
      }],
    }),
    completionService: {
      async completeAssessmentAttempt() {
        return {
          success: true,
          attemptId: 'attempt-1',
          resultId: 'result-1',
          lifecycleStatus: 'ready',
          resultStatus: 'ready',
          hasResult: true,
          payloadReady: true,
          alreadyCompleted: false,
          error: null,
        };
      },
    },
  });

  const submit = await service.completeAssessmentAttempt({
    userId: 'user-1',
    assessmentKey: 'wplp80',
    attemptId: 'attempt-1',
  });

  assert.equal(submit.kind, 'ready');
  assert.equal(submit.href, '/app/results/result-1');
});
