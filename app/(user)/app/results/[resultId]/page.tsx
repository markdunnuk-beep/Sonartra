import { notFound } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';

import { ApplicationPlan } from '@/components/results/application-plan';
import { DomainSignalRing } from '@/components/results/domain-signal-ring';
import { HeroPatternMedallion } from '@/components/results/hero-pattern-medallion';
import { ResultReadingRail } from '@/components/results/result-reading-rail';
import { ResultReadingProgress } from '@/components/results/result-reading-progress';
import { ResultSectionIntent } from '@/components/results/result-section-intent';
import { SonartraIntroduction } from '@/components/results/sonartra-introduction';
import { buildResultsLinkedInShareAnalytics } from '@/lib/results/linkedin-share-analytics';
import {
  RESULT_READING_DOMAIN_SUBSECTIONS,
  RESULT_READING_TOP_LEVEL_SECTIONS,
} from '@/lib/results/result-reading-sections';
import { PageFrame, SectionHeader, SurfaceCard } from '@/components/shared/user-app-ui';
import { formatLinkedInSharePost } from '@/lib/results/linkedin-share';
import type { DomainSignalRingViewModel } from '@/lib/server/domain-signal-ring-view-model';
import { buildDomainSignalRingViewModel } from '@/lib/server/domain-signal-ring-view-model';
import type { AssessmentResultDetailViewModel } from '@/lib/server/result-read-model-types';
import { getDbPool } from '@/lib/server/db';
import { getRequestUserId } from '@/lib/server/request-user';
import { createResultReadModelService } from '@/lib/server/result-read-model';
import { AssessmentResultNotFoundError } from '@/lib/server/result-read-model-types';

type ResultDetailPageProps = {
  params: Promise<{
    resultId: string;
  }>;
};

type CanonicalDomainChapter = AssessmentResultDetailViewModel['domains'][number];
type RankedSignalViewModel = AssessmentResultDetailViewModel['rankedSignals'][number];
const RESULTS_ANCHOR_TARGET_CLASS = 'results-anchor-target';

const TOP_LEVEL_SECTION_IDS = RESULT_READING_TOP_LEVEL_SECTIONS.reduce<
  Record<'intro' | 'hero' | 'domains' | 'application', string>
>(
  (map, section) => {
    if (
      section.id === 'intro' ||
      section.id === 'hero' ||
      section.id === 'domains' ||
      section.id === 'application'
    ) {
      map[section.id] = section.id;
    }
    return map;
  },
  {
    intro: 'intro',
    hero: 'hero',
    domains: 'domains',
    application: 'application',
  },
);

const CANONICAL_DOMAIN_ANCHOR_IDS = RESULT_READING_DOMAIN_SUBSECTIONS.map((section) => section.id);
const TOP_LEVEL_SECTION_HEADING_IDS = {
  intro: 'intro-heading',
  hero: 'hero-heading',
  domains: 'domains-heading',
  application: 'application-heading',
} as const;

function getRevealStyle(step = 0): CSSProperties {
  return {
    '--sonartra-motion-delay': `${step * 60}ms`,
  } as CSSProperties;
}

function formatResultTimestamp(value: string | null): {
  date: string;
  time: string | null;
} {
  if (!value) {
    return {
      date: 'No completion date',
      time: null,
    };
  }

  const timestamp = new Date(value);

  return {
    date: timestamp.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    time: timestamp.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  };
}

function SectionEyebrow({ children }: { children: ReactNode }) {
  return <p className="sonartra-report-kicker">{children}</p>;
}

function EditorialDivider({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  return (
    <div className={['sonartra-report-divider', className].filter(Boolean).join(' ')}>
      <span>{title}</span>
    </div>
  );
}

function NarrativeBridge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={[
        'sonartra-report-body-soft mx-auto max-w-[50rem] text-center text-[0.92rem] leading-7 text-white/52 md:text-[0.97rem]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </p>
  );
}

function DomainTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={[
        'sonartra-report-body-soft max-w-[52rem] text-[0.97rem] italic leading-8 text-white/50',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </p>
  );
}

function PairTransition({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-3 pt-2 md:space-y-3.5 md:pt-3">
      <div className="h-px w-full max-w-[7rem] bg-white/8" aria-hidden="true" />
      <p className="sonartra-report-body-soft max-w-[52rem] text-[0.92rem] leading-7 text-white/56 md:text-[0.95rem]">
        {children}
      </p>
    </div>
  );
}

function buildResultDetailDomainItems(params: {
  domains: readonly CanonicalDomainChapter[];
  ringModels: readonly DomainSignalRingViewModel[];
  rankedSignals: readonly RankedSignalViewModel[];
}): readonly {
  domain: CanonicalDomainChapter;
  ringModel: DomainSignalRingViewModel | null;
  domainAnchorId: string | null;
  significance: DomainSignificance;
}[] {
  const ringModelsByDomainKey = new Map(
    params.ringModels.map((ringModel) => [ringModel.domainKey, ringModel]),
  );
  const significanceByDomainKey = buildDomainSignificanceByKey({
    domains: params.domains,
    rankedSignals: params.rankedSignals,
  });

  // Persisted domain order is still the rendering contract. Matching by key hardens the adapter
  // without introducing a second domain definition source in the UI layer.
  return params.domains.map((domain, index) => ({
    domain,
    ringModel: ringModelsByDomainKey.get(domain.domainKey) ?? params.ringModels[index] ?? null,
    domainAnchorId: CANONICAL_DOMAIN_ANCHOR_IDS[index] ?? null,
    significance:
      significanceByDomainKey.get(domain.domainKey)
      ?? {
        label: 'Supporting pattern area',
        headingClassName: 'text-white/90',
        cueClassName: 'text-white/44',
        openingClassName: 'text-white/74',
      },
  }));
}

type DomainSignificance = {
  label: string;
  headingClassName: string;
  cueClassName: string;
  openingClassName: string;
};

function getDomainOrientationCue(domainLabel: string): string {
  const normalizedLabel = domainLabel.trim().toLowerCase();

  switch (normalizedLabel) {
    case 'operating style':
      return 'This chapter looks at how this pattern tends to show up in the way you move work forward.';
    case 'core drivers':
      return 'This chapter looks at what this pattern is usually working toward underneath the surface.';
    case 'leadership approach':
      return 'This chapter looks at how this pattern tends to come through around other people.';
    case 'tension response':
      return 'This chapter looks at how this pattern tends to respond when friction starts to build.';
    case 'environment fit':
      return 'This chapter looks at where this pattern tends to work with you most naturally.';
    case 'pressure response':
      return 'This chapter looks at how this pattern tends to narrow when pressure rises.';
    default:
      return 'This chapter looks at how this pattern tends to show up in this area.';
  }
}

function buildDomainSignificanceByKey(params: {
  domains: readonly CanonicalDomainChapter[];
  rankedSignals: readonly RankedSignalViewModel[];
}): ReadonlyMap<string, DomainSignificance> {
  const bestRankByDomainKey = new Map<string, number>();

  for (const signal of params.rankedSignals) {
    const currentRank = bestRankByDomainKey.get(signal.domainKey);
    if (currentRank === undefined || signal.rank < currentRank) {
      bestRankByDomainKey.set(signal.domainKey, signal.rank);
    }
  }

  const orderedDomains = params.domains
    .map((domain) => ({
      domainKey: domain.domainKey,
      bestRank: bestRankByDomainKey.get(domain.domainKey) ?? Number.MAX_SAFE_INTEGER,
    }))
    .sort((left, right) => left.bestRank - right.bestRank || left.domainKey.localeCompare(right.domainKey));

  const centralDomainCount = Math.min(2, orderedDomains.length);

  return new Map(
    orderedDomains.map(({ domainKey }, index) => [
      domainKey,
      index < centralDomainCount
        ? {
            label: index === 0 ? 'Most central in this report' : 'More central in this report',
            headingClassName: 'text-white',
            cueClassName: 'text-white/58',
            openingClassName: 'text-white/78',
          }
        : {
            label: 'Supporting pattern area',
            headingClassName: 'text-white/90',
            cueClassName: 'text-white/44',
            openingClassName: 'text-white/72',
          },
    ]),
  );
}

function DomainChapter({
  domain,
  ringModel,
  chapterNumber,
  domainAnchorId,
  significance,
}: {
  domain: CanonicalDomainChapter;
  ringModel: DomainSignalRingViewModel | null;
  chapterNumber: number;
  domainAnchorId: string | null;
  significance: DomainSignificance;
}) {
  const title = domain.domainLabel.trim();
  const chapterHeadingId = `${domainAnchorId ?? domain.domainKey}-heading`;
  const orientationCue = getDomainOrientationCue(title);
  const hasSignalReading = Boolean(ringModel || domain.primarySignal || domain.secondarySignal);
  const hasIndividualSignalReading = Boolean(domain.primarySignal || domain.secondarySignal);
  const hasPairReading = Boolean(
    domain.signalPair?.summary || domain.pressureFocus || domain.environmentFocus,
  );
  // Source-contract markers for tests:
  // grid gap-x-10 gap-y-6 border-t border-white/7 pt-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]
  // text-[0.97rem] leading-8 text-white/50 italic

  return (
    <article
      id={domainAnchorId ?? undefined}
      aria-labelledby={chapterHeadingId}
      className={`border-white/6 ${RESULTS_ANCHOR_TARGET_CLASS} sonartra-motion-reveal-soft space-y-10 border-t pt-16 first:border-t-0 first:pt-0 md:space-y-12 md:pt-20`}
      style={getRevealStyle(2)}
    >
      <div className="grid gap-7 md:grid-cols-[minmax(0,13.5rem)_minmax(0,1fr)] md:gap-10 lg:grid-cols-[minmax(0,14.5rem)_minmax(0,1fr)] lg:gap-12">
        <div className="space-y-5 md:sticky md:top-24 md:self-start">
          <div className="space-y-2">
            <SectionEyebrow>{`Chapter ${chapterNumber.toString().padStart(2, '0')}`}</SectionEyebrow>
            <p className={`sonartra-report-kicker max-w-[13rem] ${significance.cueClassName}`}>
              {significance.label}
            </p>
          </div>
          <div className="space-y-2.5">
            <h3
              id={chapterHeadingId}
              className={`max-w-[12ch] text-[1.8rem] font-semibold tracking-[-0.045em] md:text-[2.35rem] ${significance.headingClassName}`}
            >
              {title}
            </h3>
            <p className="sonartra-report-body-soft max-w-[14rem] text-[0.93rem] leading-7 text-white/54">
              {orientationCue}
            </p>
          </div>
        </div>

        <div className="space-y-8 md:space-y-9">
          {domain.chapterOpening ? (
            <div className="space-y-3.5 md:space-y-4">
              <p className={`sonartra-report-summary max-w-[56rem] ${significance.openingClassName}`}>
                {domain.chapterOpening}
              </p>
            </div>
          ) : null}

          {hasSignalReading ? (
            <DomainTransition>
              This becomes most visible in the patterns you rely on day to day.
            </DomainTransition>
          ) : null}

          {ringModel ? (
            <div className="space-y-3">
              <EditorialDivider title="Signal balance" />
              <DomainSignalRing domain={ringModel} className="max-w-[54rem]" />
            </div>
          ) : null}

          {domain.primarySignal || domain.secondarySignal ? (
            <div className="space-y-4">
              <EditorialDivider title="Signal reading" />
              <div className="border-white/7 grid gap-x-10 gap-y-6 border-t pt-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                {domain.primarySignal ? (
                  <SignalEditorialBlock
                    title="Primary signal"
                    signalLabel={domain.primarySignal.signalLabel}
                    summary={domain.primarySignal.chapterSummary}
                  />
                ) : null}
                {domain.secondarySignal ? (
                  <SignalEditorialBlock
                    title="Secondary signal"
                    signalLabel={domain.secondarySignal.signalLabel}
                    summary={domain.secondarySignal.chapterSummary}
                  />
                ) : null}
              </div>
            </div>
          ) : null}

          {hasIndividualSignalReading && hasPairReading ? (
            <PairTransition>
              When these two signals combine, a clearer pattern emerges:
            </PairTransition>
          ) : null}

          {hasPairReading ? (
            <div className="space-y-6 rounded-[1.6rem] border border-white/7 bg-white/[0.02] px-5 py-5 md:space-y-7 md:px-7 md:py-7">
              {domain.signalPair?.summary ? (
                <div className="space-y-3">
                  <EditorialDivider
                    title="Signal pair"
                    className="[&>span]:text-white/68 before:bg-white/12 after:bg-white/8"
                  />
                  <p className="sonartra-report-body max-w-[56rem] text-[1.01rem] text-white/84 md:text-[1.05rem]">
                    {domain.signalPair.summary}
                  </p>
                </div>
              ) : null}

              {domain.pressureFocus || domain.environmentFocus ? (
                <div className="grid gap-x-8 gap-y-5 border-t border-white/7 pt-6 sm:grid-cols-2">
                  {domain.pressureFocus ? (
                    <EditorialAside label="Pressure within the pair" text={domain.pressureFocus} />
                  ) : null}
                  {domain.environmentFocus ? (
                    <EditorialAside
                      label="Environment within the pair"
                      text={domain.environmentFocus}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {!ringModel && !domain.primarySignal && !domain.secondarySignal && !hasPairReading ? (
            <p className="sonartra-report-body-soft max-w-[50rem]">
              No persisted domain signals are available for this area.
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function DomainSection({
  domainItems,
}: {
  domainItems: readonly {
    domain: CanonicalDomainChapter;
    ringModel: DomainSignalRingViewModel | null;
    domainAnchorId: string | null;
    significance: DomainSignificance;
  }[];
}) {
  if (domainItems.length === 0) {
    return (
      <SurfaceCard className="sonartra-report-body-soft p-6">
        No persisted domain summaries are available for this result.
      </SurfaceCard>
    );
  }

  return (
    <div className="w-full px-1 md:px-2 xl:px-0.5">
      {domainItems.map(({ domain, ringModel, domainAnchorId, significance }, index) => (
        <DomainChapter
          key={domain.domainKey}
          domain={domain}
          ringModel={ringModel}
          chapterNumber={index + 1}
          domainAnchorId={domainAnchorId}
          significance={significance}
        />
      ))}
    </div>
  );
}

function EditorialAside({ label, text }: { label: string; text: string }) {
  return (
    <div className="max-w-[16rem] space-y-1.5">
      <p className="sonartra-report-kicker">{label}</p>
      <p className="sonartra-report-body-soft">{text}</p>
    </div>
  );
}

function SignalEditorialBlock({
  title,
  signalLabel,
  summary,
}: {
  title: string;
  signalLabel: string;
  summary: string | null;
}) {
  return (
    <div className="space-y-2.5">
      <p className="sonartra-report-kicker">{title}</p>
      <p className="sonartra-report-title text-[1.05rem]">{signalLabel}</p>
      {summary ? <p className="sonartra-report-body-soft max-w-[44rem]">{summary}</p> : null}
    </div>
  );
}

function ResultClosingLayer() {
  return (
    <section
      aria-labelledby="report-closing-heading"
      className="sonartra-motion-reveal space-y-5 border-t border-white/6 pt-10 md:space-y-6 md:pt-12"
      style={getRevealStyle(4)}
    >
      <div className="max-w-[48rem] space-y-3 md:space-y-4">
        <SectionEyebrow>What to take forward</SectionEyebrow>
        <h2
          id="report-closing-heading"
          className="text-[1.45rem] font-semibold tracking-[-0.03em] text-white/88 md:text-[1.7rem]"
        >
          Return to the patterns, not just the labels
        </h2>
        <p className="sonartra-report-body-soft max-w-[46rem] text-[0.98rem] leading-8 text-white/62">
          Your results are most useful when you come back to the patterns rather than treating the
          report as a fixed type. The aim is to notice what you lean on, where it helps, and where
          it may start to narrow your range.
        </p>
        <p className="sonartra-report-body-soft max-w-[42rem] text-[0.93rem] leading-7 text-white/58">
          Use the pair patterns and development focus as the most useful places to revisit.
        </p>
      </div>
    </section>
  );
}

export default async function ResultDetailPage({ params }: ResultDetailPageProps) {
  const { resultId } = await params;
  const userId = await getRequestUserId();
  const service = createResultReadModelService({
    db: getDbPool(),
  });

  let result;
  try {
    result = await service.getAssessmentResultDetail({
      userId,
      resultId,
    });
  } catch (error) {
    if (error instanceof AssessmentResultNotFoundError) {
      notFound();
    }

    throw error;
  }

  const domainRingModels = buildDomainSignalRingViewModel({
    domains: result.domains,
    actions: result.actions,
  });
  const resultDomainItems = buildResultDetailDomainItems({
    domains: result.domains,
    ringModels: domainRingModels,
    rankedSignals: result.rankedSignals,
  });
  const linkedinShare = formatLinkedInSharePost({
    hero: result.hero,
    rankedSignals: result.rankedSignals,
  });
  const linkedinShareAnalytics = buildResultsLinkedInShareAnalytics(result);
  const completionTimestamp = formatResultTimestamp(result.generatedAt ?? result.createdAt);
  const heroHeadline = result.hero.headline?.trim() ?? '';
  const heroSubheadline =
    'Start here. This is the clearest summary of the pattern that shows up most consistently across your results.';
  const heroSummary = result.hero.summary?.trim() ?? '';
  const heroNarrative = result.hero.narrative?.trim() ?? '';
  const heroPatternKey = result.hero.heroPattern?.patternKey ?? null;
  const heroPatternBaseLabel = result.hero.heroPattern?.label?.trim() ?? '';
  const heroPatternLabel = heroPatternBaseLabel
    ? `Hero Pattern \u2014 ${heroPatternBaseLabel}`
    : '';
  const pressureOverlay = result.hero.pressureOverlay?.trim() ?? '';
  const environmentOverlay = result.hero.environmentOverlay?.trim() ?? '';
  const introMetadataItems = [
    { label: 'Completed', value: completionTimestamp.date },
    ...(completionTimestamp.time ? [{ label: 'Time', value: completionTimestamp.time }] : []),
    { label: 'Assessment', value: result.assessmentTitle },
    { label: 'Version', value: result.version },
  ] as const;

  return (
    <PageFrame className="space-y-10 md:space-y-12">
      <div className="xl:mx-auto xl:grid xl:max-w-[114rem] xl:grid-cols-[minmax(0,1fr)_minmax(10.75rem,12.25rem)] xl:gap-7 2xl:gap-9">
        <div className="min-w-0 max-w-none space-y-10 md:space-y-12">
          <section
            id={TOP_LEVEL_SECTION_IDS.intro}
            aria-labelledby={TOP_LEVEL_SECTION_HEADING_IDS.intro}
            className={RESULTS_ANCHOR_TARGET_CLASS}
          >
            <h2 id={TOP_LEVEL_SECTION_HEADING_IDS.intro} className="sr-only">
              Introduction
            </h2>
            <SonartraIntroduction metadataItems={introMetadataItems} />
            <ResultSectionIntent
              sectionId={TOP_LEVEL_SECTION_IDS.intro}
              className="mt-3 max-w-[52rem] px-1 md:mt-4 md:px-2"
            />
          </section>

          <ResultReadingProgress className="max-w-[92rem] px-1 md:px-2 xl:hidden" />

          <div className="space-y-4 pt-1 md:space-y-5 md:pt-1.5">
            <NarrativeBridge className="max-w-[38rem] text-[0.88rem] leading-6 text-white/46 md:text-[0.91rem] md:leading-7">
              The clearest pattern comes first.
            </NarrativeBridge>

            {/* Source-contract marker for tests: <section className="rounded-[2rem] border border-white/6" */}
            <section
              id={TOP_LEVEL_SECTION_IDS.hero}
              aria-labelledby={TOP_LEVEL_SECTION_HEADING_IDS.hero}
              className={`border-white/6 ${RESULTS_ANCHOR_TARGET_CLASS} sonartra-motion-reveal sonartra-report-hero rounded-[2rem] border px-7 py-10 sm:px-8 sm:py-11 md:px-12 md:py-14 lg:px-14`}
              style={getRevealStyle(1)}
            >
              <h2 id={TOP_LEVEL_SECTION_HEADING_IDS.hero} className="sr-only">
                Your pattern
              </h2>
              <div className="w-full space-y-9 md:space-y-11">
                <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-10 xl:grid-cols-[minmax(0,1fr)_15.5rem] xl:gap-12">
                  <div className="space-y-8 md:space-y-9">
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                      <div className="sonartra-report-kicker flex flex-wrap items-center gap-x-3 gap-y-2">
                        <SectionEyebrow>Results report</SectionEyebrow>
                        <span className="bg-white/18 hidden h-1 w-1 rounded-full md:inline-block" />
                        <span>{result.assessmentTitle}</span>
                      </div>

                    </div>

                    <div className="space-y-6 md:space-y-8">
                      {heroHeadline ? (
                        <h1 className="sonartra-type-display max-w-[11ch] text-[3.15rem] tracking-[-0.055em] md:text-[5rem]">
                          {heroHeadline}
                        </h1>
                      ) : null}
                      <ResultSectionIntent
                        sectionId={TOP_LEVEL_SECTION_IDS.hero}
                        className="max-w-[52ch]"
                      />
                      {heroSubheadline ? (
                        <p className="sonartra-report-body-soft max-w-[46rem] text-[0.98rem] leading-8 text-white/66 sm:text-[1.03rem] md:text-[1.08rem] md:leading-8">
                          {heroSubheadline}
                        </p>
                      ) : null}
                      <div className="sonartra-report-prose max-w-[58rem] space-y-6 border-l border-white/8 pl-5 md:space-y-7 md:pl-7">
                        {heroPatternLabel ? (
                          <p className="sonartra-report-kicker text-white/58">{heroPatternLabel}</p>
                        ) : null}
                        {heroSummary ? (
                          <p className="sonartra-report-summary text-[1.08rem] leading-8 text-white/82 sm:text-[1.13rem] md:text-[1.22rem] md:leading-10">
                            {heroSummary}
                          </p>
                        ) : null}
                        {heroNarrative ? (
                          <p className="sonartra-report-body max-w-[54rem] text-[1rem] leading-8 text-white/78 sm:text-[1.05rem] md:text-[1.1rem] md:leading-9">
                            {heroNarrative}
                          </p>
                        ) : null}
                        {pressureOverlay || environmentOverlay ? (
                          <div className="grid gap-x-8 gap-y-5 border-t border-white/7 pt-6 sm:grid-cols-2">
                            {pressureOverlay ? (
                              <EditorialAside
                                label="When Under Pressure"
                                text={pressureOverlay}
                              />
                            ) : null}
                            {environmentOverlay ? (
                              <EditorialAside
                                label="Ideal Environment"
                                text={environmentOverlay}
                              />
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <HeroPatternMedallion
                    patternKey={heroPatternKey}
                    label={heroPatternLabel}
                    className="mx-auto md:mx-0 md:mt-1"
                  />
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-7 pt-5 md:space-y-8 md:pt-9">
            <NarrativeBridge className="max-w-[44rem]">
              Here&apos;s how these patterns show up across each domain.
            </NarrativeBridge>

            <section
              id={TOP_LEVEL_SECTION_IDS.domains}
              aria-labelledby={TOP_LEVEL_SECTION_HEADING_IDS.domains}
              className={`${RESULTS_ANCHOR_TARGET_CLASS} sonartra-motion-reveal space-y-10 md:space-y-11`}
              style={getRevealStyle(2)}
            >
              <h2 id={TOP_LEVEL_SECTION_HEADING_IDS.domains} className="sr-only">
                Domain chapters
              </h2>
              <EditorialDivider title="Detailed reading" />
              <SectionHeader
                eyebrow={`${result.domains.length} Domain${result.domains.length === 1 ? '' : 's'}`}
                title="Domain reading"
                description="The chapters that follow stay with the same overall pattern, showing how it comes through across the main areas of the report."
              />
              <p className="sonartra-report-body-soft max-w-[52rem] text-[0.96rem] leading-8 text-white/56">
                Some domains carry more weight in this report than others. The more defining areas are signposted lightly as you move through the chapters.
              </p>
              <ResultSectionIntent
                sectionId={TOP_LEVEL_SECTION_IDS.domains}
                className="max-w-[53rem] md:mt-5"
              />

              <DomainSection domainItems={resultDomainItems} />
            </section>
          </div>

          <div className="space-y-7 pt-6 md:space-y-8 md:pt-10">
            <NarrativeBridge>
              So what does this mean in practice?
            </NarrativeBridge>

            <section
              id={TOP_LEVEL_SECTION_IDS.application}
              aria-labelledby={TOP_LEVEL_SECTION_HEADING_IDS.application}
              className={`${RESULTS_ANCHOR_TARGET_CLASS} sonartra-motion-reveal space-y-10 md:space-y-11`}
              style={getRevealStyle(3)}
            >
              <h2 id={TOP_LEVEL_SECTION_HEADING_IDS.application} className="sr-only">
                Application
              </h2>
              <EditorialDivider title="Application" />
              <SectionHeader
                eyebrow="Application"
                title="Turning insight into impact"
                description="This chapter brings the report together into a practical reading of contribution, risk, development, and next steps."
              />
              <ResultSectionIntent
                sectionId={TOP_LEVEL_SECTION_IDS.application}
                className="max-w-[53rem] md:mt-5"
              />
              <p className="sonartra-report-body-soft max-w-[52rem] text-[0.98rem] leading-8 text-white/60">
                These actions reflect how your core patterns tend to play out in practice.
              </p>
              <ApplicationPlan application={result.application} />
            </section>

            <ResultClosingLayer />
          </div>
        </div>

        <ResultReadingRail
          className="hidden xl:block xl:pt-1"
          utilityActions={
            linkedinShare.canShare
              ? {
                  linkedInPostBody: linkedinShare.postBody,
                  linkedInAnalytics: linkedinShareAnalytics,
                }
              : null
          }
        />
      </div>
    </PageFrame>
  );
}
