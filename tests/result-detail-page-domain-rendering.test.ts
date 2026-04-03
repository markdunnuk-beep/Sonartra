import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildDomainSignalRingViewModel } from '@/lib/server/domain-signal-ring-view-model';
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
      assessmentDescription: null,
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

test('result detail domain ring mapper preserves canonical payload order for arbitrary persisted domains', () => {
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
        signalScores: Object.freeze([
          {
            signalId: 'signal-z-1',
            signalKey: 'horizon',
            signalTitle: 'Horizon',
            domainId: 'domain-z',
            domainKey: 'zeta_custom',
            domainSource: 'signal_group' as const,
            isOverlay: false,
            overlayType: 'none' as const,
            rawTotal: 8,
            normalizedValue: 80,
            percentage: 80,
            domainPercentage: 80,
            rank: 1,
          },
        ]),
        signalCount: 1,
        answeredQuestionCount: 3,
        rankedSignalIds: Object.freeze(['signal-z-1']),
        interpretation: {
          domainKey: 'zeta_custom',
          primarySignalKey: 'horizon',
          primaryPercent: 80,
          secondarySignalKey: null,
          secondaryPercent: null,
          summary: 'Zeta summary.',
        },
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
    ]),
  );

  const ringModels = buildDomainSignalRingViewModel({
    domainSummaries: getResultDetailDomains(result),
  });

  assert.deepEqual(ringModels.map((domain) => domain.domainKey), ['zeta_custom', 'adaptive_focus']);
  assert.deepEqual(ringModels[0]?.signals.map((signal) => signal.signalKey), ['horizon']);
  assert.deepEqual(ringModels[1]?.signals, []);
});

test('result detail page no longer contains fixed WPLP intelligence domain ordering', () => {
  const source = readFileSync(pagePath, 'utf8');

  assert.doesNotMatch(source, /INTELLIGENCE_DOMAIN_ORDER/);
  assert.doesNotMatch(source, /INTELLIGENCE_DOMAIN_CONFIG/);
  assert.doesNotMatch(source, /Six Intelligence Areas/);
  assert.match(source, /getResultDetailDomains\(result\)/);
  assert.match(source, /buildDomainSignalRingViewModel\(\{/);
  assert.match(source, /function buildResultDetailDomainItems\(/);
  assert.match(source, /ringModelsByDomainKey/);
  assert.match(source, /ringModelsByDomainKey\.get\(domain\.domainKey\) \?\? params\.ringModels\[index\] \?\? null/);
  assert.match(source, /<DomainSection domainItems=\{resultDomainItems\} \/>/);
  assert.match(source, /domainItems\.map\(\(\{ domain, ringModel \}\) =>/);
});

test('result detail hero is narrative-first and no longer leads with derived signal interpretation copy', () => {
  const source = readFileSync(pagePath, 'utf8');

  assert.match(source, /const heroHeading = result\.overviewSummary\.headline\.trim\(\)/);
  assert.match(source, /const heroSupport = getHeroSupport\(result\)/);
  assert.match(source, /\{heroHeading\}/);
  assert.match(source, /\{heroSupport\.narrative\}/);
  assert.doesNotMatch(source, /function getHeroNarrative\(/);
  assert.doesNotMatch(source, /function getHeroHeading\(/);
  assert.doesNotMatch(source, /const combinedInterpretation = getCombinedInterpretation/);
  assert.doesNotMatch(source, /In practice:/);
  assert.doesNotMatch(source, /heroPrimarySignalChips/);
});

test('result detail page renders assessmentDescription above the hero when present and hides the section when absent', () => {
  const source = readFileSync(pagePath, 'utf8');

  assert.match(source, /const assessmentDescription = result\.metadata\.assessmentDescription;/);
  assert.match(source, /const hasAssessmentDescription =\s*typeof assessmentDescription === 'string' && assessmentDescription\.trim\(\)\.length > 0/);
  assert.match(source, /\{hasAssessmentDescription \? \(/);
  assert.match(source, /<section className="mb-6">/);
  assert.match(source, /text-sm text-muted-foreground leading-relaxed whitespace-pre-line/);
  assert.match(source, /\{assessmentDescription\}/);

  const descriptionIndex = source.indexOf('const assessmentDescription = result.metadata.assessmentDescription;');
  const heroIndex = source.indexOf('<section className="overflow-hidden rounded-[1.5rem]');
  assert.ok(descriptionIndex >= 0);
  assert.ok(heroIndex >= 0);
  assert.ok(descriptionIndex < heroIndex);
});

test('result detail page keeps personalisation prep outside UI prose generation', () => {
  const source = readFileSync(pagePath, 'utf8');

  assert.match(source, /import \{ getRequestUserId \} from '@\/lib\/server\/request-user';/);
  assert.doesNotMatch(source, /getRequestUserContext/);
  assert.doesNotMatch(source, /userEmail/);
  assert.doesNotMatch(source, /displayName/);
  assert.doesNotMatch(source, /fullName/);
  assert.doesNotMatch(source, /firstName/);
  assert.doesNotMatch(source, /, you tend to/);
  assert.doesNotMatch(source, /, your natural style is/);
});

test('result detail action section uses a report-style text-led sequence without panel chrome', () => {
  const source = readFileSync(pagePath, 'utf8');

  assert.match(source, /title="Interpretation to hold onto"/);
  assert.match(source, /<ActionSection result=\{result\} \/>/);
  assert.match(source, /function ActionSection\(/);
  assert.match(source, /Across the rest of the report, this pattern shows up in a few consistent ways: where it adds value, where it can create friction, and where attention may be useful\./);
  assert.match(source, /<ActionList title="Strengths" items=\{result\.strengths\} \/>/);
  assert.match(source, /<ActionList title="Watchouts" items=\{result\.watchouts\} \/>/);
  assert.match(source, /<ActionList title="Development Focus" items=\{result\.developmentFocus\} \/>/);
  assert.match(source, /mx-auto max-w-\[58rem\] space-y-12 md:space-y-14/);
  assert.match(source, /border-white\/8 space-y-6 border-t pt-8 first:border-t-0 first:pt-0 md:space-y-7 md:pt-10/);
  assert.match(source, /max-w-\[42rem\] text-\[0\.98rem\] leading-8 text-white\/64/);
  assert.doesNotMatch(source, /xl:grid-cols-3/);
  assert.doesNotMatch(source, /rounded-\[1\.7rem\] p-6 sm:p-7 md:p-8/);
  assert.doesNotMatch(source, /rounded-\[1\.35rem\] border px-5 py-5 sm:px-6/);
  assert.doesNotMatch(source, /inline-flex rounded-full px-2\.5 py-1 text-\[11px\] font-medium/);
  assert.doesNotMatch(source, /Practical synthesis/);
});

test('result detail domain section is summary-first and no longer emphasizes percentages', () => {
  const source = readFileSync(pagePath, 'utf8');

  assert.match(source, /title="Domain reading"/);
  assert.match(source, /The chapters that follow stay with the same overall pattern, showing how it comes through across the main areas of the report\./);
  assert.match(source, /<DomainSection domainItems=\{resultDomainItems\} \/>/);
  assert.match(source, /function DomainChapter\(\{/);
  assert.match(source, /ringModel: DomainSignalRingViewModel \| null;/);
  assert.match(source, /<SectionEyebrow>Domain<\/SectionEyebrow>/);
  assert.match(source, /<DomainSignalRing/);
  assert.match(source, /domain=\{ringModel\}/);
  assert.match(source, /mx-auto max-w-\[58rem\] space-y-12 md:space-y-14/);
  assert.match(source, /border-white\/8 space-y-6 border-t pt-8 first:border-t-0 first:pt-0 md:space-y-7 md:pt-10/);
  assert.match(source, /max-w-\[44rem\] text-\[1rem\] leading-8 text-white\/68 md:text-\[1\.05rem\] md:leading-9/);
  assert.match(source, /interpretation\?\.summary/);
  assert.doesNotMatch(source, /formatPercent\(signal\.domainPercentage\)/);
  assert.doesNotMatch(source, /See why .* leads here/);
  assert.doesNotMatch(source, /Primary signal/);
  assert.doesNotMatch(source, /Secondary signal/);
  assert.doesNotMatch(source, /2xl:grid-cols-2/);
  assert.doesNotMatch(source, /rounded-\[1\.8rem\] p-6 sm:p-7 md:p-8/);
  assert.match(source, /Additional signal context/);
  assert.match(source, /also appears in this area/);
  assert.doesNotMatch(source, /function getPersistedDomainInterpretation\(/);
  assert.doesNotMatch(source, /function getDomainSignalContext\(/);
  assert.doesNotMatch(source, /The main reading journey/);
  assert.doesNotMatch(source, /These sections are rendered directly from the persisted result payload/);
  assert.doesNotMatch(source, /These chapters follow the persisted payload order/);
});

test('result detail page keeps the domain chart integration on the wider editorial column for signal bars', () => {
  const source = readFileSync(pagePath, 'utf8');

  assert.match(source, /max-w-\[43rem\] border-white\/8 bg-\[linear-gradient\(180deg,rgba\(12,19,33,0\.68\),rgba\(8,12,24,0\.9\)\)\] p-4 sm:p-5 md:max-w-\[45rem\] md:p-6/);
});

test('result detail domain chapters keep rendering stable even when a persisted domain has no ring signals', () => {
  const source = readFileSync(pagePath, 'utf8');

  assert.match(source, /ringModel \? \(/);
  assert.match(source, /No persisted domain signals are available for this area\./);
  assert.doesNotMatch(source, /A domain reading is not available for this area yet\./);
  assert.doesNotMatch(source, /throw new Error\(.+ring/i);
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
  assert.match(source, /<section className="overflow-hidden rounded-\[1\.5rem\] bg-\[radial-gradient\(circle_at_top_left,rgba\(118,147,255,0\.11\),transparent_38%\),linear-gradient\(180deg,rgba\(16,26,44,0\.72\),rgba\(9,15,28,0\.88\)\)\] px-7 py-8 sm:px-8 sm:py-9 md:px-12 md:py-12 lg:px-14">/);
  assert.match(source, /max-w-\[82rem\] space-y-7 md:space-y-9/);
  assert.match(source, /max-w-\[20ch\]/);
  assert.match(source, /max-w-\[76ch\]/);
  assert.match(source, /max-w-\[68ch\]/);
  assert.match(source, /className="space-y-7"/);
  assert.match(source, /md:grid-cols-\[minmax\(0,12rem\)_minmax\(0,1fr\)\]/);
  assert.match(source, /max-w-\[43rem\] border-white\/8 bg-\[linear-gradient\(180deg,rgba\(12,19,33,0\.68\),rgba\(8,12,24,0\.9\)\)\] p-4 sm:p-5 md:max-w-\[45rem\] md:p-6/);
  assert.match(source, /text-\[1\.32rem\] font-semibold tracking-\[-0\.03em\] text-white md:text-\[1\.45rem\]/);
  assert.doesNotMatch(source, /<SurfaceCard\s+accent/);
  assert.doesNotMatch(source, /rounded-\[2rem\] bg-\[radial-gradient\(circle_at_top_left,rgba\(118,147,255,0\.16\),transparent_32%\),linear-gradient\(180deg,rgba\(16,26,44,0\.92\),rgba\(9,15,28,0\.98\)\)\] px-6 py-7 sm:px-7 sm:py-8 md:px-10 md:py-12/);
});
