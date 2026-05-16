import { notFound } from 'next/navigation';

import { ReportFirstTemplateImportPanel } from '@/components/admin/report-first-template-import-panel';
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
import { getDbPool } from '@/lib/server/db';
import { buildLeadershipReportFirstImportArtifact } from '@/lib/server/leadership-report-first-package';
import { getRankedPatternWorkflowAssessment } from '@/lib/server/ranked-pattern-admin-workflow-page';
import { auditImportedReportFirstTemplateCoverage } from '@/lib/server/report-first-template-import';
import { isRankedPatternPackageCompatibleAssessment } from '@/lib/ranked-pattern-admin-compatibility';

export default async function RankedPatternWorkflowPage({
  params,
}: Readonly<{
  params: Promise<{ assessmentKey: string }>;
}>) {
  const { assessmentKey } = await params;
  const assessment = await getRankedPatternWorkflowAssessment(getDbPool(), assessmentKey);

  if (!assessment) {
    notFound();
  }

  if (
    !isRankedPatternPackageCompatibleAssessment({
      assessmentKey: assessment.assessmentKey,
      title: assessment.title,
      mode: assessment.mode,
      isActive: assessment.isActive,
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
  const reportFirstActiveCoverage = assessment.latestDraftVersion
    ? await auditImportedReportFirstTemplateCoverage({
        db: getDbPool(),
        assessmentVersionId: assessment.latestDraftVersion.assessmentVersionId,
        status: 'active',
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
          <ButtonLink href="/admin/assessments">
            Back to assessment packages
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
        </div>
      </SurfaceCard>

      {!assessment.latestDraftVersion ? (
        <SurfaceCard className="space-y-4 p-5 lg:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <p className="sonartra-page-eyebrow">No draft in progress</p>
            <LabelPill className="border-white/10 bg-white/[0.04] text-white/64">
              Import actions locked
            </LabelPill>
          </div>
          <div className="space-y-2">
            <CardTitle>Create or resolve a draft before importing</CardTitle>
            <SecondaryText>
              This assessment has a published ranked-pattern version, but no editable draft is
              currently open. The workflow remains available for review, but report-first import,
              publish prep, package import, and publish audit actions require a draft target.
            </SecondaryText>
          </div>
        </SurfaceCard>
      ) : null}

      <ReportFirstTemplateImportPanel
        assessmentKey={assessment.assessmentKey}
        generatedImportReadyCount={reportFirstArtifact.coverage.generated_import_ready_count}
        generatedPublishableCoverage={reportFirstArtifact.coverage.publishable_full_coverage}
        importedDraftCount={reportFirstDraftCoverage?.importedTemplateCount ?? null}
        importedActiveCount={reportFirstActiveCoverage?.importedTemplateCount ?? null}
        importedActiveCoverageComplete={reportFirstActiveCoverage?.coverageComplete ?? false}
        missingTemplateCount={reportFirstArtifact.coverage.missing_template_count}
        scoreShapePolicy={reportFirstArtifact.score_shape_policy}
        targetAssessmentVersionId={assessment.latestDraftVersion?.assessmentVersionId ?? null}
      />

      <RankedPatternImportPanel
        assessmentId={assessment.assessmentId}
        assessmentKey={assessment.assessmentKey}
        latestDraftVersion={assessment.latestDraftVersion}
      />
    </PageFrame>
  );
}
