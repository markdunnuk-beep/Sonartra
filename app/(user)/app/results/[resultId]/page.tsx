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

function getDomainSignalContext(
  primarySignal: AssessmentResultDomainViewModel['signalScores'][number] | null,
  secondarySignal: AssessmentResultDomainViewModel['signalScores'][number] | null,
): string | null {
  if (primarySignal && secondarySignal) {
    return `${primarySignal.signalTitle} is most evident in this area, with ${secondarySignal.signalTitle} also shaping the picture.`;
  }

  if (primarySignal) {
    return `${primarySignal.signalTitle} is the clearest signal in this area.`;
  }

  return null;
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
    <SurfaceCard className="rounded-[1.7rem] p-6 sm:p-7 md:p-8">
      <div className="space-y-7">
        <div className="space-y-3">
          <SectionEyebrow>{title}</SectionEyebrow>
          <div className="border-white/8 max-w-3xl border-t pt-4">
            <p className="text-[1.28rem] font-semibold tracking-[-0.03em] text-white md:text-[1.35rem]">{title}</p>
          </div>
        </div>

        <ul className="space-y-3">
          {visible.length > 0 ? (
            visible.map((item) => (
              <li
                key={item.key}
                className={`rounded-[1.35rem] border px-5 py-5 sm:px-6 ${toneClass}`}
              >
                <div className="space-y-3">
                  <p className="text-[0.92rem] font-semibold tracking-[-0.01em] text-white/88">
                    {item.title}
                  </p>
                  <p className="max-w-[34rem] text-[0.98rem] leading-7 text-white/66">{item.detail}</p>
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
          <details className="border-white/8 rounded-[1.25rem] border bg-black/10 px-5 py-4 sm:px-6">
            <summary className="cursor-pointer list-none text-sm font-medium text-white/64 marker:hidden">
              Show {overflow.length} more
            </summary>
            <ul className="mt-4 space-y-3">
              {overflow.map((item) => (
                <li key={item.key} className="rounded-[1.15rem] border border-white/8 bg-white/[0.02] px-4 py-4">
                  <p className="text-sm font-medium text-white/84">{item.title}</p>
                  <p className="mt-2 max-w-[34rem] text-sm leading-7 text-white/58">{item.detail}</p>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </SurfaceCard>
  );
}

function DomainChapter({ domain }: { domain: AssessmentResultDomainViewModel }) {
  const visibleSignals = domain.signalScores.slice(0, 2);
  const hiddenSignals = domain.signalScores.slice(2);
  const interpretation = getPersistedDomainInterpretation(domain);
  const title = domain.domainTitle.trim() || formatDomainLabel(domain.domainKey);
  const primarySignal = visibleSignals[0] ?? null;
  const secondarySignal = visibleSignals[1] ?? null;
  const signalContext = getDomainSignalContext(primarySignal, secondarySignal);

  return (
    <article className="border-white/8 space-y-6 border-t pt-8 first:border-t-0 first:pt-0 md:space-y-7 md:pt-10">
      <div className="grid gap-4 md:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] md:gap-8">
        <div className="space-y-3">
          <SectionEyebrow>Domain</SectionEyebrow>
          <h3 className="max-w-[14ch] text-[1.55rem] font-semibold tracking-[-0.035em] text-white md:text-[1.9rem]">
            {title}
          </h3>
        </div>

        <div className="space-y-4 md:space-y-5">
          <p className="max-w-[44rem] text-[1rem] leading-8 text-white/68 md:text-[1.05rem] md:leading-9">
            {interpretation.summary}
          </p>

          {interpretation.support ? (
            <p className="max-w-[40rem] text-[0.96rem] leading-8 text-white/52">{interpretation.support}</p>
          ) : null}
          {interpretation.tension ? (
            <p className="max-w-[40rem] text-[0.96rem] leading-8 text-white/44">{interpretation.tension}</p>
          ) : null}

          {signalContext ? (
            <p className="max-w-[40rem] text-[0.92rem] leading-7 text-white/50">
              {signalContext}
            </p>
          ) : null}

          {hiddenSignals.length > 0 ? (
            <details className="max-w-[40rem] pt-1">
              <summary className="cursor-pointer list-none text-[0.92rem] font-medium text-white/58 marker:hidden">
                Additional signal context
              </summary>
              <div className="mt-3 space-y-3 border-l border-white/8 pl-4">
                {hiddenSignals.map((signal) => (
                  <div key={signal.signalId} className="text-sm leading-7 text-white/52">
                    <span className="font-medium text-white/76">{signal.signalTitle}</span>
                    <span className="text-white/40">
                      {' '}
                      also appears in this area{signal.isOverlay ? ' as an overlay' : ''}.
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
  domains,
}: {
  domains: readonly AssessmentResultDomainViewModel[];
}) {
  if (domains.length === 0) {
    return (
      <SurfaceCard className="p-6 text-sm text-white/55">
        No persisted domain summaries are available for this result.
      </SurfaceCard>
    );
  }

  return (
    <div className="mx-auto max-w-[58rem] space-y-12 md:space-y-14">
      {domains.map((domain) => (
        <DomainChapter key={domain.domainId} domain={domain} />
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

  const resultDomains = getResultDetailDomains(result);
  const completionTimestamp = formatResultTimestamp(result.generatedAt ?? result.createdAt);
  const heroHeading = getHeroHeading(result);
  const heroSupport = getHeroSupport(result);

  return (
    <PageFrame className="space-y-12 md:space-y-14">
      <SurfaceCard
        accent
        className="overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_top_left,rgba(118,147,255,0.16),transparent_32%),linear-gradient(180deg,rgba(16,26,44,0.92),rgba(9,15,28,0.98))] px-6 py-7 sm:px-7 sm:py-8 md:px-10 md:py-12"
      >
        <div className="space-y-7 md:space-y-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">
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

          <div className="space-y-5 md:space-y-6">
            <h1 className="max-w-[16ch] text-[2.45rem] font-semibold leading-[1.03] tracking-[-0.045em] text-white sm:text-[2.9rem] md:text-[4.15rem]">
              {heroHeading}
            </h1>
            <div className="max-w-[72ch] space-y-4">
              <p className="text-[1rem] leading-8 text-white/74 sm:text-[1.05rem] md:text-[1.16rem] md:leading-9">
                {heroSupport.narrative}
              </p>
              {heroSupport.support ? (
                <p className="max-w-[62ch] text-[0.96rem] leading-8 text-white/50">
                  {heroSupport.support}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </SurfaceCard>

      <section className="space-y-7">
        <SectionHeader
          eyebrow="Action Focus"
          title="Interpretation to hold onto"
          description="Across the rest of the report, this pattern shows up in a few consistent ways: where it adds value, where it can create friction, and where attention may be useful."
        />

        <div className="grid gap-5 lg:gap-6 xl:grid-cols-3">
          <ActionList title="Strengths" items={result.strengths} tone="positive" />
          <ActionList title="Watchouts" items={result.watchouts} tone="warning" />
          <ActionList title="Development Focus" items={result.developmentFocus} tone="neutral" />
        </div>
      </section>

      <section className="space-y-7">
        <SectionHeader
          eyebrow={`${resultDomains.length} Domain${resultDomains.length === 1 ? '' : 's'}`}
          title="Domain reading"
          description="The chapters that follow stay with the same overall pattern, showing how it comes through across the main areas of the report."
        />

        <DomainSection domains={resultDomains} />
      </section>
    </PageFrame>
  );
}
