import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { StatusPill } from '@/components/shared/user-app-ui';
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
const INTELLIGENCE_DOMAIN_ORDER = [
  'signal_style',
  'signal_mot',
  'signal_lead',
  'signal_conflict',
  'signal_culture',
  'signal_stress',
] as const;

const INTELLIGENCE_DOMAIN_CONFIG: Record<
  (typeof INTELLIGENCE_DOMAIN_ORDER)[number],
  {
    title: string;
    eyebrow: string;
    summaryLabel: string;
    fallback: string;
  }
> = {
  signal_style: {
    title: 'Behaviour Style',
    eyebrow: 'How you tend to show up',
    summaryLabel: 'How you operate',
    fallback:
      'This area shows the clearest working style that tends to shape your day-to-day approach.',
  },
  signal_mot: {
    title: 'Motivators',
    eyebrow: 'What tends to energise you',
    summaryLabel: 'What keeps you engaged',
    fallback: 'This area shows the conditions and outcomes most likely to keep your energy steady.',
  },
  signal_lead: {
    title: 'Leadership',
    eyebrow: 'How you tend to lead',
    summaryLabel: 'How your leadership shows up',
    fallback:
      'This area shows the form of direction and support you are most likely to bring when others look to you.',
  },
  signal_conflict: {
    title: 'Conflict',
    eyebrow: 'How you tend to handle tension',
    summaryLabel: 'How you respond when tensions rise',
    fallback:
      'This area shows the conflict response you are most likely to rely on when the situation becomes difficult.',
  },
  signal_culture: {
    title: 'Culture',
    eyebrow: 'Where you are likely to work best',
    summaryLabel: 'What kind of environment fits best',
    fallback:
      'This area shows the kind of environment where your strengths are more likely to come through cleanly.',
  },
  signal_stress: {
    title: 'Stress',
    eyebrow: 'How pressure may change your pattern',
    summaryLabel: 'What to notice under pressure',
    fallback:
      'This area shows the pressure pattern most worth noticing early so it does not take over.',
  },
};

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

function getUserFacingDomainTitle(domainKey: string): string {
  const config = INTELLIGENCE_DOMAIN_CONFIG[domainKey as keyof typeof INTELLIGENCE_DOMAIN_CONFIG];
  return config?.title ?? formatDomainLabel(domainKey);
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

function splitNarrative(value: string): readonly string[] {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function getSecondaryHeroSignal(
  result: AssessmentResultDetailViewModel,
): AssessmentResultSignalViewModel | null {
  const primarySignalId = result.topSignal?.signalId ?? result.rankedSignals[0]?.signalId ?? null;
  return result.rankedSignals.find((signal) => signal.signalId !== primarySignalId) ?? null;
}

function getHeroHeading(
  result: AssessmentResultDetailViewModel,
  secondarySignal: AssessmentResultSignalViewModel | null,
): string {
  const headline = result.overviewSummary.headline?.trim();
  if (headline) {
    return headline;
  }

  if (result.topSignal && secondarySignal) {
    return `${result.topSignal.title} with ${getSignalTitle(secondarySignal)}`;
  }

  if (result.topSignal) {
    return result.topSignal.title;
  }

  return 'Overall pattern';
}

function getCombinedInterpretation(
  result: AssessmentResultDetailViewModel,
  secondarySignal: AssessmentResultSignalViewModel | null,
): string {
  if (result.topSignal && secondarySignal) {
    return `${result.topSignal.title} leads, with ${getSignalTitle(secondarySignal)} shaping how that pattern comes through day to day.`;
  }

  if (result.topSignal) {
    return `${result.topSignal.title} is the clearest pattern in this result.`;
  }

  return 'This result shows a clear overall pattern ready for review.';
}

function getHeroSupport(result: AssessmentResultDetailViewModel): {
  narrative: string;
  support: string | null;
} {
  const [narrative, support] = splitNarrative(getHeroNarrative(result));

  return {
    narrative: narrative ?? 'This result is ready to review.',
    support: support ?? null,
  };
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

function getVisibleItems<T>(items: readonly T[]): {
  visible: readonly T[];
  overflow: readonly T[];
} {
  return {
    visible: items.slice(0, VISIBLE_ACTION_LIMIT),
    overflow: items.slice(VISIBLE_ACTION_LIMIT),
  };
}

function SignalMeter({ value, tone = 'accent' }: { value: number; tone?: 'accent' | 'muted' }) {
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
    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
      {children}
    </p>
  );
}

function getPersistedDomainInterpretation(domain: AssessmentResultDomainViewModel): {
  summary: string;
  support: string | null;
  tension: string | null;
} {
  const interpretation = domain.interpretation;
  if (interpretation?.summary) {
    return {
      summary: interpretation.summary,
      support: interpretation.supportingLine ?? null,
      tension: interpretation.tensionClause ?? null,
    };
  }

  return {
    summary: 'Interpretation is not available in this persisted result.',
    support: null,
    tension: null,
  };
}

function getSignalCardMicrocopy(params: { signalTitle: string; isPrimary: boolean }): string {
  if (params.isPrimary) {
    return `${params.signalTitle} most strongly shapes how this area tends to show up.`;
  }

  return `${params.signalTitle} remains close enough to meaningfully shape how this area comes through.`;
}

function getIntelligenceDomains(
  result: AssessmentResultDetailViewModel,
): readonly AssessmentResultDomainViewModel[] {
  const domainByKey = new Map(
    result.domainSummaries
      .filter((domain) => domain.domainSource === 'signal_group')
      .map((domain) => [domain.domainKey, domain] as const),
  );

  return INTELLIGENCE_DOMAIN_ORDER.map((domainKey) => domainByKey.get(domainKey)).filter(
    (domain): domain is AssessmentResultDomainViewModel => Boolean(domain),
  );
}

function getHeroPrimarySignalChips(
  domains: readonly AssessmentResultDomainViewModel[],
): readonly string[] {
  return domains
    .map((domain) => domain.signalScores[0]?.signalTitle ?? null)
    .filter((signalTitle): signalTitle is string => Boolean(signalTitle));
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
              <p
                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${accentClass}`}
              >
                {item.title}
              </p>
              <p className="text-white/72 mt-3 text-sm leading-6">{item.detail}</p>
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
          <summary className="text-white/72 cursor-pointer list-none text-sm font-medium marker:hidden">
            Show {overflow.length} more
          </summary>
          <ul className="mt-4 space-y-3">
            {overflow.map((item) => (
              <li key={item.key} className="rounded-2xl bg-white/[0.03] p-4">
                <p className="text-white/88 text-sm font-medium">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-white/60">{item.detail}</p>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function DomainCard({ domain }: { domain: AssessmentResultDomainViewModel }) {
  const config = INTELLIGENCE_DOMAIN_CONFIG[
    domain.domainKey as keyof typeof INTELLIGENCE_DOMAIN_CONFIG
  ] ?? {
    title: domain.domainTitle,
    eyebrow: 'Domain',
    summaryLabel: 'Pattern',
    fallback: 'A persisted domain summary is available for this area.',
  };
  const visibleSignals = domain.signalScores.slice(0, 2);
  const hiddenSignals = domain.signalScores.slice(2);
  const interpretation = getPersistedDomainInterpretation(domain);

  return (
    <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)]">
      <div className="space-y-2">
        <SectionEyebrow>{config.eyebrow}</SectionEyebrow>
        <h3 className="text-xl font-semibold text-white">{config.title}</h3>
        <p className="text-white/62 max-w-2xl text-sm leading-7">{interpretation.summary}</p>
        {interpretation.support ? (
          <p className="text-white/48 max-w-2xl text-sm leading-7">{interpretation.support}</p>
        ) : null}
        {interpretation.tension ? (
          <p className="text-white/42 max-w-2xl text-sm leading-7">{interpretation.tension}</p>
        ) : null}
      </div>

      {visibleSignals.length > 0 ? (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {visibleSignals.map((signal, index) => (
              <div
                key={signal.signalId}
                className="border-white/8 rounded-2xl border bg-black/20 p-4"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                  {index === 0 ? 'Primary signal' : 'Secondary signal'}
                </p>
                <div className="mt-3 flex items-baseline justify-between gap-3">
                  <p className="text-lg font-semibold text-white">{signal.signalTitle}</p>
                  <p className="text-white/68 text-sm font-medium">
                    {formatPercent(signal.domainPercentage)}
                  </p>
                </div>
                <p className="text-white/58 mt-2 text-sm leading-6">
                  {getSignalCardMicrocopy({
                    signalTitle: signal.signalTitle,
                    isPrimary: index === 0,
                  })}
                </p>
              </div>
            ))}
          </div>

          {hiddenSignals.length > 0 ? (
            <details className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-4">
              <summary className="text-white/72 cursor-pointer list-none text-sm font-medium marker:hidden">
                Show remaining signals in this domain
              </summary>
              <div className="mt-4 space-y-3">
                {hiddenSignals.map((signal) => (
                  <div
                    key={signal.signalId}
                    className="rounded-2xl bg-white/[0.03] px-4 py-3 text-sm"
                  >
                    <p className="text-white/82 font-medium">{signal.signalTitle}</p>
                    <p className="mt-1 text-xs text-white/45">
                      {formatPercent(signal.domainPercentage)} supporting signal
                      {signal.isOverlay ? ' | overlay' : ''}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </>
      ) : (
        <p className="mt-5 rounded-2xl border border-dashed border-white/10 p-4 text-sm text-white/45">
          No persisted domain signals are available for this area.
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

  const { leadSignal } = getVisibleSignals(result);
  const intelligenceDomains = getIntelligenceDomains(result);
  const heroPrimarySignalChips = getHeroPrimarySignalChips(intelligenceDomains);
  const completionDate = formatResultDate(result.generatedAt ?? result.createdAt);
  const secondaryHeroSignal = getSecondaryHeroSignal(result);
  const heroHeading = getHeroHeading(result, secondaryHeroSignal);
  const combinedInterpretation = getCombinedInterpretation(result, secondaryHeroSignal);
  const heroSupport = getHeroSupport(result);

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
          <StatusPill status="ready" label="Ready" />
        </div>
      </header>

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(124,146,255,0.24),_transparent_42%),linear-gradient(180deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0.02))] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] md:p-8">
        <div className="space-y-4">
          <SectionEyebrow>Overall Pattern</SectionEyebrow>
          <div className="flex flex-wrap gap-3">
            {heroPrimarySignalChips.map((chip) => (
              <span
                key={chip}
                className="inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-white/45"
              >
                {chip}
              </span>
            ))}
            {heroPrimarySignalChips.length === 0 && leadSignal ? (
              <span className="inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-white/45">
                {getUserFacingDomainTitle(leadSignal.domainKey)}
              </span>
            ) : null}
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-5xl">
            {heroHeading}
          </h1>
          <p className="text-white/72 max-w-3xl text-lg leading-8">{combinedInterpretation}</p>
          <p className="text-white/52 max-w-3xl text-sm leading-7">
            In practice: {heroSupport.narrative}
          </p>
          {heroSupport.support ? (
            <p className="text-white/42 max-w-3xl text-sm leading-7">{heroSupport.support}</p>
          ) : null}
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <SectionEyebrow>Six Intelligence Areas</SectionEyebrow>
          <p className="text-white/58 max-w-3xl text-sm leading-7">
            The six core areas show how the strongest patterns come through across the parts of work
            that matter most.
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {intelligenceDomains.map((domain) => (
            <DomainCard key={domain.domainId} domain={domain} />
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <SectionEyebrow>Action Focus</SectionEyebrow>
          <p className="text-white/58 text-sm leading-7">
            Practical strengths to build on, risks to manage, and areas worth strengthening. These
            stay concise on purpose.
          </p>
        </div>

        <ActionList title="Strengths" items={result.strengths} tone="positive" />
        <ActionList title="Watchouts" items={result.watchouts} tone="warning" />
        <ActionList title="Development Focus" items={result.developmentFocus} tone="neutral" />
      </section>
    </main>
  );
}
