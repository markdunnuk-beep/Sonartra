import Link from 'next/link';

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

function formatEstimatedTime(value: number | null): string {
  if (value === null) {
    return 'Time not set';
  }

  return `${value} min`;
}

function getStatusTone(status: 'not_started' | 'in_progress' | 'results_ready'): string {
  switch (status) {
    case 'results_ready':
      return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100';
    case 'in_progress':
      return 'border-sky-400/25 bg-sky-400/10 text-sky-100';
    case 'not_started':
      return 'border-white/10 bg-white/[0.05] text-white/68';
  }
}

export default async function UserWorkspacePage() {
  const userId = await getRequestUserId();
  const viewModel = await createWorkspaceService({
    db: getDbPool(),
  }).getWorkspaceViewModel({ userId });

  return (
    <main className="space-y-10 px-6 py-8 lg:px-8 lg:py-10">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-white/45">User App</p>
        <h1 className="text-3xl font-semibold text-white">Workspace</h1>
        <p className="max-w-3xl text-sm text-white/62">
          Track progress, continue assessments, and review completed results.
        </p>
      </header>

      {viewModel.recommendedAction ? (
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(124,146,255,0.22),_transparent_42%),linear-gradient(180deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0.02))] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.34)] lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.2em] text-white/45">Recommended Next Action</p>
              <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-white lg:text-4xl">
                {viewModel.recommendedAction.title}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-white/68">
                {viewModel.recommendedAction.description}
              </p>
            </div>

            <Link
              href={viewModel.recommendedAction.href}
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white px-5 py-3 text-sm font-medium text-neutral-950 transition hover:bg-white/90"
            >
              {viewModel.recommendedAction.ctaLabel}
            </Link>
          </div>
        </section>
      ) : null}

      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-white/45">Assessment Overview</p>
          <h2 className="text-2xl font-semibold text-white">Available assessments</h2>
          <p className="max-w-3xl text-sm text-white/58">
            A compact view of what is available, where you are, and the next sensible action.
          </p>
        </div>

        {viewModel.assessments.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {viewModel.assessments.map((assessment) => (
              <article
                key={assessment.assessmentId}
                className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)]"
              >
                <div className="flex flex-col gap-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
                          {assessment.typeLabel}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${getStatusTone(assessment.status)}`}
                        >
                          {assessment.statusLabel}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-white">{assessment.title}</h3>
                      <p className="max-w-xl text-sm leading-6 text-white/62">
                        {assessment.description ?? 'Published assessment available in the workspace.'}
                      </p>
                    </div>

                    <Link
                      href={assessment.href}
                      className="inline-flex items-center justify-center rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                    >
                      {assessment.ctaLabel}
                    </Link>
                  </div>

                  <div className="grid gap-3 border-t border-white/8 pt-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">
                        Estimated time
                      </p>
                      <p className="mt-2 text-sm font-medium text-white/78">
                        {formatEstimatedTime(assessment.estimatedTimeMinutes)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">
                        Current state
                      </p>
                      <p className="mt-2 text-sm font-medium text-white/78">{assessment.statusLabel}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-white/[0.03] p-6">
            <h3 className="text-lg font-semibold text-white">No published assessments</h3>
            <p className="mt-2 max-w-2xl text-sm text-white/58">
              Published assessments will appear here when they are available for this user.
            </p>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-white/45">Latest Result</p>
          <h2 className="text-2xl font-semibold text-white">Most recent completed result</h2>
        </div>

        {viewModel.latestResult ? (
          <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-white">{viewModel.latestResult.assessmentTitle}</h3>
                <p className="text-sm text-white/58">
                  Completed {formatDate(viewModel.latestResult.completedAt)}
                </p>
              </div>

              <Link
                href={viewModel.latestResult.href}
                className="inline-flex items-center justify-center rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Open result
              </Link>
            </div>
          </article>
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-white/58">
              No completed ready result is available yet.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
