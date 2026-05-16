import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { ReportFirstResultReport } from '@/components/results/report-first-result-report';
import {
  ButtonLink,
  CardTitle,
  LabelPill,
  MetaItem,
  PageFrame,
  PageHeader,
  SecondaryText,
  SurfaceCard,
} from '@/components/shared/user-app-ui';
import {
  adminReportFirstRequiredPreviewHeadings,
  buildAdminReportFirstPreview,
} from '@/lib/server/admin-report-first-preview';
import {
  getGeneratedLeadershipReportFirstImportArtifact,
  type LeadershipReportFirstImportArtifact,
} from '@/lib/server/leadership-report-first-package';
import { getSingleDomainBuilderAssessment } from '@/lib/server/admin-single-domain-builder';
import { getDbPool } from '@/lib/server/db';

export const metadata: Metadata = {
  title: 'Report-first QA Preview | Sonartra Admin',
  robots: {
    index: false,
    follow: false,
  },
};

function sourceLabel(sourceStatus: string): string {
  if (sourceStatus.toLowerCase().includes('imported draft')) {
    return 'Imported draft storage';
  }

  return 'Generated package artifact';
}

function loadGeneratedArtifactForQa(): LeadershipReportFirstImportArtifact | null {
  try {
    return getGeneratedLeadershipReportFirstImportArtifact();
  } catch {
    return null;
  }
}

export default async function ReportFirstQaRoutePage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ pattern?: string }>;
}>) {
  const query = await searchParams;
  const db = getDbPool();
  const [{ assessment, redirectTo }, artifact] = await Promise.all([
    getSingleDomainBuilderAssessment(db, 'leadership-approach'),
    Promise.resolve(loadGeneratedArtifactForQa()),
  ]);

  if (redirectTo) {
    redirect(redirectTo);
  }

  if (!assessment) {
    notFound();
  }

  const preview = await buildAdminReportFirstPreview({
    assessmentKey: assessment.assessmentKey,
    assessmentTitle: assessment.title,
    assessmentVersionId: assessment.latestDraftVersion?.assessmentVersionId ?? assessment.publishedVersion?.assessmentVersionId ?? null,
    assessmentVersionTag: assessment.latestDraftVersion?.versionTag ?? assessment.publishedVersion?.versionTag ?? null,
    patternKey: query.pattern,
    scoreShape: 'paired',
  });
  const selectedPattern = preview.status === 'ready'
    ? preview.payload.patternKey
    : preview.selectedPatternKey || preview.options[0]?.patternKey || '';
  const sourceStatus = preview.status === 'ready'
    ? sourceLabel(preview.review.sourceStatus)
    : 'Unavailable for selected template';

  return (
    <>
      <div className="relative z-[80]">
        <PageFrame className="space-y-8">
          <PageHeader
            eyebrow="Admin QA"
            title="Report-first QA preview"
            description="Production-accessible admin QA route for testing the report-first reading experience without publishing an assessment or creating user results."
          />

          <SurfaceCard
            accent
            className="space-y-5 border-[rgba(255,184,107,0.24)] bg-[rgba(255,184,107,0.08)] p-5 lg:p-6"
            data-report-first-qa-banner="true"
          >
            <div className="flex flex-wrap items-center gap-2">
              <LabelPill className="border-[rgba(255,184,107,0.24)] bg-[rgba(255,184,107,0.1)] text-[rgba(255,231,196,0.94)]">
                Internal QA preview
              </LabelPill>
              <LabelPill>Not a live user result</LabelPill>
              <LabelPill>No result mutation</LabelPill>
            </div>
            <div className="space-y-2">
              <CardTitle>Internal QA preview - not a live user result</CardTitle>
              <SecondaryText>
                Use this route to test the full report-first renderer on real devices. It reads
                available report-first template data for preview only and keeps publish blocked until
                all twenty-four templates exist.
              </SecondaryText>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <MetaItem label="Assessment" value={assessment.title} />
              <MetaItem label="Template" value={selectedPattern || 'Unavailable'} />
              <MetaItem label="Source" value={sourceStatus} />
              <MetaItem
                label="Coverage"
                value={
                  artifact
                    ? `${artifact.coverage.generated_import_ready_count} of ${artifact.coverage.expected_template_count} available`
                    : 'Unavailable'
                }
              />
              <MetaItem label="Publish status" value="Blocked" />
              <MetaItem label="Score-shape policy" value="Pattern-level, score-shape neutral" />
            </div>
          </SurfaceCard>

          <SurfaceCard className="space-y-5 p-5 lg:p-6" data-report-first-qa-controls="true">
            <div className="space-y-2">
              <CardTitle>QA controls</CardTitle>
              <SecondaryText>
                Select one of the currently available Leadership Approach report-first templates.
                Preview selection is driven by signal order only.
              </SecondaryText>
            </div>
            <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]" method="get">
              <label className="space-y-2">
                <span className="sonartra-meta-label">Signal order</span>
                <select
                  className="w-full rounded-[0.85rem] border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/86 outline-none focus:border-[rgba(50,214,176,0.45)]"
                  defaultValue={selectedPattern}
                  name="pattern"
                >
                  {preview.options.map((option) => (
                    <option key={option.patternKey} value={option.patternKey}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <button className="sonartra-button sonartra-button-primary sonartra-focus-ring w-full justify-center" type="submit">
                  Preview report
                </button>
              </div>
            </form>
            <div className="grid gap-3 lg:grid-cols-[18rem_minmax(0,1fr)]">
              <MetaItem label="Score-shape policy" value="Pattern-level, score-shape neutral" />
              <SecondaryText>
                This report-first template does not vary by score shape. Score shape remains part
                of runtime scoring evidence, but it does not select different report prose for this
                template set.
              </SecondaryText>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/admin/assessments/ranked-pattern/leadership-approach/workflow">
                Back to workflow
              </ButtonLink>
            </div>
          </SurfaceCard>

          {preview.status === 'error' ? (
            <SurfaceCard
              accent
              className="space-y-4 border-[rgba(255,184,107,0.24)] bg-[rgba(255,184,107,0.08)] p-5 lg:p-6"
              data-report-first-qa-error="true"
            >
              <div className="space-y-2">
                <CardTitle>QA preview cannot be assembled</CardTitle>
                <SecondaryText>{preview.message}</SecondaryText>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <MetaItem label="Finding code" value={preview.code} />
                <MetaItem label="Selected signal order" value={preview.selectedPatternKey || 'None'} />
              </div>
              {preview.sourceAttempts && preview.sourceAttempts.length > 0 ? (
                <SecondaryText>
                  Source attempted: {preview.sourceAttempts.join(' / ')}. Publish remains blocked
                  until all report-first templates are available.
                </SecondaryText>
              ) : null}
            </SurfaceCard>
          ) : (
            <SurfaceCard muted className="space-y-3 p-5 lg:p-6" data-report-first-qa-boundaries="true">
              <CardTitle>QA boundaries</CardTitle>
              <SecondaryText>
                This page renders the production report-first report shell for admin QA only. It
                does not create a result, persist a canonical payload, publish an assessment, or
                change user result retrieval. Required heading coverage checked:{' '}
                {adminReportFirstRequiredPreviewHeadings.length} sections.
              </SecondaryText>
            </SurfaceCard>
          )}
        </PageFrame>
      </div>

      {preview.status === 'ready' ? <ReportFirstResultReport payload={preview.payload} /> : null}
    </>
  );
}
