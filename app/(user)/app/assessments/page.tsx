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
          description="Assessments will appear here when they are available in your workspace."
        />
      ) : (
        <section className="sonartra-section">
          <SectionHeader
            eyebrow="Assessment library"
            title="Available assessments"
            description="Your available assessments are listed with their current status and next action."
          />
          {viewModel.assessments.map((assessment) => (
            <SurfaceCard
              key={assessment.assessmentId}
              interactive
              className="relative overflow-hidden p-0"
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-[3px] bg-[#32D6B0]/70"
              />
              <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-5 p-5 pl-6 lg:p-6 lg:pl-7">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <LabelPill>{assessment.typeLabel}</LabelPill>
                      <StatusPill status={assessment.status} label={assessment.statusLabel} />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-[1.5rem] font-semibold tracking-[-0.03em] text-white">
                        {assessment.title}
                      </h2>
                      <p className="text-white/62 max-w-3xl text-sm leading-7">
                        {assessment.description ?? 'Assessment available in your workspace.'}
                      </p>
                    </div>
                  </div>

                  <div className="border-white/8 grid gap-3 border-t pt-4 sm:grid-cols-2">
                    <MetaItem label="Assessment type" value={assessment.typeLabel} />
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

                <div className="border-white/8 flex items-start border-t bg-black/10 p-5 pl-6 lg:items-end lg:border-l lg:border-t-0 lg:p-6">
                  <ButtonLink href={assessment.href}>{assessment.ctaLabel}</ButtonLink>
                </div>
              </div>
            </SurfaceCard>
          ))}
        </section>
      )}
    </PageFrame>
  );
}
