import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { DomainSignalRing } from '@/components/results/domain-signal-ring';
import { PageFrame, SectionHeader, SurfaceCard } from '@/components/shared/user-app-ui';
import type { DomainSignalRingViewModel } from '@/lib/server/domain-signal-ring-view-model';
import { buildDomainSignalRingViewModel } from '@/lib/server/domain-signal-ring-view-model';
import type {
  AssessmentResultDetailViewModel,
} from '@/lib/server/result-read-model-types';
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
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
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

function ActionList({
  title,
  items,
}: {
  title: string;
  items: readonly VisibleActionItem[];
}) {
  const typedItems: readonly VisibleActionItem[] = items;
  const { visible, overflow } = getVisibleItems<VisibleActionItem>(typedItems);

  return (
    <article className="border-white/8 space-y-5 border-t pt-8 first:border-t-0 first:pt-0 md:space-y-6 md:pt-10">
      <div className="grid gap-3 md:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] md:gap-6">
        <SectionEyebrow>{title}</SectionEyebrow>
        <h3 className="text-[1.28rem] font-semibold tracking-[-0.03em] text-white md:text-[1.4rem]">{title}</h3>
      </div>

      <ul className="space-y-5">
        {visible.length > 0 ? (
          visible.map((item) => (
            <li key={item.key} className="space-y-2.5">
              <p className="text-[0.95rem] font-semibold tracking-[-0.01em] text-white/86">
                {item.title}
              </p>
              <p className="max-w-[41rem] text-[0.97rem] leading-8 text-white/62">{item.detail}</p>
            </li>
          ))
        ) : (
          <li className="text-sm leading-7 text-white/45">No items available in this section.</li>
        )}
      </ul>

      {overflow.length > 0 ? (
        <details className="max-w-[42rem] pt-1">
          <summary className="cursor-pointer list-none text-[0.92rem] font-medium text-white/58 marker:hidden">
            Show {overflow.length} more
          </summary>
          <ul className="mt-3 space-y-4 border-l border-white/8 pl-4">
            {overflow.map((item) => (
              <li key={item.key} className="space-y-2">
                <p className="text-sm font-medium text-white/82">{item.title}</p>
                <p className="text-sm leading-7 text-white/56">{item.detail}</p>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
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
}: {
  actions: AssessmentResultDetailViewModel['actions'];
}) {
  return (
    <div className="mx-auto max-w-[56rem] rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-6 py-7 shadow-[0_22px_70px_rgba(0,0,0,0.18)] md:px-8 md:py-9">
      <ActionList title="Strengths" items={toVisibleActionItems(actions.strengths)} />
      <ActionList title="Watchouts" items={toVisibleActionItems(actions.watchouts)} />
      <ActionList title="Development Focus" items={toVisibleActionItems(actions.developmentFocus)} />
    </div>
  );
}

function DomainChapter({
  domain,
  ringModel,
}: {
  domain: CanonicalDomainChapter;
  ringModel: DomainSignalRingViewModel | null;
}) {
  const visibleSignals = domain.signals.slice(0, 2);
  const hiddenSignals = domain.signals.slice(2);
  const title = domain.domainLabel.trim();

  return (
    <article className="border-white/8 space-y-7 border-t pt-10 first:border-t-0 first:pt-0 md:space-y-8 md:pt-12">
      <div className="grid gap-5 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] md:gap-9">
        <div className="space-y-3">
          <SectionEyebrow>Domain</SectionEyebrow>
          <h3 className="max-w-[14ch] text-[1.55rem] font-semibold tracking-[-0.035em] text-white md:text-[1.9rem]">
            {title}
          </h3>
        </div>

        <div className="space-y-5 md:space-y-6">
          {domain.summary ? (
            <p className="max-w-[44rem] text-[1rem] leading-8 text-white/68 md:text-[1.05rem] md:leading-9">
              {domain.summary}
            </p>
          ) : null}

          {domain.focus || domain.pressure || domain.environment ? (
            <div className="grid gap-3.5 border-l border-white/8 pl-4 sm:grid-cols-3 sm:border-l-0 sm:pl-0">
              {domain.focus ? (
                <EditorialAside label="Focus" text={domain.focus} />
              ) : null}
              {domain.pressure ? (
                <EditorialAside label="Pressure" text={domain.pressure} />
              ) : null}
              {domain.environment ? (
                <EditorialAside label="Environment" text={domain.environment} />
              ) : null}
            </div>
          ) : null}

          {domain.primarySignal || domain.secondarySignal ? (
            <div className="grid gap-3.5 border-t border-white/8 pt-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
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
          ) : null}

          {domain.pairSummary?.text ? (
            <p className="max-w-[42rem] text-[0.96rem] leading-8 text-white/58 italic">
              {domain.pairSummary.text}
            </p>
          ) : null}

          {ringModel ? (
            <DomainSignalRing
              domain={ringModel}
              className="max-w-[44rem] border-white/8 bg-[linear-gradient(180deg,rgba(14,21,36,0.62),rgba(8,12,24,0.84))] p-4 sm:p-5 md:max-w-[46rem] md:p-6"
            />
          ) : null}

          {hiddenSignals.length > 0 ? (
            <details className="max-w-[40rem] pt-1">
              <summary className="cursor-pointer list-none text-[0.92rem] font-medium text-white/58 marker:hidden">
                Additional signal context
              </summary>
              <div className="mt-3 space-y-3 border-l border-white/8 pl-4">
                {hiddenSignals.map((signal) => (
                  <div key={signal.signalKey} className="text-sm leading-7 text-white/52">
                    <span className="font-medium text-white/76">{signal.signalLabel}</span>
                    <span className="text-white/40">
                      {' '}
                      also appears in this area.
                    </span>
                  </div>
                ))}
              </div>
            </details>
          ) : null}

          {visibleSignals.length === 0 ? (
            <p className="max-w-[40rem] text-sm leading-7 text-white/45">
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
      <SurfaceCard className="p-6 text-sm text-white/55">
        No persisted domain summaries are available for this result.
      </SurfaceCard>
    );
  }

  return (
    <div className="mx-auto max-w-[58rem] rounded-[2.2rem] border border-white/7 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] px-6 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.16)] md:px-8 md:py-9">
      {domainItems.map(({ domain, ringModel }) => (
        <DomainChapter key={domain.domainKey} domain={domain} ringModel={ringModel} />
      ))}
    </div>
  );
}

function EditorialAside({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  return (
    <div className="max-w-[16rem] space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/42">{label}</p>
      <p className="text-[0.94rem] leading-7 text-white/56">{text}</p>
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
    <div className="space-y-2.5 rounded-[1.2rem] border border-white/8 bg-white/[0.025] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/42">{title}</p>
      <p className="text-[1rem] font-medium tracking-[-0.02em] text-white/88">{signalLabel}</p>
      {summary ? (
        <p className="max-w-[32rem] text-[0.94rem] leading-7 text-white/56">{summary}</p>
      ) : null}
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

  return (
    <div className="grid gap-x-5 gap-y-4 border-t border-white/8 pt-6 sm:grid-cols-2 xl:grid-cols-3">
      {highlights.map((highlight) => (
        <article key={highlight.domainKey} className="space-y-1.5 border-l border-white/8 pl-4 first:border-l-0 first:pl-0 sm:first:border-l sm:first:pl-4 xl:first:border-l-0 xl:first:pl-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">
            {highlight.domainLabel}
          </p>
          <p className="text-[0.98rem] font-medium tracking-[-0.02em] text-white/84">
            {highlight.primarySignalLabel}
          </p>
          {highlight.summary ? (
            <p className="text-[0.92rem] leading-7 text-white/52">{highlight.summary}</p>
          ) : null}
        </article>
      ))}
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
  const heroNarrative = result.hero.narrative?.trim() ?? '';

  return (
    <PageFrame className="space-y-14 md:space-y-16">
      {hasAssessmentDescription ? (
        <section className="rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] px-7 py-7 shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur-sm md:px-10 md:py-9">
          <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">
            About this report
          </p>
          <div className="max-w-3xl [&>h1]:mb-6 [&>h1]:text-[30px] [&>h1]:font-semibold [&>h1]:leading-[1.08] [&>h1]:tracking-[-0.02em] [&>h1]:text-white [&>h2]:mt-10 [&>h2]:mb-3 [&>h2]:text-[20px] [&>h2]:font-semibold [&>h2]:leading-tight [&>h2]:tracking-[-0.01em] [&>h2]:text-white [&>h3]:mt-6 [&>h3]:mb-2 [&>h3]:text-[17px] [&>h3]:font-semibold [&>h3]:leading-tight [&>h3]:text-white/95 [&>p]:my-0 [&>p]:whitespace-pre-line [&>p]:text-[18px] [&>p]:leading-9 [&>p]:tracking-[-0.01em] [&>p]:text-white/76 [&>p+p]:mt-6 [&_strong]:font-semibold [&_strong]:text-white [&>hr]:my-7 [&>hr]:h-px [&>hr]:border-0 [&>hr]:bg-white/10 [&>ul]:my-5 [&>ul]:space-y-2 [&>ul]:pl-5 [&>ul]:text-[18px] [&>ul]:leading-8 [&>ul]:text-white/76 [&>ol]:my-5 [&>ol]:space-y-2 [&>ol]:pl-5 [&>ol]:text-[18px] [&>ol]:leading-8 [&>ol]:text-white/76 [&>blockquote]:my-6 [&>blockquote]:border-l [&>blockquote]:border-white/10 [&>blockquote]:pl-4 [&>blockquote]:text-white/72">
            <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
              {assessmentDescription}
            </ReactMarkdown>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-[2.1rem] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(118,147,255,0.09),transparent_38%),linear-gradient(180deg,rgba(16,26,44,0.68),rgba(9,15,28,0.84))] px-7 py-9 shadow-[0_28px_90px_rgba(0,0,0,0.24)] sm:px-8 sm:py-10 md:px-12 md:py-12 lg:px-14">
        <div className="max-w-[82rem] space-y-8 md:space-y-10">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">
            <SectionEyebrow>Hero</SectionEyebrow>
            <span className="hidden h-1 w-1 rounded-full bg-white/18 md:inline-block" />
            <span>{result.assessmentTitle}</span>
            <span className="hidden h-1 w-1 rounded-full bg-white/18 md:inline-block" />
            <span>{result.metadata.assessmentKey}</span>
            <span className="hidden h-1 w-1 rounded-full bg-white/18 md:inline-block" />
            <span>v{result.version}</span>
            <span className="hidden h-1 w-1 rounded-full bg-white/18 md:inline-block" />
            <span>{completionTimestamp.date}</span>
          </div>

          <div className="space-y-7 md:space-y-8">
            <h1 className="max-w-[18ch] text-[2.45rem] font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-[3rem] md:text-[4.15rem]">
              {heroHeadline}
            </h1>
            <div className="max-w-[74ch] space-y-6">
              <p className="max-w-[68ch] text-[1rem] leading-8 text-white/74 sm:text-[1.05rem] md:text-[1.14rem] md:leading-9">
                {heroNarrative}
              </p>
              <HeroDomainHighlights highlights={result.hero.domainHighlights} />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <SectionHeader
          eyebrow={`${result.domains.length} Domain${result.domains.length === 1 ? '' : 's'}`}
          title="Domain reading"
          description="The chapters that follow stay with the same overall pattern, showing how it comes through across the main areas of the report."
        />

        <DomainSection domainItems={resultDomainItems} />
      </section>

      <section className="space-y-8">
        <SectionHeader
          eyebrow="Action Focus"
          title="Interpretation to hold onto"
          description="Across the rest of the report, this pattern shows up in a few consistent ways: where it adds value, where it can create friction, and where attention may be useful."
        />

        <ActionSection actions={result.actions} />
      </section>
    </PageFrame>
  );
}
