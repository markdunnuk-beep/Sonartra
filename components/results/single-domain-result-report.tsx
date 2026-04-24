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
    { label: 'Leading pair', value: pairLabel },
  ] as const;

  return (
    <dl aria-label="Report details" className="sonartra-single-domain-meta-strip">
      {detailItems.map((item) => (
        <div key={`${item.label}-${item.value}`} className="sonartra-single-domain-meta-strip-item">
          <dt className="sonartra-report-kicker">{item.label}</dt>
          <dd className="sonartra-single-domain-meta-strip-value">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function SingleDomainResultReport({ result }: { result: SingleDomainResultsViewModel }) {
  const introSection = result.report.sections.find((section) => section.key === 'intro');
  const heroSection = result.report.sections.find((section) => section.key === 'hero');
  const remainingSections = result.report.sections.filter(
    (section) => section.key !== 'intro' && section.key !== 'hero',
  );

  return (
    <PageFrame className="space-y-9 md:space-y-11">
      <article className="sonartra-single-domain-report relative isolate">
        <div className="relative xl:mx-auto xl:grid xl:max-w-[114rem] xl:grid-cols-[minmax(0,1fr)_minmax(11rem,12.25rem)] xl:gap-8 2xl:gap-10">
          <div className="sonartra-single-domain-report-flow min-w-0 max-w-none xl:pr-6">
            {introSection ? (
              <header
                id={introSection.key}
                aria-labelledby={`${introSection.key}-heading`}
                className="results-anchor-target sonartra-motion-reveal sonartra-single-domain-section sonartra-single-domain-intro space-y-6 md:space-y-7"
              >
                <div className="max-w-[58rem] space-y-5 md:space-y-6">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <p className="sonartra-report-kicker">{result.assessmentTitle}</p>
                  </div>

                  <MetadataCard items={result.metadataItems} pairLabel={result.pairLabel} />

                  <div className="space-y-3.5 md:space-y-4">
                    <h1
                      id={`${introSection.key}-heading`}
                      className="max-w-[15.5ch] text-[clamp(2.45rem,11vw,3.3rem)] font-semibold leading-[0.95] tracking-[-0.058em] text-white md:max-w-[16.5ch] md:text-[clamp(3.35rem,6vw,4.25rem)] lg:max-w-[17ch]"
                    >
                      {result.report.domainTitle}
                    </h1>
                    <p className="sonartra-single-domain-intro-subtitle sonartra-report-body-soft max-w-[54ch] text-[0.98rem] leading-7 md:text-[1.04rem] md:leading-8">
                      {result.readingSections.sectionsById.intro?.intentPrompt}
                    </p>
                  </div>
                </div>

                <div className="max-w-[58rem] space-y-4 md:space-y-5">
                  {introSection.paragraphs[0] ? (
                    <p className="sonartra-report-summary max-w-[54rem] text-[1rem] leading-8 text-white/80 md:text-[1.06rem] md:leading-9">
                      {introSection.paragraphs[0]}
                    </p>
                  ) : null}

                  <div className="sonartra-single-domain-intro-copy-grid">
                    {introSection.paragraphs.slice(1, 3).map((paragraph) => (
                      <p
                        key={`intro-${paragraph}`}
                        className="sonartra-report-body max-w-[42rem] text-[0.95rem] leading-7 text-white/68 md:text-[0.98rem] md:leading-8 xl:max-w-[31rem]"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </header>
            ) : null}

            {heroSection ? (
              <SingleDomainResultSection
                section={heroSection}
                sectionsConfig={result.readingSections}
                step={1}
              />
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
                step={index + 2}
              />
            ))}
          </div>

          <ResultReadingRail sectionsConfig={result.readingSections} />
        </div>
      </article>
    </PageFrame>
  );
}
