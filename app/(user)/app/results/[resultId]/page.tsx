import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { PageFrame, SectionHeader, SurfaceCard } from '@/components/shared/user-app-ui';
import type {
  AssessmentResultDetailViewModel,
  AssessmentResultDomainViewModel,
} from '@/lib/server/result-read-model-types';
import { getDbPool } from '@/lib/server/db';
import { getResultDetailDomains } from '@/lib/server/result-detail-domain-view';
import { getRequestUserId } from '@/lib/server/request-user';
import { createResultReadModelService } from '@/lib/server/result-read-model';
import { AssessmentResultNotFoundError } from '@/lib/server/result-read-model-types';

type ResultDetailPageProps = {
  params: Promise<{
    resultId: string;
  }>;
};

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

function splitNarrative(value: string): readonly string[] {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function getHeroHeading(
  result: AssessmentResultDetailViewModel,
): string {
  const headline = result.overviewSummary.headline?.trim();
  if (headline) {
    return headline;
  }

  if (result.topSignal) {
    return result.topSignal.title;
  }

  return 'Overall pattern';
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

function getDomainDetailsCtaLabel(domain: AssessmentResultDomainViewModel): string {
  const primarySignalTitle = domain.signalScores[0]?.signalTitle ?? null;

  if (primarySignalTitle) {
    return `See why ${primarySignalTitle} leads here`;
  }

  return 'Explore this area in more detail';
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
  const toneClass =
    tone === 'positive'
      ? 'border-emerald-300/18 bg-emerald-300/[0.04]'
      : tone === 'warning'
        ? 'border-amber-300/18 bg-amber-300/[0.04]'
        : 'border-white/10 bg-white/[0.025]';

  return (
    <SurfaceCard className="rounded-[1.7rem] p-6 md:p-7">
      <div className="space-y-6">
        <div className="space-y-3">
          <SectionEyebrow>{title}</SectionEyebrow>
          <div className="border-white/8 max-w-3xl border-t pt-4">
            <p className="text-[1.35rem] font-semibold tracking-[-0.03em] text-white">{title}</p>
          </div>
        </div>

        <ul className="space-y-3">
        {visible.length > 0 ? (
          visible.map((item) => (
            <li
              key={item.key}
              className={`rounded-[1.35rem] border px-5 py-5 ${toneClass}`}
            >
              <div className="space-y-3">
                <p className="text-[0.92rem] font-semibold tracking-[-0.01em] text-white/88">
                  {item.title}
                </p>
                <p className="text-[0.98rem] leading-7 text-white/66">{item.detail}</p>
              </div>
            </li>
          ))
        ) : (
          <li className="rounded-[1.35rem] border border-dashed border-white/10 px-5 py-5 text-sm leading-7 text-white/45">
            No items available in this section.
          </li>
        )}
        </ul>

        {overflow.length > 0 ? (
          <details className="border-white/8 rounded-[1.25rem] border bg-black/10 px-5 py-4">
            <summary className="cursor-pointer list-none text-sm font-medium text-white/64 marker:hidden">
              Show {overflow.length} more
            </summary>
            <ul className="mt-4 space-y-3">
              {overflow.map((item) => (
                <li key={item.key} className="rounded-[1.15rem] border border-white/8 bg-white/[0.02] px-4 py-4">
                  <p className="text-sm font-medium text-white/84">{item.title}</p>
                  <p className="mt-2 text-sm leading-7 text-white/58">{item.detail}</p>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </SurfaceCard>
  );
}

function DomainCard({ domain }: { domain: AssessmentResultDomainViewModel }) {
  const visibleSignals = domain.signalScores.slice(0, 2);
  const hiddenSignals = domain.signalScores.slice(2);
  const interpretation = getPersistedDomainInterpretation(domain);
  const detailsCtaLabel = getDomainDetailsCtaLabel(domain);
  const title = domain.domainTitle.trim() || formatDomainLabel(domain.domainKey);
  const primarySignal = visibleSignals[0] ?? null;
  const secondarySignal = visibleSignals[1] ?? null;

  return (
    <SurfaceCard className="rounded-[1.8rem] p-7 md:p-8">
      <div className="space-y-8">
        <div className="space-y-4">
          <SectionEyebrow>Domain</SectionEyebrow>
          <div className="border-white/8 space-y-4 border-t pt-5">
            <div className="space-y-3">
              <h3 className="text-[1.7rem] font-semibold tracking-[-0.035em] text-white md:text-[2rem]">
                {title}
              </h3>
              <p className="max-w-3xl text-[1rem] leading-8 text-white/68">{interpretation.summary}</p>
            </div>

            {interpretation.support ? (
              <p className="max-w-3xl text-sm leading-7 text-white/50">{interpretation.support}</p>
            ) : null}
            {interpretation.tension ? (
              <p className="max-w-3xl text-sm leading-7 text-white/42">{interpretation.tension}</p>
            ) : null}
          </div>
        </div>

        {primarySignal ? (
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.025] px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                Primary signal
              </p>
              <p className="mt-3 text-base font-semibold text-white/88">{primarySignal.signalTitle}</p>
            </div>
            {secondarySignal ? (
              <div className="rounded-[1.25rem] border border-white/8 bg-black/10 px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/36">
                  Secondary signal
                </p>
                <p className="mt-3 text-base font-semibold text-white/78">{secondarySignal.signalTitle}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {hiddenSignals.length > 0 ? (
          <details className="rounded-[1.25rem] border border-white/8 bg-black/10 px-5 py-4">
            <summary className="cursor-pointer list-none text-sm font-medium text-white/64 marker:hidden">
              {detailsCtaLabel}
            </summary>
            <div className="mt-4 space-y-3">
              {hiddenSignals.map((signal) => (
                <div
                  key={signal.signalId}
                  className="rounded-[1rem] border border-white/8 bg-white/[0.02] px-4 py-3 text-sm"
                >
                  <p className="font-medium text-white/82">{signal.signalTitle}</p>
                  <p className="mt-1 text-xs text-white/42">
                    Supporting signal{signal.isOverlay ? ' | overlay' : ''}
                  </p>
                </div>
              ))}
            </div>
          </details>
        ) : null}

        {visibleSignals.length === 0 ? (
          <p className="rounded-[1.25rem] border border-dashed border-white/10 px-5 py-4 text-sm leading-7 text-white/45">
            No persisted domain signals are available for this area.
          </p>
        ) : null}
      </div>
    </SurfaceCard>
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

  const resultDomains = getResultDetailDomains(result);
  const completionTimestamp = formatResultTimestamp(result.generatedAt ?? result.createdAt);
  const heroHeading = getHeroHeading(result);
  const heroSupport = getHeroSupport(result);

  return (
    <PageFrame className="space-y-10">
      <SurfaceCard
        accent
        className="overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_top_left,rgba(118,147,255,0.16),transparent_32%),linear-gradient(180deg,rgba(16,26,44,0.92),rgba(9,15,28,0.98))] px-7 py-8 md:px-10 md:py-12"
      >
        <div className="space-y-8">
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">
            <SectionEyebrow>Overview</SectionEyebrow>
            <span className="hidden h-1 w-1 rounded-full bg-white/18 md:inline-block" />
            <span>{result.assessmentTitle}</span>
            <span className="hidden h-1 w-1 rounded-full bg-white/18 md:inline-block" />
            <span>{result.metadata.assessmentKey}</span>
            <span className="hidden h-1 w-1 rounded-full bg-white/18 md:inline-block" />
            <span>v{result.version}</span>
            <span className="hidden h-1 w-1 rounded-full bg-white/18 md:inline-block" />
            <span>{completionTimestamp.date}</span>
          </div>

          <div className="space-y-6">
            <h1 className="max-w-4xl text-[2.9rem] font-semibold leading-[1.02] tracking-[-0.045em] text-white md:text-[4.4rem]">
              {heroHeading}
            </h1>
            <div className="max-w-3xl space-y-4">
              <p className="text-[1.05rem] leading-8 text-white/76 md:text-[1.2rem] md:leading-9">
                {heroSupport.narrative}
              </p>
              {heroSupport.support ? (
                <p className="max-w-2xl text-[0.98rem] leading-8 text-white/52">
                  {heroSupport.support}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </SurfaceCard>

      <section className="space-y-6">
        <SectionHeader
          eyebrow="Action Focus"
          title="Interpretation to hold onto"
          description="These sections are rendered directly from the persisted result payload and are designed to be read quickly, then revisited as needed."
        />

        <div className="grid gap-5 xl:grid-cols-3">
          <ActionList title="Strengths" items={result.strengths} tone="positive" />
          <ActionList title="Watchouts" items={result.watchouts} tone="warning" />
          <ActionList title="Development Focus" items={result.developmentFocus} tone="neutral" />
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeader
          eyebrow={`${resultDomains.length} Domain${resultDomains.length === 1 ? '' : 's'}`}
          title="Domain reading"
          description="Each domain section is rendered directly from the persisted payload, with interpretation summary first and supporting signal context kept visually quiet."
        />

        <div className="grid gap-6 2xl:grid-cols-2">
          {resultDomains.map((domain) => (
            <DomainCard key={domain.domainId} domain={domain} />
          ))}
          {resultDomains.length === 0 ? (
            <SurfaceCard className="p-6 text-sm text-white/55">
              No persisted domain summaries are available for this result.
            </SurfaceCard>
          ) : null}
        </div>
      </section>
    </PageFrame>
  );
}
