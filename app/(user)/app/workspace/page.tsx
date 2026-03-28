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

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default async function UserWorkspacePage() {
  const userId = await getRequestUserId();
  const viewModel = await createWorkspaceService({
    db: getDbPool(),
  }).getWorkspaceViewModel({ userId });

  return (
    <PageFrame>
      <PageHeader
        title="Workspace"
        description="Track progress, continue assessments, and review completed results."
      />

      {viewModel.recommendedAction ? (
        <SurfaceCard accent className="overflow-hidden p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="sonartra-page-eyebrow">Recommended Next Action</p>
              <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-white lg:text-[2.6rem]">
                {viewModel.recommendedAction.title}
              </h2>
              <p className="text-white/68 max-w-2xl text-sm leading-7">
                {viewModel.recommendedAction.description}
              </p>
            </div>

            <ButtonLink href={viewModel.recommendedAction.href} variant="primary" className="px-5">
              {viewModel.recommendedAction.ctaLabel}
            </ButtonLink>
          </div>
        </SurfaceCard>
      ) : null}

      <section className="sonartra-section">
        <SectionHeader
          eyebrow="Assessment Overview"
          title="Available assessments"
          description="A compact view of what is available, where you are, and the next sensible action."
        />

        {viewModel.assessments.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {viewModel.assessments.map((assessment) => (
              <SurfaceCard key={assessment.assessmentId} interactive className="p-5">
                <div className="flex flex-col gap-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <LabelPill>{assessment.typeLabel}</LabelPill>
                        <StatusPill status={assessment.status} label={assessment.statusLabel} />
                      </div>
                      <h3 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-white">
                        {assessment.title}
                      </h3>
                      <p className="text-white/62 max-w-xl text-sm leading-7">
                        {assessment.description ??
                          'Published assessment available in the workspace.'}
                      </p>
                    </div>

                    <ButtonLink href={assessment.href}>{assessment.ctaLabel}</ButtonLink>
                  </div>

                  <div className="border-white/8 grid gap-3 border-t pt-4 sm:grid-cols-2">
                    <MetaItem
                      label="Estimated time"
                      value={formatAssessmentEstimatedDuration({
                        assessmentKey: assessment.assessmentKey,
                        estimatedTimeMinutes: assessment.estimatedTimeMinutes,
                        questionCount: assessment.questionCount,
                      })}
                    />
                    <MetaItem label="Current state" value={assessment.statusLabel} />
                  </div>
                </div>
              </SurfaceCard>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No published assessments"
            description="Published assessments will appear here when they are available for this user."
          />
        )}
      </section>

      <section className="sonartra-section">
        <SectionHeader eyebrow="Latest Result" title="Most recent completed result" />

        {viewModel.latestResult ? (
          <SurfaceCard interactive className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <h3 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-white">
                  {viewModel.latestResult.assessmentTitle}
                </h3>
                <p className="text-white/58 text-sm leading-7">
                  Completed {formatDate(viewModel.latestResult.completedAt)}
                </p>
              </div>

              <ButtonLink href={viewModel.latestResult.href}>Open result</ButtonLink>
            </div>
          </SurfaceCard>
        ) : (
          <EmptyState
            title="No completed result yet"
            description="A ready result will appear here after an assessment has been completed."
            className="p-5"
          />
        )}
      </section>
    </PageFrame>
  );
}
