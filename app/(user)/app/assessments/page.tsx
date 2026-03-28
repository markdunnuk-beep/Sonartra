import {
  ButtonLink,
  MetaItem,
  PageFrame,
  PageHeader,
  SectionHeader,
  StatusPill,
  SurfaceCard,
} from '@/components/shared/user-app-ui';
import { getDbPool } from '@/lib/server/db';
import { getRequestUserId } from '@/lib/server/request-user';
import { createWorkspaceService } from '@/lib/server/workspace-service';

function formatEstimatedTime(value: number | null): string {
  if (value === null) {
    return 'Time not set';
  }

  return `${value} min`;
}

export default async function UserAssessmentsPage() {
  const userId = await getRequestUserId();
  const viewModel = await createWorkspaceService({
    db: getDbPool(),
  }).getWorkspaceViewModel({ userId });

  return (
    <PageFrame>
      <PageHeader
        title="Assessments"
        description="Browse available assessments and track your progress."
      />

      {viewModel.assessments.length === 0 ? (
        <SurfaceCard dashed muted className="p-6">
          <h2 className="text-xl font-semibold text-white">No assessments available</h2>
          <p className="text-white/58 mt-2 max-w-2xl text-sm leading-7">
            Published assessments will appear here when they are available.
          </p>
        </SurfaceCard>
      ) : (
        <section className="sonartra-section">
          <SectionHeader
            eyebrow="Assessment Inventory"
            title="Available assessments"
            description="Each assessment uses the same persisted completion pipeline. Status stays read-only here."
          />
          {viewModel.assessments.map((assessment) => (
            <SurfaceCard key={assessment.assessmentId} interactive className="p-5">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="sonartra-status sonartra-status-neutral">
                        {assessment.typeLabel}
                      </span>
                      <StatusPill status={assessment.status} label={assessment.statusLabel} />
                    </div>
                    <h2 className="text-[1.5rem] font-semibold tracking-[-0.03em] text-white">
                      {assessment.title}
                    </h2>
                    <p className="text-white/62 max-w-3xl text-sm leading-7">
                      {assessment.description ?? 'Published assessment available in the workspace.'}
                    </p>
                  </div>

                  <ButtonLink href={assessment.href}>{assessment.ctaLabel}</ButtonLink>
                </div>

                <div className="border-white/8 grid gap-3 border-t pt-4 sm:grid-cols-2">
                  <MetaItem label="Type" value={assessment.typeLabel} />
                  <MetaItem
                    label="Estimated time"
                    value={formatEstimatedTime(assessment.estimatedTimeMinutes)}
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
