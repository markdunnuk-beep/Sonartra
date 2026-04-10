"use client";

import type { ApplicationSection } from '@/lib/types/result';

type Props = {
  application: ApplicationSection | null | undefined;
};

type ApplicationItemProps = {
  label: string;
  narrative: string;
  aside?: string;
  sourceType?: 'pair' | 'signal';
  delayClassName?: string;
};

type PatternFirstItem = {
  sourceType: 'pair' | 'signal';
};

function splitPatternFirst<T extends PatternFirstItem>(items: readonly T[]) {
  return {
    pairItems: items.filter((item) => item.sourceType === 'pair'),
    signalItems: items.filter((item) => item.sourceType === 'signal'),
  };
}

function ApplicationItem({
  label,
  narrative,
  aside,
  sourceType,
  delayClassName,
}: ApplicationItemProps) {
  return (
    <article
      className={[
        'sonartra-motion-reveal-soft space-y-3 rounded-[1.35rem] border border-white/7 bg-white/[0.015] p-3 transition-colors duration-200 hover:bg-white/[0.02] focus-within:bg-white/[0.02] md:p-4',
        delayClassName ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {sourceType === 'pair' ? (
        <p className="sonartra-report-kicker text-white/42">In this pattern</p>
      ) : null}
      <p className="sonartra-report-title text-[1.02rem] text-white/92">{label}</p>
      <p className="sonartra-report-body-soft max-w-[34rem] text-white/70">{narrative}</p>
      {aside ? <p className="sonartra-report-kicker text-white/45">{aside}</p> : null}
    </article>
  );
}

type ApplicationGridItem = {
  label: string;
  narrative: string;
  sourceType: 'pair' | 'signal';
  aside?: string;
};

function ApplicationItemGrid({ items }: { items: readonly ApplicationGridItem[] }) {
  const { pairItems, signalItems } = splitPatternFirst(items);
  const orderedItems = [...pairItems, ...signalItems];

  if (orderedItems.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {orderedItems.map((item, index) => (
        <ApplicationItem
          key={`${item.sourceType}-${item.label}-${index}`}
          label={item.label}
          narrative={item.narrative}
          aside={item.aside}
          sourceType={item.sourceType}
          delayClassName={index % 2 === 0 ? 'sonartra-motion-stage-2' : 'sonartra-motion-stage-3'}
        />
      ))}
    </div>
  );
}

export function ApplicationPlan({ application }: Props) {
  if (!application) {
    return null;
  }

  return (
    <div className="mx-auto max-w-[61rem] space-y-8 px-1 md:space-y-12 md:px-2">

      {(application.thesis.headline || application.thesis.summary) ? (
        <section className="space-y-6">
          {application.thesis.headline ? (
            <h3 className="sonartra-report-title max-w-[34rem] text-[1.28rem] leading-8 text-white/92 md:text-[1.42rem] md:leading-9">
              {application.thesis.headline}
            </h3>
          ) : null}
          {application.thesis.summary ? (
            <p className="sonartra-report-body max-w-[46rem] text-white/76">
              {application.thesis.summary}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-6">
        <div className="space-y-2">
          <p className="sonartra-report-kicker">{application.signatureContribution.title}</p>
          {application.signatureContribution.summary ? (
            <p className="sonartra-report-body-soft max-w-[42rem] text-white/58">
              {application.signatureContribution.summary}
            </p>
          ) : null}
        </div>
        <ApplicationItemGrid
          items={application.signatureContribution.items.map((item) => ({
            label: item.label,
            narrative: item.narrative,
            aside: item.bestWhen,
            sourceType: item.sourceType,
          }))}
        />
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <p className="sonartra-report-kicker">{application.patternRisks.title}</p>
          {application.patternRisks.summary ? (
            <p className="sonartra-report-body-soft max-w-[42rem] text-white/58">
              {application.patternRisks.summary}
            </p>
          ) : null}
        </div>
        <ApplicationItemGrid
          items={application.patternRisks.items.map((item) => ({
            label: item.label,
            narrative: item.narrative,
            aside: item.earlyWarning,
            sourceType: item.sourceType,
          }))}
        />
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <p className="sonartra-report-kicker">{application.rangeBuilder.title}</p>
          {application.rangeBuilder.summary ? (
            <p className="sonartra-report-body-soft max-w-[42rem] text-white/58">
              {application.rangeBuilder.summary}
            </p>
          ) : null}
        </div>
        <ApplicationItemGrid
          items={application.rangeBuilder.items.map((item) => ({
            label: item.label,
            narrative: item.narrative,
            aside: item.practice,
            sourceType: item.sourceType,
          }))}
        />
      </section>

      <section className="space-y-6">
        <p className="sonartra-report-kicker">What to do next</p>
        <div className="max-w-[48rem] space-y-6 rounded-[1.5rem] border border-white/7 bg-white/[0.02] px-5 py-5 md:px-6 md:py-6">
          {application.actionPlan30.keepDoing ? (
            <div className="space-y-2">
              <p className="sonartra-report-kicker text-white/42">
                Keep doing
              </p>
              <p className="sonartra-report-body text-white/82">{application.actionPlan30.keepDoing}</p>
            </div>
          ) : null}
          {application.actionPlan30.watchFor ? (
            <div className="space-y-2">
              <p className="sonartra-report-kicker text-white/42">
                Watch for
              </p>
              <p className="sonartra-report-body text-white/82">{application.actionPlan30.watchFor}</p>
            </div>
          ) : null}
          {application.actionPlan30.practiceNext ? (
            <div className="space-y-2">
              <p className="sonartra-report-kicker text-white/42">
                Try this
              </p>
              <p className="sonartra-report-body text-white/82">{application.actionPlan30.practiceNext}</p>
            </div>
          ) : null}
          {application.actionPlan30.askOthers ? (
            <div className="space-y-2">
              <p className="sonartra-report-kicker text-white/42">
                Ask others
              </p>
              <p className="sonartra-report-body text-white/82">{application.actionPlan30.askOthers}</p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
