import test from 'node:test';
import assert from 'node:assert/strict';

import type { Queryable } from '@/lib/engine/repository-sql';
import type { CanonicalResultPayload, RuntimeAssessmentDefinition } from '@/lib/engine/types';
import { createAssessmentCompletionService } from '@/lib/server/assessment-completion-service';
import { createAssessmentAttemptLifecycleService } from '@/lib/server/assessment-attempt-lifecycle';
import {
  AssessmentCompletionForbiddenError,
  AssessmentCompletionNotFoundError,
  AssessmentCompletionPersistenceError,
} from '@/lib/server/assessment-completion-types';

type AttemptState = {
  attemptId: string;
  userId: string;
  assessmentId: string;
  assessmentVersionId: string;
  assessmentKey: string;
  versionTag: string;
  lifecycleStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'SCORED' | 'RESULT_READY' | 'FAILED';
  startedAt: string;
  submittedAt: string | null;
  completedAt: string | null;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
};

type ResponseState = {
  responseId: string;
  attemptId: string;
  questionId: string;
  selectedOptionId: string;
  respondedAt: string;
  updatedAt: string;
};

type ResultState = {
  resultId: string;
  attemptId: string;
  assessmentId: string;
  assessmentVersionId: string;
  pipelineStatus: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  readinessStatus: 'PROCESSING' | 'READY' | 'FAILED';
  canonicalResultPayload: CanonicalResultPayload | null;
  failureReason: string | null;
  generatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type FakeDbConfig = {
  attempts?: AttemptState[];
  responses?: ResponseState[];
  results?: ResultState[];
  failReadyPersist?: boolean;
  failFailedPersist?: boolean;
};

function buildDefinition(): RuntimeAssessmentDefinition {
  return {
    assessment: {
      id: 'assessment-1',
      key: 'wplp80',
      title: 'WPLP-80',
      description: 'Assessment',
      estimatedTimeMinutes: 29,
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
    domains: [
      { id: 'domain-signals', key: 'signals', title: 'Signals', description: null, source: 'signal_group', orderIndex: 2 },
      { id: 'domain-section', key: 'section_a', title: 'Section A', description: null, source: 'question_section', orderIndex: 1 },
    ],
    signals: [
      { id: 'signal-core', key: 'core_focus', title: 'Core Focus', description: null, domainId: 'domain-signals', orderIndex: 1, isOverlay: false, overlayType: 'none' },
      { id: 'signal-overlay', key: 'role_executor', title: 'Role Executor', description: null, domainId: 'domain-signals', orderIndex: 2, isOverlay: true, overlayType: 'role' },
    ],
    questions: [
      {
        id: 'question-1',
        key: 'q1',
        prompt: 'First question?',
        description: null,
        domainId: 'domain-section',
        orderIndex: 1,
        options: [
          { id: 'option-1', key: 'q1_a', label: 'Option A', description: 'A', questionId: 'question-1', orderIndex: 1, signalWeights: [{ signalId: 'signal-core', weight: 2, reverseFlag: false, sourceWeightKey: '1|A' }] },
          { id: 'option-2', key: 'q1_b', label: 'Option B', description: 'B', questionId: 'question-1', orderIndex: 2, signalWeights: [{ signalId: 'signal-overlay', weight: 1, reverseFlag: false, sourceWeightKey: '1|B' }] },
        ],
      },
    ],
  };
}

function buildPayload(signalId: string): CanonicalResultPayload {
  const signalKey = signalId === 'signal-core' ? 'core_focus' : 'role_executor';
  const title = signalId === 'signal-core' ? 'Core Focus' : 'Role Executor';
  const isOverlay = signalId === 'signal-overlay';
  const overlayType: 'none' | 'role' = isOverlay ? 'role' : 'none';
  const normalizedSignal = {
    signalId,
    signalKey,
    signalTitle: title,
    domainId: 'domain-signals',
    domainKey: 'signals',
    domainSource: 'signal_group' as const,
    isOverlay,
    overlayType,
    rawTotal: 1,
    normalizedValue: 100,
    percentage: 100,
    domainPercentage: 100,
    rank: 1,
  };
  return {
    metadata: { assessmentKey: 'wplp80', version: '1.0.0', attemptId: 'attempt-1' },
    topSignal: { signalId, signalKey, title, domainId: 'domain-signals', domainKey: 'signals', normalizedValue: 100, rawTotal: 1, percentage: 100, rank: 1 },
    rankedSignals: Object.freeze([{ signalId, signalKey, title, domainId: 'domain-signals', domainKey: 'signals', normalizedValue: 100, rawTotal: 1, percentage: 100, domainPercentage: 100, isOverlay, overlayType, rank: 1 }]),
    normalizedScores: Object.freeze([normalizedSignal]),
    domainSummaries: Object.freeze([
      { domainId: 'domain-section', domainKey: 'section_a', domainTitle: 'Section A', domainSource: 'question_section' as const, rawTotal: 0, normalizedValue: 0, percentage: 0, signalScores: Object.freeze([]), signalCount: 0, answeredQuestionCount: 1, rankedSignalIds: Object.freeze([]) },
      { domainId: 'domain-signals', domainKey: 'signals', domainTitle: 'Signals', domainSource: 'signal_group' as const, rawTotal: 1, normalizedValue: 100, percentage: 100, signalScores: Object.freeze([normalizedSignal]), signalCount: 1, answeredQuestionCount: 1, rankedSignalIds: Object.freeze([signalId]) },
    ]),
    overviewSummary: { headline: 'Headline', narrative: 'Narrative' },
    strengths: Object.freeze([]),
    watchouts: Object.freeze([]),
    developmentFocus: Object.freeze([]),
    diagnostics: {
      readinessStatus: 'processing',
      scoring: { scoringMethod: 'option_signal_weights_only', totalQuestions: 1, answeredQuestions: 1, unansweredQuestions: 0, totalResponsesProcessed: 1, totalWeightsApplied: 1, totalScoreMass: 1, zeroScoreSignalCount: 0, zeroAnswerSubmission: false, warnings: Object.freeze([]), generatedAt: '2026-01-01T00:00:00.000Z' },
      normalization: { normalizationMethod: 'largest_remainder_integer_percentages', totalScoreMass: 1, zeroMass: false, globalPercentageSum: 100, domainPercentageSums: Object.freeze({ 'domain-signals': 100, 'domain-section': 0 }), roundingAdjustmentsApplied: 0, zeroScoreSignalCount: 0, warnings: Object.freeze([]), generatedAt: '2026-01-01T00:00:00.000Z' },
      answeredQuestionCount: 1,
      totalQuestionCount: 1,
      missingQuestionIds: Object.freeze([]),
      topSignalSelectionBasis: 'normalized_rank',
      rankedSignalCount: 1,
      domainCount: 2,
      zeroMass: false,
      zeroMassTopSignalFallbackApplied: false,
      warnings: Object.freeze([]),
      generatedAt: '2026-01-01T00:00:00.000Z',
    },
  };
}

function createFakeDb(config?: FakeDbConfig): Queryable {
  const attempts: AttemptState[] = [...(config?.attempts ?? [{
    attemptId: 'attempt-1', userId: 'user-1', assessmentId: 'assessment-1', assessmentVersionId: 'version-1', assessmentKey: 'wplp80', versionTag: '1.0.0', lifecycleStatus: 'IN_PROGRESS', startedAt: '2026-01-01T00:00:01.000Z', submittedAt: null, completedAt: null, lastActivityAt: '2026-01-01T00:00:05.000Z', createdAt: '2026-01-01T00:00:01.000Z', updatedAt: '2026-01-01T00:00:05.000Z',
  }])];
  const responses: ResponseState[] = [...(config?.responses ?? [{
    responseId: 'response-1', attemptId: 'attempt-1', questionId: 'question-1', selectedOptionId: 'option-1', respondedAt: '2026-01-01T00:00:03.000Z', updatedAt: '2026-01-01T00:00:03.000Z',
  }])];
  const results: ResultState[] = [...(config?.results ?? [])];
  let resultSequence = results.length + 1;

  return {
    async query<T>(text: string, params?: unknown[]) {
      if (text.includes('FROM attempts t') && text.includes('WHERE t.id = $1')) {
        const row = attempts.find((attempt) => attempt.attemptId === (params?.[0] as string));
        return { rows: (row ? ([{ attempt_id: row.attemptId, user_id: row.userId, assessment_id: row.assessmentId, assessment_version_id: row.assessmentVersionId, assessment_key: row.assessmentKey, version_tag: row.versionTag, lifecycle_status: row.lifecycleStatus, started_at: row.startedAt, submitted_at: row.submittedAt, completed_at: row.completedAt, last_activity_at: row.lastActivityAt, created_at: row.createdAt, updated_at: row.updatedAt }] as unknown[]) : []) as T[] };
      }

      if (text.includes('FROM results') && text.includes('canonical_result_payload IS NOT NULL AS has_canonical_result_payload')) {
        const row = results.find((result) => result.attemptId === (params?.[0] as string));
        return { rows: (row ? ([{ result_id: row.resultId, attempt_id: row.attemptId, pipeline_status: row.pipelineStatus, readiness_status: row.readinessStatus, generated_at: row.generatedAt, failure_reason: row.failureReason, has_canonical_result_payload: row.canonicalResultPayload !== null, canonical_result_payload: row.canonicalResultPayload, created_at: row.createdAt, updated_at: row.updatedAt }] as unknown[]) : []) as T[] };
      }

      if (text.includes('SELECT DISTINCT ON (r.question_id)')) {
        const attemptId = params?.[0] as string;
        const collapsed = new Map<string, ResponseState>();
        for (const response of responses.filter((entry) => entry.attemptId === attemptId).sort((a, b) => a.questionId !== b.questionId ? a.questionId.localeCompare(b.questionId) : b.updatedAt.localeCompare(a.updatedAt))) {
          if (!collapsed.has(response.questionId)) collapsed.set(response.questionId, response);
        }
        return { rows: ([...collapsed.values()].map((row) => ({ response_id: row.responseId, attempt_id: row.attemptId, question_id: row.questionId, selected_option_id: row.selectedOptionId, responded_at: row.respondedAt, updated_at: row.updatedAt })) as unknown[]) as T[] };
      }

      if (text.includes("UPDATE attempts") && text.includes("lifecycle_status = 'SUBMITTED'")) {
        const attempt = attempts.find((entry) => entry.attemptId === (params?.[0] as string));
        if (attempt) { attempt.lifecycleStatus = 'SUBMITTED'; attempt.submittedAt ??= '2026-01-01T00:01:00.000Z'; attempt.completedAt ??= '2026-01-01T00:01:00.000Z'; attempt.updatedAt = '2026-01-01T00:01:00.000Z'; }
        return { rows: [] as T[] };
      }

      if (text.includes("UPDATE attempts") && text.includes("lifecycle_status = 'RESULT_READY'")) {
        const attempt = attempts.find((entry) => entry.attemptId === (params?.[0] as string));
        if (attempt) { attempt.lifecycleStatus = 'RESULT_READY'; attempt.completedAt ??= '2026-01-01T00:01:10.000Z'; attempt.updatedAt = '2026-01-01T00:01:10.000Z'; }
        return { rows: [] as T[] };
      }

      if (text.includes("UPDATE attempts") && text.includes("lifecycle_status = 'FAILED'")) {
        const attempt = attempts.find((entry) => entry.attemptId === (params?.[0] as string));
        if (attempt) { attempt.lifecycleStatus = 'FAILED'; attempt.completedAt ??= '2026-01-01T00:01:10.000Z'; attempt.updatedAt = '2026-01-01T00:01:10.000Z'; }
        return { rows: [] as T[] };
      }

      if (text.includes("'RUNNING', 'PROCESSING'")) {
        const [attemptId, assessmentId, assessmentVersionId] = params as [string, string, string];
        let row = results.find((result) => result.attemptId === attemptId);
        if (!row) { row = { resultId: `result-${resultSequence++}`, attemptId, assessmentId, assessmentVersionId, pipelineStatus: 'RUNNING', readinessStatus: 'PROCESSING', canonicalResultPayload: null, failureReason: null, generatedAt: null, createdAt: '2026-01-01T00:01:00.000Z', updatedAt: '2026-01-01T00:01:00.000Z' }; results.push(row); }
        else { row.pipelineStatus = 'RUNNING'; row.readinessStatus = 'PROCESSING'; row.canonicalResultPayload = null; row.failureReason = null; row.updatedAt = '2026-01-01T00:01:00.000Z'; }
        return { rows: ([{ result_id: row.resultId }] as unknown[]) as T[] };
      }

      if (text.includes("'COMPLETED', 'READY'")) {
        if (config?.failReadyPersist) return { rows: [] as T[] };
        const [attemptId, assessmentId, assessmentVersionId, payloadString] = params as [string, string, string, string];
        const payload = JSON.parse(payloadString) as CanonicalResultPayload;
        let row = results.find((result) => result.attemptId === attemptId);
        if (!row) { row = { resultId: `result-${resultSequence++}`, attemptId, assessmentId, assessmentVersionId, pipelineStatus: 'COMPLETED', readinessStatus: 'READY', canonicalResultPayload: payload, failureReason: null, generatedAt: '2026-01-01T00:01:10.000Z', createdAt: '2026-01-01T00:01:10.000Z', updatedAt: '2026-01-01T00:01:10.000Z' }; results.push(row); }
        else { row.pipelineStatus = 'COMPLETED'; row.readinessStatus = 'READY'; row.canonicalResultPayload = payload; row.failureReason = null; row.generatedAt = '2026-01-01T00:01:10.000Z'; row.updatedAt = '2026-01-01T00:01:10.000Z'; }
        return { rows: ([{ result_id: row.resultId }] as unknown[]) as T[] };
      }

      if (text.includes("'FAILED', 'FAILED'")) {
        if (config?.failFailedPersist) return { rows: [] as T[] };
        const [attemptId, assessmentId, assessmentVersionId, failureReason] = params as [string, string, string, string];
        let row = results.find((result) => result.attemptId === attemptId);
        if (!row) { row = { resultId: `result-${resultSequence++}`, attemptId, assessmentId, assessmentVersionId, pipelineStatus: 'FAILED', readinessStatus: 'FAILED', canonicalResultPayload: null, failureReason, generatedAt: null, createdAt: '2026-01-01T00:01:10.000Z', updatedAt: '2026-01-01T00:01:10.000Z' }; results.push(row); }
        else { row.pipelineStatus = 'FAILED'; row.readinessStatus = 'FAILED'; row.canonicalResultPayload = null; row.failureReason = failureReason; row.generatedAt = null; row.updatedAt = '2026-01-01T00:01:10.000Z'; }
        return { rows: ([{ result_id: row.resultId }] as unknown[]) as T[] };
      }

      if (text.includes('FROM assessments a') && text.includes("av.lifecycle_status = 'PUBLISHED'")) {
        return { rows: ([{ assessment_id: 'assessment-1', assessment_key: 'wplp80', assessment_version_id: 'version-1', version_tag: '1.0.0' }] as unknown[]) as T[] };
      }

      if (text.includes("AND lifecycle_status = 'IN_PROGRESS'")) {
        const [userId, assessmentId] = params as [string, string];
        const row = attempts.find((attempt) => attempt.userId === userId && attempt.assessmentId === assessmentId && attempt.lifecycleStatus === 'IN_PROGRESS');
        return { rows: (row ? ([{ attempt_id: row.attemptId, user_id: row.userId, assessment_id: row.assessmentId, assessment_version_id: row.assessmentVersionId, lifecycle_status: row.lifecycleStatus, started_at: row.startedAt, submitted_at: row.submittedAt, completed_at: row.completedAt, last_activity_at: row.lastActivityAt, created_at: row.createdAt, updated_at: row.updatedAt }] as unknown[]) : []) as T[] };
      }

      if (text.includes('FROM attempts') && text.includes('ORDER BY created_at DESC, id DESC')) {
        const [userId, assessmentId] = params as [string, string];
        const row = attempts.find((attempt) => attempt.userId === userId && attempt.assessmentId === assessmentId);
        return { rows: (row ? ([{ attempt_id: row.attemptId, user_id: row.userId, assessment_id: row.assessmentId, assessment_version_id: row.assessmentVersionId, lifecycle_status: row.lifecycleStatus, started_at: row.startedAt, submitted_at: row.submittedAt, completed_at: row.completedAt, last_activity_at: row.lastActivityAt, created_at: row.createdAt, updated_at: row.updatedAt }] as unknown[]) : []) as T[] };
      }

      if (text.includes('COUNT(DISTINCT question_id) AS answered_questions')) {
        const attemptId = params?.[0] as string;
        return { rows: ([{ answered_questions: new Set(responses.filter((response) => response.attemptId === attemptId).map((response) => response.questionId)).size }] as unknown[]) as T[] };
      }

      if (text.includes('COUNT(*) AS total_questions')) {
        return { rows: ([{ total_questions: 1 }] as unknown[]) as T[] };
      }

      return { rows: [] as T[] };
    },
  };
}

function createRepository() {
  return {
    async getPublishedAssessmentDefinitionByKey() { return buildDefinition(); },
    async getAssessmentDefinitionByVersion() { return buildDefinition(); },
  };
}

test('successful completion path persists ready result and aligns lifecycle', async () => {
  const db = createFakeDb();
  let engineCalls = 0;
  const service = createAssessmentCompletionService({
    db,
    repository: createRepository(),
    executeEngine: async ({ responses }) => {
      engineCalls += 1;
      assert.equal(responses.responsesByQuestionId['question-1']?.value.selectedOptionId, 'option-1');
      return buildPayload('signal-core');
    },
  });

  const result = await service.completeAssessmentAttempt({ attemptId: 'attempt-1', userId: 'user-1' });
  const lifecycle = await createAssessmentAttemptLifecycleService({ db }).getAssessmentAttemptLifecycle({ userId: 'user-1', assessmentKey: 'wplp80' });

  assert.equal(engineCalls, 1);
  assert.equal(result.resultStatus, 'ready');
  assert.equal(lifecycle.status, 'ready');
});

test('ownership validation rejects wrong user and missing attempt is explicit', async () => {
  const service = createAssessmentCompletionService({ db: createFakeDb(), repository: createRepository() });
  await assert.rejects(() => service.completeAssessmentAttempt({ attemptId: 'attempt-1', userId: 'user-2' }), AssessmentCompletionForbiddenError);
  await assert.rejects(() => service.completeAssessmentAttempt({ attemptId: 'missing', userId: 'user-1' }), AssessmentCompletionNotFoundError);
});

test('already-ready path is idempotent and does not rerun engine', async () => {
  let engineCalls = 0;
  const service = createAssessmentCompletionService({
    db: createFakeDb({
      attempts: [{ attemptId: 'attempt-1', userId: 'user-1', assessmentId: 'assessment-1', assessmentVersionId: 'version-1', assessmentKey: 'wplp80', versionTag: '1.0.0', lifecycleStatus: 'RESULT_READY', startedAt: '2026-01-01T00:00:01.000Z', submittedAt: '2026-01-01T00:01:00.000Z', completedAt: '2026-01-01T00:01:10.000Z', lastActivityAt: '2026-01-01T00:01:10.000Z', createdAt: '2026-01-01T00:00:01.000Z', updatedAt: '2026-01-01T00:01:10.000Z' }],
      results: [{ resultId: 'result-1', attemptId: 'attempt-1', assessmentId: 'assessment-1', assessmentVersionId: 'version-1', pipelineStatus: 'COMPLETED', readinessStatus: 'READY', canonicalResultPayload: buildPayload('signal-core'), failureReason: null, generatedAt: '2026-01-01T00:01:10.000Z', createdAt: '2026-01-01T00:01:10.000Z', updatedAt: '2026-01-01T00:01:10.000Z' }],
    }),
    repository: createRepository(),
    executeEngine: async () => { engineCalls += 1; return buildPayload('signal-core'); },
  });

  const result = await service.completeAssessmentAttempt({ attemptId: 'attempt-1', userId: 'user-1' });
  assert.equal(engineCalls, 0);
  assert.equal(result.alreadyCompleted, true);
});

test('failed prior result retry reruns and response loading respects final-answer semantics', async () => {
  let engineCalls = 0;
  let selectedOptionId = '';
  const service = createAssessmentCompletionService({
    db: createFakeDb({
      attempts: [{ attemptId: 'attempt-1', userId: 'user-1', assessmentId: 'assessment-1', assessmentVersionId: 'version-1', assessmentKey: 'wplp80', versionTag: '1.0.0', lifecycleStatus: 'FAILED', startedAt: '2026-01-01T00:00:01.000Z', submittedAt: '2026-01-01T00:01:00.000Z', completedAt: '2026-01-01T00:01:10.000Z', lastActivityAt: '2026-01-01T00:01:10.000Z', createdAt: '2026-01-01T00:00:01.000Z', updatedAt: '2026-01-01T00:01:10.000Z' }],
      responses: [
        { responseId: 'response-1', attemptId: 'attempt-1', questionId: 'question-1', selectedOptionId: 'option-1', respondedAt: '2026-01-01T00:00:01.000Z', updatedAt: '2026-01-01T00:00:01.000Z' },
        { responseId: 'response-2', attemptId: 'attempt-1', questionId: 'question-1', selectedOptionId: 'option-2', respondedAt: '2026-01-01T00:00:03.000Z', updatedAt: '2026-01-01T00:00:03.000Z' },
      ],
      results: [{ resultId: 'result-1', attemptId: 'attempt-1', assessmentId: 'assessment-1', assessmentVersionId: 'version-1', pipelineStatus: 'FAILED', readinessStatus: 'FAILED', canonicalResultPayload: null, failureReason: 'previous_failure', generatedAt: null, createdAt: '2026-01-01T00:01:10.000Z', updatedAt: '2026-01-01T00:01:10.000Z' }],
    }),
    repository: createRepository(),
    executeEngine: async ({ responses }) => { engineCalls += 1; selectedOptionId = responses.responsesByQuestionId['question-1']?.value.selectedOptionId ?? ''; return buildPayload('signal-overlay'); },
  });

  const result = await service.completeAssessmentAttempt({ attemptId: 'attempt-1', userId: 'user-1' });
  assert.equal(engineCalls, 1);
  assert.equal(selectedOptionId, 'option-2');
  assert.equal(result.resultStatus, 'ready');
});

test('engine failure and persistence failure are explicit and do not pretend success', async () => {
  const engineFailDb = createFakeDb();
  const engineFailService = createAssessmentCompletionService({
    db: engineFailDb,
    repository: createRepository(),
    executeEngine: async () => { throw new Error('engine_boom'); },
  });
  await assert.rejects(() => engineFailService.completeAssessmentAttempt({ attemptId: 'attempt-1', userId: 'user-1' }), /engine_boom/);
  const lifecycle = await createAssessmentAttemptLifecycleService({ db: engineFailDb }).getAssessmentAttemptLifecycle({ userId: 'user-1', assessmentKey: 'wplp80' });
  assert.equal(lifecycle.status, 'error');

  const persistFailService = createAssessmentCompletionService({
    db: createFakeDb({ failReadyPersist: true, failFailedPersist: true }),
    repository: createRepository(),
    executeEngine: async () => buildPayload('signal-core'),
  });
  await assert.rejects(() => persistFailService.completeAssessmentAttempt({ attemptId: 'attempt-1', userId: 'user-1' }), AssessmentCompletionPersistenceError);
});

test('repeated reads after success are stable', async () => {
  const service = createAssessmentCompletionService({
    db: createFakeDb(),
    repository: createRepository(),
    executeEngine: async () => buildPayload('signal-core'),
  });
  await service.completeAssessmentAttempt({ attemptId: 'attempt-1', userId: 'user-1' });
  const first = await service.completeAssessmentAttempt({ attemptId: 'attempt-1', userId: 'user-1' });
  const second = await service.completeAssessmentAttempt({ attemptId: 'attempt-1', userId: 'user-1' });
  assert.deepEqual(first, second);
});
