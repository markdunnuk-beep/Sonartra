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

const DISALLOWED_GENERIC_HERO_HEADLINE_PATTERN =
  /A clear (working style|source of motivation|leadership pattern|conflict response|environment preference|decision pattern|role fit) is coming through|A pressure pattern is coming through/;
const REMOVED_DOMAIN_FOCUS_PATTERN = new RegExp(`domain${'Focus'}`);

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
      subheadline: 'Canonical hero subheadline.',
      summary: 'Canonical hero summary.',
      narrative: 'Canonical hero narrative.',
      pressureOverlay: 'Canonical pressure overlay.',
      environmentOverlay: 'Canonical environment overlay.',
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
      chapterOpening: 'Zeta summary.',
      signalBalance: {
        items: [
          {
            signalKey: 'horizon',
            signalLabel: 'Horizon',
            withinDomainPercent: 80,
            rank: 1,
            isPrimary: true,
            isSecondary: false,
            chapterSummary: null,
          },
        ],
      },
      primarySignal: null,
      secondarySignal: null,
      signalPair: null,
      pressureFocus: null,
      environmentFocus: null,
    },
    {
      domainKey: 'adaptive_focus',
      domainLabel: 'Adaptive Focus',
      chapterOpening: 'Adaptive summary.',
      signalBalance: {
        items: [],
      },
      primarySignal: null,
      secondarySignal: null,
      signalPair: null,
      pressureFocus: null,
      environmentFocus: null,
    },
  ]);

  const ringModels = buildDomainSignalRingViewModel({
    domains: result.domains,
  });

  assert.deepEqual(ringModels.map((domain) => domain.domainKey), ['zeta_custom', 'adaptive_focus']);
  assert.deepEqual(ringModels[0]?.signals.map((signal) => signal.signalKey), ['horizon']);
  assert.deepEqual(ringModels[1]?.signals, []);
});

test('result detail page renders the system introduction above hero and keeps canonical result sections below it', () => {
  const source = readFileSync(pagePath, 'utf8');

  assert.match(source, /import \{ SonartraIntroduction \} from '@\/components\/results\/sonartra-introduction';/);
  assert.match(source, /import \{ HeroPatternMedallion \} from '@\/components\/results\/hero-pattern-medallion';/);
  assert.match(source, /function NarrativeBridge\(/);
  assert.match(source, /const heroHeadline = result\.hero\.headline\?\.trim\(\) \?\? '';/);
  assert.match(source, /const heroSubheadline = result\.hero\.subheadline\?\.trim\(\) \?\? '';/);
  assert.match(source, /const heroSummary = result\.hero\.summary\?\.trim\(\) \?\? '';/);
  assert.match(source, /const heroNarrative = result\.hero\.narrative\?\.trim\(\) \?\? '';/);
  assert.match(source, /const heroPatternKey = result\.hero\.heroPattern\?\.patternKey \?\? null;/);
  assert.match(source, /const heroPatternLabel = result\.hero\.heroPattern\?\.label\?\.trim\(\) \?\? '';/);
  assert.match(source, /const pressureOverlay = result\.hero\.pressureOverlay\?\.trim\(\) \?\? '';/);
  assert.match(source, /const environmentOverlay = result\.hero\.environmentOverlay\?\.trim\(\) \?\? '';/);
  assert.match(source, /const overviewHeadline = result\.overviewSummary\.headline\?\.trim\(\) \?\? '';/);
  assert.match(source, /const overviewNarrative = result\.overviewSummary\.narrative\?\.trim\(\) \?\? '';/);
  assert.match(source, /const introMetadataItems = \[/);
  assert.match(source, /buildDomainSignalRingViewModel\(\{\s*domains: result\.domains,\s*actions: result\.actions,/);
  assert.match(source, /buildResultDetailDomainItems\(\{\s*domains: result\.domains,/);
  assert.match(source, /<PageFrame className="space-y-12 md:space-y-14">/);
  assert.match(source, /<SonartraIntroduction metadataItems=\{introMetadataItems\} \/>/);
  assert.match(source, /With that context, here&apos;s what your patterns are showing\./);
  assert.match(source, /Here&apos;s how these patterns show up across each domain\./);
  assert.match(source, /So what does this mean in practice\?/);
  assert.match(source, /sonartra-report-hero rounded-\[2rem\] border px-7 py-11 sm:px-8 sm:py-12 md:px-12 md:py-16 lg:px-14/);
  assert.match(source, /sonartra-type-display max-w-\[11ch\] text-\[3\.15rem\] tracking-\[-0\.055em\] md:text-\[5rem\]/);
  assert.match(source, /sonartra-report-body-soft max-w-\[42rem\] text-\[1rem\] leading-8 text-white\/68/);
  assert.match(source, /sonartra-report-prose max-w-\[50rem\] space-y-6 border-l border-white\/8 pl-5 md:space-y-7 md:pl-7/);
  assert.match(source, /sonartra-report-summary text-\[1\.08rem\] leading-8 text-white\/82 sm:text-\[1\.13rem\] md:text-\[1\.22rem\] md:leading-10/);
  assert.match(source, /sonartra-report-body max-w-\[46rem\] text-\[1rem\] leading-8 text-white\/78 sm:text-\[1\.05rem\] md:text-\[1\.1rem\] md:leading-9/);
  assert.match(source, /grid gap-9 md:grid-cols-\[minmax\(0,1fr\)_auto\] md:items-start md:gap-11/);
  assert.match(source, /<HeroPatternMedallion\s+patternKey=\{heroPatternKey\}\s+label=\{heroPatternLabel\}/);
  assert.match(source, /<NarrativeBridge className="max-w-\[38rem\]">/);
  assert.match(source, /heroPatternLabel/);
  assert.match(source, /heroSummary/);
  assert.match(source, /heroNarrative/);
  assert.match(source, /<EditorialAside label="Pressure" text=\{pressureOverlay\} \/>/);
  assert.match(source, /<EditorialAside label="Environment" text=\{environmentOverlay\} \/>/);
  assert.match(source, /<DomainSection domainItems=\{resultDomainItems\} \/>/);
  assert.match(source, /<ActionSection\s+actions=\{result\.actions\}\s+conclusionHeadline=\{actionConclusionHeadline\}\s+conclusionNarrative=\{actionConclusionNarrative\}\s+\/>/);

  assert.doesNotMatch(source, /result\.intro\.assessmentDescription/);
  assert.doesNotMatch(source, /result\.metadata\.assessmentDescription/);
  assert.doesNotMatch(source, /result\.bridge/);
  assert.doesNotMatch(source, /result\.sections/);
  assert.doesNotMatch(source, /result\.hero\.domainHighlights/);
  assert.doesNotMatch(source, DISALLOWED_GENERIC_HERO_HEADLINE_PATTERN);
  assert.doesNotMatch(source, /getResultDetailDomains/);
  assert.doesNotMatch(source, /<ActionSection result=\{result\} \/>/);
  assert.doesNotMatch(source, /reportIntroduction/);
  assert.doesNotMatch(source, /introCopy/);
  assert.doesNotMatch(source, /sonartra-report-hero-meta-grid/);

  const introIndex = source.indexOf('<SonartraIntroduction metadataItems={introMetadataItems} />');
  const introBridgeIndex = source.indexOf('With that context, here&apos;s what your patterns are showing.');
  const heroIndex = source.indexOf('sonartra-report-hero rounded-[2rem] border');
  const domainBridgeIndex = source.indexOf('Here&apos;s how these patterns show up across each domain.');
  const domainIndex = source.indexOf('title="Domain reading"');
  const actionBridgeIndex = source.indexOf('So what does this mean in practice?');
  const actionIndex = source.indexOf('title="What this means in practice"');

  assert.ok(introIndex >= 0);
  assert.ok(introBridgeIndex >= 0);
  assert.ok(heroIndex >= 0);
  assert.ok(domainBridgeIndex >= 0);
  assert.ok(domainIndex >= 0);
  assert.ok(actionBridgeIndex >= 0);
  assert.ok(actionIndex >= 0);
  assert.ok(introIndex < introBridgeIndex);
  assert.ok(introBridgeIndex < heroIndex);
  assert.ok(heroIndex < domainBridgeIndex);
  assert.ok(domainBridgeIndex < domainIndex);
  assert.ok(domainIndex < actionBridgeIndex);
  assert.ok(actionBridgeIndex < actionIndex);
});

test('result detail page removes the redundant hero domain highlight subsection', () => {
  const source = readFileSync(pagePath, 'utf8');

  assert.doesNotMatch(source, /function HeroDomainHighlights\(/);
  assert.doesNotMatch(source, /highlights\.length === 0/);
  assert.doesNotMatch(source, /highlight\.domainLabel/);
  assert.doesNotMatch(source, /highlight\.primarySignalLabel/);
  assert.doesNotMatch(source, /highlight\.summary \?/);
  assert.doesNotMatch(source, /max-w-\[60rem\] border-t border-white\/7 pt-7/);
  assert.doesNotMatch(source, /<HeroDomainHighlights highlights=\{result\.hero\.domainHighlights\} \/>/);
});

test('result detail page renders canonical domain chapter fields without UI-side interpretation synthesis', () => {
  const source = readFileSync(pagePath, 'utf8');
  const chapterOpeningIndex = source.indexOf('domain.chapterOpening');
  const firstTransitionIndex = source.indexOf(
    'This becomes most visible in the patterns you rely on day to day.',
  );
  const signalBalanceIndex = source.indexOf('<EditorialDivider title="Signal balance" />');
  const primarySignalIndex = source.indexOf('title="Primary signal"');
  const secondarySignalIndex = source.indexOf('title="Secondary signal"');
  const secondTransitionIndex = source.indexOf(
    'When these patterns come together, they shape a more consistent way of operating.',
  );
  const pairSummaryIndex = source.indexOf('<EditorialDivider title="Signal pair" />');
  const pressureFocusIndex = source.indexOf('label="Pressure within the pair"');
  const environmentFocusIndex = source.indexOf('label="Environment within the pair"');

  assert.match(source, /domain\.chapterOpening/);
  assert.match(source, /domain\.pressureFocus/);
  assert.match(source, /domain\.environmentFocus/);
  assert.match(source, /domain\.primarySignal/);
  assert.match(source, /domain\.secondarySignal/);
  assert.match(source, /domain\.primarySignal\.chapterSummary/);
  assert.match(source, /domain\.secondarySignal\.chapterSummary/);
  assert.match(source, /domain\.signalPair\?\.summary/);
  assert.match(source, /buildDomainSignalRingViewModel\(\{\s*domains: result\.domains,\s*actions: result\.actions,/);
  assert.match(
    source,
    /This becomes most visible in the patterns you rely on day to day\./,
  );
  assert.match(
    source,
    /When these patterns come together, they shape a more consistent way of operating\./,
  );
  assert.match(source, /label="Pressure within the pair"/);
  assert.match(source, /label="Environment within the pair"/);
  assert.match(source, /chapterNumber: number;/);
  assert.match(source, /Chapter \$\{chapterNumber\.toString\(\)\.padStart\(2, '0'\)\}/);
  assert.match(source, /grid gap-x-10 gap-y-6 border-t border-white\/7 pt-6 md:grid-cols-\[minmax\(0,1fr\)_minmax\(0,1fr\)\]/);
  assert.match(source, /text-\[0\.97rem\] leading-8 text-white\/50 italic/);

  assert.ok(chapterOpeningIndex >= 0);
  assert.ok(firstTransitionIndex > chapterOpeningIndex);
  assert.ok(signalBalanceIndex > firstTransitionIndex);
  assert.ok(primarySignalIndex > signalBalanceIndex);
  assert.ok(secondarySignalIndex > primarySignalIndex);
  assert.ok(secondTransitionIndex > secondarySignalIndex);
  assert.ok(pairSummaryIndex > secondTransitionIndex);
  assert.ok(pressureFocusIndex > pairSummaryIndex);
  assert.ok(environmentFocusIndex > pressureFocusIndex);

  assert.doesNotMatch(source, /interpretation\?\.summary/);
  assert.doesNotMatch(source, /supportingLine/);
  assert.doesNotMatch(source, /tensionClause/);
  assert.doesNotMatch(source, /Additional signal context/);
  assert.doesNotMatch(source, REMOVED_DOMAIN_FOCUS_PATTERN);
});

test('result detail page renders actions from canonical action blocks only', () => {
  const source = readFileSync(pagePath, 'utf8');

  assert.match(source, /function toVisibleActionItems\(/);
  assert.match(source, /detail: item\.text/);
  assert.match(source, /title: item\.signalLabel/);
  assert.match(source, /function ActionSection\(\{\s*actions,\s*conclusionHeadline,\s*conclusionNarrative,/);
  assert.match(source, /<SectionEyebrow>Closing reading<\/SectionEyebrow>/);
  assert.match(source, /What to keep doing/);
  assert.match(source, /Where to be careful/);
  assert.match(source, /Where to focus next/);
  assert.match(source, /items\.map\(\(item, index\) => \(/);
  assert.match(source, /items=\{toVisibleActionItems\(actions\.strengths\)\}/);
  assert.match(source, /items=\{toVisibleActionItems\(actions\.watchouts\)\}/);
  assert.match(source, /items=\{toVisibleActionItems\(actions\.developmentFocus\)\}/);
  assert.match(source, /title="What this means in practice"/);
  assert.match(source, /mx-auto max-w-\[61rem\] space-y-10 px-1 md:space-y-12 md:px-2/);
  assert.match(source, /grid gap-7 border-t border-white\/6 pt-12 first:border-t-0 first:pt-0 md:grid-cols-\[minmax\(0,15rem\)_minmax\(0,1fr\)\] md:gap-10 md:pt-14/);
  assert.match(source, /sonartra-report-action-item rounded-\[1\.2rem\] border border-white\/7 bg-white\/\[0\.015\] px-5 py-5 md:px-6 md:py-6/);

  assert.doesNotMatch(source, /items=\{result\.strengths\}/);
  assert.doesNotMatch(source, /items=\{result\.watchouts\}/);
  assert.doesNotMatch(source, /items=\{result\.developmentFocus\}/);
  assert.doesNotMatch(source, /Show \{overflow\.length\} more/);
  assert.doesNotMatch(source, /<details className="max-w-\[46rem\] pt-1">/);
});

test('result detail page removes payload-driven intro rendering in favor of the system introduction layer', () => {
  const source = readFileSync(pagePath, 'utf8');

  assert.match(source, /<SonartraIntroduction metadataItems=\{introMetadataItems\} \/>/);
  assert.match(source, /sonartra-report-hero/);
  assert.match(source, /mx-auto max-w-\[61rem\] px-1 md:px-2/);
  assert.doesNotMatch(source, /import ReactMarkdown from 'react-markdown';/);
  assert.doesNotMatch(source, /import remarkGfm from 'remark-gfm';/);
  assert.doesNotMatch(source, /<ReactMarkdown remarkPlugins=\{\[remarkGfm\]\} skipHtml>/);
  assert.doesNotMatch(source, /About this report/);
  assert.doesNotMatch(source, /rounded-\[1\.9rem\] border border-white\/6/);
  assert.doesNotMatch(source, /dangerouslySetInnerHTML/);
});
