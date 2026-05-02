import test from 'node:test';
import assert from 'node:assert/strict';

import { runAssessmentEngine } from '@/lib/engine/engine-runner';
import type { Queryable } from '@/lib/engine/repository-sql';
import type { CanonicalResultPayload, EngineLanguageBundle, RuntimeAssessmentDefinition } from '@/lib/engine/types';
import { CANONICAL_RESULT_PAYLOAD_FIELDS, isCanonicalResultPayload } from '@/lib/engine/result-contract';
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

function buildDefinition(params?: {
  assessmentKey?: string;
  assessmentVersionId?: string;
  versionTag?: string;
}): RuntimeAssessmentDefinition {
  return {
    assessment: {
      id: 'assessment-1',
      key: params?.assessmentKey ?? 'wplp80',
      title: 'WPLP-80',
      description: 'Assessment',
      estimatedTimeMinutes: 29,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    version: {
      id: params?.assessmentVersionId ?? 'version-1',
      assessmentId: 'assessment-1',
      versionTag: params?.versionTag ?? '1.0.0',
      status: 'published',
      isPublished: true,
      publishedAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    assessmentIntro: null,
    heroDefinition: null,
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

function buildLiveHeroDefinition(params?: {
  assessmentKey?: string;
  assessmentVersionId?: string;
  versionTag?: string;
}): RuntimeAssessmentDefinition {
  const definition = buildDefinition(params);

  definition.heroDefinition = {
    fallbackPatternKey: 'balanced_operator',
    pairTraitWeights: [
      { profileDomainKey: 'operatingStyle', pairKey: 'driver_influencer', traitKey: 'adaptive', weight: 1, orderIndex: 1 },
      { profileDomainKey: 'operatingStyle', pairKey: 'driver_influencer', traitKey: 'assertive', weight: 1, orderIndex: 2 },
      { profileDomainKey: 'coreDrivers', pairKey: 'purpose_reward', traitKey: 'adaptive', weight: 1, orderIndex: 1 },
      { profileDomainKey: 'leadershipApproach', pairKey: 'directive_inclusive', traitKey: 'people_led', weight: 1, orderIndex: 1 },
      { profileDomainKey: 'tensionResponse', pairKey: 'accommodate_compete', traitKey: 'adaptive', weight: 1, orderIndex: 1 },
      { profileDomainKey: 'environmentFit', pairKey: 'autonomy_collaboration', traitKey: 'flexible', weight: 1, orderIndex: 1 },
      { profileDomainKey: 'pressureResponse', pairKey: 'critical_scatter', traitKey: 'adaptive', weight: 1, orderIndex: 1 },
    ],
    patternRules: [
      {
        patternKey: 'adaptive_mobiliser',
        priority: 24,
        conditions: [
          { traitKey: 'adaptive', operator: '>=', value: 3 },
          { traitKey: 'flexible', operator: '>=', value: 1 },
        ],
        exclusions: [],
      },
    ],
    patternLanguage: [
      {
        patternKey: 'adaptive_mobiliser',
        headline: 'Adaptive Mobiliser',
        subheadline: 'Fast and flexible across shifting conditions.',
        summary: 'You adapt quickly while keeping people moving.',
        narrative: 'You tend to reorient in motion and keep momentum alive.',
        pressureOverlay: 'Under pressure you may accelerate adaptation.',
        environmentOverlay: 'You do best where room to adjust remains visible.',
      },
      {
        patternKey: 'balanced_operator',
        headline: 'Balanced Operator',
        subheadline: null,
        summary: null,
        narrative: 'No single Hero pattern dominates strongly.',
        pressureOverlay: null,
        environmentOverlay: null,
      },
    ],
  };

  definition.domains = [
    { id: 'domain-style', key: 'operating-style', title: 'Operating Style', description: null, source: 'signal_group', orderIndex: 1 },
    { id: 'domain-mot', key: 'core-drivers', title: 'Core Drivers', description: null, source: 'signal_group', orderIndex: 2 },
    { id: 'domain-lead', key: 'leadership-approach', title: 'Leadership Approach', description: null, source: 'signal_group', orderIndex: 3 },
    { id: 'domain-conflict', key: 'tension-response', title: 'Tension Response', description: null, source: 'signal_group', orderIndex: 4 },
    { id: 'domain-culture', key: 'environment-fit', title: 'Environment Fit', description: null, source: 'signal_group', orderIndex: 5 },
    { id: 'domain-stress', key: 'pressure-response', title: 'Pressure Response', description: null, source: 'signal_group', orderIndex: 6 },
    { id: 'domain-section', key: 'section_a', title: 'Section A', description: null, source: 'question_section', orderIndex: 7 },
  ];

  definition.signals = [
    { id: 'style-driver', key: 'style_driver', title: 'Driver', description: null, domainId: 'domain-style', orderIndex: 1, isOverlay: false, overlayType: 'none' },
    { id: 'style-influencer', key: 'style_influencer', title: 'Influencer', description: null, domainId: 'domain-style', orderIndex: 2, isOverlay: false, overlayType: 'none' },
    { id: 'mot-purpose', key: 'mot_purpose', title: 'Purpose', description: null, domainId: 'domain-mot', orderIndex: 1, isOverlay: false, overlayType: 'none' },
    { id: 'mot-reward', key: 'mot_reward', title: 'Reward', description: null, domainId: 'domain-mot', orderIndex: 2, isOverlay: false, overlayType: 'none' },
    { id: 'lead-directive', key: 'lead_directive', title: 'Directive', description: null, domainId: 'domain-lead', orderIndex: 1, isOverlay: false, overlayType: 'none' },
    { id: 'lead-inclusive', key: 'lead_inclusive', title: 'Inclusive', description: null, domainId: 'domain-lead', orderIndex: 2, isOverlay: false, overlayType: 'none' },
    { id: 'conflict-compete', key: 'conflict_compete', title: 'Compete', description: null, domainId: 'domain-conflict', orderIndex: 1, isOverlay: false, overlayType: 'none' },
    { id: 'conflict-accommodate', key: 'conflict_accommodate', title: 'Accommodate', description: null, domainId: 'domain-conflict', orderIndex: 2, isOverlay: false, overlayType: 'none' },
    { id: 'culture-autonomy', key: 'culture_autonomy', title: 'Autonomy', description: null, domainId: 'domain-culture', orderIndex: 1, isOverlay: false, overlayType: 'none' },
    { id: 'culture-collaboration', key: 'culture_collaboration', title: 'Collaboration', description: null, domainId: 'domain-culture', orderIndex: 2, isOverlay: false, overlayType: 'none' },
    { id: 'stress-criticality', key: 'stress_criticality', title: 'Criticality', description: null, domainId: 'domain-stress', orderIndex: 1, isOverlay: false, overlayType: 'none' },
    { id: 'stress-scatter', key: 'stress_scatter', title: 'Scatter', description: null, domainId: 'domain-stress', orderIndex: 2, isOverlay: false, overlayType: 'none' },
  ];

  definition.questions = [
    {
      id: 'hero-question-1',
      key: 'hero_q1',
      prompt: 'Hero fixture question?',
      description: null,
      domainId: 'domain-section',
      orderIndex: 1,
      options: [
        {
          id: 'hero-option-1',
          key: 'hero_q1_a',
          label: 'Hero option',
          description: 'Fixture',
          questionId: 'hero-question-1',
          orderIndex: 1,
          signalWeights: definition.signals.map((signal, index) => ({
            signalId: signal.id,
            weight: index + 1,
            reverseFlag: false,
            sourceWeightKey: `hero|${index + 1}`,
          })),
        },
      ],
    },
  ];

  return definition;
}

function createEmptyLanguageBundle(): EngineLanguageBundle {
  return {
    signals: {},
    pairs: {},
    domains: {},
    overview: {},
  };
}

function buildPayload(signalId: string): CanonicalResultPayload {
  const signalKey = signalId === 'signal-core' ? 'core_focus' : 'role_executor';
  const title = signalId === 'signal-core' ? 'Core Focus' : 'Role Executor';
  const isOverlay = signalId === 'signal-overlay';
  return {
    metadata: {
      assessmentKey: 'wplp80',
      assessmentTitle: 'WPLP-80',
      version: '1.0.0',
      attemptId: 'attempt-1',
      completedAt: '2026-01-01T00:01:10.000Z',
      assessmentDescription: null,
    },
    intro: {
      assessmentDescription: null,
    },
    hero: {
      headline: 'Headline',
      subheadline: null,
      summary: null,
      narrative: 'Narrative',
      pressureOverlay: null,
      environmentOverlay: null,
      primaryPattern: {
        label: title,
        signalKey,
        signalLabel: title,
      },
      heroPattern: null,
      domainPairWinners: [],
      traitTotals: [],
      matchedPatterns: [],
      domainHighlights: [{
        domainKey: 'signals',
        domainLabel: 'Signals',
        primarySignalKey: signalKey,
        primarySignalLabel: title,
        summary: `${title} is the clearest signal in this domain.`,
      }],
    },
    domains: [{
      domainKey: 'section_a',
      domainLabel: 'Section A',
      chapterOpening: null,
      signalBalance: {
        items: [],
      },
      primarySignal: null,
      secondarySignal: null,
      signalPair: null,
      pressureFocus: null,
      environmentFocus: null,
    }, {
      domainKey: 'signals',
      domainLabel: 'Signals',
      chapterOpening: `${title} is the clearest signal in this domain.`,
      signalBalance: {
        items: [{
          signalKey,
          signalLabel: title,
          withinDomainPercent: 100,
          rank: 1,
          isPrimary: true,
          isSecondary: false,
          chapterSummary: null,
        }],
      },
      primarySignal: {
        signalKey,
        signalLabel: title,
        chapterSummary: null,
        strength: null,
        watchout: null,
        development: null,
      },
      secondarySignal: null,
      signalPair: null,
      pressureFocus: null,
      environmentFocus: null,
    }],
    actions: {
      strengths: [],
      watchouts: [],
      developmentFocus: [],
    },
    application: {
      thesis: {
        headline: '',
        summary: '',
        sourceKeys: {
          heroPatternKey: '',
        },
      },
      signatureContribution: {
        title: 'Where you create the most value',
        summary: '',
        items: [],
      },
      patternRisks: {
        title: 'Where this pattern can work against you',
        summary: '',
        items: [],
      },
      rangeBuilder: {
        title: 'Where to build more range',
        summary: '',
        items: [],
      },
      actionPlan30: {
        keepDoing: '',
        watchFor: '',
        practiceNext: '',
        askOthers: '',
      },
    },
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

      if (text.includes("lifecycle_status = 'IN_PROGRESS'")) {
        const [userId, assessmentId] = params as [string, string];
        const row = attempts.find((attempt) => attempt.userId === userId && attempt.assessmentId === assessmentId && attempt.lifecycleStatus === 'IN_PROGRESS');
        return { rows: (row ? ([{ attempt_id: row.attemptId, user_id: row.userId, assessment_id: row.assessmentId, assessment_version_id: row.assessmentVersionId, version_tag: row.versionTag, lifecycle_status: row.lifecycleStatus, started_at: row.startedAt, submitted_at: row.submittedAt, completed_at: row.completedAt, last_activity_at: row.lastActivityAt, created_at: row.createdAt, updated_at: row.updatedAt }] as unknown[]) : []) as T[] };
      }

      if (text.includes('FROM attempts') && text.includes('ORDER BY') && !text.includes("lifecycle_status = 'IN_PROGRESS'")) {
        const [userId, assessmentId] = params as [string, string];
        const row = attempts.find((attempt) => attempt.userId === userId && attempt.assessmentId === assessmentId);
        return { rows: (row ? ([{ attempt_id: row.attemptId, user_id: row.userId, assessment_id: row.assessmentId, assessment_version_id: row.assessmentVersionId, version_tag: row.versionTag, lifecycle_status: row.lifecycleStatus, started_at: row.startedAt, submitted_at: row.submittedAt, completed_at: row.completedAt, last_activity_at: row.lastActivityAt, created_at: row.createdAt, updated_at: row.updatedAt }] as unknown[]) : []) as T[] };
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

function createRepository(): import('@/lib/engine/repository').AssessmentDefinitionRepository {
  return {
    async getPublishedAssessmentDefinitionByKey() { return buildDefinition(); },
    async getAssessmentDefinitionByVersion() { return buildDefinition(); },
    async getAssessmentVersionLanguageBundle() { return createEmptyLanguageBundle(); },
  };
}

async function loadPersistedResultPayload(db: Queryable, attemptId: string): Promise<CanonicalResultPayload | null> {
  const result = await db.query<{
    canonical_result_payload: CanonicalResultPayload | null;
    has_canonical_result_payload: boolean;
  }>(
    `SELECT canonical_result_payload,
            canonical_result_payload IS NOT NULL AS has_canonical_result_payload
       FROM results
      WHERE attempt_id = $1`,
    [attemptId],
  );

  return result.rows[0]?.has_canonical_result_payload ? (result.rows[0]?.canonical_result_payload ?? null) : null;
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

test('completion resolves the runtime definition by the attempt assessmentVersionId', async () => {
  let publishedCalls = 0;
  let versionCalls = 0;
  let languageCalls = 0;
  let capturedLanguageVersionId: string | null = null;
  let capturedParams:
    | {
        assessmentVersionId?: string;
        assessmentKey?: string;
        version?: string;
      }
    | undefined;

  const service = createAssessmentCompletionService({
    db: createFakeDb({
      attempts: [{
        attemptId: 'attempt-2',
        userId: 'user-1',
        assessmentId: 'assessment-1',
        assessmentVersionId: 'version-2',
        assessmentKey: 'custom-live',
        versionTag: '2.0.0',
        lifecycleStatus: 'IN_PROGRESS',
        startedAt: '2026-01-01T00:00:01.000Z',
        submittedAt: null,
        completedAt: null,
        lastActivityAt: '2026-01-01T00:00:05.000Z',
        createdAt: '2026-01-01T00:00:01.000Z',
        updatedAt: '2026-01-01T00:00:05.000Z',
      }],
      responses: [{
        responseId: 'response-1',
        attemptId: 'attempt-2',
        questionId: 'question-1',
        selectedOptionId: 'option-1',
        respondedAt: '2026-01-01T00:00:03.000Z',
        updatedAt: '2026-01-01T00:00:03.000Z',
      }],
    }),
    repository: {
      async getPublishedAssessmentDefinitionByKey() {
        publishedCalls += 1;
        return buildDefinition({
          assessmentKey: 'custom-live',
          assessmentVersionId: 'version-2',
          versionTag: '2.0.0',
        });
      },
      async getAssessmentDefinitionByVersion(params) {
        versionCalls += 1;
        capturedParams = params;
        return buildDefinition({
          assessmentKey: 'custom-live',
          assessmentVersionId: 'version-2',
          versionTag: '2.0.0',
        });
      },
      async getAssessmentVersionLanguageBundle(assessmentVersionId) {
        languageCalls += 1;
        capturedLanguageVersionId = assessmentVersionId;
        return createEmptyLanguageBundle();
      },
    } as import('@/lib/engine/repository').AssessmentDefinitionRepository,
    executeEngine: async (params) =>
      runAssessmentEngine({
        repository: params.repository as import('@/lib/engine/repository').AssessmentDefinitionRepository,
        assessmentKey: params.assessmentKey,
        assessmentVersionId: params.assessmentVersionId,
        versionKey: params.versionKey,
        responses: params.responses,
        loadAssessmentLanguage: async () => ({ assessment_description: null }),
      }),
  });

  const result = await service.completeAssessmentAttempt({
    attemptId: 'attempt-2',
    userId: 'user-1',
  });

  assert.equal(result.resultStatus, 'ready');
  assert.equal(publishedCalls, 0);
  assert.equal(versionCalls, 1);
  assert.equal(languageCalls, 1);
  assert.deepEqual(capturedParams, { assessmentVersionId: 'version-2' });
  assert.equal(capturedLanguageVersionId, 'version-2');
});

test('completion path persists the canonical payload unchanged through the real engine with a full language bundle', async () => {
  const db = createFakeDb({
    attempts: [{
      attemptId: 'attempt-2',
      userId: 'user-1',
      assessmentId: 'assessment-1',
      assessmentVersionId: 'version-1',
      assessmentKey: 'wplp80',
      versionTag: '1.0.0',
      lifecycleStatus: 'IN_PROGRESS',
      startedAt: '2026-01-01T00:00:01.000Z',
      submittedAt: null,
      completedAt: null,
      lastActivityAt: '2026-01-01T00:00:05.000Z',
      createdAt: '2026-01-01T00:00:01.000Z',
      updatedAt: '2026-01-01T00:00:05.000Z',
    }],
    responses: [
      {
        responseId: 'response-1',
        attemptId: 'attempt-2',
        questionId: 'question-1',
        selectedOptionId: 'option-2',
        respondedAt: '2026-01-01T00:00:03.000Z',
        updatedAt: '2026-01-01T00:00:03.000Z',
      },
    ],
  });

  const service = createAssessmentCompletionService({
    db,
    repository: {
      async getPublishedAssessmentDefinitionByKey() {
        return buildDefinition();
      },
      async getAssessmentDefinitionByVersion() {
        return buildDefinition();
      },
      async getAssessmentVersionLanguageBundle() {
        return {
          signals: {
            role_executor: {
              chapterSummary: 'Persisted signal summary.',
              strength: 'Persisted strength language.',
            },
            core_focus: {
              chapterSummary: 'Persisted secondary summary.',
            },
          },
          pairs: {
            executor_focus: {
              chapterSummary: 'Persisted pair summary.',
              pressureFocus: 'Persisted pressure section.',
              environmentFocus: 'Persisted environment section.',
            },
          },
          domains: {
            signals: {
              chapterOpening: 'Persisted domain summary.',
            },
          },
          overview: {},
          heroHeaders: {
            executor_focus: {
              headline: 'Persisted hero headline.',
            },
          },
        };
      },
    } as import('@/lib/engine/repository').AssessmentDefinitionRepository,
    executeEngine: async (params) =>
      runAssessmentEngine({
        repository: params.repository as import('@/lib/engine/repository').AssessmentDefinitionRepository,
        assessmentKey: params.assessmentKey,
        assessmentVersionId: params.assessmentVersionId,
        versionKey: params.versionKey,
        responses: params.responses,
        loadAssessmentLanguage: async () => ({ assessment_description: null }),
      }),
  });

  const completion = await service.completeAssessmentAttempt({ attemptId: 'attempt-2', userId: 'user-1' });
  const payload = await loadPersistedResultPayload(db, 'attempt-2');

  assert.equal(completion.resultStatus, 'ready');
  assert.ok(payload);
  assert.ok(isCanonicalResultPayload(payload));
  assert.deepEqual(Object.keys(payload ?? {}), [...CANONICAL_RESULT_PAYLOAD_FIELDS]);
  assert.equal(payload?.hero.headline, 'Persisted hero headline.');
  assert.equal(payload?.hero.narrative, 'Persisted pair summary.');
  assert.deepEqual(payload?.hero.domainHighlights, [{
    domainKey: 'signals',
    domainLabel: 'Signals',
    primarySignalKey: 'role_executor',
    primarySignalLabel: 'Role Executor',
    summary: 'Persisted signal summary.',
  }]);
  assert.equal(payload?.domains[1]?.chapterOpening, 'Persisted domain summary.');
  assert.equal(payload?.domains[1]?.pressureFocus, 'Persisted pressure section.');
  assert.equal(payload?.domains[1]?.environmentFocus, 'Persisted environment section.');
  assert.deepEqual(payload?.domains[1]?.secondarySignal, {
    signalKey: 'core_focus',
    signalLabel: 'Core Focus',
    chapterSummary: 'Persisted secondary summary.',
    strength: null,
    watchout: null,
    development: null,
  });
  assert.deepEqual(payload?.domains[1]?.signalPair, {
    pairKey: 'executor_focus',
    primarySignalKey: 'role_executor',
    primarySignalLabel: 'Role Executor',
    secondarySignalKey: 'core_focus',
    secondarySignalLabel: 'Core Focus',
    summary: 'Persisted pair summary.',
  });
  assert.deepEqual(Object.keys(payload?.actions ?? {}), ['strengths', 'watchouts', 'developmentFocus']);
  assert.deepEqual(Object.keys(payload?.actions.strengths[0] ?? {}), ['signalKey', 'signalLabel', 'text']);
  assert.equal(payload?.actions.strengths[0]?.text, 'Persisted strength language.');
  assert.equal(payload?.metadata.assessmentDescription, null);
  assert.equal(payload?.metadata.attemptId, 'attempt-2');
});

test('completion path succeeds with live Sonartra Hero domain keys and persists the canonical hero payload', async () => {
  const db = createFakeDb({
    attempts: [{
      attemptId: 'attempt-hero',
      userId: 'user-1',
      assessmentId: 'assessment-1',
      assessmentVersionId: 'version-hero',
      assessmentKey: 'sonartra-signals',
      versionTag: '2026.04',
      lifecycleStatus: 'IN_PROGRESS',
      startedAt: '2026-01-01T00:00:01.000Z',
      submittedAt: null,
      completedAt: null,
      lastActivityAt: '2026-01-01T00:00:05.000Z',
      createdAt: '2026-01-01T00:00:01.000Z',
      updatedAt: '2026-01-01T00:00:05.000Z',
    }],
    responses: [{
      responseId: 'response-hero-1',
      attemptId: 'attempt-hero',
      questionId: 'hero-question-1',
      selectedOptionId: 'hero-option-1',
      respondedAt: '2026-01-01T00:00:03.000Z',
      updatedAt: '2026-01-01T00:00:03.000Z',
    }],
  });

  const service = createAssessmentCompletionService({
    db,
    repository: {
      async getPublishedAssessmentDefinitionByKey() {
        return buildLiveHeroDefinition({
          assessmentKey: 'sonartra-signals',
          assessmentVersionId: 'version-hero',
          versionTag: '2026.04',
        });
      },
      async getAssessmentDefinitionByVersion() {
        return buildLiveHeroDefinition({
          assessmentKey: 'sonartra-signals',
          assessmentVersionId: 'version-hero',
          versionTag: '2026.04',
        });
      },
      async getAssessmentVersionLanguageBundle() {
        return createEmptyLanguageBundle();
      },
    } as import('@/lib/engine/repository').AssessmentDefinitionRepository,
    executeEngine: async (params) =>
      runAssessmentEngine({
        repository: params.repository as import('@/lib/engine/repository').AssessmentDefinitionRepository,
        assessmentKey: params.assessmentKey,
        assessmentVersionId: params.assessmentVersionId,
        versionKey: params.versionKey,
        responses: params.responses,
        loadAssessmentLanguage: async () => ({ assessment_description: null }),
      }),
  });

  const completion = await service.completeAssessmentAttempt({ attemptId: 'attempt-hero', userId: 'user-1' });
  const payload = await loadPersistedResultPayload(db, 'attempt-hero');

  assert.equal(completion.resultStatus, 'ready');
  assert.ok(payload);
  assert.equal(payload?.hero.heroPattern?.patternKey, 'adaptive_mobiliser');
  assert.deepEqual(
    payload?.hero.domainPairWinners.map((winner) => winner.sourceDomainKey),
    [
      'operating-style',
      'core-drivers',
      'leadership-approach',
      'tension-response',
      'environment-fit',
      'pressure-response',
    ],
  );
  assert.equal(payload?.diagnostics.readinessStatus, 'processing');
});

test('completion path persists assessmentDescription in the canonical payload when sourced by the engine', async () => {
  const db = createFakeDb();

  const service = createAssessmentCompletionService({
    db,
    repository: createRepository(),
    executeEngine: async () => ({
      ...buildPayload('signal-core'),
      metadata: {
        assessmentKey: 'wplp80',
        assessmentTitle: 'WPLP-80',
        version: '1.0.0',
        attemptId: 'attempt-1',
        completedAt: '2026-01-01T00:01:10.000Z',
        assessmentDescription: 'Persisted assessment description.',
      },
      intro: {
        assessmentDescription: 'Persisted assessment description.',
      },
    }),
  });

  const completion = await service.completeAssessmentAttempt({ attemptId: 'attempt-1', userId: 'user-1' });
  const payload = await loadPersistedResultPayload(db, 'attempt-1');

  assert.equal(completion.resultStatus, 'ready');
  assert.ok(payload);
  assert.equal(payload?.metadata.assessmentDescription, 'Persisted assessment description.');
  assert.equal(payload?.intro.assessmentDescription, 'Persisted assessment description.');
  assert.equal(payload?.metadata.assessmentKey, 'wplp80');
  assert.equal(payload?.hero.primaryPattern?.signalKey, 'core_focus');
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
