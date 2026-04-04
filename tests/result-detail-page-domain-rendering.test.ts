import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildDomainSignalRingViewModel } from '@/lib/server/domain-signal-ring-view-model';
import type { AssessmentResultDetailViewModel } from '@/lib/server/result-read-model-types';

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
  domains: AssessmentResultDetailViewModel['domains'],
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
      assessmentTitle: 'Signals Flex',
      version: '1.0.0',
      attemptId: 'attempt-1',
      completedAt: '2026-01-01T00:00:00.000Z',
      assessmentDescription: 'Legacy fallback copy.',
    },
    intro: {
      assessmentDescription: 'Canonical intro copy.',
    },
    hero: {
      headline: 'Canonical hero headline',
      narrative: 'Canonical hero narrative.',
      primaryPattern: {
        label: 'Core Focus',
        signalKey: 'core_focus',
        signalLabel: 'Core Focus',
      },
      domainHighlights: [
        {
          domainKey: 'focus',
          domainLabel: 'Focus',
          primarySignalKey: 'core_focus',
          primarySignalLabel: 'Core Focus',
          summary: 'Keeps energy trained on the main line of work.',
        },
      ],
    },
    domains,
    actions: {
      strengths: [
        {
          signalKey: 'core_focus',
          signalLabel: 'Core Focus',
          text: 'Strength text.',
        },
      ],
      watchouts: [
        {
          signalKey: 'pressure_guard',
          signalLabel: 'Pressure Guard',
          text: 'Watchout text.',
        },
      ],
      developmentFocus: [
        {
          signalKey: 'environment_scan',
          signalLabel: 'Environment Scan',
          text: 'Development text.',
        },
      ],
    },
    topSignal: null,
    rankedSignals: Object.freeze([]),
    normalizedScores: Object.freeze([]),
    domainSummaries: Object.freeze([]),
    overviewSummary: {
      headline: 'Legacy hero headline',
      narrative: 'Legacy hero narrative.',
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
      domainCount: domains.length,
      zeroMass: true,
      zeroMassTopSignalFallbackApplied: false,
      warnings: Object.freeze([]),
      generatedAt: '2026-01-01T00:00:00.000Z',
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    generatedAt: '2026-01-01T00:00:00.000Z',
  };
}

test('domain signal ring mapper can build rings directly from canonical domains payload order', () => {
  const result = buildResultDetail([
    {
      domainKey: 'zeta_custom',
      domainLabel: 'Zeta Custom',
      summary: 'Zeta summary.',
      focus: null,
      pressure: null,
      environment: null,
      primarySignal: null,
      secondarySignal: null,
      pairSummary: null,
      signals: [
        {
          signalKey: 'horizon',
          signalLabel: 'Horizon',
          score: 80,
          withinDomainPercent: 80,
          rank: 1,
          isPrimary: true,
          isSecondary: false,
        },
      ],
    },
    {
      domainKey: 'adaptive_focus',
      domainLabel: 'Adaptive Focus',
      summary: 'Adaptive summary.',
      focus: null,
      pressure: null,
      environment: null,
      primarySignal: null,
      secondarySignal: null,
      pairSummary: null,
      signals: [],
    },
  ]);

  const ringModels = buildDomainSignalRingViewModel({
    domains: result.domains,
  });

  assert.deepEqual(ringModels.map((domain) => domain.domainKey), ['zeta_custom', 'adaptive_focus']);
  assert.deepEqual(ringModels[0]?.signals.map((signal) => signal.signalKey), ['horizon']);
  assert.deepEqual(ringModels[1]?.signals, []);
});

test('result detail page reads intro, hero, domains, and actions from canonical payload sections in final order', () => {
  const source = readFileSync(pagePath, 'utf8');

  assert.match(source, /const assessmentDescription = result\.intro\.assessmentDescription;/);
  assert.match(source, /const heroHeadline = result\.hero\.headline\?\.trim\(\) \?\? '';/);
  assert.match(source, /const heroNarrative = result\.hero\.narrative\?\.trim\(\) \?\? '';/);
  assert.match(source, /buildDomainSignalRingViewModel\(\{\s*domains: result\.domains,/);
  assert.match(source, /buildResultDetailDomainItems\(\{\s*domains: result\.domains,/);
  assert.match(source, /<HeroDomainHighlights highlights=\{result\.hero\.domainHighlights\} \/>/);
  assert.match(source, /<DomainSection domainItems=\{resultDomainItems\} \/>/);
  assert.match(source, /<ActionSection actions=\{result\.actions\} \/>/);

  assert.doesNotMatch(source, /result\.metadata\.assessmentDescription/);
  assert.doesNotMatch(source, /result\.overviewSummary\.headline/);
  assert.doesNotMatch(source, /result\.overviewSummary\.narrative/);
  assert.doesNotMatch(source, /getResultDetailDomains/);
  assert.doesNotMatch(source, /<ActionSection result=\{result\} \/>/);

  const introIndex = source.indexOf('const assessmentDescription = result.intro.assessmentDescription;');
  const heroIndex = source.indexOf('<section className="rounded-[2rem] border border-white/6');
  const domainIndex = source.indexOf('title="Domain reading"');
  const actionIndex = source.indexOf('title="What this means in practice"');

  assert.ok(introIndex >= 0);
  assert.ok(heroIndex >= 0);
  assert.ok(domainIndex >= 0);
  assert.ok(actionIndex >= 0);
  assert.ok(introIndex < heroIndex);
  assert.ok(heroIndex < domainIndex);
  assert.ok(domainIndex < actionIndex);
});

test('result detail page renders canonical hero domain highlights beneath the hero narrative', () => {
  const source = readFileSync(pagePath, 'utf8');

  assert.match(source, /function HeroDomainHighlights\(/);
  assert.match(source, /highlights\.length === 0/);
  assert.match(source, /highlight\.domainLabel/);
  assert.match(source, /highlight\.primarySignalLabel/);
  assert.match(source, /highlight\.summary \?/);
  assert.match(source, /max-w-\[60rem\] border-t border-white\/7 pt-7/);
  assert.match(source, /space-y-3\.5/);
  assert.match(source, /flex flex-wrap items-baseline gap-x-3 gap-y-1/);
});

test('result detail page renders canonical domain chapter fields without UI-side interpretation synthesis', () => {
  const source = readFileSync(pagePath, 'utf8');

  assert.match(source, /domain\.summary/);
  assert.match(source, /domain\.focus/);
  assert.match(source, /domain\.pressure/);
  assert.match(source, /domain\.environment/);
  assert.match(source, /domain\.primarySignal/);
  assert.match(source, /domain\.secondarySignal/);
  assert.match(source, /domain\.pairSummary\?\.text/);
  assert.match(source, /const visibleSignals = domain\.signals\.slice\(0, 2\);/);
  assert.match(source, /const hiddenSignals = domain\.signals\.slice\(2\);/);
  assert.match(source, /signal\.signalLabel/);
  assert.match(source, /grid gap-x-10 gap-y-6 border-t border-white\/7 pt-6 md:grid-cols-\[minmax\(0,1fr\)_minmax\(0,1fr\)\]/);
  assert.match(source, /text-\[0\.97rem\] leading-8 text-white\/50 italic/);

  assert.doesNotMatch(source, /interpretation\?\.summary/);
  assert.doesNotMatch(source, /supportingLine/);
  assert.doesNotMatch(source, /tensionClause/);
});

test('result detail page renders actions from canonical action blocks only', () => {
  const source = readFileSync(pagePath, 'utf8');

  assert.match(source, /function toVisibleActionItems\(/);
  assert.match(source, /detail: item\.text/);
  assert.match(source, /title: item\.signalLabel/);
  assert.match(source, /items=\{toVisibleActionItems\(actions\.strengths\)\}/);
  assert.match(source, /items=\{toVisibleActionItems\(actions\.watchouts\)\}/);
  assert.match(source, /items=\{toVisibleActionItems\(actions\.developmentFocus\)\}/);
  assert.match(source, /title="What this means in practice"/);
  assert.match(source, /mx-auto max-w-\[56rem\] px-1 md:px-2/);
  assert.match(source, /space-y-6 border-t border-white\/6 pt-10 first:border-t-0 first:pt-0 md:space-y-7 md:pt-14/);

  assert.doesNotMatch(source, /items=\{result\.strengths\}/);
  assert.doesNotMatch(source, /items=\{result\.watchouts\}/);
  assert.doesNotMatch(source, /items=\{result\.developmentFocus\}/);
});

test('result detail page keeps markdown intro rendering and editorial shell for canonical intro copy', () => {
  const source = readFileSync(pagePath, 'utf8');

  assert.match(source, /import ReactMarkdown from 'react-markdown';/);
  assert.match(source, /import remarkGfm from 'remark-gfm';/);
  assert.match(source, /<ReactMarkdown remarkPlugins=\{\[remarkGfm\]\} skipHtml>/);
  assert.match(source, /\{assessmentDescription\}/);
  assert.match(source, /About this report/);
  assert.match(source, /<PageFrame className="space-y-14 md:space-y-16">/);
  assert.match(source, /rounded-\[2rem\] border border-white\/6/);
  assert.match(source, /mx-auto max-w-\[58rem\] px-1 md:px-2/);
  assert.match(source, /rounded-\[2rem\] border border-white\/8/);
  assert.doesNotMatch(source, /dangerouslySetInnerHTML/);
});
