import { notFound, redirect } from 'next/navigation';

import { RankedPatternImportPanel } from '@/components/admin/ranked-pattern-import-panel';
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
import { getSingleDomainBuilderAssessment } from '@/lib/server/admin-single-domain-builder';
import { getDbPool } from '@/lib/server/db';
import { buildLeadershipReportFirstImportArtifact } from '@/lib/server/leadership-report-first-package';
import { auditImportedReportFirstTemplateCoverage } from '@/lib/server/report-first-template-import';
import { isRankedPatternPackageCompatibleAssessment } from '@/lib/ranked-pattern-admin-compatibility';

function AdminReportFirstBlockingCopy({
  importedCount,
  missingCount,
}: Readonly<{
  importedCount: number;
  missingCount: number;
}>) {
  return (
    <div className="rounded-[1rem] border border-[rgba(255,184,107,0.2)] bg-[rgba(255,184,107,0.08)] px-4 py-3">
      <p className="text-sm font-medium text-[rgba(255,235,204,0.92)]">
        Report-first publish coverage remains blocked
      </p>
      <p className="mt-1 text-sm leading-6 text-[rgba(255,235,204,0.68)]">
        {importedCount} report-first templates are present in draft storage. {missingCount} required
        ranked-pattern templates are still missing, so publish audit must continue to block
        report-first readiness.
      </p>
    </div>
  );
}

export default async function RankedPatternWorkflowPage({
  params,
}: Readonly<{
  params: Promise<{ assessmentKey: string }>;
}>) {
  const { assessmentKey } = await params;
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
      <PageFrame className="space-y-8">
        <PageHeader
          eyebrow="Ranked-pattern admin"
          title="Legacy assessment record"
          description="This keyed workflow is available only for compatible ranked-pattern package assessments."
        />

        <SurfaceCard accent className="space-y-5 p-5 lg:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <LabelPill>{assessment.assessmentKey}</LabelPill>
            <LabelPill className="border-[rgba(255,210,143,0.22)] bg-[rgba(78,48,6,0.24)] text-[rgba(255,234,196,0.94)]">
              Legacy / incompatible
            </LabelPill>
          </div>
          <div className="space-y-2">
            <CardTitle>{assessment.title}</CardTitle>
            <SecondaryText>
              This assessment key belongs to a legacy or test builder record. Ranked-pattern package
              import will not attach workbook metadata to it silently.
            </SecondaryText>
            <SecondaryText>
              Start from the package-first workflow and use the assessment_key declared in the
              workbook metadata, or archive the legacy record before reusing the key.
            </SecondaryText>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/admin/assessments/ranked-pattern/workflow" variant="primary">
              Start package-first workflow
            </ButtonLink>
            <ButtonLink href="/admin/assessments">
              Back to assessments
            </ButtonLink>
          </div>
        </SurfaceCard>
      </PageFrame>
    );
  }

  const reportFirstArtifact = await buildLeadershipReportFirstImportArtifact();
  const reportFirstDraftCoverage = assessment.latestDraftVersion
    ? await auditImportedReportFirstTemplateCoverage({
        db: getDbPool(),
        assessmentVersionId: assessment.latestDraftVersion.assessmentVersionId,
        status: 'draft',
      })
    : null;

  return (
    <PageFrame className="space-y-8">
      <PageHeader
        eyebrow="Ranked-pattern admin"
        title="Ranked-pattern package workflow"
        description="Create or select a draft version, audit and dry-run the package, apply package data to draft only, run publish audit, and explicitly publish once blocking findings are clear."
      />

      <SurfaceCard accent className="space-y-5 p-5 lg:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <LabelPill>{assessment.assessmentKey}</LabelPill>
          <LabelPill className="border-[rgba(116,209,177,0.22)] bg-[rgba(116,209,177,0.1)] text-[rgba(214,246,233,0.86)]">
            Active ranked-pattern workflow
          </LabelPill>
          <LabelPill className="border-white/10 bg-white/[0.04] text-white/68">
            {assessment.latestDraftVersion
              ? `Draft ${assessment.latestDraftVersion.versionTag}`
              : assessment.publishedVersion
                ? `Published ${assessment.publishedVersion.versionTag}`
                : 'No version context'}
          </LabelPill>
        </div>

        <div className="space-y-2">
          <CardTitle>{assessment.title}</CardTitle>
          <SecondaryText>
            This page is dedicated to the ranked-pattern package workflow. It does not include the
            legacy single-domain builder stages, readiness cards, or generic publish controls.
          </SecondaryText>
          <SecondaryText>
            Publishing affects new attempts only. Existing completed results remain tied to their
            original assessment version and persisted canonical result payload.
          </SecondaryText>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetaItem
            label="Current live version"
            value={assessment.publishedVersion?.versionTag ?? 'None'}
          />
          <MetaItem
            label="Editable draft"
            value={assessment.latestDraftVersion?.versionTag ?? 'Create from published'}
          />
          <MetaItem label="Assessment id" value={assessment.assessmentId} />
          <MetaItem
            label="Draft version id"
            value={assessment.latestDraftVersion?.assessmentVersionId ?? 'Create a draft first'}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/admin/assessments/single-domain">
            Back to workflow selector
          </ButtonLink>
          <ButtonLink href="/admin/assessments/ranked-pattern/workflow">
            Start package-first workflow
          </ButtonLink>
          <ButtonLink
            href={`/admin/assessments/ranked-pattern/${assessment.assessmentKey}/workflow/report-first-preview`}
            variant="primary"
          >
            Preview report-first output
          </ButtonLink>
          <ButtonLink href={`/admin/assessments/single-domain/${assessment.assessmentKey}/review`}>
            Open legacy builder review
          </ButtonLink>
        </div>
      </SurfaceCard>

      <SurfaceCard className="space-y-5 p-5 lg:p-6" data-report-first-import-status="true">
        <div className="flex flex-wrap items-center gap-2">
          <p className="sonartra-page-eyebrow">Report-first templates</p>
          <LabelPill>
            {reportFirstArtifact.coverage.generated_import_ready_count} generated rows
          </LabelPill>
          <LabelPill className="border-[rgba(255,184,107,0.22)] bg-[rgba(255,184,107,0.1)] text-[rgba(255,227,187,0.9)]">
            {reportFirstArtifact.coverage.missing_template_count} missing
          </LabelPill>
        </div>
        <div className="space-y-2">
          <CardTitle>Report-first import handoff</CardTitle>
          <SecondaryText>
            The generated package artifact is available for draft import. It currently contains the
            four authored Leadership Approach report templates and keeps full report-first coverage
            non-publishable until all twenty-four templates exist.
          </SecondaryText>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetaItem label="Artifact" value="Found" />
          <MetaItem
            label="Draft imported rows"
            value={
              reportFirstDraftCoverage
                ? String(reportFirstDraftCoverage.importedTemplateCount)
                : 'Create a draft first'
            }
          />
          <MetaItem
            label="Coverage"
            value={reportFirstArtifact.coverage.publishable_full_coverage ? 'Publishable' : 'Blocked'}
          />
          <MetaItem label="Score-shape policy" value={reportFirstArtifact.score_shape_policy} />
        </div>
        <AdminReportFirstBlockingCopy
          importedCount={reportFirstDraftCoverage?.importedTemplateCount ?? 0}
          missingCount={
            reportFirstDraftCoverage
              ? reportFirstDraftCoverage.missingPatternKeys.length
              : reportFirstArtifact.coverage.missing_template_count
          }
        />
      </SurfaceCard>

      <RankedPatternImportPanel
        assessmentId={assessment.assessmentId}
        assessmentKey={assessment.assessmentKey}
        latestDraftVersion={assessment.latestDraftVersion}
      />
    </PageFrame>
  );
}
