import Link from 'next/link';

import { getDbPool } from '@/lib/server/db';
import { getRequestUserId } from '@/lib/server/request-user';
import { createWorkspaceService, type WorkspaceAssessmentStatus } from '@/lib/server/workspace-service';

function formatEstimatedTime(value: number | null): string {
  if (value === null) {
    return 'Time not set';
  }

  return `${value} min`;
}

function getStatusTone(status: WorkspaceAssessmentStatus): string {
  switch (status) {
    case 'results_ready':
      return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100';
    case 'in_progress':
      return 'border-sky-400/25 bg-sky-400/10 text-sky-100';
    case 'not_started':
      return 'border-white/10 bg-white/[0.05] text-white/68';
  }
}

export default async function UserAssessmentsPage() {
  const userId = await getRequestUserId();
  const viewModel = await createWorkspaceService({
    db: getDbPool(),
  }).getWorkspaceViewModel({ userId });

  return (
    <main className="space-y-8 px-6 py-8 lg:px-8 lg:py-10">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-white/45">User App</p>
        <h1 className="text-3xl font-semibold text-white">Assessments</h1>
        <p className="max-w-3xl text-sm text-white/62">
          Browse available assessments and track your progress.
        </p>
      </header>

      {viewModel.assessments.length === 0 ? (
        <section className="rounded-[1.6rem] border border-dashed border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-semibold text-white">No assessments available</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/58">
            Published assessments will appear here when they are available.
          </p>
        </section>
      ) : (
        <section className="space-y-4">
          {viewModel.assessments.map((assessment) => (
            <article
              key={assessment.assessmentId}
              className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)]"
            >
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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
                    <h2 className="text-2xl font-semibold text-white">{assessment.title}</h2>
                    <p className="max-w-3xl text-sm leading-6 text-white/62">
                      {assessment.description ?? 'Published assessment available in the repository.'}
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
                      Type
                    </p>
                    <p className="mt-2 text-sm font-medium text-white/78">{assessment.typeLabel}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">
                      Estimated time
                    </p>
                    <p className="mt-2 text-sm font-medium text-white/78">
                      {formatEstimatedTime(assessment.estimatedTimeMinutes)}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
