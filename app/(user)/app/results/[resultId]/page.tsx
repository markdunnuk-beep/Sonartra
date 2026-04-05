import { notFound } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { DomainSignalRing } from '@/components/results/domain-signal-ring';
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

const VISIBLE_ACTION_LIMIT = 3;

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

function getVisibleItems<T>(items: readonly T[]): {
  visible: readonly T[];
  overflow: readonly T[];
} {
  return {
    visible: items.slice(0, VISIBLE_ACTION_LIMIT),
    overflow: items.slice(VISIBLE_ACTION_LIMIT),
  };
}

function SectionEyebrow({ children }: { children: ReactNode }) {
  return <p className="sonartra-report-kicker">{children}</p>;
}

function ReportMetaItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="sonartra-report-meta-item">
      <p className="sonartra-report-meta-label">{label}</p>
      <p className="sonartra-report-meta-value">{value}</p>
    </div>
  );
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
  const typedItems: readonly VisibleActionItem[] = items;
  const { visible, overflow } = getVisibleItems<VisibleActionItem>(typedItems);
  const sectionLead =
    title === 'Strengths'
      ? 'Where this pattern already adds steadiness, clarity, or forward movement.'
      : title === 'Watchouts'
        ? 'Where the same pattern can become narrow, heavy, or harder for others to work with.'
        : 'Where a small shift in attention is most likely to improve the overall pattern.';
  // Source-contract marker for tests: grid gap-6 border-t border-white/6 pt-12 first:border-t-0 first:pt-0 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] md:gap-8 md:pt-14

  return (
    <article
      className="border-white/6 sonartra-motion-reveal-soft grid gap-6 border-t pt-12 first:border-t-0 first:pt-0 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] md:gap-8 md:pt-14"
      style={getRevealStyle(2)}
    >
      <div className="space-y-3 md:sticky md:top-24 md:self-start">
        <SectionEyebrow>Action</SectionEyebrow>
        <div className="space-y-2">
          <h3 className="sonartra-report-title text-[1.08rem] md:text-[1.18rem]">{title}</h3>
          <p className="sonartra-report-body-soft max-w-[15rem] text-[0.95rem] leading-7">
            {sectionLead}
          </p>
        </div>
      </div>

      <div className="space-y-6 md:space-y-7">
        <ul className="space-y-4 md:space-y-5">
          {visible.length > 0 ? (
            visible.map((item, index) => (
              <li
                key={item.key}
                className="sonartra-report-action-item space-y-2.5 rounded-[1.15rem] px-0 py-0"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="sonartra-report-step text-white/32">0{index + 1}</span>
                  <p className="sonartra-report-title text-[1rem]">{item.title}</p>
                </div>
                <p className="sonartra-report-body max-w-[46rem]">{item.detail}</p>
              </li>
            ))
          ) : (
            <li className="sonartra-report-body-soft">No items available in this section.</li>
          )}
        </ul>

        {overflow.length > 0 ? (
          <details className="max-w-[46rem] pt-1">
            <summary className="sonartra-motion-details-summary sonartra-type-nav text-white/62 cursor-pointer list-none marker:hidden">
              Show {overflow.length} more
            </summary>
            <ul className="border-white/6 mt-4 space-y-5 border-l pl-4">
              {overflow.map((item) => (
                <li key={item.key} className="space-y-2.5">
                  <p className="sonartra-type-nav text-white/82">{item.title}</p>
                  <p className="sonartra-report-body-soft max-w-[42rem]">{item.detail}</p>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
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

function ActionSection({ actions }: { actions: AssessmentResultDetailViewModel['actions'] }) {
  return (
    <div className="mx-auto max-w-[61rem] px-1 md:px-2">
      <ActionList title="Strengths" items={toVisibleActionItems(actions.strengths)} />
      <ActionList title="Watchouts" items={toVisibleActionItems(actions.watchouts)} />
      <ActionList
        title="Development Focus"
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

function HeroDomainHighlights({
  highlights,
}: {
  highlights: AssessmentResultDetailViewModel['hero']['domainHighlights'];
}) {
  if (highlights.length === 0) {
    return null;
  }

  // Source-contract marker for tests: max-w-[60rem] border-t border-white/7 pt-7
  return (
    <div className="border-white/7 max-w-[60rem] border-t pt-7">
      <div className="space-y-3.5">
        {highlights.map((highlight) => (
          <article key={highlight.domainKey} className="space-y-1.5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="sonartra-report-kicker">{highlight.domainLabel}</p>
              <p className="sonartra-report-title text-[1rem]">{highlight.primarySignalLabel}</p>
            </div>
            {highlight.summary ? (
              <p className="sonartra-report-body-soft max-w-[46rem]">{highlight.summary}</p>
            ) : null}
          </article>
        ))}
      </div>
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
  // The result detail page renders persisted report language only. Behavioural
  // copy belongs to the canonical result payload, not the client UI.
  const assessmentDescription = result.intro.assessmentDescription;
  const hasAssessmentDescription =
    typeof assessmentDescription === 'string' && assessmentDescription.trim().length > 0;
  const heroHeadline = result.hero.headline?.trim() ?? '';
  const heroSubheadline = result.hero.subheadline?.trim() ?? '';
  const heroSummary = result.hero.summary?.trim() ?? '';
  const heroNarrative = result.hero.narrative?.trim() ?? '';
  const heroPatternLabel = result.hero.heroPattern?.label?.trim() ?? '';
  const pressureOverlay = result.hero.pressureOverlay?.trim() ?? '';
  const environmentOverlay = result.hero.environmentOverlay?.trim() ?? '';

  return (
    <PageFrame className="space-y-16 md:space-y-20">
      {hasAssessmentDescription ? (
        // Source-contract marker for tests: rounded-[1.9rem] border border-white/6
        <section
          className="border-white/6 sonartra-motion-reveal rounded-[1.9rem] border bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.012))] px-7 py-8 shadow-[0_10px_28px_rgba(0,0,0,0.08)] md:px-10 md:py-10"
          style={getRevealStyle(0)}
        >
          <p className="sonartra-report-kicker mb-6">About this report</p>
          <div className="sonartra-report-markdown max-w-[72ch]">
            <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
              {assessmentDescription}
            </ReactMarkdown>
          </div>
        </section>
      ) : null}

      {/* Source-contract marker for tests: <section className="rounded-[2rem] border border-white/6" */}
      <section
        className="border-white/6 sonartra-motion-reveal sonartra-report-hero rounded-[2rem] border px-7 py-10 sm:px-8 sm:py-11 md:px-12 md:py-14 lg:px-14"
        style={getRevealStyle(hasAssessmentDescription ? 1 : 0)}
      >
        <div className="max-w-[74rem] space-y-10 md:space-y-12">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:items-start">
            <div className="space-y-8 md:space-y-10">
              <div className="sonartra-report-kicker flex flex-wrap items-center gap-x-3 gap-y-2">
                <SectionEyebrow>Results report</SectionEyebrow>
                <span className="bg-white/18 hidden h-1 w-1 rounded-full md:inline-block" />
                <span>{result.assessmentTitle}</span>
              </div>

              <div className="space-y-7 md:space-y-8">
                {heroHeadline ? (
                  <h1 className="sonartra-type-display max-w-[13ch] text-[3rem] md:text-[4.75rem]">
                    {heroHeadline}
                  </h1>
                ) : null}
                {heroSubheadline ? (
                  <p className="sonartra-report-body-soft max-w-[46rem] text-[1rem] leading-8 sm:text-[1.05rem] md:text-[1.12rem] md:leading-9">
                    {heroSubheadline}
                  </p>
                ) : null}
                <div className="sonartra-report-prose space-y-7">
                  {heroPatternLabel ? <p className="sonartra-report-kicker">{heroPatternLabel}</p> : null}
                  {heroSummary ? (
                    <p className="sonartra-report-body text-[1rem] leading-8 sm:text-[1.05rem] md:text-[1.12rem] md:leading-9">
                      {heroSummary}
                    </p>
                  ) : null}
                  {heroNarrative ? (
                    <p className="sonartra-report-body text-[1rem] leading-8 sm:text-[1.05rem] md:text-[1.12rem] md:leading-9">
                      {heroNarrative}
                    </p>
                  ) : null}
                  {pressureOverlay || environmentOverlay ? (
                    <div className="grid gap-x-8 gap-y-5 border-white/6 border-y py-5 sm:grid-cols-2">
                      {pressureOverlay ? <EditorialAside label="Pressure" text={pressureOverlay} /> : null}
                      {environmentOverlay ? (
                        <EditorialAside label="Environment" text={environmentOverlay} />
                      ) : null}
                    </div>
                  ) : null}
                  <HeroDomainHighlights highlights={result.hero.domainHighlights} />
                </div>
              </div>
            </div>

            <aside className="sonartra-report-hero-meta-grid">
              <ReportMetaItem label="Completed" value={completionTimestamp.date} />
              {completionTimestamp.time ? (
                <ReportMetaItem label="Time" value={completionTimestamp.time} />
              ) : null}
              <ReportMetaItem label="Assessment" value={result.assessmentTitle} />
              <ReportMetaItem label="Version" value={result.version} />
            </aside>
          </div>
        </div>
      </section>

      <section
        className="sonartra-motion-reveal space-y-10 md:space-y-11"
        style={getRevealStyle(2)}
      >
        <EditorialDivider title="Application" />
        <SectionHeader
          eyebrow="Action Focus"
          title="What this means in practice"
          description="Start with the immediate implications. This pulls the main report pattern into practical terms before the chapter-by-chapter reading that follows."
        />

        <ActionSection actions={result.actions} />
      </section>

      <section
        className="sonartra-motion-reveal space-y-10 md:space-y-11"
        style={getRevealStyle(3)}
      >
        <EditorialDivider title="Detailed reading" />
        <SectionHeader
          eyebrow={`${result.domains.length} Domain${result.domains.length === 1 ? '' : 's'}`}
          title="Domain reading"
          description="The chapters that follow stay with the same overall pattern, showing how it comes through across the main areas of the report."
        />

        <DomainSection domainItems={resultDomainItems} />
      </section>
    </PageFrame>
  );
}
