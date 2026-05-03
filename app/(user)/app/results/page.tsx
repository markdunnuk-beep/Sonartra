import {
  ButtonLink,
  EmptyState,
  LabelPill,
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

function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
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
            <SurfaceCard key={result.resultId} interactive className="relative overflow-hidden p-0">
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,rgba(50,214,176,0.58),rgba(245,241,234,0.12),transparent)]"
              />
              <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-4 p-5 pl-6 lg:p-6 lg:pl-7">
                  <div className="flex flex-wrap items-center gap-2">
                    <LabelPill>Ready report</LabelPill>
                    <p className="sonartra-page-eyebrow">Completed report</p>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-[1.35rem] font-semibold leading-tight text-[#F5F1EA]">
                      {result.assessmentTitle}
                    </h2>
                    <p className="text-[#D8D0C3]/66 text-sm leading-7">
                      Completed {formatResultDate(result.completedAt)}
                    </p>
                  </div>
                  {result.signalSnapshot.length > 0 ? (
                    <div
                      aria-label={`Signal snapshot for ${result.assessmentTitle}`}
                      className="grid gap-2 pt-1 sm:grid-cols-2 xl:grid-cols-4"
                    >
                      {result.signalSnapshot.map((signal) => (
                        <div
                          key={signal.signalKey}
                          className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(245,241,234,0.034),rgba(245,241,234,0.014))] px-3 py-3"
                        >
                          <p className="sonartra-page-eyebrow">
                            {signal.rank === 1 ? 'Primary' : `Rank ${signal.rank}`}
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-semibold text-[#F5F1EA]/90">
                              {signal.signalLabel}
                            </p>
                            <p className="shrink-0 text-sm font-semibold text-[#32D6B0]">
                              {formatPercentage(signal.percentage)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="bg-black/16 flex items-start border-t border-white/10 p-5 pl-6 lg:items-end lg:border-l lg:border-t-0 lg:p-6">
                  <ButtonLink href={result.href} variant="primary">
                    View Result
                  </ButtonLink>
                </div>
              </div>
            </SurfaceCard>
          ))}
        </section>
      )}
    </PageFrame>
  );
}
