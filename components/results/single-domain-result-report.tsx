import { ResultReadingProgress } from '@/components/results/result-reading-progress';
import { ResultReadingRail } from '@/components/results/result-reading-rail';
import { SingleDomainResultSection } from '@/components/results/single-domain-result-section';
import { PageFrame } from '@/components/shared/user-app-ui';
import type { SingleDomainResultsViewModel } from '@/lib/server/single-domain-results-view-model';

function MetadataCard({
  items,
  pairLabel,
}: {
  items: SingleDomainResultsViewModel['metadataItems'];
  pairLabel: string;
}) {
  const detailItems = [
    ...items,
    { label: 'Leading pair', value: pairLabel, emphasis: true },
  ] as const;

  return (
    <dl className="sonartra-single-domain-meta-grid sonartra-single-domain-surface-muted overflow-hidden rounded-[1.45rem] border">
      {detailItems.map((item, index) => (
        <div
          key={`${item.label}-${item.value}`}
          className={[
            'space-y-1 px-4 py-3.5',
            index > 0 ? 'border-white/6 border-t' : '',
            item.emphasis ? 'bg-white/[0.018]' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <dt className="sonartra-report-kicker text-white/34">{item.label}</dt>
          <dd
            className={[
              'sonartra-report-body text-[0.98rem] leading-7',
              item.emphasis ? 'text-white/84 font-medium' : 'text-white/74',
            ].join(' ')}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function SingleDomainResultReport({ result }: { result: SingleDomainResultsViewModel }) {
  const introSection = result.report.sections.find((section) => section.key === 'intro');
  const remainingSections = result.report.sections.filter((section) => section.key !== 'intro');

  return (
    <PageFrame className="space-y-10 md:space-y-12">
      <article className="sonartra-single-domain-report relative isolate">
        <div className="relative xl:mx-auto xl:grid xl:max-w-[114rem] xl:grid-cols-[minmax(0,1fr)_minmax(11rem,12.25rem)] xl:gap-8 2xl:gap-10">
          <div className="min-w-0 max-w-none space-y-12 md:space-y-16 xl:pr-6">
            {introSection ? (
              <header
                id={introSection.key}
                aria-labelledby={`${introSection.key}-heading`}
                className="results-anchor-target sonartra-motion-reveal sonartra-single-domain-section space-y-8 md:space-y-9"
              >
                <div className="border-white/6 grid gap-8 border-b pb-8 md:gap-10 md:pb-10 lg:grid-cols-[minmax(0,1.14fr)_minmax(15.5rem,18.5rem)]">
                  <div className="max-w-[58rem] space-y-5 md:space-y-7">
                    <div className="space-y-3">
                      <p className="sonartra-report-kicker">{result.assessmentTitle}</p>
                      <p className="text-white/34 max-w-[18rem] text-[0.73rem] font-medium uppercase tracking-[0.16em]">
                        Single-domain report
                      </p>
                    </div>
                    <h1
                      id={`${introSection.key}-heading`}
                      className="max-w-[10ch] text-[3.2rem] font-semibold leading-[0.92] tracking-[-0.062em] text-white md:text-[5rem] lg:text-[5.35rem]"
                    >
                      {result.report.domainTitle}
                    </h1>
                    <p className="sonartra-report-body-soft text-white/52 max-w-[48ch] text-[0.92rem] leading-7 md:text-[0.98rem]">
                      {result.readingSections.sectionsById.intro?.intentPrompt}
                    </p>
                  </div>

                  <aside className="self-start lg:justify-self-end">
                    <MetadataCard items={result.metadataItems} pairLabel={result.pairLabel} />
                  </aside>
                </div>

                <div className="max-w-[58rem] space-y-5 md:space-y-6">
                  {introSection.paragraphs[0] ? (
                    <p className="sonartra-report-summary text-white/82 max-w-[55rem] text-[1.05rem] leading-8 md:text-[1.12rem] md:leading-9">
                      {introSection.paragraphs[0]}
                    </p>
                  ) : null}

                  <div className="sonartra-single-domain-intro-copy-grid">
                    {introSection.paragraphs.slice(1).map((paragraph) => (
                      <p
                        key={`intro-${paragraph}`}
                        className="sonartra-report-body text-white/68 max-w-[33rem] text-[0.98rem] leading-8 md:text-[1rem] md:leading-8"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </header>
            ) : null}

            <ResultReadingProgress
              className="max-w-[92rem] px-1 md:px-2 xl:hidden"
              sectionsConfig={result.readingSections}
            />

            {remainingSections.map((section, index) => (
              <SingleDomainResultSection
                key={section.key}
                section={section}
                sectionsConfig={result.readingSections}
                step={index + 1}
              />
            ))}
          </div>

          <ResultReadingRail sectionsConfig={result.readingSections} />
        </div>
      </article>
    </PageFrame>
  );
}
