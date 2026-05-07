import test from 'node:test';
import assert from 'node:assert/strict';

import type { Queryable } from '@/lib/engine/repository-sql';
import { createResultReadModelService } from '@/lib/server/result-read-model';
import { AssessmentResultPayloadError } from '@/lib/server/result-read-model-types';
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
