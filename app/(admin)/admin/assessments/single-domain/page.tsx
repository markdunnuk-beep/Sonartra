import {
  ButtonLink,
  CardTitle,
  EmptyState,
  LabelPill,
  MetaItem,
  PageFrame,
  PageHeader,
  SecondaryText,
  SurfaceCard,
} from '@/components/shared/user-app-ui';
import {
  buildAdminAssessmentDashboardViewModel,
  type AdminAssessmentDashboardItem,
} from '@/lib/server/admin-assessment-dashboard';
import { getDbPool } from '@/lib/server/db';

function WorkflowAssessmentCard({
  assessment,
  tone = 'active',
}: Readonly<{
  assessment: AdminAssessmentDashboardItem;
  tone?: 'active' | 'legacy';
}>) {
  const workflowHref = `/admin/assessments/ranked-pattern/${assessment.assessmentKey}/workflow`;
  const draftStatus = assessment.latestDraftVersion
    ? `Draft ${assessment.latestDraftVersion.versionTag}`
    : 'No draft';

  return (
    <SurfaceCard className="space-y-5 p-5 lg:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <LabelPill>{assessment.assessmentKey}</LabelPill>
            <LabelPill className="border-[rgba(116,209,177,0.22)] bg-[rgba(116,209,177,0.1)] text-[rgba(214,246,233,0.86)]">
              {tone === 'legacy' ? 'Legacy / test record' : 'Active ranked-pattern path'}
            </LabelPill>
            <LabelPill className="border-white/10 bg-white/[0.04] text-white/68">
              {draftStatus}
            </LabelPill>
          </div>

          <div className="space-y-2">
            <CardTitle>{assessment.title}</CardTitle>
            <SecondaryText>
              Open the review/import panel to create the next draft version, audit the workbook
              package, dry-run, apply to draft, run publish audit, and explicitly publish.
            </SecondaryText>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <ButtonLink href={workflowHref} variant="primary">
            {tone === 'legacy' ? 'Open archived workflow' : 'Open import workflow'}
          </ButtonLink>
          {tone === 'active' ? (
            <>
              <ButtonLink href={workflowHref}>
                Create draft version
              </ButtonLink>
              <ButtonLink href={`${assessment.actionHref}/review`}>
                Open legacy builder review
              </ButtonLink>
            </>
          ) : null}
        </div>
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
        <MetaItem label="Status" value={assessment.overallStatusLabel} />
        <MetaItem label="Versions" value={String(assessment.versionCount)} />
      </div>
    </SurfaceCard>
  );
}

function isTestOrLegacyAssessment(assessment: AdminAssessmentDashboardItem): boolean {
  const haystack = `${assessment.assessmentKey} ${assessment.title}`.toLowerCase();
  return !assessment.isActive || haystack.includes('test') || haystack.includes('legacy');
}

export default async function SingleDomainBuilderEntryPage() {
  const viewModel = await buildAdminAssessmentDashboardViewModel(getDbPool());
  const singleDomainAssessments = viewModel.assessments.filter(
    (assessment) => assessment.mode === 'single_domain',
  );
  const activeRankedPatternAssessments = singleDomainAssessments.filter(
    (assessment) => !isTestOrLegacyAssessment(assessment),
  );
  const legacySingleDomainAssessments = singleDomainAssessments.filter((assessment) =>
    isTestOrLegacyAssessment(assessment),
  );

  return (
    <PageFrame className="space-y-8">
      <PageHeader
        eyebrow="Admin Workspace"
        title="Ranked-pattern package workflow"
        description="Use this active path for single-domain ranked-pattern builds. Select an assessment, then use the import panel to create draft versions, audit packages, apply imports to draft, run publish audit, and explicitly publish."
      />

      <SurfaceCard accent className="space-y-4 p-6 lg:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <LabelPill>Recommended active workflow</LabelPill>
          <LabelPill className="border-white/10 bg-white/[0.04] text-white/68">
            Existing assessment family
          </LabelPill>
        </div>
        <CardTitle>Start from an existing single-domain assessment.</CardTitle>
        <SecondaryText>
          New active ranked-pattern work is versioned inside an assessment family. Create the next
          draft from a published version, import the package into draft only, run publish audit, and
          publish explicitly when the audit passes.
        </SecondaryText>
        <SecondaryText>
          Full brand-new assessment shell creation is still a legacy builder concern. Do not use
          legacy builders to bypass ranked-pattern import or publish audit.
        </SecondaryText>
      </SurfaceCard>

      {activeRankedPatternAssessments.length > 0 ? (
        <section className="space-y-4">
          {activeRankedPatternAssessments.map((assessment) => (
            <WorkflowAssessmentCard
              assessment={assessment}
              key={assessment.assessmentId}
            />
          ))}
        </section>
      ) : (
        <EmptyState
          title="No single-domain ranked-pattern assessments found"
          description="Create or restore an assessment family before starting the ranked-pattern package workflow. Legacy creation remains available only for historical maintenance."
          action={
            <ButtonLink href="/admin/assessments/create">
              Open legacy multi-domain builder
            </ButtonLink>
          }
        />
      )}

      {legacySingleDomainAssessments.length > 0 ? (
        <section className="space-y-4">
          <div className="space-y-2">
            <p className="sonartra-page-eyebrow">Legacy / test records</p>
            <SecondaryText>
              These records remain visible for maintenance, but they are not the active package
              workflow for new ranked-pattern assessment operations.
            </SecondaryText>
          </div>
          {legacySingleDomainAssessments.map((assessment) => (
            <WorkflowAssessmentCard
              assessment={assessment}
              key={assessment.assessmentId}
              tone="legacy"
            />
          ))}
        </section>
      ) : null}

      <SurfaceCard muted className="space-y-3 p-5">
        <CardTitle className="text-lg">Legacy single-domain shell</CardTitle>
        <SecondaryText>
          Use this only for transitional maintenance of older one-domain records that still depend
          on the historical CRUD authoring surface.
        </SecondaryText>
        <ButtonLink href="/admin/assessments/single-domain/new">
          Open legacy single-domain shell
        </ButtonLink>
      </SurfaceCard>
    </PageFrame>
  );
}
