import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';

import type { CanonicalResultPayload } from '@/lib/engine/types';
import { createAssessmentCompletionService } from '@/lib/server/assessment-completion-service';
import { createResultReadModelService } from '@/lib/server/result-read-model';
import { ApplicationPlan } from '@/components/results/application-plan';

type AttemptState = {
  attemptId: string;
  userId: string;
  assessmentId: string;
  assessmentVersionId: string;
  assessmentKey: string;
  versionTag: string;
  lifecycleStatus: 'IN_PROGRESS' | 'RESULT_READY';
};

type ResponseState = {
  responseId: string;
  attemptId: string;
  questionId: string;
  selectedOptionId: string;
  updatedAt: string;
};

type ResultState = {
  resultId: string;
  attemptId: string;
  assessmentId: string;
  assessmentVersionId: string;
  pipelineStatus: 'RUNNING' | 'COMPLETED';
  readinessStatus: 'PROCESSING' | 'READY';
  canonicalResultPayload: CanonicalResultPayload | null;
  failureReason: string | null;
  generatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function buildApplicationPayload(): CanonicalResultPayload {
  return {
    metadata: {
      assessmentKey: 'wplp80',
      assessmentTitle: 'WPLP-80',
      version: '1.0.1',
      attemptId: 'attempt-1',
      completedAt: '2026-04-08T00:10:00.000Z',
      assessmentDescription: null,
    },
    intro: {
      assessmentDescription: null,
    },
    hero: {
      headline: 'Steady Steward',
      subheadline: null,
      summary: 'You create traction through steadiness and follow-through.',
      narrative: 'You help work stay coherent and dependable under load.',
      pressureOverlay: null,
      environmentOverlay: null,
      primaryPattern: {
        label: 'Core Focus',
        signalKey: 'core_focus',
        signalLabel: 'Core Focus',
      },
      heroPattern: {
        patternKey: 'steady_steward',
        label: 'Steady Steward',
        priority: 26,
        isFallback: false,
      },
      domainPairWinners: [],
      traitTotals: [],
      matchedPatterns: [],
      domainHighlights: [],
    },
    domains: [{
      domainKey: 'signals',
      domainLabel: 'Signals',
      chapterOpening: 'Steady, dependable execution is the clearest signal.',
      signalBalance: {
        items: [{
          signalKey: 'core_focus',
          signalLabel: 'Core Focus',
          withinDomainPercent: 100,
          rank: 1,
          isPrimary: true,
          isSecondary: false,
          chapterSummary: 'Steady, dependable execution is the clearest signal.',
        }],
      },
      primarySignal: {
        signalKey: 'core_focus',
        signalLabel: 'Core Focus',
        chapterSummary: 'Steady, dependable execution is the clearest signal.',
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
        headline: 'A steady pattern with practical leverage',
        summary: 'You create the most impact when consistency and structure make the work easier to trust.',
        sourceKeys: {
          heroPatternKey: 'steady_steward',
        },
      },
      signatureContribution: {
        title: 'Where you create the most value',
        summary: '',
        items: [{
          label: 'Reliable coordination',
          narrative: 'You help teams keep momentum without losing coherence.',
          bestWhen: 'the work needs calm structure and dependable follow-through',
          watchFor: 'absorbing too much',
          sourceKey: 'pair_1',
          sourceType: 'pair',
        }],
      },
      patternRisks: {
        title: 'Where this pattern can work against you',
        summary: '',
        items: [{
          label: 'Over-carrying the load',
          narrative: 'You may take on too much instead of redistributing ownership.',
          impact: 'Others can lean on your steadiness instead of stepping in.',
          earlyWarning: 'You are solving the problem before others engage.',
          sourceKey: 'pair_1',
          sourceType: 'pair',
        }],
      },
      rangeBuilder: {
        title: 'Where to build more range',
        summary: '',
        items: [{
          label: 'Sharper escalation',
          narrative: 'Calling the decision point earlier helps protect pace and accountability.',
          practice: 'Name the next owner earlier in the work.',
          successMarker: 'You intervene later and more precisely.',
          sourceKey: 'signal_1',
          sourceType: 'signal',
        }],
      },
      actionPlan30: {
        keepDoing: 'Keep anchoring work in clear expectations.',
        watchFor: 'Watch for taking on too much too early.',
        practiceNext: 'Ask for explicit ownership sooner.',
        askOthers: 'Where do I create clarity, and where do I create dependence?',
      },
    },
    diagnostics: {
      readinessStatus: 'ready',
      scoring: {
        scoringMethod: 'option_signal_weights_only',
        totalQuestions: 1,
        answeredQuestions: 1,
        unansweredQuestions: 0,
        totalResponsesProcessed: 1,
        totalWeightsApplied: 1,
        totalScoreMass: 10,
        zeroScoreSignalCount: 0,
        zeroAnswerSubmission: false,
        warnings: [],
        generatedAt: '2026-04-08T00:10:00.000Z',
      },
      normalization: {
        normalizationMethod: 'largest_remainder_integer_percentages',
        totalScoreMass: 10,
        zeroMass: false,
        globalPercentageSum: 100,
        domainPercentageSums: {
          signals: 100,
        },
        roundingAdjustmentsApplied: 0,
        zeroScoreSignalCount: 0,
        warnings: [],
        generatedAt: '2026-04-08T00:10:00.000Z',
      },
      answeredQuestionCount: 1,
      totalQuestionCount: 1,
      missingQuestionIds: [],
      topSignalSelectionBasis: 'normalized_rank',
      rankedSignalCount: 1,
      domainCount: 1,
      zeroMass: false,
      zeroMassTopSignalFallbackApplied: false,
      warnings: [],
      generatedAt: '2026-04-08T00:10:00.000Z',
    },
  };
}

function createFakeDb() {
  const attempts: AttemptState[] = [{
    attemptId: 'attempt-1',
    userId: 'user-1',
    assessmentId: 'assessment-1',
    assessmentVersionId: 'version-published',
    assessmentKey: 'wplp80',
    versionTag: '1.0.1',
    lifecycleStatus: 'IN_PROGRESS',
  }];
  const responses: ResponseState[] = [{
    responseId: 'response-1',
    attemptId: 'attempt-1',
    questionId: 'question-1',
    selectedOptionId: 'option-1',
    updatedAt: '2026-04-08T00:09:00.000Z',
  }];
  const results: ResultState[] = [];

  return {
    db: {
      async query<T>(text: string, params?: unknown[]) {
        if (text.includes('FROM attempts t') && text.includes('WHERE t.id = $1')) {
          const attempt = attempts.find((entry) => entry.attemptId === params?.[0]);
          return {
            rows: (attempt
              ? [{
                  attempt_id: attempt.attemptId,
                  user_id: attempt.userId,
                  assessment_id: attempt.assessmentId,
                  assessment_version_id: attempt.assessmentVersionId,
                  assessment_key: attempt.assessmentKey,
                  version_tag: attempt.versionTag,
                  lifecycle_status: attempt.lifecycleStatus,
                  started_at: '2026-04-08T00:00:00.000Z',
                  submitted_at: null,
                  completed_at: null,
                  last_activity_at: '2026-04-08T00:09:00.000Z',
                  created_at: '2026-04-08T00:00:00.000Z',
                  updated_at: '2026-04-08T00:09:00.000Z',
                }]
              : []) as T[],
          };
        }

        if (text.includes('SELECT DISTINCT ON (r.question_id)')) {
          return {
            rows: responses.map((response) => ({
              response_id: response.responseId,
              attempt_id: response.attemptId,
              question_id: response.questionId,
              selected_option_id: response.selectedOptionId,
              responded_at: response.updatedAt,
              updated_at: response.updatedAt,
            })) as T[],
          };
        }

        if (text.includes('FROM results') && text.includes('canonical_result_payload IS NOT NULL AS has_canonical_result_payload')) {
          const result = results.find((entry) => entry.attemptId === params?.[0]);
          return {
            rows: (result
              ? [{
                  result_id: result.resultId,
                  attempt_id: result.attemptId,
                  pipeline_status: result.pipelineStatus,
                  readiness_status: result.readinessStatus,
                  generated_at: result.generatedAt,
                  failure_reason: result.failureReason,
                  has_canonical_result_payload: result.canonicalResultPayload !== null,
                  canonical_result_payload: result.canonicalResultPayload,
                  created_at: result.createdAt,
                  updated_at: result.updatedAt,
                }]
              : []) as T[],
          };
        }

        if (text.includes("UPDATE attempts") && text.includes("lifecycle_status = 'SUBMITTED'")) {
          return { rows: [] as T[] };
        }

        if (text.includes("UPDATE attempts") && text.includes("lifecycle_status = 'RESULT_READY'")) {
          attempts[0]!.lifecycleStatus = 'RESULT_READY';
          return { rows: [] as T[] };
        }

        if (text.includes("'RUNNING', 'PROCESSING'")) {
          results[0] = {
            resultId: 'result-1',
            attemptId: 'attempt-1',
            assessmentId: 'assessment-1',
            assessmentVersionId: 'version-published',
            pipelineStatus: 'RUNNING',
            readinessStatus: 'PROCESSING',
            canonicalResultPayload: null,
            failureReason: null,
            generatedAt: null,
            createdAt: '2026-04-08T00:10:00.000Z',
            updatedAt: '2026-04-08T00:10:00.000Z',
          };
          return { rows: [{ result_id: 'result-1' }] as T[] };
        }

        if (text.includes("'COMPLETED', 'READY'")) {
          results[0] = {
            resultId: 'result-1',
            attemptId: 'attempt-1',
            assessmentId: 'assessment-1',
            assessmentVersionId: 'version-published',
            pipelineStatus: 'COMPLETED',
            readinessStatus: 'READY',
            canonicalResultPayload: JSON.parse(String(params?.[3])) as CanonicalResultPayload,
            failureReason: null,
            generatedAt: '2026-04-08T00:10:00.000Z',
            createdAt: '2026-04-08T00:10:00.000Z',
            updatedAt: '2026-04-08T00:10:00.000Z',
          };
          return { rows: [{ result_id: 'result-1' }] as T[] };
        }

        if (text.includes('ORDER BY COALESCE(r.generated_at, r.created_at) DESC, r.id DESC')) {
          return {
            rows: results.map((result) => ({
              result_id: result.resultId,
              attempt_id: result.attemptId,
              assessment_id: result.assessmentId,
              assessment_key: 'wplp80',
              assessment_title: 'WPLP-80',
              version_tag: '1.0.1',
              readiness_status: result.readinessStatus,
              generated_at: result.generatedAt,
              created_at: result.createdAt,
              canonical_result_payload: result.canonicalResultPayload,
            })) as T[],
          };
        }

        if (text.includes('WHERE r.id = $1')) {
          const result = results.find((entry) => entry.resultId === params?.[0]);
          return {
            rows: (result
              ? [{
                  result_id: result.resultId,
                  attempt_id: result.attemptId,
                  assessment_id: result.assessmentId,
                  assessment_key: 'wplp80',
                  assessment_title: 'WPLP-80',
                  version_tag: '1.0.1',
                  readiness_status: result.readinessStatus,
                  generated_at: result.generatedAt,
                  created_at: result.createdAt,
                  canonical_result_payload: result.canonicalResultPayload,
                }]
              : []) as T[],
          };
        }

        return { rows: [] as T[] };
      },
    },
  };
}

test('completion path persists application and the results read path renders it end to end', async () => {
  const fake = createFakeDb();
  const completionService = createAssessmentCompletionService({
    db: fake.db,
    repository: {} as never,
    executeEngine: async () => buildApplicationPayload(),
  });
  const resultReadModel = createResultReadModelService({
    db: fake.db,
  });

  const completion = await completionService.completeAssessmentAttempt({
    attemptId: 'attempt-1',
    userId: 'user-1',
  });
  const detail = await resultReadModel.getAssessmentResultDetail({
    userId: 'user-1',
    resultId: 'result-1',
  });
  const list = await resultReadModel.listAssessmentResults({
    userId: 'user-1',
  });
  const markup = renderToStaticMarkup(<ApplicationPlan application={detail.application} />);

  assert.equal(completion.resultStatus, 'ready');
  assert.equal(completion.payloadReady, true);
  assert.equal(detail.diagnostics.readinessStatus, 'ready');
  assert.equal(detail.hasApplicationPlan, true);
  assert.equal(detail.application?.thesis.headline, 'A steady pattern with practical leverage');
  assert.equal(detail.application?.signatureContribution.items.length, 1);
  assert.equal(detail.application?.patternRisks.items.length, 1);
  assert.equal(detail.application?.rangeBuilder.items.length, 1);
  assert.equal(detail.application?.actionPlan30.keepDoing, 'Keep anchoring work in clear expectations.');
  assert.equal(list[0]?.resultId, 'result-1');
  assert.match(markup, /Turning insight into impact/);
  assert.match(markup, /A steady pattern with practical leverage/);
  assert.doesNotMatch(markup, /What to keep doing/);
  assert.doesNotMatch(markup, /Where to be careful/);
  assert.doesNotMatch(markup, /Where to focus next/);
});
