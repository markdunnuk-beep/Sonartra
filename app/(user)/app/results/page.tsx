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
        <h1 className="text-2xl font-semibold">Results</h1>
        <p className="text-sm text-neutral-600">
          No ready assessment results are available yet.
        </p>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Results</h1>
        <p className="text-sm text-neutral-600">
          Stored canonical results for your completed assessments.
        </p>
      </div>

      <div className="grid gap-4">
        {results.map((result) => (
          <article
            key={result.resultId}
            className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div>
                  <h2 className="text-lg font-semibold">{result.assessmentTitle}</h2>
                  <p className="text-sm text-neutral-600">Version {result.version}</p>
                </div>

                <div className="text-sm text-neutral-700">
                  <p>Completed {formatResultDate(result.generatedAt ?? result.createdAt)}</p>
                  <p>
                    Top signal:{' '}
                    <span className="font-medium">
                      {result.topSignal?.title ?? 'Unavailable'}
                    </span>
                    {result.topSignalPercentage !== null ? ` (${result.topSignalPercentage}%)` : ''}
                  </p>
                </div>
              </div>

              <Link
                href={`/app/results/${result.resultId}`}
                className="inline-flex items-center justify-center rounded-md border border-neutral-900 px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-900 hover:text-white"
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
