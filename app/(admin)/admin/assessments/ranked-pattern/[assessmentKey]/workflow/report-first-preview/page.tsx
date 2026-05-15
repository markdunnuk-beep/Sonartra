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
import { rankedPatternSupportedScoreShapes } from '@/content/assessment-packages/import-contract/ranked-pattern-import-manifest';
import {
  adminReportFirstRequiredPreviewHeadings,
  buildAdminReportFirstPreview,
  type AdminReportFirstPreviewReview,
} from '@/lib/server/admin-report-first-preview';
import { getSingleDomainBuilderAssessment } from '@/lib/server/admin-single-domain-builder';
import { getDbPool } from '@/lib/server/db';
import { isRankedPatternPackageCompatibleAssessment } from '@/lib/ranked-pattern-admin-compatibility';

function ReviewCheck({
  label,
  passed,
}: Readonly<{
  label: string;
  passed: boolean;
}>) {
  return (
    <div className="rounded-[0.85rem] border border-white/8 bg-white/[0.035] px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/46">
        {passed ? 'Passed' : 'Needs review'}
      </p>
      <p className="mt-1 text-sm text-white/82">{label}</p>
    </div>
  );
}

function ReviewSummary({ review }: Readonly<{ review: AdminReportFirstPreviewReview }>) {
  return (
    <SurfaceCard accent className="space-y-5 p-5 lg:p-6" data-admin-report-first-preview-summary="true">
      <div className="flex flex-wrap items-center gap-2">
        <LabelPill>Admin preview only</LabelPill>
        <LabelPill className="border-[rgba(116,209,177,0.22)] bg-[rgba(116,209,177,0.1)] text-[rgba(214,246,233,0.86)]">
          Assembly passed
        </LabelPill>
      </div>
      <div className="space-y-2">
        <CardTitle>Report-first review summary</CardTitle>
        <SecondaryText>
          This summary verifies the preview payload before the report shell below renders it. The
          paid-user report area uses the same report-first renderer and keeps diagnostics out of the
          reader experience.
        </SecondaryText>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetaItem label="Report key" value={review.reportKey} />
        <MetaItem label="Signal order" value={review.signalOrderLabel} />
        <MetaItem label="Score shape" value={review.scoreShape} />
        <MetaItem label="Source status" value={review.sourceStatus} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <ReviewCheck label="Full report body present" passed={review.fullBodyPresent} />
        <ReviewCheck label="Required headings present" passed={review.requiredHeadingsPresent} />
        <ReviewCheck label="Evidence can be rendered" passed={review.evidenceRenderable} />
        <ReviewCheck label="Reader area avoids internal labels" passed={review.readerInternalLabelsAbsent} />
        <ReviewCheck label="Preview assembly completed" passed={review.previewAssemblyPassed} />
        <ReviewCheck label="Canonical section coverage checked" passed={review.missingHeadings.length === 0} />
      </div>
      {review.missingHeadings.length > 0 || review.forbiddenLabels.length > 0 ? (
        <div className="rounded-[1rem] border border-[rgba(255,184,107,0.24)] bg-[rgba(255,184,107,0.09)] p-4 text-sm leading-6 text-[rgba(255,238,210,0.88)]">
          {review.missingHeadings.length > 0 ? (
            <p>Missing headings: {review.missingHeadings.join(', ')}</p>
          ) : null}
          {review.forbiddenLabels.length > 0 ? (
            <p>Internal labels found in report body: {review.forbiddenLabels.join(', ')}</p>
          ) : null}
        </div>
      ) : null}
    </SurfaceCard>
  );
}

export default async function ReportFirstAdminPreviewPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ assessmentKey: string }>;
  searchParams: Promise<{ pattern?: string; scoreShape?: string }>;
}>) {
  const { assessmentKey } = await params;
  const query = await searchParams;
  const { assessment, redirectTo } = await getSingleDomainBuilderAssessment(getDbPool(), assessmentKey);

  if (redirectTo) {
    redirect(redirectTo);
  }

  if (!assessment) {
    notFound();
  }

  if (
    !isRankedPatternPackageCompatibleAssessment({
      assessmentKey: assessment.assessmentKey,
      title: assessment.title,
      mode: 'single_domain',
      isActive: true,
    })
  ) {
    return (
      <PageFrame className="relative z-20 space-y-8">
        <PageHeader
          eyebrow="Report-first admin preview"
          title="Preview unavailable for this assessment"
          description="Report-first preview is available only for compatible ranked-pattern assessment records."
        />
        <ButtonLink href="/admin/assessments/ranked-pattern/workflow" variant="primary">
          Back to package workflow
        </ButtonLink>
      </PageFrame>
    );
  }

  const preview = await buildAdminReportFirstPreview({
    assessmentKey: assessment.assessmentKey,
    assessmentTitle: assessment.title,
    assessmentVersionId: assessment.latestDraftVersion?.assessmentVersionId ?? assessment.publishedVersion?.assessmentVersionId ?? null,
    assessmentVersionTag: assessment.latestDraftVersion?.versionTag ?? assessment.publishedVersion?.versionTag ?? null,
    patternKey: query.pattern,
    scoreShape: query.scoreShape,
  });

  const selectedPattern = preview.status === 'ready'
    ? preview.payload.patternKey
    : preview.selectedPatternKey || preview.options[0]?.patternKey || '';
  const selectedScoreShape = preview.status === 'ready'
    ? preview.payload.scoreShape.value
    : query.scoreShape || 'paired';

  return (
    <>
      <div className="relative z-[80]">
        <PageFrame className="space-y-8">
          <PageHeader
            eyebrow="Report-first admin preview"
            title="Review report-first template output"
            description="Assemble an admin-only preview payload for a selected ranked pattern and score shape, then render it with the production report-first report shell."
          />

        <SurfaceCard className="space-y-5 p-5 lg:p-6" data-admin-report-first-preview="true">
          <div className="flex flex-wrap items-center gap-2">
            <LabelPill>{assessment.assessmentKey}</LabelPill>
            <LabelPill>Preview assembly only</LabelPill>
            <LabelPill className="border-white/10 bg-white/[0.04] text-white/68">
              Does not create user results
            </LabelPill>
          </div>
          <div className="space-y-2">
            <CardTitle>Preview controls</CardTitle>
            <SecondaryText>
              Choose the available report-first template and score shape to review how the full
              compiled report body will read in the production report shell.
            </SecondaryText>
          </div>
          <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem_auto]" method="get">
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
            <label className="space-y-2">
              <span className="sonartra-meta-label">Score shape</span>
              <select
                className="w-full rounded-[0.85rem] border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/86 outline-none focus:border-[rgba(50,214,176,0.45)]"
                defaultValue={selectedScoreShape}
                name="scoreShape"
              >
                {rankedPatternSupportedScoreShapes.map((shape) => (
                  <option key={shape} value={shape}>
                    {shape}
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
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={`/admin/assessments/ranked-pattern/${assessment.assessmentKey}/workflow`}>
              Back to workflow
            </ButtonLink>
          </div>
        </SurfaceCard>

        {preview.status === 'error' ? (
          <SurfaceCard
            accent
            className="space-y-4 border-[rgba(255,184,107,0.24)] bg-[rgba(255,184,107,0.08)] p-5 lg:p-6"
            data-admin-report-first-preview-error="true"
          >
            <div className="space-y-2">
              <CardTitle>Preview cannot be assembled</CardTitle>
              <SecondaryText>{preview.message}</SecondaryText>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <MetaItem label="Finding code" value={preview.code} />
              <MetaItem label="Selected signal order" value={preview.selectedPatternKey || 'None'} />
            </div>
          </SurfaceCard>
        ) : (
          <>
            <ReviewSummary review={preview.review} />
            <SurfaceCard muted className="space-y-3 p-5 lg:p-6">
              <CardTitle>Preview boundaries</CardTitle>
              <SecondaryText>
                The report below is assembled only for admin review. It does not write a result, does
                not publish the assessment, and does not change user result retrieval. Required
                heading coverage checked: {adminReportFirstRequiredPreviewHeadings.length} sections.
              </SecondaryText>
            </SurfaceCard>
          </>
        )}
        </PageFrame>
      </div>

      {preview.status === 'ready' ? <ReportFirstResultReport payload={preview.payload} /> : null}
    </>
  );
}
