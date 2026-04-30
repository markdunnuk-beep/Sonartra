import { ResultReadingProgress } from '@/components/results/result-reading-progress';
import { ResultReadingRail } from '@/components/results/result-reading-rail';
import { ResultSectionNavigation } from '@/components/results/result-section-navigation';
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
  const versionItem = items.find((item) => item.label.toLowerCase() === 'version');
  const detailItems = [
    ...items.filter((item) => item.label.toLowerCase() !== 'version'),
    { label: 'Leading pair', value: pairLabel },
  ] as const;

  return (
    <div className="sonartra-single-domain-meta-block">
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
      {versionItem ? (
        <p className="sonartra-single-domain-version-note">
          Report version {versionItem.value}
        </p>
      ) : null}
    </div>
  );
}

function OpeningEvidencePanel({
  lead,
  proofItems,
  items,
}: {
  lead: SingleDomainResultsViewModel['openingSummary']['evidenceLead'];
  proofItems: SingleDomainResultsViewModel['openingSummary']['proofItems'];
  items: SingleDomainResultsViewModel['openingSummary']['evidenceItems'];
}) {
  const headlineProofItems = proofItems.slice(0, 2);
  const supportingProofItems = proofItems.slice(2);

  return (
    <aside className="sonartra-single-domain-evidence-panel" aria-label="Result basis">
      <div className="sonartra-single-domain-evidence-panel-header">
        <p className="sonartra-report-kicker">Result basis</p>
        <p className="sonartra-single-domain-evidence-panel-note">
          {lead}
        </p>
      </div>

      <div className="sonartra-single-domain-proof-grid" aria-label="Headline signal evidence">
        {headlineProofItems.map((item) => (
          <div key={`${item.label}-${item.value}`} className="sonartra-single-domain-proof-item">
            <div>
              <p className="sonartra-single-domain-proof-label">{item.label}</p>
              <p className="sonartra-single-domain-proof-value">{item.value}</p>
            </div>
            {item.scoreLabel ? (
              <span className="sonartra-single-domain-proof-score">{item.scoreLabel}</span>
            ) : null}
            <p className="sonartra-single-domain-proof-detail">{item.detail}</p>
          </div>
        ))}
      </div>

      <details className="sonartra-single-domain-evidence-details">
        <summary>
          <span>View full evidence</span>
        </summary>
        <div className="sonartra-single-domain-evidence-details-body">
          {supportingProofItems.length > 0 ? (
            <div className="sonartra-single-domain-proof-grid" aria-label="Full signal rank evidence">
              {supportingProofItems.map((item) => (
                <div key={`${item.label}-${item.value}`} className="sonartra-single-domain-proof-item">
                  <div>
                    <p className="sonartra-single-domain-proof-label">{item.label}</p>
                    <p className="sonartra-single-domain-proof-value">{item.value}</p>
                  </div>
                  {item.scoreLabel ? (
                    <span className="sonartra-single-domain-proof-score">{item.scoreLabel}</span>
                  ) : null}
                  <p className="sonartra-single-domain-proof-detail">{item.detail}</p>
                </div>
              ))}
            </div>
          ) : null}

          <dl className="sonartra-single-domain-evidence-list">
            {items.map((item) => (
              <div key={`${item.label}-${item.value}`} className="sonartra-single-domain-evidence-item">
                <dt>{item.label}</dt>
                <dd>
                  <strong>{item.value}</strong>
                  {item.detail ? <span>{item.detail}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </details>
    </aside>
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
            meta={
              <>
                <MetadataCard items={result.metadataItems} pairLabel={result.pairLabel} />
                <ResultSectionNavigation sectionsConfig={result.readingSections} />
              </>
            }
            title={result.openingSummary.title}
            lead={
              <p className="sonartra-single-domain-intro-subtitle sonartra-single-domain-opening-lead">
                {result.openingSummary.diagnosis}
              </p>
            }
            className="sonartra-single-domain-intro"
            contentClassName="sonartra-single-domain-opening-content"
          >
            <div className="sonartra-single-domain-opening-grid">
              <div className="sonartra-single-domain-opening-narrative">
                <p className="sonartra-report-summary text-white/78">
                  {result.openingSummary.implication}
                </p>

                <div className="sonartra-single-domain-intro-copy-grid">
                  {introSection.paragraphs.slice(1, 3).map((paragraph) => (
                    <p
                      key={`intro-${paragraph}`}
                      className="sonartra-report-body text-white/58"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>

              <OpeningEvidencePanel
                lead={result.openingSummary.evidenceLead}
                proofItems={result.openingSummary.proofItems}
                items={result.openingSummary.evidenceItems}
              />
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
