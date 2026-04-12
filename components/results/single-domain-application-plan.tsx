import type { SingleDomainResultsViewModel } from '@/lib/server/single-domain-results-view-model';

type StatementGroup = {
  title: string;
  items: SingleDomainResultsViewModel['application']['strengths'];
};

function ApplicationStatementGroup({ title, items }: StatementGroup) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="sonartra-report-kicker">{title}</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {items.map((item, index) => (
          <article
            key={`${title}-${item.signal_key}-${index}`}
            className="sonartra-motion-reveal-soft space-y-3 rounded-[1.35rem] border border-white/7 bg-white/[0.015] p-3 transition-colors duration-200 hover:bg-white/[0.02] focus-within:bg-white/[0.02] md:p-4"
          >
            <p className="sonartra-report-title text-[1.02rem] text-white/92">{item.statement}</p>
            <p className="sonartra-report-kicker text-white/42">
              {item.signal_label} • Rank {item.rank}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function SingleDomainApplicationPlan({
  application,
}: {
  application: SingleDomainResultsViewModel['application'];
}) {
  return (
    <div className="mx-auto max-w-[61rem] space-y-8 px-1 md:space-y-12 md:px-2">
      <ApplicationStatementGroup title="Strengths to rely on" items={application.strengths} />
      <ApplicationStatementGroup title="Watchouts to notice" items={application.watchouts} />
      <ApplicationStatementGroup
        title="Development focus"
        items={application.developmentFocus}
      />
    </div>
  );
}
