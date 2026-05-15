import test from 'node:test';
import assert from 'node:assert/strict';

import type { Queryable } from '@/lib/engine/repository-sql';
import { createResultReadModelService } from '@/lib/server/result-read-model';
import { AssessmentResultPayloadError } from '@/lib/server/result-read-model-types';
import type { ReportFirstCanonicalPayloadV1 } from '@/lib/types/report-first-result';
import { buildRankedPatternResultPayload } from '@/tests/fixtures/ranked-pattern-result-payload';

type ResultRowFixture = {
  resultId: string;
  attemptId: string;
  assessmentId: string;
  assessmentKey: string;
  assessmentTitle: string;
  versionTag: string;
  userId: string;
  readinessStatus: 'READY' | 'FAILED' | 'PROCESSING';
  generatedAt: string | null;
  createdAt: string;
  canonicalResultPayload: unknown;
  mode?: string | null;
};

function createFakeDb(rows: ResultRowFixture[]): Queryable {
  return {
    async query<T>(text: string, params?: unknown[]) {
      assert.doesNotMatch(text, /assessment_result_language_rows/i);
      assert.doesNotMatch(text, /assessment_report_first_templates/i);
      assert.doesNotMatch(text, /option_signal_weights|responses|assessment_ranked_patterns/i);

      if (
        text.includes('FROM results r') &&
        text.includes('ORDER BY COALESCE(r.generated_at, r.created_at) DESC, r.id DESC')
      ) {
        const userId = params?.[0] as string;
        return {
          rows: rows
            .filter((row) =>
              row.userId === userId &&
              row.readinessStatus === 'READY' &&
              row.canonicalResultPayload !== null,
            )
            .map((row) => ({
              result_id: row.resultId,
              attempt_id: row.attemptId,
              assessment_id: row.assessmentId,
              assessment_key: row.assessmentKey,
              assessment_mode: row.mode ?? 'single_domain',
              assessment_title: row.assessmentTitle,
              version_tag: row.versionTag,
              readiness_status: row.readinessStatus,
              generated_at: row.generatedAt,
              created_at: row.createdAt,
              canonical_result_payload: row.canonicalResultPayload,
            })) as T[],
        };
      }

      if (text.includes('FROM results r') && text.includes('WHERE r.id = $1')) {
        const resultId = params?.[0] as string;
        const userId = params?.[1] as string;
        const row = rows.find((entry) =>
          entry.resultId === resultId &&
          entry.userId === userId &&
          entry.readinessStatus === 'READY' &&
          entry.canonicalResultPayload !== null,
        );

        return {
          rows: (row
            ? [{
                result_id: row.resultId,
                attempt_id: row.attemptId,
                assessment_id: row.assessmentId,
                assessment_key: row.assessmentKey,
                assessment_mode: row.mode ?? 'single_domain',
                assessment_title: row.assessmentTitle,
                version_tag: row.versionTag,
                readiness_status: row.readinessStatus,
                generated_at: row.generatedAt,
                created_at: row.createdAt,
                canonical_result_payload: row.canonicalResultPayload,
              }]
            : []) as T[],
        };
      }

      return { rows: [] as T[] };
    },
  };
}

function readyRankedRow(payload: unknown = buildRankedPatternResultPayload()): ResultRowFixture {
  return {
    resultId: 'result-ranked-1',
    attemptId: 'attempt-ranked-1',
    assessmentId: 'assessment-ranked-1',
    assessmentKey: 'test_assessment',
    assessmentTitle: 'Test Assessment',
    versionTag: '1.0.0',
    userId: 'user-1',
    readinessStatus: 'READY',
    generatedAt: '2026-05-07T10:00:00.000Z',
    createdAt: '2026-05-07T10:00:00.000Z',
    canonicalResultPayload: payload,
    mode: 'single_domain',
  };
}

function buildReportFirstPayload(overrides?: Partial<ReportFirstCanonicalPayloadV1>): ReportFirstCanonicalPayloadV1 {
  return {
    metadata: {
      payloadVersion: 1,
      contractName: 'report_first_canonical_payload_v1',
      generatedAt: '2026-05-15T10:00:00.000Z',
      assessmentVersionId: 'version-report-first',
      assessmentKey: 'leadership-approach',
      assessmentTitle: 'Leadership Approach',
      version: '1.0.0',
      attemptId: 'attempt-report-first',
      mode: 'single_domain',
      reportMode: 'single_domain_ranked_pattern',
      reportModel: 'report_first_canonical',
      resultModelKey: 'ranked_pattern',
      domainKey: 'leadership-approach',
      completedAt: '2026-05-15T10:00:00.000Z',
    },
    assessment: {
      key: 'leadership-approach',
      title: 'Leadership Approach',
      version: '1.0.0',
      description: 'Leadership assessment',
    },
    attempt: {
      attemptId: 'attempt-report-first',
      submittedAt: '2026-05-15T10:00:00.000Z',
      completedAt: '2026-05-15T10:00:00.000Z',
      answeredQuestionCount: 24,
      totalQuestionCount: 24,
    },
    domain: {
      key: 'leadership-approach',
      title: 'Leadership Approach',
      description: null,
    },
    topSignal: {
      signalKey: 'process',
      signalLabel: 'Process',
      rank: 1,
      rawScore: 10,
      normalizedPercentage: 42,
    },
    rankedSignals: [
      { rank: 1, signalKey: 'process', signalLabel: 'Process', roleLabel: 'Primary' },
      { rank: 2, signalKey: 'results', signalLabel: 'Results', roleLabel: 'Secondary' },
      { rank: 3, signalKey: 'people', signalLabel: 'People', roleLabel: 'Supporting' },
      { rank: 4, signalKey: 'vision', signalLabel: 'Vision', roleLabel: 'Underplayed' },
    ],
    normalizedScores: [
      { signalKey: 'process', signalLabel: 'Process', normalizedPercent: 42, rawScore: 10 },
      { signalKey: 'results', signalLabel: 'Results', normalizedPercent: 33, rawScore: 8 },
      { signalKey: 'people', signalLabel: 'People', normalizedPercent: 17, rawScore: 4 },
      { signalKey: 'vision', signalLabel: 'Vision', normalizedPercent: 8, rawScore: 2 },
    ],
    scoreShape: {
      value: 'paired',
      policyKey: 'fixed_gap_v1',
      policyVersion: '1.0.0',
    },
    patternKey: 'process_results_people_vision',
    scoring: {
      patternKey: 'process_results_people_vision',
      scoreShape: 'paired',
      rankedSignals: [
        { rank: 1, signalKey: 'process', signalLabel: 'Process', roleLabel: 'Primary' },
        { rank: 2, signalKey: 'results', signalLabel: 'Results', roleLabel: 'Secondary' },
        { rank: 3, signalKey: 'people', signalLabel: 'People', roleLabel: 'Supporting' },
        { rank: 4, signalKey: 'vision', signalLabel: 'Vision', roleLabel: 'Underplayed' },
      ],
      normalizedScores: [
        { signalKey: 'process', signalLabel: 'Process', normalizedPercent: 42, rawScore: 10 },
        { signalKey: 'results', signalLabel: 'Results', normalizedPercent: 33, rawScore: 8 },
        { signalKey: 'people', signalLabel: 'People', normalizedPercent: 17, rawScore: 4 },
        { signalKey: 'vision', signalLabel: 'Vision', normalizedPercent: 8, rawScore: 2 },
      ],
      rawScores: [
        { signalKey: 'process', signalLabel: 'Process', normalizedPercent: 42, rawScore: 10 },
        { signalKey: 'results', signalLabel: 'Results', normalizedPercent: 33, rawScore: 8 },
        { signalKey: 'people', signalLabel: 'People', normalizedPercent: 17, rawScore: 4 },
        { signalKey: 'vision', signalLabel: 'Vision', normalizedPercent: 8, rawScore: 2 },
      ],
      scoreShapeCapturedButNotLanguageDriving: true,
      scoringMethod: 'option_signal_weights',
      normalizationMethod: 'largest_remainder_integer_percentages',
    },
    report: {
      reportKey: 'leadership_process_results_people_vision',
      patternKey: 'process_results_people_vision',
      reportTitle: 'Process, Results, People, Vision',
      hero: {
        title: 'You lead by turning complexity into structured progress',
        resultStatement: 'You create confidence by giving work a clearer way forward.',
      },
      chapters: [
        {
          chapterKey: 'value_creation',
          chapterNumber: 1,
          title: 'How your leadership creates value',
          railLabel: 'Value',
          readerFacing: true,
          blocks: [{ type: 'paragraph', text: 'Persisted report-first chapter.' }],
        },
      ],
    },
    reportFirst: {
      templateId: 'template-1',
      reportKey: 'leadership_process_results_people_vision',
      patternKey: 'process_results_people_vision',
      contentHash: 'hash-1',
      contractName: 'report_first_canonical_payload_v1',
      template: { reportKey: 'leadership_process_results_people_vision' },
    },
    evidence: {
      title: 'Evidence behind your result',
      rankedSignalEvidence: [
        { rank: 1, signalKey: 'process', signalLabel: 'Process', roleLabel: 'Primary' },
        { rank: 2, signalKey: 'results', signalLabel: 'Results', roleLabel: 'Secondary' },
        { rank: 3, signalKey: 'people', signalLabel: 'People', roleLabel: 'Supporting' },
        { rank: 4, signalKey: 'vision', signalLabel: 'Vision', roleLabel: 'Underplayed' },
      ],
      scoreRows: [
        { signalKey: 'process', signalLabel: 'Process', normalizedPercent: 42, rawScore: 10 },
        { signalKey: 'results', signalLabel: 'Results', normalizedPercent: 33, rawScore: 8 },
        { signalKey: 'people', signalLabel: 'People', normalizedPercent: 17, rawScore: 4 },
        { signalKey: 'vision', signalLabel: 'Vision', normalizedPercent: 8, rawScore: 2 },
      ],
      scoreShapeBadge: { label: 'paired', readerFacing: false },
      explanatoryNote: 'Persisted evidence.',
    },
    diagnostics: {
      readinessStatus: 'ready',
      scoringMethod: 'option_signal_weights_only',
      normalizationMethod: 'largest_remainder_integer_percentages',
      answeredQuestionCount: 24,
      totalQuestionCount: 24,
      signalCount: 4,
      derivedPairCount: 0,
      topPair: null,
      scoreShapePolicy: { policyKey: 'fixed_gap_v1', policyVersion: '1.0.0' },
      patternLookup: {
        patternKey: 'process_results_people_vision',
        rankSignalKeys: ['process', 'results', 'people', 'vision'],
      },
      reportFirstTemplate: {
        id: 'template-1',
        reportKey: 'leadership_process_results_people_vision',
        contentHash: 'hash-1',
        reportContract: 'report_first_canonical_payload_v1',
      },
      sourceReportKey: 'leadership_process_results_people_vision',
      sourceAssessmentVersionId: 'version-report-first',
      sourceContentHash: 'hash-1',
      adminNotesExcluded: true,
      warningList: [],
      generatedFrom: 'compiled_report_first_template',
      counts: { domainCount: 1, questionCount: 24, optionCount: 96, weightCount: 96 },
      warnings: [],
    },
    ...overrides,
  };
}

function readyReportFirstRow(payload: unknown = buildReportFirstPayload()): ResultRowFixture {
  return {
    resultId: 'result-report-first-1',
    attemptId: 'attempt-report-first',
    assessmentId: 'assessment-report-first',
    assessmentKey: 'leadership-approach',
    assessmentTitle: 'Leadership Approach',
    versionTag: '1.0.0',
    userId: 'user-1',
    readinessStatus: 'READY',
    generatedAt: '2026-05-15T10:00:00.000Z',
    createdAt: '2026-05-15T10:00:00.000Z',
    canonicalResultPayload: payload,
    mode: 'single_domain',
  };
}

test('read model accepts persisted ranked-pattern payload and exposes persisted score fields', async () => {
  const service = createResultReadModelService({ db: createFakeDb([readyRankedRow()]) });

  const detail = await service.getAssessmentResultDetail({
    userId: 'user-1',
    resultId: 'result-ranked-1',
  });

  assert.equal(detail.assessmentTitle, 'Test Assessment');
  assert.equal(detail.version, '1.0.0');
  assert.equal(detail.topSignal?.signalKey, 'alpha');
  assert.equal(detail.topSignal?.percentage, 55);
  assert.deepEqual(
    detail.rankedSignals.map((signal) => [signal.signalKey, signal.percentage, signal.rank]),
    [['alpha', 55, 1], ['beta', 25, 2], ['gamma', 12, 3], ['delta', 8, 4]],
  );
  assert.deepEqual(
    detail.normalizedScores.map((signal) => [signal.signalKey, signal.normalizedValue]),
    [['alpha', 55], ['beta', 25], ['gamma', 12], ['delta', 8]],
  );
  assert.equal(detail.scoreShape, 'concentrated');
  assert.equal(detail.patternKey, 'alpha_beta_gamma_delta');
  assert.equal(detail.summaryLine, 'You may recognise this as a clear first-route pattern.');
  assert.equal(detail.singleDomainResult?.scoreShape?.value, 'concentrated');
  assert.equal(detail.singleDomainResult?.patternKey, 'alpha_beta_gamma_delta');
});

test('read model recognises report-first payload and exposes persisted report content and scoring metadata', async () => {
  const service = createResultReadModelService({ db: createFakeDb([readyReportFirstRow()]) });

  const detail = await service.getAssessmentResultDetail({
    userId: 'user-1',
    resultId: 'result-report-first-1',
  });

  assert.equal(detail.resultKind, 'report_first');
  assert.equal(detail.mode, 'single_domain');
  assert.equal(detail.singleDomainResult, null);
  assert.ok(detail.reportFirstResult);
  assert.equal(detail.reportFirstResult.metadata.contractName, 'report_first_canonical_payload_v1');
  assert.equal(detail.reportFirstResult.assessment.title, 'Leadership Approach');
  assert.equal(detail.reportFirstResult.attempt.answeredQuestionCount, 24);
  assert.equal(detail.reportFirstResult.domain.key, 'leadership-approach');
  assert.equal(detail.topSignal?.signalKey, 'process');
  assert.equal(detail.topSignal?.percentage, 42);
  assert.deepEqual(
    detail.rankedSignals.map((signal) => [signal.signalKey, signal.percentage, signal.rank]),
    [['process', 42, 1], ['results', 33, 2], ['people', 17, 3], ['vision', 8, 4]],
  );
  assert.deepEqual(
    detail.normalizedScores.map((signal) => [signal.signalKey, signal.normalizedValue, signal.rawTotal]),
    [['process', 42, 10], ['results', 33, 8], ['people', 17, 4], ['vision', 8, 2]],
  );
  assert.equal(detail.scoreShape, 'paired');
  assert.equal(detail.patternKey, 'process_results_people_vision');
  assert.equal(detail.summaryLine, 'You create confidence by giving work a clearer way forward.');
  assert.equal(
    (detail.reportFirstResult.report as { reportTitle?: string }).reportTitle,
    'Process, Results, People, Vision',
  );
  assert.equal(detail.reportFirstResult.diagnostics.reportFirstTemplate.id, 'template-1');
});

test('result list projects ranked-pattern summary without recomputing pattern meaning', async () => {
  const service = createResultReadModelService({ db: createFakeDb([readyRankedRow()]) });
  const results = await service.listAssessmentResults({ userId: 'user-1' });

  assert.equal(results.length, 1);
  assert.equal(results[0]?.assessmentTitle, 'Test Assessment');
  assert.equal(results[0]?.topSignal?.title, 'Alpha');
  assert.equal(results[0]?.topSignalPercentage, 55);
  assert.equal(results[0]?.scoreShape, 'concentrated');
  assert.equal(results[0]?.patternKey, 'alpha_beta_gamma_delta');
  assert.equal(results[0]?.summaryLine, 'You may recognise this as a clear first-route pattern.');
  assert.deepEqual(
    results[0]?.signalSnapshot.map((signal) => [signal.signalKey, signal.percentage, signal.rank]),
    [['alpha', 55, 1], ['beta', 25, 2], ['gamma', 12, 3], ['delta', 8, 4]],
  );
});

test('result list projects report-first summary from persisted payload only', async () => {
  const service = createResultReadModelService({ db: createFakeDb([readyReportFirstRow()]) });
  const results = await service.listAssessmentResults({ userId: 'user-1' });

  assert.equal(results.length, 1);
  assert.equal(results[0]?.resultKind, 'report_first');
  assert.equal(results[0]?.assessmentTitle, 'Leadership Approach');
  assert.equal(results[0]?.topSignal?.title, 'Process');
  assert.equal(results[0]?.topSignalPercentage, 42);
  assert.equal(results[0]?.scoreShape, 'paired');
  assert.equal(results[0]?.patternKey, 'process_results_people_vision');
  assert.equal(results[0]?.summaryLine, 'You create confidence by giving work a clearer way forward.');
  assert.deepEqual(
    results[0]?.signalSnapshot.map((signal) => [signal.signalKey, signal.percentage, signal.rank]),
    [['process', 42, 1], ['results', 33, 2], ['people', 17, 3], ['vision', 8, 4]],
  );
});

test('malformed ranked-pattern payload is rejected instead of filled with legacy fallback fields', async () => {
  const malformed = {
    ...buildRankedPatternResultPayload(),
    closingIntegration: undefined,
  };
  const service = createResultReadModelService({ db: createFakeDb([readyRankedRow(malformed)]) });

  await assert.rejects(
    () => service.getAssessmentResultDetail({
      userId: 'user-1',
      resultId: 'result-ranked-1',
    }),
    AssessmentResultPayloadError,
  );
  assert.deepEqual(await service.listAssessmentResults({ userId: 'user-1' }), []);
});

test('malformed report-first payload is rejected instead of fabricating report language', async () => {
  const malformed = {
    ...buildReportFirstPayload(),
    reportFirst: undefined,
  };
  const service = createResultReadModelService({ db: createFakeDb([readyReportFirstRow(malformed)]) });

  await assert.rejects(
    () => service.getAssessmentResultDetail({
      userId: 'user-1',
      resultId: 'result-report-first-1',
    }),
    AssessmentResultPayloadError,
  );
  assert.deepEqual(await service.listAssessmentResults({ userId: 'user-1' }), []);
});
