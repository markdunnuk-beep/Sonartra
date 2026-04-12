import { notFound } from 'next/navigation';

import { getDbPool } from '@/lib/server/db';
import { getRequestUserId } from '@/lib/server/request-user';
import { createResultReadModelService } from '@/lib/server/result-read-model';
import { AssessmentResultNotFoundError } from '@/lib/server/result-read-model-types';

type SingleDomainResultPageProps = {
  params: Promise<{
    resultId: string;
  }>;
};

export default async function SingleDomainResultPage(
  props: SingleDomainResultPageProps,
) {
  const { resultId } = await props.params;
  const service = createResultReadModelService({
    db: getDbPool(),
  });

  let detail;
  try {
    detail = await service.getAssessmentResultDetail({
      userId: await getRequestUserId(),
      resultId,
    });
  } catch (error) {
    if (error instanceof AssessmentResultNotFoundError) {
      notFound();
    }

    throw error;
  }

  if (detail.mode !== 'single_domain' || !detail.singleDomainResult) {
    notFound();
  }

  const result = detail.singleDomainResult;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {result.metadata.assessmentTitle}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          {result.hero.hero_headline}
        </h1>
        <p className="max-w-3xl text-sm leading-7 text-slate-600">
          {result.hero.hero_opening}
        </p>
      </header>

      <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-950">{result.intro.section_title}</h2>
        <p className="text-sm leading-7 text-slate-700">{result.intro.intro_paragraph}</p>
        <p className="text-sm leading-7 text-slate-700">{result.intro.meaning_paragraph}</p>
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-950">Signals</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {result.signals.map((signal) => (
            <article
              key={signal.signal_key}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {signal.position_label}
              </p>
              <h3 className="mt-2 text-base font-semibold text-slate-950">
                {signal.signal_label}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Rank {signal.rank} · {signal.normalized_score}%
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{signal.chapter_intro}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
