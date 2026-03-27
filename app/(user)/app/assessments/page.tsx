import Link from 'next/link';

import { buildAssessmentWorkspaceViewModel } from '@/lib/server/dashboard-workspace-view-model';
import { getDbPool } from '@/lib/server/db';
import { getRequestUserId } from '@/lib/server/request-user';

function formatDate(value: string | null): string {
  if (!value) {
    return 'Not available';
  }

  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function renderAction(params: {
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

export default async function UserAssessmentsPage() {
  const userId = await getRequestUserId();
  const viewModel = await buildAssessmentWorkspaceViewModel({
    db: getDbPool(),
    userId,
  });

  return (
    <main className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-white/45">User App</p>
        <h1 className="text-3xl font-semibold text-white">Assessment Workspace</h1>
        <p className="max-w-3xl text-sm text-white/65">
          Published assessments enriched with canonical lifecycle state and persisted result
          availability.
        </p>
      </header>

      {viewModel.assessments.length === 0 ? (
        <section className="sonartra-panel space-y-3">
          <h2 className="text-xl font-semibold text-white">No published assessments</h2>
          <p className="text-sm text-white/65">
            No assessment inventory is currently available for lifecycle or result wiring.
          </p>
        </section>
      ) : null}

      <section className="grid gap-4">
        {viewModel.assessments.map((assessment) => (
          <article
            id={assessment.assessmentKey}
            key={assessment.assessmentKey}
            className="sonartra-panel space-y-5 scroll-mt-24"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold text-white">{assessment.title}</h2>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/55">
                    {assessment.statusLabel}
                  </span>
                </div>
                <p className="max-w-3xl text-sm text-white/65">
                  {assessment.description ?? 'Published assessment inventory record.'}
                </p>
                <p className="text-sm text-white/60">{assessment.statusDetail}</p>
              </div>
              {renderAction(assessment.cta)}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-white/45">Version</p>
                <p className="mt-1 font-medium text-white">{assessment.versionTag}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-white/45">Questions</p>
                <p className="mt-1 font-medium text-white">{assessment.totalQuestions}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-white/45">Answered</p>
                <p className="mt-1 font-medium text-white">
                  {assessment.answeredQuestions} ({assessment.completionPercentage}%)
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-white/45">Latest ready result</p>
                <p className="mt-1 font-medium text-white">
                  {formatDate(assessment.latestReadyResultAt)}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-white/45">Top signal</p>
                <p className="mt-1 font-medium text-white">
                  {assessment.latestTopSignalTitle ?? 'Not available'}
                  {assessment.latestTopSignalPercentage !== null
                    ? ` (${assessment.latestTopSignalPercentage}%)`
                    : ''}
                </p>
              </div>
            </div>

            {assessment.latestReadyResultId ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">Persisted result available</p>
                  <p className="text-sm text-white/60">
                    The latest ready result is stored and can be opened directly from the canonical
                    results route.
                  </p>
                </div>
                <Link
                  href={`/app/results/${assessment.latestReadyResultId}`}
                  className="inline-flex items-center justify-center rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Open result
                </Link>
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  );
}
