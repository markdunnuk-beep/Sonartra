import test from 'node:test';
import assert from 'node:assert/strict';

import type { Queryable } from '@/lib/engine/repository-sql';
import {
  createVoiceSessionService,
  VoiceSessionResolutionStateError,
  VoiceSessionValidationError,
} from '@/lib/server/voice/voice-session.service';

type AttemptFixture = {
  attemptId: string;
  userId: string;
  assessmentId: string;
  assessmentKey: string;
  assessmentVersionId: string;
  versionTag: string;
  lifecycleStatus: 'IN_PROGRESS' | 'SUBMITTED' | 'SCORED' | 'RESULT_READY' | 'FAILED';
};

type VoiceSessionFixture = {
  id: string;
  attemptId: string;
  userId: string;
  assessmentId: string;
  assessmentVersionId: string;
  status: 'in_progress' | 'completed' | 'failed';
  provider: string;
  model: string;
  locale: string | null;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type VoiceResolutionFixture = {
  id: string;
  voiceSessionId: string;
  questionId: string;
  inferredOptionId: string | null;
  finalSelectedOptionId: string | null;
  confidence: number | null;
  wasConfirmed: boolean;
  sourceExcerpt: string;
  createdAt: string;
};

type QuestionFixture = {
  questionId: string;
  prompt: string;
  options: Array<{
    optionId: string;
    label: string | null;
    text: string;
    orderIndex: number;
  }>;
};

type ResponseFixture = {
  attemptId: string;
  questionId: string;
  selectedOptionId: string;
};

function createHarness(params?: {
  attempts?: AttemptFixture[];
  voiceSessions?: VoiceSessionFixture[];
  resolutions?: VoiceResolutionFixture[];
  questionsByVersionId?: Record<string, QuestionFixture[]>;
  responses?: ResponseFixture[];
}) {
  const attempts = [...(params?.attempts ?? [{
    attemptId: 'attempt-1',
    userId: 'user-1',
    assessmentId: 'assessment-1',
    assessmentKey: 'wplp80',
    assessmentVersionId: 'version-1',
    versionTag: '1.0.0',
    lifecycleStatus: 'IN_PROGRESS' as const,
  }])];
  const voiceSessions = [...(params?.voiceSessions ?? [{
    id: 'voice-session-1',
    attemptId: 'attempt-1',
    userId: 'user-1',
    assessmentId: 'assessment-1',
    assessmentVersionId: 'version-1',
    status: 'in_progress' as const,
    provider: 'openai',
    model: 'gpt-realtime-mini',
    locale: null,
    startedAt: '2026-04-20T10:00:00.000Z',
    endedAt: null,
    createdAt: '2026-04-20T10:00:00.000Z',
    updatedAt: '2026-04-20T10:00:00.000Z',
  }])];
  const resolutions = [...(params?.resolutions ?? [{
    id: 'resolution-1',
    voiceSessionId: 'voice-session-1',
    questionId: 'question-1',
    inferredOptionId: 'option-1',
    finalSelectedOptionId: null,
    confidence: 0.96,
    wasConfirmed: true,
    sourceExcerpt: 'the first one',
    createdAt: '2026-04-20T10:01:00.000Z',
  }])];
  const questionsByVersionId = {
    'version-1': [
      {
        questionId: 'question-1',
        prompt: 'Question one?',
        options: [
          { optionId: 'option-1', label: 'A', text: 'First option', orderIndex: 1 },
          { optionId: 'option-2', label: 'B', text: 'Second option', orderIndex: 2 },
        ],
      },
      {
        questionId: 'question-2',
        prompt: 'Question two?',
        options: [
          { optionId: 'option-3', label: 'A', text: 'Third option', orderIndex: 1 },
        ],
      },
      ...((params?.questionsByVersionId?.['version-1'] ?? []).filter((question) => question.questionId !== 'question-1' && question.questionId !== 'question-2')),
    ],
    ...(params?.questionsByVersionId ?? {}),
  };
  const responses = [...(params?.responses ?? [])];

  const db: Queryable = {
    async query<T>(text: string, queryParams?: unknown[]) {
      if (text.includes('FROM voice_sessions') && text.includes('WHERE id = $1')) {
        const voiceSessionId = queryParams?.[0] as string;
        const session = voiceSessions.find((entry) => entry.id === voiceSessionId);

        return {
          rows: (session
            ? [{
                id: session.id,
                attempt_id: session.attemptId,
                user_id: session.userId,
                assessment_id: session.assessmentId,
                assessment_version_id: session.assessmentVersionId,
                status: session.status,
                provider: session.provider,
                model: session.model,
                locale: session.locale,
                started_at: session.startedAt,
                ended_at: session.endedAt,
                created_at: session.createdAt,
                updated_at: session.updatedAt,
              }]
            : []) as T[],
        };
      }

      if (
        text.includes('SELECT id') &&
        text.includes('FROM questions') &&
        text.includes('assessment_version_id = $2')
      ) {
        const [questionId, assessmentVersionId] = queryParams as [string, string];
        const question = (questionsByVersionId[assessmentVersionId] ?? []).find((entry) => entry.questionId === questionId);

        return {
          rows: (question ? ([{ id: question.questionId }] as unknown[]) : []) as T[],
        };
      }

      if (text.includes('FROM voice_response_resolutions') && text.includes('ORDER BY created_at DESC')) {
        const [voiceSessionId, questionId] = queryParams as [string, string];
        const ordered = resolutions
          .filter((entry) => entry.voiceSessionId === voiceSessionId && entry.questionId === questionId)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id));
        const row = ordered[0];

        return {
          rows: (row
            ? [{
                id: row.id,
                voice_session_id: row.voiceSessionId,
                question_id: row.questionId,
                inferred_option_id: row.inferredOptionId,
                final_selected_option_id: row.finalSelectedOptionId,
                confidence: row.confidence,
                was_confirmed: row.wasConfirmed,
                source_excerpt: row.sourceExcerpt,
                created_at: row.createdAt,
              }]
            : []) as T[],
        };
      }

      if (
        text.includes('FROM attempts t') &&
        text.includes('WHERE t.id = $1') &&
        text.includes('a.assessment_key')
      ) {
        const attemptId = queryParams?.[0] as string;
        const attempt = attempts.find((entry) => entry.attemptId === attemptId);

        return {
          rows: (attempt
            ? [{
                attempt_id: attempt.attemptId,
                user_id: attempt.userId,
                assessment_id: attempt.assessmentId,
                assessment_key: attempt.assessmentKey,
                assessment_title: 'WPLP-80',
                assessment_description: null,
                assessment_version_id: attempt.assessmentVersionId,
                version_tag: attempt.versionTag,
                lifecycle_status: attempt.lifecycleStatus,
                started_at: '2026-04-20T10:00:00.000Z',
                submitted_at: null,
                completed_at: null,
                updated_at: '2026-04-20T10:00:00.000Z',
              }]
            : []) as T[],
        };
      }

      if (text.includes('FROM results') && text.includes('readiness_status')) {
        return { rows: [] as T[] };
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
        text.includes('SELECT') &&
        text.includes('COALESCE(r.answered_questions, 0) AS answered_questions') &&
        text.includes('CROSS JOIN LATERAL')
      ) {
        const [attemptId, assessmentVersionId] = queryParams as [string, string];
        const totalQuestions = (questionsByVersionId[assessmentVersionId] ?? []).length;
        const answeredQuestions = responses.filter((entry) => entry.attemptId === attemptId).length;

        return {
          rows: ([{
            answered_questions: answeredQuestions,
            total_questions: totalQuestions,
          }] as unknown[]) as T[],
        };
      }

      if (text.includes('INSERT INTO responses') && text.includes('ON CONFLICT (attempt_id, question_id)')) {
        const [attemptId, questionId, selectedOptionId] = queryParams as [string, string, string];
        const existing = responses.find((entry) => entry.attemptId === attemptId && entry.questionId === questionId);

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

  return {
    db,
    responses,
    resolutions,
  };
}

test('confirmed inferred candidate writes successfully to canonical responses', async () => {
  const harness = createHarness();
  const service = createVoiceSessionService({ db: harness.db });

  const committed = await service.commitVoiceAnswerToCanonicalResponse({
    userId: 'user-1',
    voiceSessionId: 'voice-session-1',
    questionId: 'question-1',
  });

  assert.equal(committed.committedOptionId, 'option-1');
  assert.equal(committed.response.selectedOptionId, 'option-1');
  assert.deepEqual(harness.responses, [{
    attemptId: 'attempt-1',
    questionId: 'question-1',
    selectedOptionId: 'option-1',
  }]);
});

test('corrected option writes successfully to canonical responses', async () => {
  const harness = createHarness({
    resolutions: [{
      id: 'resolution-2',
      voiceSessionId: 'voice-session-1',
      questionId: 'question-1',
      inferredOptionId: 'option-1',
      finalSelectedOptionId: 'option-2',
      confidence: 0.77,
      wasConfirmed: true,
      sourceExcerpt: 'actually the second one',
      createdAt: '2026-04-20T10:02:00.000Z',
    }],
  });
  const service = createVoiceSessionService({ db: harness.db });

  const committed = await service.commitVoiceAnswerToCanonicalResponse({
    userId: 'user-1',
    voiceSessionId: 'voice-session-1',
    questionId: 'question-1',
  });

  assert.equal(committed.committedOptionId, 'option-2');
  assert.equal(harness.responses[0]?.selectedOptionId, 'option-2');
});

test('unresolved or unconfirmed candidate is rejected before canonical write', async () => {
  const harness = createHarness({
    resolutions: [{
      id: 'resolution-3',
      voiceSessionId: 'voice-session-1',
      questionId: 'question-1',
      inferredOptionId: 'option-1',
      finalSelectedOptionId: null,
      confidence: 0.74,
      wasConfirmed: false,
      sourceExcerpt: 'maybe the first one',
      createdAt: '2026-04-20T10:03:00.000Z',
    }],
  });
  const service = createVoiceSessionService({ db: harness.db });

  await assert.rejects(
    () =>
      service.commitVoiceAnswerToCanonicalResponse({
        userId: 'user-1',
        voiceSessionId: 'voice-session-1',
        questionId: 'question-1',
      }),
    VoiceSessionResolutionStateError,
  );
});

test('overwrite of an existing pre-completion answer works correctly', async () => {
  const harness = createHarness({
    responses: [{
      attemptId: 'attempt-1',
      questionId: 'question-1',
      selectedOptionId: 'option-1',
    }],
    resolutions: [{
      id: 'resolution-4',
      voiceSessionId: 'voice-session-1',
      questionId: 'question-1',
      inferredOptionId: 'option-1',
      finalSelectedOptionId: 'option-2',
      confidence: 0.78,
      wasConfirmed: true,
      sourceExcerpt: 'change that to the second one',
      createdAt: '2026-04-20T10:04:00.000Z',
    }],
  });
  const service = createVoiceSessionService({ db: harness.db });

  await service.commitVoiceAnswerToCanonicalResponse({
    userId: 'user-1',
    voiceSessionId: 'voice-session-1',
    questionId: 'question-1',
  });

  assert.equal(harness.responses.length, 1);
  assert.equal(harness.responses[0]?.selectedOptionId, 'option-2');
});

test('cross-question or wrong-option writes are rejected', async () => {
  const harness = createHarness({
    resolutions: [{
      id: 'resolution-5',
      voiceSessionId: 'voice-session-1',
      questionId: 'question-1',
      inferredOptionId: 'option-3',
      finalSelectedOptionId: 'option-3',
      confidence: 0.92,
      wasConfirmed: true,
      sourceExcerpt: 'the third option',
      createdAt: '2026-04-20T10:05:00.000Z',
    }],
  });
  const service = createVoiceSessionService({ db: harness.db });

  await assert.rejects(
    () =>
      service.commitVoiceAnswerToCanonicalResponse({
        userId: 'user-1',
        voiceSessionId: 'voice-session-1',
        questionId: 'question-1',
      }),
    VoiceSessionValidationError,
  );
});
