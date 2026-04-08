"use client";

import type { ApplicationSection } from '@/lib/types/result';

type Props = {
  application: ApplicationSection | null | undefined;
};

type ApplicationItemProps = {
  label: string;
  narrative: string;
  aside?: string;
};

function ApplicationItem({ label, narrative, aside }: ApplicationItemProps) {
  return (
    <article className="space-y-3 rounded-[1.4rem] border border-white/7 bg-white/[0.02] px-5 py-5 md:px-6 md:py-6">
      <p className="sonartra-report-title text-[1.02rem] text-white/92">{label}</p>
      <p className="sonartra-report-body-soft max-w-[34rem] text-white/70">{narrative}</p>
      {aside ? <p className="sonartra-report-kicker text-white/45">{aside}</p> : null}
    </article>
  );
}

export function ApplicationPlan({ application }: Props) {
  if (!application) {
    return null;
  }

  return (
    <div className="mx-auto max-w-[61rem] space-y-10 px-1 md:space-y-12 md:px-2">
      <div className="max-w-[52rem] space-y-4 border-l border-white/8 pl-5 md:space-y-5 md:pl-7">
        <p className="sonartra-report-kicker">Application</p>
        <h2 className="sonartra-report-title max-w-[24rem] text-[1.45rem] leading-8 text-white/94 md:text-[1.62rem] md:leading-9">
          Turning insight into impact
        </h2>
        <p className="sonartra-report-body-soft max-w-[42rem] text-white/58">
          This section brings your patterns together into a clear view of how you
          create value, where they can work against you, and what to do next.
        </p>
      </div>

      {(application.thesis.headline || application.thesis.summary) ? (
        <section className="space-y-4">
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
        {application.signatureContribution.items.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2">
            {application.signatureContribution.items.map((item, index) => (
              <ApplicationItem
                key={`${item.sourceType}-${item.sourceKey}-${index}`}
                label={item.label}
                narrative={item.narrative}
                aside={`Works best when ${item.bestWhen}`}
              />
            ))}
          </div>
        ) : null}
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
        {application.patternRisks.items.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2">
            {application.patternRisks.items.map((item, index) => (
              <ApplicationItem
                key={`${item.sourceType}-${item.sourceKey}-${index}`}
                label={item.label}
                narrative={item.narrative}
                aside={item.earlyWarning}
              />
            ))}
          </div>
        ) : null}
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
        {application.rangeBuilder.items.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2">
            {application.rangeBuilder.items.map((item, index) => (
              <ApplicationItem
                key={`${item.sourceType}-${item.sourceKey}-${index}`}
                label={item.label}
                narrative={item.narrative}
                aside={`Try this: ${item.practice}`}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section className="space-y-5">
        <p className="sonartra-report-kicker">What to do next</p>
        <div className="max-w-[46rem] space-y-4 rounded-[1.5rem] border border-white/7 bg-white/[0.02] px-5 py-5 md:px-6 md:py-6">
          {application.actionPlan30.keepDoing ? (
            <p className="sonartra-report-body-soft text-white/72">
              <span className="text-white/92">Keep doing:</span> {application.actionPlan30.keepDoing}
            </p>
          ) : null}
          {application.actionPlan30.watchFor ? (
            <p className="sonartra-report-body-soft text-white/72">
              <span className="text-white/92">Watch for:</span> {application.actionPlan30.watchFor}
            </p>
          ) : null}
          {application.actionPlan30.practiceNext ? (
            <p className="sonartra-report-body-soft text-white/72">
              <span className="text-white/92">Try this:</span> {application.actionPlan30.practiceNext}
            </p>
          ) : null}
          {application.actionPlan30.askOthers ? (
            <p className="sonartra-report-body-soft text-white/72">
              <span className="text-white/92">Ask others:</span> {application.actionPlan30.askOthers}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
