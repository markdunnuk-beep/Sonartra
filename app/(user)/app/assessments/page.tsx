import {
  ButtonLink,
  EmptyState,
  LabelPill,
  MetaItem,
  PageFrame,
  PageHeader,
  SectionHeader,
  StatusPill,
  SurfaceCard,
} from '@/components/shared/user-app-ui';
import { formatAssessmentEstimatedDuration } from '@/lib/ui/assessment-duration';
import { getDbPool } from '@/lib/server/db';
import { getRequestUserId } from '@/lib/server/request-user';
import { createWorkspaceService } from '@/lib/server/workspace-service';

export default async function UserAssessmentsPage() {
  const userId = await getRequestUserId();
  const viewModel = await createWorkspaceService({
    db: getDbPool(),
  }).getWorkspaceViewModel({ userId });

  return (
    <PageFrame>
      <PageHeader
        title="Assessments"
        description="Choose an assessment, continue one you have started, or view results when they are ready."
      />

      {viewModel.assessments.length === 0 ? (
        <EmptyState
          title="No assessments available"
          description="Published assessments will appear here when they are available."
        />
      ) : (
        <section className="sonartra-section">
          <SectionHeader
            eyebrow="Assessments"
            title="Available assessments"
            description="Your available assessments are listed with the next action that makes sense for each one."
          />
          {viewModel.assessments.map((assessment) => (
            <SurfaceCard key={assessment.assessmentId} interactive className="p-5">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <LabelPill>{assessment.typeLabel}</LabelPill>
                      <StatusPill status={assessment.status} label={assessment.statusLabel} />
                    </div>
                    <h2 className="text-[1.5rem] font-semibold tracking-[-0.03em] text-white">
                      {assessment.title}
                    </h2>
                    <p className="text-white/62 max-w-3xl text-sm leading-7">
                      {assessment.description ?? 'Assessment available in your workspace.'}
                    </p>
                  </div>

                  <ButtonLink href={assessment.href}>{assessment.ctaLabel}</ButtonLink>
                </div>

                <div className="border-white/8 grid gap-3 border-t pt-4 sm:grid-cols-2">
                  <MetaItem label="Type" value={assessment.typeLabel} />
                  <MetaItem
                    label="Estimated time"
                    value={formatAssessmentEstimatedDuration({
                      assessmentKey: assessment.assessmentKey,
                      estimatedTimeMinutes: assessment.estimatedTimeMinutes,
                      questionCount: assessment.questionCount,
                    })}
                  />
                </div>
              </div>
            </SurfaceCard>
          ))}
        </section>
      )}
    </PageFrame>
  );
}
