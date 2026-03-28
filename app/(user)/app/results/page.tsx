import Link from 'next/link';

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
    <main className="space-y-8 px-6 py-8 lg:px-8 lg:py-10">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-white/45">User App</p>
        <h1 className="text-3xl font-semibold text-white">Results</h1>
        <p className="max-w-3xl text-sm text-white/62">
          View and revisit your completed assessments.
        </p>
      </header>

      {results.length === 0 ? (
        <section className="rounded-[1.6rem] border border-dashed border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-semibold text-white">No results yet</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/58">
            Complete an assessment to see your results here.
          </p>
          <div className="mt-5">
            <Link
              href="/app/assessments"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Open Assessments
            </Link>
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          {results.map((result) => (
            <article
              key={result.resultId}
              className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.2)]"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-white">{result.assessmentTitle}</h2>
                  <p className="text-sm text-white/58">
                    Completed {formatResultDate(result.completedAt)}
                  </p>
                </div>

                <Link
                  href={result.href}
                  className="inline-flex items-center justify-center rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  View Result
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
