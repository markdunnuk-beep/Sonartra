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
  assert.match(source, /<DomainSection domains=\{resultDomains\} \/>/);
  assert.match(source, /domains\.map\(\(domain\) =>/);
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

test('result detail action section uses a report-style three-column layout without analytic badge treatment', () => {
  const source = readFileSync(pagePath, 'utf8');

  assert.match(source, /title="Interpretation to hold onto"/);
  assert.match(source, /className="grid gap-5 lg:gap-6 xl:grid-cols-3"/);
  assert.match(source, /<ActionList title="Strengths" items=\{result\.strengths\} tone="positive" \/>/);
  assert.match(source, /<ActionList title="Watchouts" items=\{result\.watchouts\} tone="warning" \/>/);
  assert.match(source, /<ActionList title="Development Focus" items=\{result\.developmentFocus\} tone="neutral" \/>/);
  assert.doesNotMatch(source, /inline-flex rounded-full px-2\.5 py-1 text-\[11px\] font-medium/);
  assert.doesNotMatch(source, /Practical synthesis/);
});

test('result detail domain section is summary-first and no longer emphasizes percentages', () => {
  const source = readFileSync(pagePath, 'utf8');

  assert.match(source, /title="Domain reading"/);
  assert.match(source, /<DomainSection domains=\{resultDomains\} \/>/);
  assert.match(source, /function DomainChapter\(\{ domain \}: \{ domain: AssessmentResultDomainViewModel \}\)/);
  assert.match(source, /<SectionEyebrow>Domain<\/SectionEyebrow>/);
  assert.match(source, /const primarySignal = visibleSignals\[0\] \?\? null/);
  assert.match(source, /const signalContext = getDomainSignalContext\(primarySignal, secondarySignal\)/);
  assert.match(source, /mx-auto max-w-\[58rem\] space-y-12 md:space-y-14/);
  assert.match(source, /border-white\/8 space-y-6 border-t pt-8 first:border-t-0 first:pt-0 md:space-y-7 md:pt-10/);
  assert.match(source, /max-w-\[44rem\] text-\[1rem\] leading-8 text-white\/68 md:text-\[1\.05rem\] md:leading-9/);
  assert.doesNotMatch(source, /formatPercent\(signal\.domainPercentage\)/);
  assert.doesNotMatch(source, /See why .* leads here/);
  assert.doesNotMatch(source, /Primary signal/);
  assert.doesNotMatch(source, /Secondary signal/);
  assert.doesNotMatch(source, /2xl:grid-cols-2/);
  assert.doesNotMatch(source, /rounded-\[1\.8rem\] p-6 sm:p-7 md:p-8/);
  assert.match(source, /Additional signal context/);
  assert.match(source, /also appears in this area/);
  assert.doesNotMatch(source, /The main reading journey/);
});

test('result detail page removes the separate status bar and keeps the reading order narrative then actions then domains', () => {
  const source = readFileSync(pagePath, 'utf8');

  assert.doesNotMatch(source, /StatusPill/);
  assert.doesNotMatch(source, /<SurfaceCard className="rounded-\[1\.6rem\] px-5 py-4">/);
  assert.match(source, /<span>\{result\.assessmentTitle\}<\/span>/);

  const actionIndex = source.indexOf('title="Interpretation to hold onto"');
  const domainIndex = source.indexOf('title="Domain reading"');

  assert.ok(actionIndex >= 0);
  assert.ok(domainIndex >= 0);
  assert.ok(actionIndex < domainIndex);
});

test('result detail page uses tightened responsive spacing and reading widths for the final polish pass', () => {
  const source = readFileSync(pagePath, 'utf8');

  assert.match(source, /<PageFrame className="space-y-12 md:space-y-14">/);
  assert.match(source, /max-w-\[16ch\]/);
  assert.match(source, /max-w-\[72ch\]/);
  assert.match(source, /px-6 py-7 sm:px-7 sm:py-8 md:px-10 md:py-12/);
  assert.match(source, /className="space-y-7"/);
  assert.match(source, /md:grid-cols-\[minmax\(0,12rem\)_minmax\(0,1fr\)\]/);
  assert.match(source, /max-w-\[40rem\] text-\[0\.92rem\] leading-7 text-white\/50/);
});
