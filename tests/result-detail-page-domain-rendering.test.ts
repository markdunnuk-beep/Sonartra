import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { AssessmentResultDetailViewModel } from '@/lib/server/result-read-model-types';
import { getResultDetailDomains } from '@/lib/server/result-detail-domain-view';

const pagePath = join(
  process.cwd(),
  'app',
  '(user)',
  'app',
  'results',
  '[resultId]',
  'page.tsx',
);

function buildResultDetail(
  domainSummaries: AssessmentResultDetailViewModel['domainSummaries'],
): AssessmentResultDetailViewModel {
  return {
    resultId: 'result-1',
    attemptId: 'attempt-1',
    assessmentId: 'assessment-1',
    assessmentKey: 'signals-flex',
    assessmentTitle: 'Signals Flex',
    version: '1.0.0',
    metadata: {
      assessmentKey: 'signals-flex',
      version: '1.0.0',
      attemptId: 'attempt-1',
    },
    topSignal: null,
    rankedSignals: Object.freeze([]),
    normalizedScores: Object.freeze([]),
    domainSummaries,
    overviewSummary: {
      headline: 'Headline',
      narrative: 'Narrative',
    },
    strengths: Object.freeze([]),
    watchouts: Object.freeze([]),
    developmentFocus: Object.freeze([]),
    diagnostics: {
      readinessStatus: 'ready',
      scoring: {
        scoringMethod: 'option_signal_weights_only',
        totalQuestions: 0,
        answeredQuestions: 0,
        unansweredQuestions: 0,
        totalResponsesProcessed: 0,
        totalWeightsApplied: 0,
        totalScoreMass: 0,
        zeroScoreSignalCount: 0,
        zeroAnswerSubmission: false,
        warnings: Object.freeze([]),
        generatedAt: '2026-01-01T00:00:00.000Z',
      },
      normalization: {
        normalizationMethod: 'largest_remainder_integer_percentages',
        totalScoreMass: 0,
        zeroMass: true,
        globalPercentageSum: 0,
        domainPercentageSums: Object.freeze({}),
        roundingAdjustmentsApplied: 0,
        zeroScoreSignalCount: 0,
        warnings: Object.freeze([]),
        generatedAt: '2026-01-01T00:00:00.000Z',
      },
      answeredQuestionCount: 0,
      totalQuestionCount: 0,
      missingQuestionIds: Object.freeze([]),
      topSignalSelectionBasis: 'normalized_rank',
      rankedSignalCount: 0,
      domainCount: domainSummaries.length,
      zeroMass: true,
      zeroMassTopSignalFallbackApplied: false,
      warnings: Object.freeze([]),
      generatedAt: '2026-01-01T00:00:00.000Z',
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    generatedAt: '2026-01-01T00:00:00.000Z',
  };
}

test('result detail domains preserve canonical payload order for arbitrary domain keys', () => {
  const result = buildResultDetail(
    Object.freeze([
      {
        domainId: 'domain-z',
        domainKey: 'zeta_custom',
        domainTitle: 'Zeta Custom',
        domainSource: 'signal_group',
        rawTotal: 9,
        normalizedValue: 45,
        percentage: 45,
        signalScores: Object.freeze([]),
        signalCount: 0,
        answeredQuestionCount: 3,
        rankedSignalIds: Object.freeze([]),
        interpretation: null,
      },
      {
        domainId: 'domain-a',
        domainKey: 'adaptive_focus',
        domainTitle: 'Adaptive Focus',
        domainSource: 'signal_group',
        rawTotal: 11,
        normalizedValue: 55,
        percentage: 55,
        signalScores: Object.freeze([]),
        signalCount: 0,
        answeredQuestionCount: 3,
        rankedSignalIds: Object.freeze([]),
        interpretation: null,
      },
      {
        domainId: 'domain-q',
        domainKey: 'question_flow',
        domainTitle: 'Question Flow',
        domainSource: 'question_section',
        rawTotal: 0,
        normalizedValue: 0,
        percentage: 0,
        signalScores: Object.freeze([]),
        signalCount: 0,
        answeredQuestionCount: 3,
        rankedSignalIds: Object.freeze([]),
        interpretation: null,
      },
    ]),
  );

  assert.deepEqual(
    getResultDetailDomains(result).map((domain) => domain.domainKey),
    ['zeta_custom', 'adaptive_focus', 'question_flow'],
  );
});

test('result detail domains tolerate an empty persisted collection', () => {
  const result = buildResultDetail(Object.freeze([]));

  assert.deepEqual(getResultDetailDomains(result), []);
});

test('result detail page no longer contains fixed WPLP intelligence domain ordering', () => {
  const source = readFileSync(pagePath, 'utf8');

  assert.doesNotMatch(source, /INTELLIGENCE_DOMAIN_ORDER/);
  assert.doesNotMatch(source, /INTELLIGENCE_DOMAIN_CONFIG/);
  assert.doesNotMatch(source, /Six Intelligence Areas/);
  assert.match(source, /getResultDetailDomains\(result\)/);
  assert.match(source, /resultDomains\.map\(\(domain\) =>/);
});

test('result detail hero is narrative-first and no longer leads with derived signal interpretation copy', () => {
  const source = readFileSync(pagePath, 'utf8');

  assert.match(source, /const heroHeading = getHeroHeading\(result\)/);
  assert.match(source, /const heroSupport = getHeroSupport\(result\)/);
  assert.match(source, /\{heroHeading\}/);
  assert.match(source, /\{heroSupport\.narrative\}/);
  assert.doesNotMatch(source, /const combinedInterpretation = getCombinedInterpretation/);
  assert.doesNotMatch(source, /In practice:/);
  assert.doesNotMatch(source, /heroPrimarySignalChips/);
});
