import test from 'node:test';
import assert from 'node:assert/strict';

import { createResultReadModelService } from '@/lib/server/result-read-model';

function buildLegacyPayloadWithoutApplication() {
  return {
    metadata: {
      assessmentKey: 'wplp80',
      assessmentTitle: 'WPLP-80',
      version: '1.0.0',
      attemptId: 'attempt-1',
      completedAt: '2026-04-08T00:00:00.000Z',
    },
    intro: {
      assessmentDescription: null,
    },
    hero: {
      headline: 'Legacy headline',
      subheadline: null,
      summary: null,
      narrative: 'Legacy narrative.',
      pressureOverlay: null,
      environmentOverlay: null,
      primaryPattern: {
        label: 'Core Focus',
        signalKey: 'core_focus',
        signalLabel: 'Core Focus',
      },
      heroPattern: null,
      domainPairWinners: [],
      traitTotals: [],
      matchedPatterns: [],
      domainHighlights: [],
    },
    domains: [{
      domainKey: 'signals',
      domainLabel: 'Signals',
      chapterOpening: 'Legacy chapter opening.',
      signalBalance: {
        items: [{
          signalKey: 'core_focus',
          signalLabel: 'Core Focus',
          withinDomainPercent: 100,
          rank: 1,
          isPrimary: true,
          isSecondary: false,
          chapterSummary: null,
        }],
      },
      primarySignal: {
        signalKey: 'core_focus',
        signalLabel: 'Core Focus',
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
    diagnostics: {
      readinessStatus: 'ready',
      scoring: {
        scoringMethod: 'option_signal_weights_only',
        totalQuestions: 1,
        answeredQuestions: 1,
        unansweredQuestions: 0,
        totalResponsesProcessed: 1,
        totalWeightsApplied: 1,
        totalScoreMass: 7,
        zeroScoreSignalCount: 0,
        zeroAnswerSubmission: false,
        warnings: [],
        generatedAt: '2026-04-08T00:00:00.000Z',
      },
      normalization: {
        normalizationMethod: 'largest_remainder_integer_percentages',
        totalScoreMass: 7,
        zeroMass: false,
        globalPercentageSum: 100,
        domainPercentageSums: {
          signals: 100,
        },
        roundingAdjustmentsApplied: 0,
        zeroScoreSignalCount: 0,
        warnings: [],
        generatedAt: '2026-04-08T00:00:00.000Z',
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
      generatedAt: '2026-04-08T00:00:00.000Z',
    },
  };
}

function createFakeDb(payload: unknown) {
  return {
    async query<T>(text: string, params?: unknown[]) {
      if (text.includes('ORDER BY COALESCE(r.generated_at, r.created_at) DESC, r.id DESC')) {
        return {
          rows: [{
            result_id: 'result-1',
            attempt_id: 'attempt-1',
            assessment_id: 'assessment-1',
            assessment_key: 'wplp80',
            assessment_title: 'WPLP-80',
            version_tag: '1.0.0',
            readiness_status: 'READY',
            generated_at: '2026-04-08T00:00:00.000Z',
            created_at: '2026-04-08T00:00:00.000Z',
            canonical_result_payload: payload,
          }] as T[],
        };
      }

      if (text.includes('WHERE r.id = $1')) {
        return {
          rows: [{
            result_id: 'result-1',
            attempt_id: 'attempt-1',
            assessment_id: 'assessment-1',
            assessment_key: 'wplp80',
            assessment_title: 'WPLP-80',
            version_tag: '1.0.0',
            readiness_status: 'READY',
            generated_at: '2026-04-08T00:00:00.000Z',
            created_at: '2026-04-08T00:00:00.000Z',
            canonical_result_payload: payload,
          }] as T[],
        };
      }

      return { rows: [] as T[] };
    },
  };
}

test('payload without application does not crash the read model', async () => {
  const service = createResultReadModelService({
    db: createFakeDb(buildLegacyPayloadWithoutApplication()),
  });

  const detail = await service.getAssessmentResultDetail({
    userId: 'user-1',
    resultId: 'result-1',
  });
  const list = await service.listAssessmentResults({
    userId: 'user-1',
  });

  assert.equal(detail.resultId, 'result-1');
  assert.equal(detail.application, null);
  assert.equal(detail.topSignal?.signalKey, 'core_focus');
  assert.equal(list[0]?.resultId, 'result-1');
});

test('hasApplicationPlan is false when the payload predates application plan', async () => {
  const service = createResultReadModelService({
    db: createFakeDb(buildLegacyPayloadWithoutApplication()),
  });

  const detail = await service.getAssessmentResultDetail({
    userId: 'user-1',
    resultId: 'result-1',
  });

  assert.equal(detail.hasApplicationPlan, false);
});
