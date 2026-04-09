import { notFound } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';

import { ApplicationPlan } from '@/components/results/application-plan';
import { DomainSignalRing } from '@/components/results/domain-signal-ring';
import { HeroPatternMedallion } from '@/components/results/hero-pattern-medallion';
import { ResultLinkedInShare } from '@/components/results/result-linkedin-share';
import { ResultReadingProgress } from '@/components/results/result-reading-progress';
import { ResultReadingRail } from '@/components/results/result-reading-rail';
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

function buildResultDetailDomainItems(params: {
  domains: readonly CanonicalDomainChapter[];
  ringModels: readonly DomainSignalRingViewModel[];
}): readonly {
  domain: CanonicalDomainChapter;
  ringModel: DomainSignalRingViewModel | null;
  domainAnchorId: string | null;
}[] {
  const ringModelsByDomainKey = new Map(
    params.ringModels.map((ringModel) => [ringModel.domainKey, ringModel]),
  );

  // Persisted domain order is still the rendering contract. Matching by key hardens the adapter
  // without introducing a second domain definition source in the UI layer.
  return params.domains.map((domain, index) => ({
    domain,
    ringModel: ringModelsByDomainKey.get(domain.domainKey) ?? params.ringModels[index] ?? null,
    domainAnchorId: CANONICAL_DOMAIN_ANCHOR_IDS[index] ?? null,
  }));
}

function DomainChapter({
  domain,
  ringModel,
  chapterNumber,
  domainAnchorId,
}: {
  domain: CanonicalDomainChapter;
  ringModel: DomainSignalRingViewModel | null;
  chapterNumber: number;
  domainAnchorId: string | null;
}) {
  const title = domain.domainLabel.trim();
  const hasSignalReading = Boolean(ringModel || domain.primarySignal || domain.secondarySignal);
  const hasPairReading = Boolean(
    domain.signalPair?.summary || domain.pressureFocus || domain.environmentFocus,
  );
  // Source-contract markers for tests:
  // grid gap-x-10 gap-y-6 border-t border-white/7 pt-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]
  // text-[0.97rem] leading-8 text-white/50 italic

  return (
    <article
      id={domainAnchorId ?? undefined}
      className={`border-white/6 ${RESULTS_ANCHOR_TARGET_CLASS} sonartra-motion-reveal-soft space-y-10 border-t pt-16 first:border-t-0 first:pt-0 md:space-y-12 md:pt-20`}
      style={getRevealStyle(2)}
    >
      <div className="grid gap-7 md:grid-cols-[minmax(0,12.5rem)_minmax(0,1fr)] md:gap-10 lg:gap-12">
        <div className="space-y-4 md:sticky md:top-24 md:self-start">
          <div className="space-y-2">
            <SectionEyebrow>{`Chapter ${chapterNumber.toString().padStart(2, '0')}`}</SectionEyebrow>
            <p className="sonartra-report-body-soft max-w-[13rem] text-[0.95rem] leading-7">
              Domain reading
            </p>
          </div>
          <h3 className="max-w-[12ch] text-[1.8rem] font-semibold tracking-[-0.045em] text-white md:text-[2.35rem]">
            {title}
          </h3>
        </div>

        <div className="space-y-8 md:space-y-9">
          {domain.chapterOpening ? (
            <div className="space-y-5">
              <EditorialDivider title="Chapter opening" />
              <p className="sonartra-report-summary max-w-[56rem]">{domain.chapterOpening}</p>
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

          {hasPairReading ? (
            <DomainTransition>
              When these patterns come together, they shape a more consistent way of operating.
            </DomainTransition>
          ) : null}

          {hasPairReading ? (
            <div className="space-y-6 rounded-[1.6rem] border border-white/7 bg-white/[0.02] px-5 py-5 md:space-y-7 md:px-7 md:py-7">
              {domain.signalPair?.summary ? (
                <div className="space-y-3">
                  <EditorialDivider title="Signal pair" />
                  <p className="sonartra-report-body max-w-[56rem] text-white/80">
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
    <div className="mx-auto max-w-[72rem] px-1 md:px-2">
      {domainItems.map(({ domain, ringModel, domainAnchorId }, index) => (
        <DomainChapter
          key={domain.domainKey}
          domain={domain}
          ringModel={ringModel}
          chapterNumber={index + 1}
          domainAnchorId={domainAnchorId}
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
  });
  const linkedinShare = formatLinkedInSharePost({
    hero: result.hero,
    rankedSignals: result.rankedSignals,
  });
  const linkedinShareAnalytics = buildResultsLinkedInShareAnalytics(result);
  const completionTimestamp = formatResultTimestamp(result.generatedAt ?? result.createdAt);
  const heroHeadline = result.hero.headline?.trim() ?? '';
  const heroSubheadline = result.hero.subheadline?.trim() ?? '';
  const heroSummary = result.hero.summary?.trim() ?? '';
  const heroNarrative = result.hero.narrative?.trim() ?? '';
  const heroPatternKey = result.hero.heroPattern?.patternKey ?? null;
  const heroPatternLabel = result.hero.heroPattern?.label?.trim() ?? '';
  const pressureOverlay = result.hero.pressureOverlay?.trim() ?? '';
  const environmentOverlay = result.hero.environmentOverlay?.trim() ?? '';
  const introMetadataItems = [
    { label: 'Completed', value: completionTimestamp.date },
    ...(completionTimestamp.time ? [{ label: 'Time', value: completionTimestamp.time }] : []),
    { label: 'Assessment', value: result.assessmentTitle },
    { label: 'Version', value: result.version },
  ] as const;

  return (
    <PageFrame className="space-y-12 md:space-y-14">
      <div className="xl:mx-auto xl:grid xl:max-w-[102rem] xl:grid-cols-[minmax(0,4fr)_minmax(11.5rem,1fr)] xl:gap-6 2xl:gap-8">
        <main className="min-w-0 max-w-none space-y-12 md:space-y-14">
          <section id={TOP_LEVEL_SECTION_IDS.intro} className={RESULTS_ANCHOR_TARGET_CLASS}>
            <SonartraIntroduction metadataItems={introMetadataItems} />
            <ResultSectionIntent sectionId={TOP_LEVEL_SECTION_IDS.intro} className="mx-auto mt-5 max-w-[74rem] px-1 md:mt-6 md:px-2" />
          </section>

          <ResultReadingProgress className="mx-auto max-w-[74rem] px-1 md:px-2 xl:hidden" />

          <div className="space-y-5 pt-3 md:space-y-6 md:pt-4">
            <NarrativeBridge>
              With that context, here&apos;s what your patterns are showing.
            </NarrativeBridge>

            {/* Source-contract marker for tests: <section className="rounded-[2rem] border border-white/6" */}
            <section
              id={TOP_LEVEL_SECTION_IDS.hero}
              className={`border-white/6 ${RESULTS_ANCHOR_TARGET_CLASS} sonartra-motion-reveal sonartra-report-hero rounded-[2rem] border px-7 py-11 sm:px-8 sm:py-12 md:px-12 md:py-16 lg:px-14`}
              style={getRevealStyle(1)}
            >
              <div className="max-w-[80rem] space-y-11 md:space-y-14">
                <div className="grid gap-9 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-11">
                  <div className="space-y-9 md:space-y-11">
                    <div className="flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                      <div className="sonartra-report-kicker flex flex-wrap items-center gap-x-3 gap-y-2">
                        <SectionEyebrow>Results report</SectionEyebrow>
                        <span className="bg-white/18 hidden h-1 w-1 rounded-full md:inline-block" />
                        <span>{result.assessmentTitle}</span>
                      </div>

                      {linkedinShare.canShare ? (
                        <ResultLinkedInShare
                          postBody={linkedinShare.postBody}
                          analytics={linkedinShareAnalytics}
                        />
                      ) : null}
                    </div>

                    <div className="space-y-8 md:space-y-10">
                      {heroHeadline ? (
                        <h1 className="sonartra-type-display max-w-[11ch] text-[3.15rem] tracking-[-0.055em] md:text-[5rem]">
                          {heroHeadline}
                        </h1>
                      ) : null}
                      <ResultSectionIntent sectionId={TOP_LEVEL_SECTION_IDS.hero} />
                      {heroSubheadline ? (
                        <p className="sonartra-report-body-soft max-w-[50rem] text-[1rem] leading-8 text-white/68 sm:text-[1.05rem] md:text-[1.12rem] md:leading-9">
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
                              <EditorialAside label="Pressure" text={pressureOverlay} />
                            ) : null}
                            {environmentOverlay ? (
                              <EditorialAside label="Environment" text={environmentOverlay} />
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
              className={`${RESULTS_ANCHOR_TARGET_CLASS} sonartra-motion-reveal space-y-10 md:space-y-11`}
              style={getRevealStyle(2)}
            >
              <EditorialDivider title="Detailed reading" />
              <SectionHeader
                eyebrow={`${result.domains.length} Domain${result.domains.length === 1 ? '' : 's'}`}
                title="Domain reading"
                description="The chapters that follow stay with the same overall pattern, showing how it comes through across the main areas of the report."
              />
              <ResultSectionIntent sectionId={TOP_LEVEL_SECTION_IDS.domains} className="max-w-[46rem]" />

              <DomainSection domainItems={resultDomainItems} />
            </section>
          </div>

          <div className="space-y-7 pt-6 md:space-y-8 md:pt-10">
            <NarrativeBridge>
              So what does this mean in practice?
            </NarrativeBridge>

            <section
              id={TOP_LEVEL_SECTION_IDS.application}
              className={`${RESULTS_ANCHOR_TARGET_CLASS} sonartra-motion-reveal space-y-10 md:space-y-11`}
              style={getRevealStyle(3)}
            >
              <EditorialDivider title="Application" />
              <SectionHeader
                eyebrow="Application"
                title="Turning insight into impact"
                description="This chapter brings the report together into a practical reading of contribution, risk, development, and next steps."
              />
              <ResultSectionIntent sectionId={TOP_LEVEL_SECTION_IDS.application} className="max-w-[46rem]" />
              <ApplicationPlan application={result.application} />
            </section>
          </div>
        </main>

        <ResultReadingRail className="hidden xl:block xl:pt-0.5" />
      </div>
    </PageFrame>
  );
}
