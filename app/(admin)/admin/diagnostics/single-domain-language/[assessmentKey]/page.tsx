import { runSingleDomainLanguageDiagnostic } from '@/lib/server/single-domain-language-diagnostic';

const DEFAULT_ASSESSMENT_KEY = 'sonartra-blueprint-leadership';

export const dynamic = 'force-dynamic';

type SingleDomainLanguageDiagnosticPageProps = {
  params: { assessmentKey: string };
};

export default async function SingleDomainLanguageDiagnosticPage(
  props: SingleDomainLanguageDiagnosticPageProps,
) {
  const { assessmentKey: routeAssessmentKey } = props.params;
  const assessmentKey = routeAssessmentKey?.trim() || DEFAULT_ASSESSMENT_KEY;

  let diagnostic: Awaited<ReturnType<typeof runSingleDomainLanguageDiagnostic>> | null = null;
  let errorMessage: string | null = null;

  try {
    diagnostic = await runSingleDomainLanguageDiagnostic(assessmentKey);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Unknown diagnostic failure';
  }

  if (!diagnostic) {
    return (
      <main className="space-y-6 p-6 text-sm text-white">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Single-domain language diagnostic</h1>
          <p className="text-amber-300">
            Temporary admin diagnostic. Remove after readiness issue is resolved.
          </p>
          <p className="text-white/70">Assessment key: {assessmentKey}</p>
        </header>

        <section className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-4">
          <h2 className="mb-2 text-base font-semibold text-rose-200">Diagnostic failed</h2>
          <p className="text-rose-100">{errorMessage}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6 text-sm text-white">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Single-domain language diagnostic</h1>
        <p className="text-amber-300">
          Temporary admin diagnostic. Remove after readiness issue is resolved.
        </p>
        <p className="text-white/70">Assessment key: {diagnostic.assessmentKey}</p>
      </header>

      <section className="rounded-lg border border-white/15 bg-black/30 p-4">
        <h2 className="mb-3 text-base font-semibold">Summary</h2>
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-white/60">overallReady</dt>
            <dd className={diagnostic.overallReady ? 'text-emerald-300' : 'text-rose-300'}>{String(diagnostic.overallReady)}</dd>
          </div>
          <div>
            <dt className="text-white/60">blockingDatasets</dt>
            <dd>{diagnostic.blockingDatasets.length > 0 ? diagnostic.blockingDatasets.join(', ') : 'None'}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-white/15 bg-black/30 p-4">
        <h2 className="mb-3 text-base font-semibold">Datasets</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-white/20 text-white/65">
                <th className="px-2 py-2">Dataset</th>
                <th className="px-2 py-2">Expected</th>
                <th className="px-2 py-2">Actual</th>
                <th className="px-2 py-2">Ready</th>
                <th className="px-2 py-2">Missing</th>
                <th className="px-2 py-2">Invalid</th>
                <th className="px-2 py-2">Duplicate</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(diagnostic.datasets).map(([datasetKey, report]) => (
                <tr key={datasetKey} className="border-b border-white/10 align-top">
                  <td className="px-2 py-2 font-medium">{datasetKey}</td>
                  <td className="px-2 py-2">{report.expectedCount}</td>
                  <td className="px-2 py-2">{report.actualCount}</td>
                  <td className={report.isReady ? 'px-2 py-2 text-emerald-300' : 'px-2 py-2 text-rose-300'}>
                    {String(report.isReady)}
                  </td>
                  <td className="px-2 py-2">{report.missingKeys.length}</td>
                  <td className="px-2 py-2">{report.invalidKeys.length}</td>
                  <td className="px-2 py-2">{report.duplicateKeys.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-white/15 bg-black/30 p-4">
        <h2 className="mb-3 text-base font-semibold">Raw diagnostic JSON</h2>
        <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded border border-white/10 bg-black/40 p-3 text-xs leading-6 text-white/80">
          {JSON.stringify(diagnostic, null, 2)}
        </pre>
      </section>
    </main>
  );
}
