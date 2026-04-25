import { ResultReadingProgress } from '@/components/results/result-reading-progress';
import { ResultReadingRail } from '@/components/results/result-reading-rail';
import { ReportHeader } from '@/components/results/report-chapter';
import { ReportBody, ReportShell } from '@/components/results/report-shell';
import { SingleDomainResultSection } from '@/components/results/single-domain-result-section';
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
    <ReportShell rail={<ResultReadingRail sectionsConfig={result.readingSections} />}>
      <ReportBody className="sonartra-single-domain-report-flow">
        {introSection ? (
          <ReportHeader
            id={introSection.key}
            titleId={`${introSection.key}-heading`}
            eyebrow={result.assessmentTitle}
            meta={<MetadataCard items={result.metadataItems} pairLabel={result.pairLabel} />}
            title={result.report.domainTitle}
            lead={
              <p className="sonartra-single-domain-intro-subtitle">
                {result.readingSections.sectionsById.intro?.intentPrompt}
              </p>
            }
            className="sonartra-single-domain-intro"
          >
            <div className="sonartra-report-reading-measure space-y-4 md:space-y-5">
              {introSection.paragraphs[0] ? (
                <p className="sonartra-report-summary text-white/80">
                  {introSection.paragraphs[0]}
                </p>
              ) : null}

              <div className="sonartra-single-domain-intro-copy-grid">
                {introSection.paragraphs.slice(1, 3).map((paragraph) => (
                  <p
                    key={`intro-${paragraph}`}
                    className="sonartra-report-body text-white/68"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </ReportHeader>
        ) : null}

        {heroSection ? (
          <SingleDomainResultSection
            section={heroSection}
            sectionsConfig={result.readingSections}
            step={1}
          />
        ) : null}

        <ResultReadingProgress
          className="max-w-[72rem] px-1 md:px-2 xl:hidden"
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
      </ReportBody>
    </ReportShell>
  );
}
