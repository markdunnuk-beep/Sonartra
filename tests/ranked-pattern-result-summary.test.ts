import test from 'node:test';
import assert from 'node:assert/strict';

import type { Queryable } from '@/lib/engine/repository-sql';
import {
  mapLifecycleStatusToCta,
  projectAssessmentWorkspaceItem,
  selectDashboardRecommendation,
} from '@/lib/server/dashboard-workspace-view-model';
import { createResultsService } from '@/lib/server/results-service';
import { buildRankedPatternResultPayload } from '@/tests/fixtures/ranked-pattern-result-payload';

function createFakeDb(): Queryable {
  return {
    async query<T>(text: string, params?: unknown[]) {
      assert.doesNotMatch(text, /assessment_result_language_rows/i);
      assert.doesNotMatch(text, /option_signal_weights|responses|assessment_ranked_patterns/i);

      if (
        text.includes('FROM results r') &&
        text.includes('ORDER BY COALESCE(r.generated_at, r.created_at) DESC, r.id DESC')
      ) {
        const userId = params?.[0] as string;
        if (userId !== 'user-1') {
          return { rows: [] as T[] };
        }

        return {
          rows: [{
            result_id: 'result-ranked-1',
            attempt_id: 'attempt-ranked-1',
            assessment_id: 'assessment-ranked-1',
            assessment_key: 'test_assessment',
            assessment_mode: 'single_domain',
            assessment_title: 'Test Assessment',
            version_tag: '1.0.0',
            readiness_status: 'READY',
            generated_at: '2026-05-07T10:00:00.000Z',
            created_at: '2026-05-07T10:00:00.000Z',
            canonical_result_payload: buildRankedPatternResultPayload(),
          }] as T[],
        };
      }

      return { rows: [] as T[] };
    },
  };
}

test('results list summary reads ranked-pattern fields from persisted payload only', async () => {
  const results = await createResultsService({ db: createFakeDb() }).listResults({
    userId: 'user-1',
  });

  assert.equal(results.length, 1);
  assert.equal(results[0]?.assessmentTitle, 'Test Assessment');
  assert.equal(results[0]?.completedAt, '2026-05-07T10:00:00.000Z');
  assert.equal(results[0]?.href, '/app/results/single-domain/result-ranked-1');
  assert.deepEqual(
    results[0]?.signalSnapshot.map((signal) => ({
      signalKey: signal.signalKey,
      signalLabel: signal.signalLabel,
      percentage: signal.percentage,
      rank: signal.rank,
    })),
    [
      { signalKey: 'alpha', signalLabel: 'Alpha', percentage: 55, rank: 1 },
      { signalKey: 'beta', signalLabel: 'Beta', percentage: 25, rank: 2 },
      { signalKey: 'gamma', signalLabel: 'Gamma', percentage: 12, rank: 3 },
      { signalKey: 'delta', signalLabel: 'Delta', percentage: 8, rank: 4 },
    ],
  );
});

test('workspace and dashboard summaries can use ranked-pattern compact read-model data', () => {
  const latestReadyResult = {
    resultId: 'result-ranked-1',
    attemptId: 'attempt-ranked-1',
    assessmentId: 'assessment-ranked-1',
    assessmentKey: 'test_assessment',
    mode: 'single_domain' as const,
    assessmentTitle: 'Test Assessment',
    version: '1.0.0',
    readinessStatus: 'ready' as const,
    createdAt: '2026-05-07T10:00:00.000Z',
    generatedAt: '2026-05-07T10:00:00.000Z',
    topSignal: {
      signalId: 'alpha',
      signalKey: 'alpha',
      title: 'Alpha',
      domainId: 'test_domain',
      domainKey: 'test_domain',
      normalizedValue: 55,
      rawTotal: 55,
      percentage: 55,
      rank: 1 as const,
    },
    topSignalPercentage: 55,
    signalSnapshot: [],
    scoreShape: 'concentrated',
    patternKey: 'alpha_beta_gamma_delta',
    resultAvailable: true as const,
  };
  const workspaceItem = projectAssessmentWorkspaceItem({
    assessment: {
      assessmentId: 'assessment-ranked-1',
      assessmentKey: 'test_assessment',
      title: 'Test Assessment',
      description: null,
      versionTag: '1.0.0',
    },
    lifecycle: {
      attemptId: 'attempt-ranked-1',
      assessmentId: 'assessment-ranked-1',
      assessmentKey: 'test_assessment',
      assessmentVersionId: 'version-ranked-1',
      versionTag: '1.0.0',
      status: 'ready',
      startedAt: '2026-05-07T09:30:00.000Z',
      submittedAt: '2026-05-07T09:58:00.000Z',
      updatedAt: '2026-05-07T10:00:00.000Z',
      completedAt: '2026-05-07T10:00:00.000Z',
      totalQuestions: 24,
      answeredQuestions: 24,
      completionPercentage: 100,
      latestResultId: 'result-ranked-1',
      latestResultReady: true,
      latestResultStatus: 'READY',
      lastError: null,
    },
    latestReadyResult,
  });
  const recommendation = selectDashboardRecommendation([workspaceItem], latestReadyResult);

  assert.equal(workspaceItem.status, 'ready');
  assert.equal(workspaceItem.latestReadyResultId, 'result-ranked-1');
  assert.equal(workspaceItem.latestTopSignalTitle, 'Alpha');
  assert.equal(workspaceItem.latestTopSignalPercentage, 55);
  assert.equal(workspaceItem.cta.href, '/app/results/single-domain/result-ranked-1');
  assert.equal(recommendation?.kind, 'view_results');
  assert.match(recommendation?.description ?? '', /Alpha is the latest leading signal/);
});
