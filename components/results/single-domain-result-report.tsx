import { ResultReadingProgress } from '@/components/results/result-reading-progress';
import { ResultReadingRail } from '@/components/results/result-reading-rail';
import { SingleDomainResultSection } from '@/components/results/single-domain-result-section';
import { PageFrame } from '@/components/shared/user-app-ui';
import type { SingleDomainResultsViewModel } from '@/lib/server/single-domain-results-view-model';

function MetadataCard({ items }: { items: SingleDomainResultsViewModel['metadataItems'] }) {
  return (
    <dl className="sonartra-single-domain-surface sonartra-single-domain-meta overflow-hidden rounded-[1.3rem] border">
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`} className="space-y-1 px-4 py-3.5">
          <dt className="sonartra-report-kicker text-white/38">{item.label}</dt>
          <dd className="sonartra-report-body text-white/78 text-[0.98rem]">{item.value}</dd>
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
        <div className="relative xl:mx-auto xl:grid xl:max-w-[114rem] xl:grid-cols-[minmax(0,1fr)_minmax(11.25rem,12.5rem)] xl:gap-8 2xl:gap-10">
          <div className="min-w-0 max-w-none space-y-12 md:space-y-16 xl:pr-4">
            {introSection ? (
              <header
                id={introSection.key}
                aria-labelledby={`${introSection.key}-heading`}
                className="results-anchor-target sonartra-motion-reveal sonartra-single-domain-section space-y-8 md:space-y-10"
              >
                <div className="border-white/6 grid gap-8 border-b pb-8 md:gap-10 md:pb-10 lg:grid-cols-[minmax(0,1.12fr)_minmax(15rem,18rem)]">
                  <div className="max-w-[56rem] space-y-5 md:space-y-7">
                    <div className="space-y-3">
                      <p className="sonartra-report-kicker">{result.assessmentTitle}</p>
                      <p className="text-white/34 max-w-[18rem] text-[0.73rem] font-medium uppercase tracking-[0.16em]">
                        Single-domain report
                      </p>
                    </div>
                    <h1
                      id={`${introSection.key}-heading`}
                      className="max-w-[11ch] text-[3.2rem] font-semibold leading-[0.93] tracking-[-0.06em] text-white md:text-[4.7rem]"
                    >
                      {result.report.domainTitle}
                    </h1>
                    <p className="sonartra-report-body-soft text-white/56 max-w-[56ch] text-[0.94rem] leading-7 md:text-[0.98rem]">
                      {result.readingSections.sectionsById.intro?.intentPrompt}
                    </p>
                  </div>

                  <aside className="space-y-4 self-end lg:justify-self-end">
                    <MetadataCard items={result.metadataItems} />
                    <div className="border-white/7 sonartra-single-domain-surface-muted rounded-[1.3rem] border px-4 py-4">
                      <p className="sonartra-report-kicker">Leading pair</p>
                      <p className="text-white/78 mt-2 text-[1rem] font-medium leading-7">
                        {result.pairLabel}
                      </p>
                    </div>
                  </aside>
                </div>

                <div className="grid gap-7 md:grid-cols-[minmax(0,1fr)_15rem] md:gap-10">
                  <div className="max-w-[57rem] space-y-4 md:space-y-5">
                    {introSection.paragraphs.map((paragraph, index) => (
                      <p
                        key={`intro-${index + 1}`}
                        className={
                          index === 0
                            ? 'sonartra-report-summary text-white/82 max-w-[55rem] text-[1.06rem] leading-8 md:text-[1.12rem] md:leading-9'
                            : 'sonartra-report-body text-white/72 max-w-[54rem] text-[1rem] leading-8 md:text-[1.04rem] md:leading-9'
                        }
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  <div className="hidden md:block md:pt-1">
                    <div className="border-white/7 max-w-[15rem] border-l pl-5">
                      <p className="text-[0.68rem] font-medium uppercase tracking-[0.15em] text-white/30">
                        Reading flow
                      </p>
                      <p className="text-white/52 mt-2 text-[0.88rem] leading-7">
                        Intro first, then move into the dominant pattern, its drivers, the pair
                        dynamic, the tension point, and finally the practical application.
                      </p>
                    </div>
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
