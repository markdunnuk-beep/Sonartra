import Link from 'next/link';

import { getDbPool } from '@/lib/server/db';
import { getRequestUserId } from '@/lib/server/request-user';
import { createResultReadModelService } from '@/lib/server/result-read-model';

function formatResultDate(value: string | null): string {
  if (!value) {
    return 'No completion date';
  }

  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default async function UserResultsPage() {
  const userId = await getRequestUserId();
  const service = createResultReadModelService({
    db: getDbPool(),
  });
  const results = await service.listAssessmentResults({ userId });

  if (results.length === 0) {
    return (
      <main className="space-y-4">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.2em] text-white/45">User App</p>
          <h1 className="text-3xl font-semibold text-white">Results</h1>
        </header>
        <p className="text-sm text-white/60">
          No ready assessment results are available yet.
        </p>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-white/45">User App</p>
        <h1 className="text-3xl font-semibold text-white">Results</h1>
        <p className="text-sm text-white/60">
          Stored canonical results for your completed assessments.
        </p>
      </header>

      <div className="grid gap-4">
        {results.map((result) => (
          <article
            key={result.resultId}
            className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)]"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div>
                  <h2 className="text-lg font-semibold text-white">{result.assessmentTitle}</h2>
                  <p className="text-sm text-white/55">Version {result.version}</p>
                </div>

                <div className="text-sm text-white/68">
                  <p>Completed {formatResultDate(result.generatedAt ?? result.createdAt)}</p>
                  <p>
                    Top signal:{' '}
                    <span className="font-medium text-white">
                      {result.topSignal?.title ?? 'Unavailable'}
                    </span>
                    {result.topSignalPercentage !== null ? ` (${result.topSignalPercentage}%)` : ''}
                  </p>
                </div>
              </div>

              <Link
                href={`/app/results/${result.resultId}`}
                className="inline-flex items-center justify-center rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                View result
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
