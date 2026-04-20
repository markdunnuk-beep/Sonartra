import test from 'node:test';
import assert from 'node:assert/strict';

import type { Queryable } from '@/lib/engine/repository-sql';
import { createVoiceAttemptOrchestrator } from '@/lib/server/voice/voice-attempt-orchestrator';

type AssessmentFixture = {
  assessmentId: string;
  assessmentKey: string;
  title: string;
  description: string | null;
};

type PublishedVersionFixture = {
  assessmentVersionId: string;
  versionTag: string;
} | null;

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

function createFakeDb(params: {
  assessment?: AssessmentFixture | null;
  publishedVersion?: PublishedVersionFixture;
  attempts?: AttemptFixture[];
  questions?: QuestionFixture[];
  responses?: ResponseFixture[];
}): Queryable {
  const assessment =
    params.assessment === undefined
      ? {
          assessmentId: 'assessment-1',
          assessmentKey: 'wplp80',
          title: 'WPLP-80',
          description: 'Signals',
        }
      : params.assessment;
  const publishedVersion =
    params.publishedVersion === undefined
      ? {
          assessmentVersionId: 'version-1',
          versionTag: '1.0.0',
        }
      : params.publishedVersion;
  const attempts = [...(params.attempts ?? [])];
  const questions = [...(params.questions ?? [])];
  const responses = [...(params.responses ?? [])];

  let attemptSequence = attempts.length + 1;

  return {
    async query<T>(text: string, queryParams?: unknown[]) {
      if (
        text.includes('FROM assessments') &&
        text.includes('WHERE assessment_key = $1') &&
        !text.includes('assessment_versions')
      ) {
        const assessmentKey = queryParams?.[0] as string;
        if (!assessment || assessment.assessmentKey !== assessmentKey) {
          return { rows: [] as T[] };
        }

        return {
          rows: ([{
            assessment_id: assessment.assessmentId,
            assessment_key: assessment.assessmentKey,
            assessment_title: assessment.title,
            assessment_description: assessment.description,
          }] as unknown[]) as T[],
        };
      }

      if (
        text.includes('FROM assessments a') &&
        text.includes("av.lifecycle_status = 'PUBLISHED'")
      ) {
        const assessmentKey = queryParams?.[0] as string;
        if (
          !assessment
          || !publishedVersion
          || assessment.assessmentKey !== assessmentKey
        ) {
          return { rows: [] as T[] };
        }

        if (text.includes('assessment_title')) {
          return {
            rows: ([{
              assessment_id: assessment.assessmentId,
              assessment_key: assessment.assessmentKey,
              assessment_title: assessment.title,
              assessment_description: assessment.description,
              assessment_version_id: publishedVersion.assessmentVersionId,
              version_tag: publishedVersion.versionTag,
            }] as unknown[]) as T[],
          };
        }

        return {
          rows: ([{
            assessment_id: assessment.assessmentId,
            assessment_key: assessment.assessmentKey,
            assessment_version_id: publishedVersion.assessmentVersionId,
            version_tag: publishedVersion.versionTag,
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
          responses
            .filter((response) => response.attemptId === attemptId)
            .map((response) => response.questionId),
        ).size;

        return {
          rows: ([{ answered_questions: answeredQuestions }] as unknown[]) as T[],
        };
      }

      if (text.includes('FROM results') && text.includes('canonical_result_payload IS NOT NULL AS has_canonical_result_payload')) {
        return { rows: [] as T[] };
      }

      if (text.includes('COUNT(*) AS total_questions') && !text.includes('CROSS JOIN LATERAL')) {
        return {
          rows: ([{ total_questions: questions.length }] as unknown[]) as T[],
        };
      }

      if (text.includes('INSERT INTO attempts')) {
        if (!assessment || !publishedVersion) {
          return { rows: [] as T[] };
        }

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

      if (text.includes('FROM questions q') && text.includes('INNER JOIN options o ON o.question_id = q.id')) {
        const assessmentVersionId = queryParams?.[0] as string;
        if (!publishedVersion || assessmentVersionId !== publishedVersion.assessmentVersionId) {
          return { rows: [] as T[] };
        }

        const rows = questions.flatMap((question) =>
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

      return { rows: [] as T[] };
    },
  };
}

test('supported assessment with no prior attempt creates a deterministic voice attempt payload', async () => {
  process.env.SONARTRA_ENABLE_VOICE_ASSESSMENTS = 'true';
  process.env.SONARTRA_VOICE_ASSESSMENT_KEYS = 'wplp80';

  const orchestrator = createVoiceAttemptOrchestrator({
    db: createFakeDb({
      questions: [
        {
          questionId: 'q1',
          questionKey: 'wplp80_q01',
          prompt: 'Question one?',
          orderIndex: 1,
          domainTitle: 'Section A',
          options: [
            { optionId: 'o1', optionKey: 'a', optionLabel: 'A', optionText: 'Alpha', orderIndex: 1 },
          ],
        },
        {
          questionId: 'q2',
          questionKey: 'wplp80_q02',
          prompt: 'Question two?',
          orderIndex: 2,
          domainTitle: 'Section B',
          options: [
            { optionId: 'o2', optionKey: 'a', optionLabel: 'A', optionText: 'Beta', orderIndex: 1 },
          ],
        },
      ],
    }),
  });

  const result = await orchestrator.prepareVoiceAssessment({
    userId: 'user-1',
    assessmentKey: 'wplp80',
  });

  assert.equal(result.state, 'ready_to_start');
  assert.equal(result.data?.attempt.attemptId, 'attempt-1');
  assert.equal(result.data?.delivery.currentQuestionIndex, 0);
  assert.equal(result.data?.delivery.currentQuestion?.questionId, 'q1');
  assert.equal(result.data?.delivery.questions.length, 2);
});

test('feature disabled returns controlled feature_disabled state', async () => {
  process.env.SONARTRA_ENABLE_VOICE_ASSESSMENTS = 'false';
  process.env.SONARTRA_VOICE_ASSESSMENT_KEYS = 'wplp80';

  const orchestrator = createVoiceAttemptOrchestrator({
    db: createFakeDb({}),
  });

  const result = await orchestrator.prepareVoiceAssessment({
    userId: 'user-1',
    assessmentKey: 'wplp80',
  });

  assert.equal(result.state, 'feature_disabled');
  assert.equal(result.data, null);
});

test('supported assessment with resumable in-progress attempt resumes at first unanswered question', async () => {
  process.env.SONARTRA_ENABLE_VOICE_ASSESSMENTS = 'true';
  process.env.SONARTRA_VOICE_ASSESSMENT_KEYS = 'wplp80';

  const orchestrator = createVoiceAttemptOrchestrator({
    db: createFakeDb({
      attempts: [
        {
          attemptId: 'attempt-7',
          userId: 'user-1',
          assessmentId: 'assessment-1',
          assessmentVersionId: 'version-1',
          lifecycleStatus: 'IN_PROGRESS',
          startedAt: '2026-01-01T00:00:00.000Z',
          submittedAt: null,
          completedAt: null,
          lastActivityAt: '2026-01-01T00:00:00.000Z',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      questions: [
        {
          questionId: 'q1',
          questionKey: 'wplp80_q01',
          prompt: 'Question one?',
          orderIndex: 1,
          domainTitle: 'Section A',
          options: [
            { optionId: 'o1', optionKey: 'a', optionLabel: 'A', optionText: 'Alpha', orderIndex: 1 },
          ],
        },
        {
          questionId: 'q2',
          questionKey: 'wplp80_q02',
          prompt: 'Question two?',
          orderIndex: 2,
          domainTitle: 'Section B',
          options: [
            { optionId: 'o2', optionKey: 'a', optionLabel: 'A', optionText: 'Beta', orderIndex: 1 },
          ],
        },
      ],
      responses: [
        {
          attemptId: 'attempt-7',
          questionId: 'q1',
          selectedOptionId: 'o1',
        },
      ],
    }),
  });

  const result = await orchestrator.prepareVoiceAssessment({
    userId: 'user-1',
    assessmentKey: 'wplp80',
  });

  assert.equal(result.state, 'resumed_in_progress');
  assert.equal(result.data?.attempt.attemptId, 'attempt-7');
  assert.equal(result.data?.delivery.currentQuestionIndex, 1);
  assert.equal(result.data?.delivery.currentQuestion?.questionId, 'q2');
});

test('unsupported assessment returns controlled unsupported state', async () => {
  process.env.SONARTRA_ENABLE_VOICE_ASSESSMENTS = 'true';
  process.env.SONARTRA_VOICE_ASSESSMENT_KEYS = 'wplp80';

  const orchestrator = createVoiceAttemptOrchestrator({
    db: createFakeDb({
      assessment: {
        assessmentId: 'assessment-2',
        assessmentKey: 'other',
        title: 'Other',
        description: null,
      },
    }),
  });

  const result = await orchestrator.prepareVoiceAssessment({
    userId: 'user-1',
    assessmentKey: 'other',
  });

  assert.equal(result.state, 'unsupported_assessment');
  assert.equal(result.data, null);
});

test('missing assessment key returns assessment_not_found', async () => {
  process.env.SONARTRA_ENABLE_VOICE_ASSESSMENTS = 'true';
  process.env.SONARTRA_VOICE_ASSESSMENT_KEYS = 'wplp80';

  const orchestrator = createVoiceAttemptOrchestrator({
    db: createFakeDb({
      assessment: null,
      publishedVersion: null,
    }),
  });

  const result = await orchestrator.prepareVoiceAssessment({
    userId: 'user-1',
    assessmentKey: 'missing',
  });

  assert.equal(result.state, 'assessment_not_found');
});

test('assessment without published version returns no_published_version', async () => {
  process.env.SONARTRA_ENABLE_VOICE_ASSESSMENTS = 'true';
  process.env.SONARTRA_VOICE_ASSESSMENT_KEYS = 'wplp80';

  const orchestrator = createVoiceAttemptOrchestrator({
    db: createFakeDb({
      publishedVersion: null,
    }),
  });

  const result = await orchestrator.prepareVoiceAssessment({
    userId: 'user-1',
    assessmentKey: 'wplp80',
  });

  assert.equal(result.state, 'no_published_version');
});

test('all answered responses return all_questions_answered without triggering completion', async () => {
  process.env.SONARTRA_ENABLE_VOICE_ASSESSMENTS = 'true';
  process.env.SONARTRA_VOICE_ASSESSMENT_KEYS = 'wplp80';

  const orchestrator = createVoiceAttemptOrchestrator({
    db: createFakeDb({
      attempts: [
        {
          attemptId: 'attempt-9',
          userId: 'user-1',
          assessmentId: 'assessment-1',
          assessmentVersionId: 'version-1',
          lifecycleStatus: 'IN_PROGRESS',
          startedAt: '2026-01-01T00:00:00.000Z',
          submittedAt: null,
          completedAt: null,
          lastActivityAt: '2026-01-01T00:00:00.000Z',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      questions: [
        {
          questionId: 'q1',
          questionKey: 'wplp80_q01',
          prompt: 'Question one?',
          orderIndex: 1,
          domainTitle: 'Section A',
          options: [
            { optionId: 'o1', optionKey: 'a', optionLabel: 'A', optionText: 'Alpha', orderIndex: 1 },
          ],
        },
      ],
      responses: [
        {
          attemptId: 'attempt-9',
          questionId: 'q1',
          selectedOptionId: 'o1',
        },
      ],
    }),
  });

  const result = await orchestrator.prepareVoiceAssessment({
    userId: 'user-1',
    assessmentKey: 'wplp80',
  });

  assert.equal(result.state, 'all_questions_answered');
  assert.equal(result.data?.delivery.currentQuestionIndex, null);
  assert.equal(result.data?.delivery.currentQuestion, null);
});
