import {
  ButtonLink,
  PageFrame,
  PageHeader,
  SectionHeader,
  SurfaceCard,
} from '@/components/shared/user-app-ui';
import { getDbPool } from '@/lib/server/db';
import { getRequestUserId } from '@/lib/server/request-user';
import { createResultsService } from '@/lib/server/results-service';

function formatResultDate(value: string): string {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default async function UserResultsPage() {
  const userId = await getRequestUserId();
  const results = await createResultsService({
    db: getDbPool(),
  }).listResults({ userId });

  return (
    <PageFrame>
      <PageHeader title="Results" description="View and revisit your completed assessments." />

      {results.length === 0 ? (
        <SurfaceCard dashed muted className="p-6">
          <h2 className="text-xl font-semibold text-white">No results yet</h2>
          <p className="text-white/58 mt-2 max-w-2xl text-sm leading-7">
            Complete an assessment to see your results here.
          </p>
          <div className="mt-5">
            <ButtonLink href="/app/assessments">Open Assessments</ButtonLink>
          </div>
        </SurfaceCard>
      ) : (
        <section className="sonartra-section">
          <SectionHeader
            eyebrow="Completed Results"
            title="Ready to revisit"
            description="Completed assessments are listed here using the persisted canonical result payload."
          />
          {results.map((result) => (
            <SurfaceCard key={result.resultId} interactive className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <h2 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-white">
                    {result.assessmentTitle}
                  </h2>
                  <p className="text-white/58 text-sm leading-7">
                    Completed {formatResultDate(result.completedAt)}
                  </p>
                </div>

                <ButtonLink href={result.href}>View Result</ButtonLink>
              </div>
            </SurfaceCard>
          ))}
        </section>
      )}
    </PageFrame>
  );
}
