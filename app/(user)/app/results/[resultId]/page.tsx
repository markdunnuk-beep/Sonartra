import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import type {
  AssessmentResultDetailViewModel,
  AssessmentResultDomainViewModel,
  AssessmentResultSignalViewModel,
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

const PROMINENT_SIGNAL_LIMIT = 5;
const VISIBLE_ACTION_LIMIT = 3;
const VISIBLE_DOMAIN_LIMIT = 2;

function formatResultDate(value: string | null): string {
  if (!value) {
    return 'No completion date';
  }

  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatPercent(value: number): string {
  return `${value}%`;
}

function formatDomainLabel(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getHeroNarrative(result: AssessmentResultDetailViewModel): string {
  const narrative = result.overviewSummary.narrative?.trim();
  if (narrative) {
    return narrative;
  }

  if (result.topSignal) {
    return `${result.topSignal.title} is the strongest signal in this result.`;
  }

  return 'This result is ready to review.';
}

function getSignalTitle(signal: AssessmentResultSignalViewModel): string {
  return 'title' in signal ? signal.title : signal.signalTitle;
}

function getVisibleSignals(result: AssessmentResultDetailViewModel): {
  leadSignal: AssessmentResultSignalViewModel | null;
  prominentSignals: readonly AssessmentResultSignalViewModel[];
  secondarySignals: readonly AssessmentResultSignalViewModel[];
} {
  const leadSignal = result.rankedSignals[0] ?? null;
  const remainingSignals = result.rankedSignals.slice(1);
  const prominentSignals = remainingSignals.slice(0, PROMINENT_SIGNAL_LIMIT - 1);
  const secondarySignals = remainingSignals.slice(PROMINENT_SIGNAL_LIMIT - 1);

  return {
    leadSignal,
    prominentSignals,
    secondarySignals,
  };
}

function getPrioritizedDomains(result: AssessmentResultDetailViewModel): {
  visibleDomains: readonly AssessmentResultDomainViewModel[];
  additionalDomains: readonly AssessmentResultDomainViewModel[];
} {
  const prioritized = [...result.domainSummaries].sort((left, right) => {
    if (left.domainSource !== right.domainSource) {
      return left.domainSource === 'signal_group' ? -1 : 1;
    }

    if (right.percentage !== left.percentage) {
      return right.percentage - left.percentage;
    }

    return left.domainTitle.localeCompare(right.domainTitle);
  });

  return {
    visibleDomains: prioritized.slice(0, VISIBLE_DOMAIN_LIMIT),
    additionalDomains: prioritized.slice(VISIBLE_DOMAIN_LIMIT),
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

function SignalMeter({
  value,
  tone = 'accent',
}: {
  value: number;
  tone?: 'accent' | 'muted';
}) {
  const width = `${Math.max(0, Math.min(value, 100))}%`;
  const fillClass = tone === 'accent' ? 'bg-accent' : 'bg-white/35';

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div className={`h-full rounded-full ${fillClass}`} style={{ width }} />
    </div>
  );
}

function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">{children}</p>
  );
}

function ActionList({
  title,
  items,
  tone,
}: {
  title: string;
  items: AssessmentResultDetailViewModel['strengths'];
  tone: 'positive' | 'warning' | 'neutral';
}) {
  const { visible, overflow } = getVisibleItems(items);
  const accentClass =
    tone === 'positive'
      ? 'bg-emerald-400/12 text-emerald-200 ring-1 ring-emerald-400/20'
      : tone === 'warning'
        ? 'bg-amber-400/12 text-amber-100 ring-1 ring-amber-400/20'
        : 'bg-white/8 text-white/78 ring-1 ring-white/10';

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)]">
      <SectionEyebrow>{title}</SectionEyebrow>
      <ul className="mt-4 space-y-3">
        {visible.length > 0 ? (
          visible.map((item) => (
            <li key={item.key} className="rounded-2xl bg-black/20 p-4">
              <p className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${accentClass}`}>
                {item.title}
              </p>
              <p className="mt-3 text-sm leading-6 text-white/72">{item.detail}</p>
            </li>
          ))
        ) : (
          <li className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-white/45">
            No items available in this section.
          </li>
        )}
      </ul>

      {overflow.length > 0 ? (
        <details className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-4">
          <summary className="cursor-pointer list-none text-sm font-medium text-white/72 marker:hidden">
            Show {overflow.length} more
          </summary>
          <ul className="mt-4 space-y-3">
            {overflow.map((item) => (
              <li key={item.key} className="rounded-2xl bg-white/[0.03] p-4">
                <p className="text-sm font-medium text-white/88">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-white/60">{item.detail}</p>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function DomainCard({
  domain,
  defaultOpen,
}: {
  domain: AssessmentResultDomainViewModel;
  defaultOpen?: boolean;
}) {
  const visibleSignals = domain.signalScores.slice(0, 3);
  const hiddenSignals = domain.signalScores.slice(3);

  return (
    <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <SectionEyebrow>{domain.domainSource === 'signal_group' ? 'Signal Domain' : 'Question Section'}</SectionEyebrow>
          <h3 className="text-xl font-semibold text-white">{domain.domainTitle}</h3>
          <p className="text-sm text-white/55">
            {domain.answeredQuestionCount} answered - {formatPercent(domain.percentage)} of overall signal share
          </p>
        </div>
        <div className="min-w-[10rem]">
          <div className="mb-2 flex items-center justify-between text-xs text-white/45">
            <span>Domain concentration</span>
            <span>{formatPercent(domain.percentage)}</span>
          </div>
          <SignalMeter value={domain.percentage} tone="muted" />
        </div>
      </div>

      {domain.signalScores.length > 0 ? (
        <>
          <div className="mt-5 space-y-3">
            {visibleSignals.map((signal) => (
              <div
                key={signal.signalId}
                className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-4 text-sm">
                  <div>
                    <p className="font-medium text-white/88">{signal.signalTitle}</p>
                    <p className="mt-1 text-xs text-white/45">
                      Rank #{signal.rank}
                      {signal.isOverlay ? ' - overlay' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-white">{formatPercent(signal.percentage)}</p>
                    <p className="text-xs text-white/45">
                      {formatPercent(signal.domainPercentage)} in domain
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {hiddenSignals.length > 0 ? (
            <details
              className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-4"
              open={defaultOpen}
            >
              <summary className="cursor-pointer list-none text-sm font-medium text-white/72 marker:hidden">
                Show full domain breakdown
              </summary>
              <div className="mt-4 space-y-3">
                {hiddenSignals.map((signal) => (
                  <div
                    key={signal.signalId}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-white/82">{signal.signalTitle}</p>
                      <p className="mt-1 text-xs text-white/45">
                        {signal.isOverlay ? 'Overlay' : 'Scored signal'} - Rank #{signal.rank}
                      </p>
                    </div>
                    <div className="text-right text-white/60">
                      <p>{formatPercent(signal.percentage)}</p>
                      <p className="text-xs">{formatPercent(signal.domainPercentage)} in domain</p>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </>
      ) : (
        <p className="mt-5 rounded-2xl border border-dashed border-white/10 p-4 text-sm text-white/45">
          This section has no scored signals in the persisted result payload.
        </p>
      )}
    </article>
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

  const { leadSignal, prominentSignals, secondarySignals } = getVisibleSignals(result);
  const { visibleDomains, additionalDomains } = getPrioritizedDomains(result);
  const completionDate = formatResultDate(result.generatedAt ?? result.createdAt);
  const heroNarrative = getHeroNarrative(result);

  return (
    <main className="space-y-8">
      <header className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur">
        <div className="flex flex-col gap-2 text-sm text-white/55 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>{result.assessmentTitle}</span>
            <span className="hidden text-white/20 md:inline">/</span>
            <span>Version {result.version}</span>
            <span className="hidden text-white/20 md:inline">/</span>
            <span>{completionDate}</span>
          </div>
          <span className="inline-flex w-fit rounded-full border border-emerald-400/25 bg-emerald-400/12 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-emerald-200">
            Ready
          </span>
        </div>
      </header>

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(124,146,255,0.24),_transparent_42%),linear-gradient(180deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0.02))] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] md:p-8">
        <div className="grid gap-8 xl:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-6">
            <div className="space-y-3">
              <SectionEyebrow>Core Insight</SectionEyebrow>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-5xl">
                {result.topSignal?.title ?? result.overviewSummary.headline}
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-white/72">{heroNarrative}</p>
              {result.overviewSummary.headline &&
              result.topSignal?.title !== result.overviewSummary.headline ? (
                <p className="max-w-2xl text-sm uppercase tracking-[0.18em] text-white/42">
                  {result.overviewSummary.headline}
                </p>
              ) : null}
            </div>

            {leadSignal ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">Top signal</p>
                  <p className="mt-3 text-2xl font-semibold text-white">{getSignalTitle(leadSignal)}</p>
                  <p className="mt-2 text-sm text-white/52">{formatDomainLabel(leadSignal.domainKey)}</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">Normalized score</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{formatPercent(leadSignal.percentage)}</p>
                  <SignalMeter value={leadSignal.percentage} />
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">Rank position</p>
                  <p className="mt-3 text-3xl font-semibold text-white">#{leadSignal.rank}</p>
                  <p className="mt-2 text-sm text-white/52">Raw total {leadSignal.rawTotal}</p>
                </div>
              </div>
            ) : null}
          </div>

          <aside className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5">
            <SectionEyebrow>Signal Hierarchy</SectionEyebrow>
            <div className="mt-4 space-y-3">
              {prominentSignals.map((signal) => (
                <div
                  key={signal.signalId}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-white/88">
                        #{signal.rank} {getSignalTitle(signal)}
                      </p>
                      <p className="mt-1 text-xs text-white/45">
                        {formatDomainLabel(signal.domainKey)}
                        {signal.isOverlay ? ' - overlay' : ''}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-white">{formatPercent(signal.percentage)}</p>
                  </div>
                  <div className="mt-3">
                    <SignalMeter value={signal.percentage} tone="muted" />
                  </div>
                </div>
              ))}

              {prominentSignals.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-white/45">
                  No additional ranked signals are available.
                </div>
              ) : null}
            </div>

            {secondarySignals.length > 0 ? (
              <details className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <summary className="cursor-pointer list-none text-sm font-medium text-white/72 marker:hidden">
                  Show {secondarySignals.length} lower-priority signals
                </summary>
                <div className="mt-4 space-y-3">
                  {secondarySignals.map((signal) => (
                    <div
                      key={signal.signalId}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-black/20 px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-white/82">
                          #{signal.rank} {getSignalTitle(signal)}
                        </p>
                        <p className="mt-1 text-xs text-white/45">
                          {formatDomainLabel(signal.domainKey)}
                          {signal.isOverlay ? ' - overlay' : ''}
                        </p>
                      </div>
                      <p className="text-white/60">{formatPercent(signal.percentage)}</p>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
          </aside>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="space-y-2">
            <SectionEyebrow>Domain Summaries</SectionEyebrow>
            <p className="max-w-2xl text-sm leading-7 text-white/58">
              The strongest domains are expanded first. Lower-priority sections stay available
              without taking over the page.
            </p>
          </div>

          <div className="space-y-5">
            {visibleDomains.map((domain, index) => (
              <DomainCard
                key={domain.domainId}
                domain={domain}
                defaultOpen={index === 0 && domain.signalScores.length > 3}
              />
            ))}
          </div>

          {additionalDomains.length > 0 ? (
            <details className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
              <summary className="cursor-pointer list-none text-sm font-medium text-white/72 marker:hidden">
                Show {additionalDomains.length} more domain summaries
              </summary>
              <div className="mt-5 space-y-5">
                {additionalDomains.map((domain) => (
                  <DomainCard key={domain.domainId} domain={domain} />
                ))}
              </div>
            </details>
          ) : null}
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <SectionEyebrow>Action Focus</SectionEyebrow>
            <p className="text-sm leading-7 text-white/58">
              Practical signals to keep, manage, and strengthen. These are concise on purpose.
            </p>
          </div>

          <ActionList title="Strengths" items={result.strengths} tone="positive" />
          <ActionList title="Watchouts" items={result.watchouts} tone="warning" />
          <ActionList title="Development Focus" items={result.developmentFocus} tone="neutral" />
        </div>
      </section>
    </main>
  );
}
