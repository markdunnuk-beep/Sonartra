import test from 'node:test';
import assert from 'node:assert/strict';

import type { Queryable } from '@/lib/engine/repository-sql';
import type { CanonicalResultPayload } from '@/lib/engine/types';
import { createResultReadModelService } from '@/lib/server/result-read-model';
import {
  AssessmentResultNotFoundError,
  AssessmentResultPayloadError,
} from '@/lib/server/result-read-model-types';

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
};

function buildPayload(params?: {
  resultAttemptId?: string;
  includeEmptyDomain?: boolean;
  includeZeroSignal?: boolean;
}): CanonicalResultPayload {
  const includeEmptyDomain = params?.includeEmptyDomain ?? true;
  const includeZeroSignal = params?.includeZeroSignal ?? true;

  return {
    metadata: {
      assessmentKey: 'wplp80',
      assessmentTitle: 'WPLP-80',
      version: '1.0.0',
      attemptId: params?.resultAttemptId ?? 'attempt-1',
      completedAt: '2026-01-01T00:01:00.000Z',
    },
    intro: {
      assessmentDescription: null,
    },
    hero: {
      headline: 'Core Focus leads the current pattern',
      narrative: 'concentrated profile with Core Focus leading and Signals holding the strongest domain share.',
      primaryPattern: {
        label: 'Core Focus',
        signalKey: 'core_focus',
        signalLabel: 'Core Focus',
      },
      domainHighlights: [{
        domainKey: 'signals',
        domainLabel: 'Signals',
        primarySignalKey: 'core_focus',
        primarySignalLabel: 'Core Focus',
        summary: null,
      }],
    },
    domains: Object.freeze([
      ...(includeEmptyDomain
        ? [{
            domainKey: 'section_a',
            domainLabel: 'Section A',
            summary: null,
            focus: null,
            pressure: null,
            environment: null,
            primarySignal: null,
            secondarySignal: null,
            pairSummary: null,
            signals: Object.freeze([]),
          }]
        : []),
      {
        domainKey: 'signals',
        domainLabel: 'Signals',
        summary: 'Core Focus leads this domain, with Role Executor adding a secondary influence.',
        focus: null,
        pressure: null,
        environment: null,
        primarySignal: {
          signalKey: 'core_focus',
          signalLabel: 'Core Focus',
          summary: null,
          strength: null,
          watchout: null,
          development: null,
        },
        secondarySignal: includeZeroSignal
          ? {
              signalKey: 'role_executor',
              signalLabel: 'Role Executor',
              summary: null,
              strength: null,
              watchout: null,
              development: null,
            }
          : null,
        pairSummary: includeZeroSignal
          ? {
              pairKey: 'executor_focus',
              text: null,
            }
          : null,
        signals: Object.freeze([
          {
            signalKey: 'core_focus',
            signalLabel: 'Core Focus',
            score: 70,
            withinDomainPercent: 70,
            rank: 1,
            isPrimary: true,
            isSecondary: false,
          },
          ...(includeZeroSignal
            ? [{
                signalKey: 'role_executor',
                signalLabel: 'Role Executor',
                score: 0,
                withinDomainPercent: 0,
                rank: 2,
                isPrimary: false,
                isSecondary: true,
              }]
            : []),
        ]),
      },
    ]),
    actions: {
      strengths: Object.freeze([{
        signalKey: 'core_focus',
        signalLabel: 'Core Focus',
        text: 'Core Focus strength.',
      }]),
      watchouts: Object.freeze([{
        signalKey: 'role_executor',
        signalLabel: 'Role Executor',
        text: 'Role Executor watchout.',
      }]),
      developmentFocus: Object.freeze([{
        signalKey: 'role_executor',
        signalLabel: 'Role Executor',
        text: 'Role Executor development.',
      }]),
    },
    diagnostics: {
      readinessStatus: 'processing',
      scoring: {
        scoringMethod: 'option_signal_weights_only',
        totalQuestions: 1,
        answeredQuestions: 1,
        unansweredQuestions: 0,
        totalResponsesProcessed: 1,
        totalWeightsApplied: 1,
        totalScoreMass: 7,
        zeroScoreSignalCount: includeZeroSignal ? 1 : 0,
        zeroAnswerSubmission: false,
        warnings: Object.freeze([]),
        generatedAt: '2026-01-01T00:01:00.000Z',
      },
      normalization: {
        normalizationMethod: 'largest_remainder_integer_percentages',
        totalScoreMass: 7,
        zeroMass: false,
        percentage: 70,
        globalPercentageSum: 70,
        domainPercentageSums: Object.freeze({
          'domain-section': 0,
          'domain-signals': 70,
        }),
        roundingAdjustmentsApplied: 0,
        zeroScoreSignalCount: includeZeroSignal ? 1 : 0,
        warnings: Object.freeze([]),
        generatedAt: '2026-01-01T00:01:00.000Z',
      },
      answeredQuestionCount: 1,
      totalQuestionCount: 1,
      missingQuestionIds: Object.freeze([]),
      topSignalSelectionBasis: 'normalized_rank',
      rankedSignalCount: includeZeroSignal ? 2 : 1,
      domainCount: includeEmptyDomain ? 2 : 1,
      zeroMass: false,
      zeroMassTopSignalFallbackApplied: false,
      warnings: Object.freeze([]),
      generatedAt: '2026-01-01T00:01:00.000Z',
    },
  };
}

function createFakeDb(rows: ResultRowFixture[]): Queryable {
  return {
    async query<T>(text: string, params?: unknown[]) {
      if (text.includes('FROM results r') && text.includes('ORDER BY COALESCE(r.generated_at, r.created_at) DESC, r.id DESC')) {
        const userId = params?.[0] as string;
        const filtered = rows
          .filter((row) => row.userId === userId && row.readinessStatus === 'READY' && row.canonicalResultPayload !== null)
          .sort((left, right) => {
            const leftKey = left.generatedAt ?? left.createdAt;
            const rightKey = right.generatedAt ?? right.createdAt;
            if (rightKey !== leftKey) {
              return rightKey.localeCompare(leftKey);
            }
            return right.resultId.localeCompare(left.resultId);
          });

        return {
          rows: filtered.map((row) => ({
            result_id: row.resultId,
            attempt_id: row.attemptId,
            assessment_id: row.assessmentId,
            assessment_key: row.assessmentKey,
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
        const row = rows.find(
          (entry) =>
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

test('empty result list returns empty array', async () => {
  const service = createResultReadModelService({ db: createFakeDb([]) });
  const results = await service.listAssessmentResults({ userId: 'user-1' });

  assert.deepEqual(results, []);
});

test('ready persisted result appears in list view and ordering is deterministic newest first', async () => {
  const service = createResultReadModelService({
    db: createFakeDb([
      {
        resultId: 'result-1',
        attemptId: 'attempt-1',
        assessmentId: 'assessment-1',
        assessmentKey: 'wplp80',
        assessmentTitle: 'WPLP-80',
        versionTag: '1.0.0',
        userId: 'user-1',
        readinessStatus: 'READY',
        generatedAt: '2026-01-01T00:01:00.000Z',
        createdAt: '2026-01-01T00:01:00.000Z',
        canonicalResultPayload: buildPayload({ resultAttemptId: 'attempt-1' }),
      },
      {
        resultId: 'result-2',
        attemptId: 'attempt-2',
        assessmentId: 'assessment-1',
        assessmentKey: 'wplp80',
        assessmentTitle: 'WPLP-80',
        versionTag: '1.0.1',
        userId: 'user-1',
        readinessStatus: 'READY',
        generatedAt: '2026-01-01T00:02:00.000Z',
        createdAt: '2026-01-01T00:02:00.000Z',
        canonicalResultPayload: buildPayload({ resultAttemptId: 'attempt-2' }),
      },
      {
        resultId: 'result-3',
        attemptId: 'attempt-3',
        assessmentId: 'assessment-1',
        assessmentKey: 'wplp80',
        assessmentTitle: 'WPLP-80',
        versionTag: '1.0.0',
        userId: 'user-1',
        readinessStatus: 'FAILED',
        generatedAt: null,
        createdAt: '2026-01-01T00:03:00.000Z',
        canonicalResultPayload: buildPayload({ resultAttemptId: 'attempt-3' }),
      },
    ]),
  });

  const results = await service.listAssessmentResults({ userId: 'user-1' });

  assert.equal(results.length, 2);
  assert.deepEqual(results.map((result) => result.resultId), ['result-2', 'result-1']);
  assert.equal(results[0]?.topSignal?.signalId, 'signal-core');
  assert.equal(results[0]?.resultAvailable, true);
});

test('detail load returns canonical payload projection including empty domains and zero-score signals', async () => {
  const service = createResultReadModelService({
    db: createFakeDb([
      {
        resultId: 'result-1',
        attemptId: 'attempt-1',
        assessmentId: 'assessment-1',
        assessmentKey: 'wplp80',
        assessmentTitle: 'WPLP-80',
        versionTag: '1.0.0',
        userId: 'user-1',
        readinessStatus: 'READY',
        generatedAt: '2026-01-01T00:01:00.000Z',
        createdAt: '2026-01-01T00:01:00.000Z',
        canonicalResultPayload: buildPayload(),
      },
    ]),
  });

  const detail = await service.getAssessmentResultDetail({
    userId: 'user-1',
    resultId: 'result-1',
  });

  assert.equal(detail.resultId, 'result-1');
  assert.equal(detail.domainSummaries[0]?.signalScores.length, 0);
  assert.equal(detail.domainSummaries[0]?.domainSource, 'question_section');
  assert.equal(detail.normalizedScores[1]?.rawTotal, 0);
  assert.equal(detail.normalizedScores[1]?.isOverlay, true);
  assert.equal(detail.domainSummaries[1]?.interpretation?.primarySignalKey, 'core_focus');
  assert.equal(detail.actions.strengths[0]?.signalKey, 'core_focus');
  assert.equal(detail.actions.strengths[0]?.text, 'Core Focus strength.');
  assert.equal(detail.strengths[0]?.detail, 'Core Focus strength.');
});

test('malformed payload triggers explicit payload error', async () => {
  const service = createResultReadModelService({
    db: createFakeDb([
      {
        resultId: 'result-1',
        attemptId: 'attempt-1',
        assessmentId: 'assessment-1',
        assessmentKey: 'wplp80',
        assessmentTitle: 'WPLP-80',
        versionTag: '1.0.0',
        userId: 'user-1',
        readinessStatus: 'READY',
        generatedAt: '2026-01-01T00:01:00.000Z',
        createdAt: '2026-01-01T00:01:00.000Z',
        canonicalResultPayload: { invalid: true },
      },
    ]),
  });

  await assert.rejects(
    () => service.getAssessmentResultDetail({ userId: 'user-1', resultId: 'result-1' }),
    AssessmentResultPayloadError,
  );
});

test('missing or non-owned result triggers not found', async () => {
  const service = createResultReadModelService({
    db: createFakeDb([
      {
        resultId: 'result-1',
        attemptId: 'attempt-1',
        assessmentId: 'assessment-1',
        assessmentKey: 'wplp80',
        assessmentTitle: 'WPLP-80',
        versionTag: '1.0.0',
        userId: 'user-2',
        readinessStatus: 'READY',
        generatedAt: '2026-01-01T00:01:00.000Z',
        createdAt: '2026-01-01T00:01:00.000Z',
        canonicalResultPayload: buildPayload(),
      },
    ]),
  });

  await assert.rejects(
    () => service.getAssessmentResultDetail({ userId: 'user-1', resultId: 'result-1' }),
    AssessmentResultNotFoundError,
  );
});

test('repeated reads are deterministic and byte-stable', async () => {
  const service = createResultReadModelService({
    db: createFakeDb([
      {
        resultId: 'result-1',
        attemptId: 'attempt-1',
        assessmentId: 'assessment-1',
        assessmentKey: 'wplp80',
        assessmentTitle: 'WPLP-80',
        versionTag: '1.0.0',
        userId: 'user-1',
        readinessStatus: 'READY',
        generatedAt: '2026-01-01T00:01:00.000Z',
        createdAt: '2026-01-01T00:01:00.000Z',
        canonicalResultPayload: buildPayload(),
      },
    ]),
  });

  const firstList = await service.listAssessmentResults({ userId: 'user-1' });
  const secondList = await service.listAssessmentResults({ userId: 'user-1' });
  const firstDetail = await service.getAssessmentResultDetail({ userId: 'user-1', resultId: 'result-1' });
  const secondDetail = await service.getAssessmentResultDetail({ userId: 'user-1', resultId: 'result-1' });

  assert.equal(JSON.stringify(firstList), JSON.stringify(secondList));
  assert.equal(JSON.stringify(firstDetail), JSON.stringify(secondDetail));
});
