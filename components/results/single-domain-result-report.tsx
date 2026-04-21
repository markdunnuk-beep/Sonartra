import { ResultReadingProgress } from '@/components/results/result-reading-progress';
import { ResultReadingRail } from '@/components/results/result-reading-rail';
import { SingleDomainResultSection } from '@/components/results/single-domain-result-section';
import { PageFrame } from '@/components/shared/user-app-ui';
import type { SingleDomainResultsViewModel } from '@/lib/server/single-domain-results-view-model';

function MetadataCard({
  items,
}: {
  items: SingleDomainResultsViewModel['metadataItems'];
}) {
  return (
    <div className="space-y-3 rounded-[1.4rem] border border-white/7 bg-white/[0.02] px-4 py-4">
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`} className="space-y-1">
          <p className="sonartra-report-kicker text-white/40">{item.label}</p>
          <p className="sonartra-report-body-soft text-white/70">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export function SingleDomainResultReport({
  result,
}: {
  result: SingleDomainResultsViewModel;
}) {
  const introSection = result.report.sections.find((section) => section.key === 'intro');
  const remainingSections = result.report.sections.filter((section) => section.key !== 'intro');

  return (
    <PageFrame className="space-y-10 md:space-y-12">
      <div className="xl:mx-auto xl:grid xl:max-w-[114rem] xl:grid-cols-[minmax(0,1fr)_minmax(10.75rem,12.25rem)] xl:gap-7 2xl:gap-9">
        <div className="min-w-0 max-w-none space-y-10 md:space-y-12">
          {introSection ? (
            <section
              id={introSection.key}
              aria-labelledby={`${introSection.key}-heading`}
              className="results-anchor-target sonartra-motion-reveal space-y-7 md:space-y-8"
            >
              <div className="max-w-[52rem] space-y-5 md:space-y-6">
                <p className="sonartra-report-kicker">{result.assessmentTitle}</p>
                <h1
                  id={`${introSection.key}-heading`}
                  className="max-w-[12ch] text-[3rem] font-semibold tracking-[-0.055em] text-white md:text-[4.3rem]"
                >
                  {result.report.domainTitle}
                </h1>
                <p className="sonartra-report-body-soft max-w-[56ch] text-[0.94rem] leading-7 text-white/56 md:text-[0.98rem]">
                  {result.readingSections.sectionsById.intro?.intentPrompt}
                </p>
              </div>

              <div className="grid gap-7 border-t border-white/6 pt-7 md:grid-cols-[minmax(0,1fr)_13.5rem] md:gap-10">
                <div className="space-y-4 md:space-y-5">
                  {introSection.paragraphs.map((paragraph, index) => (
                    <p
                      key={`intro-${index + 1}`}
                      className={index === 0
                        ? 'sonartra-report-summary max-w-[56rem] text-white/80'
                        : 'sonartra-report-body max-w-[54rem] text-[1rem] leading-8 text-white/76 md:text-[1.04rem] md:leading-9'}
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>

                <div className="space-y-5 md:pt-1">
                  <MetadataCard items={result.metadataItems} />
                  <div className="max-w-[18rem] space-y-1.5">
                    <p className="sonartra-report-kicker">Leading pair</p>
                    <p className="sonartra-report-body-soft">{result.pairLabel}</p>
                  </div>
                </div>
              </div>
            </section>
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
    </PageFrame>
  );
}
