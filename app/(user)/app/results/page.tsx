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
          description="Completed reports will appear here after an assessment result is ready."
          action={<ButtonLink href="/app/assessments">Open Assessments</ButtonLink>}
        />
      ) : (
        <section className="sonartra-section">
          <SectionHeader
            eyebrow="Result history"
            title="Ready to revisit"
            description="Completed assessment reports stay available here for reference."
          />
          {results.map((result) => (
            <SurfaceCard
              key={result.resultId}
              interactive
              className="relative overflow-hidden p-0"
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-[3px] bg-[#32D6B0]/70"
              />
              <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-3 p-5 pl-6 lg:p-6 lg:pl-7">
                  <p className="sonartra-page-eyebrow">Completed report</p>
                  <div className="space-y-2">
                    <h2 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-white">
                      {result.assessmentTitle}
                    </h2>
                    <p className="text-white/58 text-sm leading-7">
                      Completed {formatResultDate(result.completedAt)}
                    </p>
                  </div>
                </div>

                <div className="border-white/8 flex items-start border-t bg-black/10 p-5 pl-6 lg:items-end lg:border-l lg:border-t-0 lg:p-6">
                  <ButtonLink href={result.href}>View Result</ButtonLink>
                </div>
              </div>
            </SurfaceCard>
          ))}
        </section>
      )}
    </PageFrame>
  );
}
