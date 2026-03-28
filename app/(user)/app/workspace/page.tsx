import Link from 'next/link';

import { buildDashboardViewModel } from '@/lib/server/dashboard-workspace-view-model';
import { getDbPool } from '@/lib/server/db';
import { getRequestUserId } from '@/lib/server/request-user';

function formatDate(value: string | null): string {
  if (!value) {
    return 'No date available';
  }

  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function renderCta(params: {
  label: string;
  href: string | null;
  disabled: boolean;
}) {
  if (!params.href || params.disabled) {
    return (
      <span className="inline-flex items-center justify-center rounded-md border border-white/10 px-4 py-2 text-sm font-medium text-white/50">
        {params.label}
      </span>
    );
  }

  return (
    <Link
      href={params.href}
      className="inline-flex items-center justify-center rounded-md border border-white/15 bg-white px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-white/90"
    >
      {params.label}
    </Link>
  );
}

export default async function UserWorkspacePage() {
  const userId = await getRequestUserId();
  const viewModel = await buildDashboardViewModel({
    db: getDbPool(),
    userId,
  });

  return (
    <main className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-white/45">User App</p>
        <h1 className="text-3xl font-semibold text-white">Workspace</h1>
        <p className="max-w-3xl text-sm text-white/65">
          The primary working view for assessments in progress, ready results, and next actions.
        </p>
      </header>

      {viewModel.totalAssessments === 0 ? (
        <section className="sonartra-panel space-y-3">
          <h2 className="text-xl font-semibold text-white">No published assessments</h2>
          <p className="text-sm text-white/65">
            The workspace is connected to canonical lifecycle and result reads, but no published
            assessments are currently available for this user.
          </p>
        </section>
      ) : null}

      {viewModel.recommendation ? (
        <section className="sonartra-panel flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.2em] text-white/45">Next Action</p>
            <h2 className="text-2xl font-semibold text-white">{viewModel.recommendation.title}</h2>
            <p className="max-w-2xl text-sm text-white/65">
              {viewModel.recommendation.description}
            </p>
          </div>
          {renderCta(viewModel.recommendation.cta)}
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Assessments', value: viewModel.totalAssessments },
          { label: 'In Progress', value: viewModel.inProgressCount },
          { label: 'Ready', value: viewModel.readyCount },
          { label: 'Processing', value: viewModel.processingCount },
          { label: 'Ready Results', value: viewModel.readyResultCount },
        ].map((item) => (
          <article key={item.label} className="sonartra-panel space-y-1">
            <p className="text-sm text-white/50">{item.label}</p>
            <p className="text-3xl font-semibold text-white">{item.value}</p>
          </article>
        ))}
      </section>

      {viewModel.latestReadyResult ? (
        <section className="sonartra-panel flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.2em] text-white/45">Latest Ready Result</p>
            <h2 className="text-2xl font-semibold text-white">
              {viewModel.latestReadyResult.assessmentTitle}
            </h2>
            <p className="text-sm text-white/65">
              Completed {formatDate(viewModel.latestReadyResult.generatedAt)}
            </p>
            <p className="text-sm text-white/70">
              Top signal:{' '}
              <span className="font-medium text-white">
                {viewModel.latestReadyResult.topSignalTitle ?? 'Unavailable'}
              </span>
              {viewModel.latestReadyResult.topSignalPercentage !== null
                ? ` (${viewModel.latestReadyResult.topSignalPercentage}%)`
                : ''}
            </p>
          </div>
          <Link
            href={viewModel.latestReadyResult.href}
            className="inline-flex items-center justify-center rounded-md border border-white/15 bg-white px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-white/90"
          >
            View Results
          </Link>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Assessment Status</h2>
            <p className="text-sm text-white/60">
              Current lifecycle state and persisted result availability for each published
              assessment.
            </p>
          </div>
          <Link
            href="/app/assessments"
            className="text-sm font-medium text-white/70 transition hover:text-white"
          >
            Open assessments
          </Link>
        </div>

        <div className="grid gap-4">
          {viewModel.assessments.map((assessment) => (
            <article key={assessment.assessmentKey} className="sonartra-panel space-y-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-semibold text-white">{assessment.title}</h3>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/55">
                      {assessment.statusLabel}
                    </span>
                  </div>
                  <p className="max-w-3xl text-sm text-white/65">
                    {assessment.description ?? 'Published assessment ready for canonical lifecycle tracking.'}
                  </p>
                  <p className="text-sm text-white/60">{assessment.statusDetail}</p>
                </div>
                {renderCta(assessment.cta)}
              </div>

              <div className="grid gap-3 text-sm text-white/65 md:grid-cols-4">
                <div>
                  <p className="text-white/45">Version</p>
                  <p className="font-medium text-white">{assessment.versionTag}</p>
                </div>
                <div>
                  <p className="text-white/45">Progress</p>
                  <p className="font-medium text-white">
                    {assessment.answeredQuestions} / {assessment.totalQuestions} ({assessment.completionPercentage}
                    %)
                  </p>
                </div>
                <div>
                  <p className="text-white/45">Latest ready result</p>
                  <p className="font-medium text-white">
                    {assessment.latestReadyResultAt
                      ? formatDate(assessment.latestReadyResultAt)
                      : 'Not available'}
                  </p>
                </div>
                <div>
                  <p className="text-white/45">Top signal</p>
                  <p className="font-medium text-white">
                    {assessment.latestTopSignalTitle ?? 'Not available'}
                    {assessment.latestTopSignalPercentage !== null
                      ? ` (${assessment.latestTopSignalPercentage}%)`
                      : ''}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
