import { notFound } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';

import { DomainSignalRing } from '@/components/results/domain-signal-ring';
import { SonartraIntroduction } from '@/components/results/sonartra-introduction';
import { PageFrame, SectionHeader, SurfaceCard } from '@/components/shared/user-app-ui';
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

type VisibleActionItem = {
  key: string;
  title: string;
  detail: string;
};

type CanonicalDomainChapter = AssessmentResultDetailViewModel['domains'][number];
type CanonicalActionItem = AssessmentResultDetailViewModel['actions']['strengths'][number];

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
        'sonartra-report-body-soft mx-auto max-w-[42rem] text-center text-[0.92rem] leading-7 text-white/52 md:text-[0.97rem]',
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
}[] {
  const ringModelsByDomainKey = new Map(
    params.ringModels.map((ringModel) => [ringModel.domainKey, ringModel]),
  );

  // Persisted domain order is still the rendering contract. Matching by key hardens the adapter
  // without introducing a second domain definition source in the UI layer.
  return params.domains.map((domain, index) => ({
    domain,
    ringModel: ringModelsByDomainKey.get(domain.domainKey) ?? params.ringModels[index] ?? null,
  }));
}

function ActionList({ title, items }: { title: string; items: readonly VisibleActionItem[] }) {
  const sectionLead =
    title === 'What to keep doing'
      ? 'The parts of the pattern that already create traction and are worth reinforcing deliberately.'
      : title === 'Where to be careful'
        ? 'The places where the same strengths can become heavier, narrower, or harder to work around.'
        : 'Where a small shift in attention is most likely to improve the overall pattern.';
  // Source-contract marker for tests: grid gap-7 border-t border-white/6 pt-12 first:border-t-0 first:pt-0 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-10 md:pt-14

  return (
    <article
      className="border-white/6 sonartra-motion-reveal-soft grid gap-7 border-t pt-12 first:border-t-0 first:pt-0 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-10 md:pt-14"
      style={getRevealStyle(2)}
    >
      <div className="space-y-3.5 md:sticky md:top-24 md:self-start">
        <SectionEyebrow>Action</SectionEyebrow>
        <div className="space-y-2.5">
          <h3 className="sonartra-report-title max-w-[12rem] text-[1.12rem] md:text-[1.24rem]">
            {title}
          </h3>
          <p className="sonartra-report-body-soft max-w-[16rem] text-[0.96rem] leading-7">
            {sectionLead}
          </p>
        </div>
      </div>

      <div className="space-y-6 md:space-y-8">
        <ul className="space-y-5 md:space-y-6">
          {items.length > 0 ? (
            items.map((item, index) => (
              <li
                key={item.key}
                className={[
                  'sonartra-report-action-item rounded-[1.2rem] border border-white/7 bg-white/[0.015] px-5 py-5 md:px-6 md:py-6',
                  index === 0 ? 'space-y-3.5' : 'space-y-3',
                ].join(' ')}
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className={index === 0 ? 'sonartra-report-step text-white/46' : 'sonartra-report-step text-white/28'}>
                    0{index + 1}
                  </span>
                  <p
                    className={
                      index === 0
                        ? 'sonartra-report-title text-[1.08rem] text-white'
                        : 'sonartra-report-title text-[1rem] text-white/88'
                    }
                  >
                    {item.title}
                  </p>
                </div>
                <p
                  className={
                    index === 0
                      ? 'sonartra-report-body max-w-[46rem] text-white/82'
                      : 'sonartra-report-body-soft max-w-[44rem] text-white/68'
                  }
                >
                  {item.detail}
                </p>
              </li>
            ))
          ) : (
            <li className="sonartra-report-body-soft">No items available in this section.</li>
          )}
        </ul>
      </div>
    </article>
  );
}

function toVisibleActionItems(items: readonly CanonicalActionItem[]): readonly VisibleActionItem[] {
  return items.map((item, index) => ({
    key: `${item.signalKey}-${index + 1}`,
    title: item.signalLabel,
    detail: item.text,
  }));
}

function ActionSection({
  actions,
  conclusionHeadline,
  conclusionNarrative,
}: {
  actions: AssessmentResultDetailViewModel['actions'];
  conclusionHeadline: string;
  conclusionNarrative: string;
}) {
  return (
    <div className="mx-auto max-w-[61rem] space-y-10 px-1 md:space-y-12 md:px-2">
      {conclusionHeadline || conclusionNarrative ? (
        <div className="max-w-[52rem] space-y-4 border-l border-white/8 pl-5 md:space-y-5 md:pl-7">
          <SectionEyebrow>Closing reading</SectionEyebrow>
          {conclusionHeadline ? (
            <p className="sonartra-report-title max-w-[30rem] text-[1.28rem] leading-8 text-white/94 md:text-[1.45rem] md:leading-9">
              {conclusionHeadline}
            </p>
          ) : null}
          {conclusionNarrative ? (
            <p className="sonartra-report-body max-w-[46rem] text-white/76">{conclusionNarrative}</p>
          ) : null}
        </div>
      ) : null}

      <ActionList title="What to keep doing" items={toVisibleActionItems(actions.strengths)} />
      <ActionList title="Where to be careful" items={toVisibleActionItems(actions.watchouts)} />
      <ActionList
        title="Where to focus next"
        items={toVisibleActionItems(actions.developmentFocus)}
      />
    </div>
  );
}

function DomainChapter({
  domain,
  ringModel,
  chapterNumber,
}: {
  domain: CanonicalDomainChapter;
  ringModel: DomainSignalRingViewModel | null;
  chapterNumber: number;
}) {
  const visibleSignals = domain.signals.slice(0, 2);
  const hiddenSignals = domain.signals.slice(2);
  const title = domain.domainLabel.trim();
  // Source-contract markers for tests:
  // grid gap-x-10 gap-y-6 border-t border-white/7 pt-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]
  // text-[0.97rem] leading-8 text-white/50 italic

  return (
    <article
      className="border-white/6 sonartra-motion-reveal-soft space-y-10 border-t pt-16 first:border-t-0 first:pt-0 md:space-y-12 md:pt-20"
      style={getRevealStyle(2)}
    >
      <div className="grid gap-7 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:gap-10">
        <div className="space-y-4 md:sticky md:top-24 md:self-start">
          <div className="space-y-2">
            <SectionEyebrow>{`Chapter ${chapterNumber.toString().padStart(2, '0')}`}</SectionEyebrow>
            <p className="sonartra-report-body-soft max-w-[12rem] text-[0.95rem] leading-7">
              Domain reading
            </p>
          </div>
          <h3 className="max-w-[12ch] text-[1.8rem] font-semibold tracking-[-0.045em] text-white md:text-[2.35rem]">
            {title}
          </h3>
        </div>

        <div className="space-y-8 md:space-y-9">
          {domain.summary ? (
            <div className="space-y-5">
              <EditorialDivider title="Chapter opening" />
              <p className="sonartra-report-summary max-w-[46rem]">{domain.summary}</p>
            </div>
          ) : null}

          {domain.focus || domain.pressure || domain.environment ? (
            <div className="grid gap-x-8 gap-y-5 border-white/6 border-y py-5 sm:grid-cols-3">
              {domain.focus ? <EditorialAside label="Focus" text={domain.focus} /> : null}
              {domain.pressure ? <EditorialAside label="Pressure" text={domain.pressure} /> : null}
              {domain.environment ? (
                <EditorialAside label="Environment" text={domain.environment} />
              ) : null}
            </div>
          ) : null}

          {ringModel ? (
            <div className="space-y-3">
              <EditorialDivider title="Signal balance" />
              <DomainSignalRing domain={ringModel} className="max-w-[47rem]" />
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
                    summary={domain.primarySignal.summary}
                  />
                ) : null}
                {domain.secondarySignal ? (
                  <SignalEditorialBlock
                    title="Secondary signal"
                    signalLabel={domain.secondarySignal.signalLabel}
                    summary={domain.secondarySignal.summary}
                  />
                ) : null}
              </div>
            </div>
          ) : null}

          {domain.pairSummary?.text ? (
            <p className="sonartra-report-body-soft max-w-[46rem] text-[0.97rem] italic leading-8 text-white/50">
              {domain.pairSummary.text}
            </p>
          ) : null}

          {hiddenSignals.length > 0 ? (
            <details className="max-w-[42rem] pt-1">
              <summary className="sonartra-motion-details-summary sonartra-type-nav text-white/62 cursor-pointer list-none marker:hidden">
                Additional signal context
              </summary>
              <div className="border-white/8 mt-3 space-y-3 border-l pl-4">
                {hiddenSignals.map((signal) => (
                  <div key={signal.signalKey} className="sonartra-report-body-soft">
                    <span className="sonartra-type-nav text-white/76">{signal.signalLabel}</span>
                    <span className="text-white/40"> also appears in this area.</span>
                  </div>
                ))}
              </div>
            </details>
          ) : null}

          {visibleSignals.length === 0 ? (
            <p className="sonartra-report-body-soft max-w-[42rem]">
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
    <div className="mx-auto max-w-[61rem] px-1 md:px-2">
      {domainItems.map(({ domain, ringModel }, index) => (
        <DomainChapter
          key={domain.domainKey}
          domain={domain}
          ringModel={ringModel}
          chapterNumber={index + 1}
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
      {summary ? <p className="sonartra-report-body-soft max-w-[34rem]">{summary}</p> : null}
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
  const completionTimestamp = formatResultTimestamp(result.generatedAt ?? result.createdAt);
  const heroHeadline = result.hero.headline?.trim() ?? '';
  const heroSubheadline = result.hero.subheadline?.trim() ?? '';
  const heroSummary = result.hero.summary?.trim() ?? '';
  const heroNarrative = result.hero.narrative?.trim() ?? '';
  const heroPatternLabel = result.hero.heroPattern?.label?.trim() ?? '';
  const pressureOverlay = result.hero.pressureOverlay?.trim() ?? '';
  const environmentOverlay = result.hero.environmentOverlay?.trim() ?? '';
  const overviewHeadline = result.overviewSummary.headline?.trim() ?? '';
  const overviewNarrative = result.overviewSummary.narrative?.trim() ?? '';
  const actionConclusionHeadline =
    overviewHeadline && overviewHeadline !== heroHeadline ? overviewHeadline : '';
  const actionConclusionNarrative =
    overviewNarrative && overviewNarrative !== heroNarrative ? overviewNarrative : '';
  const introMetadataItems = [
    { label: 'Completed', value: completionTimestamp.date },
    ...(completionTimestamp.time ? [{ label: 'Time', value: completionTimestamp.time }] : []),
    { label: 'Assessment', value: result.assessmentTitle },
    { label: 'Version', value: result.version },
  ] as const;

  return (
    <PageFrame className="space-y-12 md:space-y-14">
      <SonartraIntroduction metadataItems={introMetadataItems} />

      <div className="space-y-5 pt-3 md:space-y-6 md:pt-4">
        <NarrativeBridge>
          With that context, here&apos;s what your patterns are showing.
        </NarrativeBridge>

        {/* Source-contract marker for tests: <section className="rounded-[2rem] border border-white/6" */}
        <section
          className="border-white/6 sonartra-motion-reveal sonartra-report-hero rounded-[2rem] border px-7 py-11 sm:px-8 sm:py-12 md:px-12 md:py-16 lg:px-14"
          style={getRevealStyle(1)}
        >
          <div className="max-w-[68rem] space-y-11 md:space-y-14">
            <div className="space-y-9 md:space-y-11">
              <div className="space-y-9 md:space-y-11">
                <div className="sonartra-report-kicker flex flex-wrap items-center gap-x-3 gap-y-2">
                  <SectionEyebrow>Results report</SectionEyebrow>
                  <span className="bg-white/18 hidden h-1 w-1 rounded-full md:inline-block" />
                  <span>{result.assessmentTitle}</span>
                </div>

                <div className="space-y-8 md:space-y-10">
                  {heroHeadline ? (
                    <h1 className="sonartra-type-display max-w-[11ch] text-[3.15rem] tracking-[-0.055em] md:text-[5rem]">
                      {heroHeadline}
                    </h1>
                  ) : null}
                  {heroSubheadline ? (
                    <p className="sonartra-report-body-soft max-w-[42rem] text-[1rem] leading-8 text-white/68 sm:text-[1.05rem] md:text-[1.12rem] md:leading-9">
                      {heroSubheadline}
                    </p>
                  ) : null}
                  <div className="sonartra-report-prose max-w-[50rem] space-y-6 border-l border-white/8 pl-5 md:space-y-7 md:pl-7">
                    {heroPatternLabel ? (
                      <p className="sonartra-report-kicker text-white/58">{heroPatternLabel}</p>
                    ) : null}
                    {heroSummary ? (
                      <p className="sonartra-report-summary text-[1.08rem] leading-8 text-white/82 sm:text-[1.13rem] md:text-[1.22rem] md:leading-10">
                        {heroSummary}
                      </p>
                    ) : null}
                    {heroNarrative ? (
                      <p className="sonartra-report-body max-w-[46rem] text-[1rem] leading-8 text-white/78 sm:text-[1.05rem] md:text-[1.1rem] md:leading-9">
                        {heroNarrative}
                      </p>
                    ) : null}
                    {pressureOverlay || environmentOverlay ? (
                      <div className="grid gap-x-8 gap-y-5 border-t border-white/7 pt-6 sm:grid-cols-2">
                        {pressureOverlay ? <EditorialAside label="Pressure" text={pressureOverlay} /> : null}
                        {environmentOverlay ? (
                          <EditorialAside label="Environment" text={environmentOverlay} />
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="space-y-7 pt-5 md:space-y-8 md:pt-9">
        <NarrativeBridge className="max-w-[38rem]">
          Here&apos;s how these patterns show up across each domain.
        </NarrativeBridge>

        <section
          className="sonartra-motion-reveal space-y-10 md:space-y-11"
          style={getRevealStyle(2)}
        >
          <EditorialDivider title="Detailed reading" />
          <SectionHeader
            eyebrow={`${result.domains.length} Domain${result.domains.length === 1 ? '' : 's'}`}
            title="Domain reading"
            description="The chapters that follow stay with the same overall pattern, showing how it comes through across the main areas of the report."
          />

          <DomainSection domainItems={resultDomainItems} />
        </section>
      </div>

      <div className="space-y-7 pt-6 md:space-y-8 md:pt-10">
        <NarrativeBridge>
          So what does this mean in practice?
        </NarrativeBridge>

        <section
          className="sonartra-motion-reveal space-y-10 md:space-y-11"
          style={getRevealStyle(3)}
        >
          <EditorialDivider title="Application" />
          <SectionHeader
            eyebrow="Action Focus"
            title="What this means in practice"
            description="Start with the immediate implications. This pulls the main report pattern into practical terms after the chapter-by-chapter reading."
          />

          <ActionSection
            actions={result.actions}
            conclusionHeadline={actionConclusionHeadline}
            conclusionNarrative={actionConclusionNarrative}
          />
        </section>
      </div>
    </PageFrame>
  );
}
