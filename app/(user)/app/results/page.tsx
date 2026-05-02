import {
  ButtonLink,
  EmptyState,
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
      <PageHeader
        title="Results"
        description="Review completed assessments and return to previous reports when you need them."
      />

      {results.length === 0 ? (
        <EmptyState
          title="No results yet"
          description="Complete an assessment to see your results here."
          action={<ButtonLink href="/app/assessments">Open Assessments</ButtonLink>}
        />
      ) : (
        <section className="sonartra-section">
          <SectionHeader
            eyebrow="Results"
            title="Ready to revisit"
            description="Completed assessment reports stay available here for reference."
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
