import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDashboardViewModel } from '@/lib/server/dashboard-workspace-view-model';
import { createResultsService } from '@/lib/server/results-service';

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

function createDb() {
  return {
    async query<T>(text: string, params?: unknown[]) {
      if (text.includes("WHERE av.lifecycle_status = 'PUBLISHED'")) {
        return {
          rows: [{
            assessment_id: 'assessment-1',
            assessment_key: 'wplp80',
            assessment_title: 'WPLP-80',
            assessment_description: 'Signals assessment',
            assessment_version_id: 'version-1',
            version_tag: '1.0.0',
            published_at: '2026-04-08T00:00:00.000Z',
          }] as T[],
        };
      }

      if (text.includes('FROM assessments a') && text.includes('WHERE a.assessment_key = $1')) {
        return {
          rows: [{
            assessment_id: 'assessment-1',
            assessment_key: 'wplp80',
            assessment_version_id: 'version-1',
            version_tag: '1.0.0',
          }] as T[],
        };
      }

      if (text.includes("AND lifecycle_status = 'IN_PROGRESS'")) {
        return { rows: [] as T[] };
      }

      if (text.includes('FROM attempts') && !text.includes("AND lifecycle_status = 'IN_PROGRESS'")) {
        return {
          rows: [{
            attempt_id: 'attempt-1',
            user_id: 'user-1',
            assessment_id: 'assessment-1',
            assessment_version_id: 'version-1',
            lifecycle_status: 'RESULT_READY',
            started_at: '2026-04-08T00:00:00.000Z',
            submitted_at: '2026-04-08T00:05:00.000Z',
            completed_at: '2026-04-08T00:06:00.000Z',
            last_activity_at: '2026-04-08T00:06:00.000Z',
            created_at: '2026-04-08T00:00:00.000Z',
            updated_at: '2026-04-08T00:06:00.000Z',
          }] as T[],
        };
      }

      if (text.includes('COUNT(DISTINCT question_id) AS answered_questions')) {
        return {
          rows: [{ answered_questions: 1 }] as T[],
        };
      }

      if (text.includes('COUNT(*) AS total_questions')) {
        return {
          rows: [{ total_questions: 1 }] as T[],
        };
      }

      if (text.includes('ORDER BY COALESCE(r.generated_at, r.created_at) DESC, r.id DESC')) {
        return {
          rows: [
            {
              result_id: 'result-legacy',
              attempt_id: 'attempt-1',
              assessment_id: 'assessment-1',
              assessment_key: 'wplp80',
              assessment_title: 'WPLP-80',
              version_tag: '1.0.0',
              readiness_status: 'READY',
              generated_at: '2026-04-08T00:06:00.000Z',
              created_at: '2026-04-08T00:06:00.000Z',
              canonical_result_payload: buildLegacyPayloadWithoutApplication(),
            },
            {
              result_id: 'result-malformed',
              attempt_id: 'attempt-2',
              assessment_id: 'assessment-1',
              assessment_key: 'wplp80',
              assessment_title: 'WPLP-80',
              version_tag: '1.0.0',
              readiness_status: 'READY',
              generated_at: '2026-04-07T00:06:00.000Z',
              created_at: '2026-04-07T00:06:00.000Z',
              canonical_result_payload: { invalid: true },
            },
          ] as T[],
        };
      }

      return { rows: [] as T[] };
    },
  };
}

test('latest result lookup still works for a legacy payload without application', async () => {
  const db = createDb();
  const dashboard = await buildDashboardViewModel({
    db,
    userId: 'user-1',
  });

  assert.equal(dashboard.latestReadyResult?.resultId, 'result-legacy');
  assert.equal(dashboard.latestReadyResult?.topSignalTitle, 'Core Focus');
});

test('results list still works when application is missing from an older payload', async () => {
  const service = createResultsService({
    db: createDb(),
  });

  const results = await service.listResults({
    userId: 'user-1',
  });

  assert.equal(results.length, 1);
  assert.equal(results[0]?.resultId, 'result-legacy');
  assert.equal(results[0]?.href, '/app/results/result-legacy');
});

test('malformed rows do not break listing when a valid legacy row is still present', async () => {
  const service = createResultsService({
    db: createDb(),
  });

  const results = await service.listResults({
    userId: 'user-1',
  });

  assert.deepEqual(results.map((result) => result.resultId), ['result-legacy']);
});
