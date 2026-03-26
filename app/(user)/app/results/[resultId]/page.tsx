import { notFound } from 'next/navigation';

import { getDbPool } from '@/lib/server/db';
import { getRequestUserId } from '@/lib/server/request-user';
import { createResultReadModelService } from '@/lib/server/result-read-model';
import { AssessmentResultNotFoundError } from '@/lib/server/result-read-model-types';

type ResultDetailPageProps = {
  params: Promise<{
    resultId: string;
  }>;
};

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

export default async function ResultDetailPage({ params }: ResultDetailPageProps) {
  const { resultId } = await params;
  const userId = await getRequestUserId();
  const service = createResultReadModelService({
    db: getDbPool(),
  });

  let result;
  try {
    result = await service.getAssessmentResultDetail({
      userId,
      resultId,
    });
  } catch (error) {
    if (error instanceof AssessmentResultNotFoundError) {
      notFound();
    }

    throw error;
  }

  return (
    <main className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm text-neutral-500">
          {result.assessmentTitle} - Version {result.version}
        </p>
        <h1 className="text-3xl font-semibold">
          {result.topSignal?.title ?? 'Result detail'}
        </h1>
        <p className="text-sm text-neutral-600">
          Completed {formatResultDate(result.generatedAt ?? result.createdAt)}
        </p>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Overview</p>
          <h2 className="mt-1 text-lg font-semibold">{result.overviewSummary.headline}</h2>
          <p className="mt-2 text-sm text-neutral-700">{result.overviewSummary.narrative}</p>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Ranked Signals</h2>
          <div className="mt-4 space-y-3">
            {result.rankedSignals.map((signal) => (
              <div
                key={signal.signalId}
                className="flex items-center justify-between rounded-md border border-neutral-100 p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    #{signal.rank} {signal.title}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {signal.domainKey}
                    {signal.isOverlay ? ' - overlay' : ''}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium">{signal.percentage}%</p>
                  <p className="text-neutral-500">Raw {signal.rawTotal}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Top Signal</h2>
          {result.topSignal ? (
            <div className="mt-4 space-y-2 text-sm text-neutral-700">
              <p>
                <span className="font-medium">{result.topSignal.title}</span>
              </p>
              <p>Percentage {result.topSignal.percentage}%</p>
              <p>Raw total {result.topSignal.rawTotal}</p>
              <p>Rank {result.topSignal.rank}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-neutral-600">No top signal available.</p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Domain Summaries</h2>
        <div className="mt-4 grid gap-4">
          {result.domainSummaries.map((domain) => (
            <article key={domain.domainId} className="rounded-md border border-neutral-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">{domain.domainTitle}</h3>
                  <p className="text-xs text-neutral-500">
                    {domain.domainSource} - {domain.percentage}% share
                  </p>
                </div>
                <p className="text-sm text-neutral-600">
                  Answered questions {domain.answeredQuestionCount}
                </p>
              </div>

              {domain.signalScores.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {domain.signalScores.map((signal) => (
                    <div key={signal.signalId} className="flex items-center justify-between text-sm">
                      <span>{signal.signalTitle}</span>
                      <span className="text-neutral-600">
                        {signal.percentage}% overall - {signal.domainPercentage}% in domain
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-neutral-600">
                  No scored signals are stored for this domain.
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Strengths</h2>
          <ul className="mt-4 space-y-3 text-sm text-neutral-700">
            {result.strengths.map((item) => (
              <li key={item.key}>
                <p className="font-medium">{item.title}</p>
                <p>{item.detail}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Watchouts</h2>
          <ul className="mt-4 space-y-3 text-sm text-neutral-700">
            {result.watchouts.map((item) => (
              <li key={item.key}>
                <p className="font-medium">{item.title}</p>
                <p>{item.detail}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Development Focus</h2>
          <ul className="mt-4 space-y-3 text-sm text-neutral-700">
            {result.developmentFocus.map((item) => (
              <li key={item.key}>
                <p className="font-medium">{item.title}</p>
                <p>{item.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
