import test from 'node:test';
import assert from 'node:assert/strict';

import type { Queryable } from '@/lib/engine/repository-sql';
import type { CanonicalResultPayload } from '@/lib/engine/types';
import {
  buildAssessmentWorkspaceViewModel,
  buildDashboardViewModel,
  mapLifecycleStatusToCta,
  projectAssessmentWorkspaceItem,
  selectDashboardRecommendation,
  type AssessmentWorkspaceItemViewModel,
} from '@/lib/server/dashboard-workspace-view-model';
import type { AssessmentAttemptLifecycleViewModel } from '@/lib/server/assessment-attempt-lifecycle-types';
import type { AssessmentResultListItem } from '@/lib/server/result-read-model-types';

type InventoryFixture = {
  assessmentId: string;
  assessmentKey: string;
  title: string;
  description: string | null;
  assessmentVersionId: string;
  versionTag: string;
  publishedAt: string | null;
};

type AttemptFixture = {
  attemptId: string;
  userId: string;
  assessmentId: string;
  assessmentVersionId: string;
  lifecycleStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'SCORED' | 'RESULT_READY' | 'FAILED';
  startedAt: string;
  submittedAt: string | null;
  completedAt: string | null;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
};

type ResponseFixture = {
  attemptId: string;
  questionId: string;
};

type ResultFixture = {
  resultId: string;
  attemptId: string;
  assessmentId: string;
  assessmentVersionId: string;
  assessmentKey: string;
  assessmentTitle: string;
  versionTag: string;
  userId: string;
  pipelineStatus: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  readinessStatus: 'READY' | 'FAILED' | 'PROCESSING';
  generatedAt: string | null;
  failureReason: string | null;
  hasCanonicalResultPayload: boolean;
  createdAt: string;
  updatedAt: string;
  canonicalResultPayload: unknown;
};

function buildPayload(params?: {
  assessmentKey?: string;
  version?: string;
  attemptId?: string;
  topSignalTitle?: string;
  topSignalPercentage?: number;
}): CanonicalResultPayload {
  const topSignalTitle = params?.topSignalTitle ?? 'Core Focus';
  const topSignalPercentage = params?.topSignalPercentage ?? 72;

  return {
    metadata: {
      assessmentKey: params?.assessmentKey ?? 'wplp80',
      version: params?.version ?? '1.0.0',
      attemptId: params?.attemptId ?? 'attempt-1',
    },
    topSignal: {
      signalId: 'signal-core',
      signalKey: 'core_focus',
      title: topSignalTitle,
      domainId: 'domain-signals',
      domainKey: 'signals',
      normalizedValue: topSignalPercentage,
      rawTotal: 7,
      percentage: topSignalPercentage,
      rank: 1,
    },
    rankedSignals: Object.freeze([{
      signalId: 'signal-core',
      signalKey: 'core_focus',
      title: topSignalTitle,
      domainId: 'domain-signals',
      domainKey: 'signals',
      normalizedValue: topSignalPercentage,
      rawTotal: 7,
      percentage: topSignalPercentage,
      domainPercentage: topSignalPercentage,
      isOverlay: false,
      overlayType: 'none',
      rank: 1,
    }]),
    normalizedScores: Object.freeze([{
      signalId: 'signal-core',
      signalKey: 'core_focus',
      signalTitle: topSignalTitle,
      domainId: 'domain-signals',
      domainKey: 'signals',
      domainSource: 'signal_group',
      isOverlay: false,
      overlayType: 'none',
      rawTotal: 7,
      normalizedValue: topSignalPercentage,
      percentage: topSignalPercentage,
      domainPercentage: topSignalPercentage,
      rank: 1,
    }]),
    domainSummaries: Object.freeze([{
      domainId: 'domain-signals',
      domainKey: 'signals',
      domainTitle: 'Signals',
      domainSource: 'signal_group',
      rawTotal: 7,
      normalizedValue: 100,
      percentage: 100,
      signalScores: Object.freeze([{
        signalId: 'signal-core',
        signalKey: 'core_focus',
        signalTitle: topSignalTitle,
        domainId: 'domain-signals',
        domainKey: 'signals',
        domainSource: 'signal_group' as const,
        isOverlay: false,
        overlayType: 'none' as const,
        rawTotal: 7,
        normalizedValue: topSignalPercentage,
        percentage: topSignalPercentage,
        domainPercentage: topSignalPercentage,
        rank: 1,
      }]),
      signalCount: 1,
      answeredQuestionCount: 1,
      rankedSignalIds: Object.freeze(['signal-core']),
    }]),
    overviewSummary: {
      headline: `${topSignalTitle} leads the current pattern`,
      narrative: `${topSignalTitle} leads the persisted result summary.`,
    },
    strengths: Object.freeze([]),
    watchouts: Object.freeze([]),
    developmentFocus: Object.freeze([]),
    diagnostics: {
      readinessStatus: 'ready',
      scoring: {
        scoringMethod: 'option_signal_weights_only',
        totalQuestions: 1,
        answeredQuestions: 1,
        unansweredQuestions: 0,
        totalResponsesProcessed: 1,
        totalWeightsApplied: 1,
        totalScoreMass: 7,
        zeroScoreSignalCount: 0,
        zeroAnswerSubmission: false,
        warnings: Object.freeze([]),
        generatedAt: '2026-01-01T00:01:00.000Z',
      },
      normalization: {
        normalizationMethod: 'largest_remainder_integer_percentages',
        totalScoreMass: 7,
        zeroMass: false,
        globalPercentageSum: 100,
        domainPercentageSums: Object.freeze({
          'domain-signals': 100,
        }),
        roundingAdjustmentsApplied: 0,
        zeroScoreSignalCount: 0,
        warnings: Object.freeze([]),
        generatedAt: '2026-01-01T00:01:00.000Z',
      },
      answeredQuestionCount: 1,
      totalQuestionCount: 1,
      missingQuestionIds: Object.freeze([]),
      topSignalSelectionBasis: 'normalized_rank',
      rankedSignalCount: 1,
      domainCount: 1,
      zeroMass: false,
      zeroMassTopSignalFallbackApplied: false,
      warnings: Object.freeze([]),
      generatedAt: '2026-01-01T00:01:00.000Z',
    },
  };
}

function createAssessmentItem(
  params: Partial<AssessmentWorkspaceItemViewModel> & Pick<AssessmentWorkspaceItemViewModel, 'assessmentKey' | 'title' | 'status' | 'cta'>,
): AssessmentWorkspaceItemViewModel {
  return {
    assessmentId: params.assessmentId ?? `${params.assessmentKey}-id`,
    assessmentKey: params.assessmentKey,
    title: params.title,
    description: params.description ?? null,
    versionTag: params.versionTag ?? '1.0.0',
    status: params.status,
    statusLabel: params.statusLabel ?? params.status,
    statusDetail: params.statusDetail ?? 'detail',
    totalQuestions: params.totalQuestions ?? 10,
    answeredQuestions: params.answeredQuestions ?? 0,
    completionPercentage: params.completionPercentage ?? 0,
    attemptId: params.attemptId ?? null,
    latestReadyResultId: params.latestReadyResultId ?? null,
    latestReadyResultAt: params.latestReadyResultAt ?? null,
    latestTopSignalTitle: params.latestTopSignalTitle ?? null,
    latestTopSignalPercentage: params.latestTopSignalPercentage ?? null,
    cta: params.cta,
  };
}

function createLifecycle(params?: Partial<AssessmentAttemptLifecycleViewModel>): AssessmentAttemptLifecycleViewModel {
  return {
    attemptId: params?.attemptId ?? null,
    assessmentId: params?.assessmentId ?? 'assessment-1',
    assessmentKey: params?.assessmentKey ?? 'wplp80',
    assessmentVersionId: params?.assessmentVersionId ?? 'version-1',
    versionTag: params?.versionTag ?? '1.0.0',
    status: params?.status ?? 'not_started',
    startedAt: params?.startedAt ?? null,
    updatedAt: params?.updatedAt ?? null,
    completedAt: params?.completedAt ?? null,
    totalQuestions: params?.totalQuestions ?? 20,
    answeredQuestions: params?.answeredQuestions ?? 0,
    completionPercentage: params?.completionPercentage ?? 0,
    latestResultId: params?.latestResultId ?? null,
    latestResultReady: params?.latestResultReady ?? false,
    latestResultStatus: params?.latestResultStatus ?? null,
    lastError: params?.lastError ?? null,
  };
}

function createResultListItem(params?: Partial<AssessmentResultListItem>): AssessmentResultListItem {
  return {
    resultId: params?.resultId ?? 'result-1',
    attemptId: params?.attemptId ?? 'attempt-1',
    assessmentId: params?.assessmentId ?? 'assessment-1',
    assessmentKey: params?.assessmentKey ?? 'wplp80',
    assessmentTitle: params?.assessmentTitle ?? 'WPLP-80',
    version: params?.version ?? '1.0.0',
    readinessStatus: 'ready',
    createdAt: params?.createdAt ?? '2026-01-01T00:01:00.000Z',
    generatedAt: params?.generatedAt ?? '2026-01-01T00:01:00.000Z',
    topSignal: params?.topSignal ?? {
      signalId: 'signal-core',
      signalKey: 'core_focus',
      title: 'Core Focus',
      domainId: 'domain-signals',
      domainKey: 'signals',
      normalizedValue: 72,
      rawTotal: 7,
      percentage: 72,
      rank: 1,
    },
    topSignalPercentage: params?.topSignalPercentage ?? 72,
    resultAvailable: true,
  };
}

function createFakeDb(params: {
  inventory: InventoryFixture[];
  attempts?: AttemptFixture[];
  responses?: ResponseFixture[];
  results?: ResultFixture[];
  questionCountByVersionId?: Record<string, number>;
}): Queryable {
  const attempts = [...(params.attempts ?? [])];
  const responses = [...(params.responses ?? [])];
  const results = [...(params.results ?? [])];
  const inventory = [...params.inventory];
  const inventoryByKey = new Map(inventory.map((item) => [item.assessmentKey, item]));
  const inventoryById = new Map(inventory.map((item) => [item.assessmentId, item]));
  const questionCountByVersionId = {
    ...Object.fromEntries(inventory.map((item) => [item.assessmentVersionId, 0])),
    ...(params.questionCountByVersionId ?? {}),
  };

  return {
    async query<T>(text: string, queryParams?: unknown[]) {
      if (text.includes('a.title AS assessment_title') && text.includes("WHERE av.lifecycle_status = 'PUBLISHED'")) {
        return {
          rows: inventory.map((item) => ({
            assessment_id: item.assessmentId,
            assessment_key: item.assessmentKey,
            assessment_title: item.title,
            assessment_description: item.description,
            assessment_version_id: item.assessmentVersionId,
            version_tag: item.versionTag,
            published_at: item.publishedAt,
          })) as T[],
        };
      }

      if (text.includes('FROM assessments a') && text.includes("WHERE a.assessment_key = $1")) {
        const assessmentKey = queryParams?.[0] as string;
        const item = inventoryByKey.get(assessmentKey);
        if (!item) {
          return { rows: [] as T[] };
        }

        return {
          rows: ([{
            assessment_id: item.assessmentId,
            assessment_key: item.assessmentKey,
            assessment_version_id: item.assessmentVersionId,
            version_tag: item.versionTag,
          }] as unknown[]) as T[],
        };
      }

      if (text.includes('FROM attempts') && text.includes("AND lifecycle_status = 'IN_PROGRESS'")) {
        const [userId, assessmentId] = queryParams as [string, string];
        const row = attempts
          .filter((attempt) => attempt.userId === userId && attempt.assessmentId === assessmentId && attempt.lifecycleStatus === 'IN_PROGRESS')
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

        if (!row) {
          return { rows: [] as T[] };
        }

        return {
          rows: ([{
            attempt_id: row.attemptId,
            user_id: row.userId,
            assessment_id: row.assessmentId,
            assessment_version_id: row.assessmentVersionId,
            lifecycle_status: row.lifecycleStatus,
            started_at: row.startedAt,
            submitted_at: row.submittedAt,
            completed_at: row.completedAt,
            last_activity_at: row.lastActivityAt,
            created_at: row.createdAt,
            updated_at: row.updatedAt,
          }] as unknown[]) as T[],
        };
      }

      if (text.includes('FROM attempts') && !text.includes("AND lifecycle_status = 'IN_PROGRESS'")) {
        const [userId, assessmentId] = queryParams as [string, string];
        const row = attempts
          .filter((attempt) => attempt.userId === userId && attempt.assessmentId === assessmentId)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

        if (!row) {
          return { rows: [] as T[] };
        }

        return {
          rows: ([{
            attempt_id: row.attemptId,
            user_id: row.userId,
            assessment_id: row.assessmentId,
            assessment_version_id: row.assessmentVersionId,
            lifecycle_status: row.lifecycleStatus,
            started_at: row.startedAt,
            submitted_at: row.submittedAt,
            completed_at: row.completedAt,
            last_activity_at: row.lastActivityAt,
            created_at: row.createdAt,
            updated_at: row.updatedAt,
          }] as unknown[]) as T[],
        };
      }

      if (text.includes('COUNT(DISTINCT question_id) AS answered_questions')) {
        const attemptId = queryParams?.[0] as string;
        const answeredQuestions = new Set(
          responses
            .filter((response) => response.attemptId === attemptId)
            .map((response) => response.questionId),
        ).size;

        return {
          rows: ([{ answered_questions: answeredQuestions }] as unknown[]) as T[],
        };
      }

      if (text.includes('canonical_result_payload IS NOT NULL AS has_canonical_result_payload')) {
        const attemptId = queryParams?.[0] as string;
        const row = results
          .filter((result) => result.attemptId === attemptId)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

        if (!row) {
          return { rows: [] as T[] };
        }

        return {
          rows: ([{
            result_id: row.resultId,
            attempt_id: row.attemptId,
            pipeline_status: row.pipelineStatus,
            readiness_status: row.readinessStatus,
            generated_at: row.generatedAt,
            failure_reason: row.failureReason,
            has_canonical_result_payload: row.hasCanonicalResultPayload,
            created_at: row.createdAt,
            updated_at: row.updatedAt,
          }] as unknown[]) as T[],
        };
      }

      if (text.includes('COUNT(*) AS total_questions')) {
        const assessmentVersionId = queryParams?.[0] as string;
        return {
          rows: ([{ total_questions: questionCountByVersionId[assessmentVersionId] ?? 0 }] as unknown[]) as T[],
        };
      }

      if (text.includes('ORDER BY COALESCE(r.generated_at, r.created_at) DESC, r.id DESC')) {
        const userId = queryParams?.[0] as string;
        const filtered = results
          .filter((result) => result.userId === userId && result.readinessStatus === 'READY' && result.canonicalResultPayload !== null)
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
            assessment_title: inventoryById.get(row.assessmentId)?.title ?? row.assessmentTitle,
            version_tag: row.versionTag,
            readiness_status: row.readinessStatus,
            generated_at: row.generatedAt,
            created_at: row.createdAt,
            canonical_result_payload: row.canonicalResultPayload,
          })) as T[],
        };
      }

      return { rows: [] as T[] };
    },
  };
}

test('lifecycle status mapping returns canonical CTA labels', () => {
  assert.deepEqual(
    mapLifecycleStatusToCta({
      status: 'not_started',
      assessmentKey: 'wplp80',
      latestReadyResultId: null,
    }),
    {
      action: 'start',
      label: 'Start',
      href: '/app/assessments#wplp80',
      disabled: false,
    },
  );

  assert.deepEqual(
    mapLifecycleStatusToCta({
      status: 'ready',
      assessmentKey: 'wplp80',
      latestReadyResultId: 'result-1',
    }),
    {
      action: 'view_results',
      label: 'View Results',
      href: '/app/results/result-1',
      disabled: false,
    },
  );
});

test('recommendation priority prefers in-progress over ready and startable states', () => {
  const assessments = [
    createAssessmentItem({
      assessmentKey: 'wplp80',
      title: 'WPLP-80',
      status: 'ready',
      cta: mapLifecycleStatusToCta({
        status: 'ready',
        assessmentKey: 'wplp80',
        latestReadyResultId: 'result-1',
      }),
    }),
    createAssessmentItem({
      assessmentKey: 'signals',
      title: 'Signals',
      status: 'in_progress',
      answeredQuestions: 6,
      totalQuestions: 12,
      cta: mapLifecycleStatusToCta({
        status: 'in_progress',
        assessmentKey: 'signals',
        latestReadyResultId: null,
      }),
    }),
  ];

  const recommendation = selectDashboardRecommendation(
    assessments,
    createResultListItem({
      resultId: 'result-1',
      assessmentKey: 'wplp80',
      assessmentTitle: 'WPLP-80',
    }),
  );

  assert.equal(recommendation?.kind, 'resume');
  assert.equal(recommendation?.cta.label, 'Resume');
  assert.match(recommendation?.description ?? '', /6 of 12/);
});

test('workspace projection preserves lifecycle CTA and prior ready result highlight', () => {
  const item = projectAssessmentWorkspaceItem({
    assessment: {
      assessmentId: 'assessment-1',
      assessmentKey: 'wplp80',
      title: 'WPLP-80',
      description: 'Signals assessment',
      versionTag: '1.0.0',
    },
    lifecycle: createLifecycle({
      assessmentId: 'assessment-1',
      assessmentKey: 'wplp80',
      status: 'in_progress',
      attemptId: 'attempt-2',
      totalQuestions: 40,
      answeredQuestions: 10,
      completionPercentage: 25,
    }),
    latestReadyResult: createResultListItem({
      resultId: 'result-1',
      assessmentId: 'assessment-1',
      assessmentKey: 'wplp80',
      generatedAt: '2026-01-02T00:00:00.000Z',
      topSignalPercentage: 68,
      topSignal: {
        signalId: 'signal-focus',
        signalKey: 'focus',
        title: 'Focus',
        domainId: 'domain-signals',
        domainKey: 'signals',
        normalizedValue: 68,
        rawTotal: 8,
        percentage: 68,
        rank: 1,
      },
    }),
  });

  assert.equal(item.status, 'in_progress');
  assert.equal(item.cta.label, 'Resume');
  assert.equal(item.latestReadyResultId, 'result-1');
  assert.equal(item.latestTopSignalTitle, 'Focus');
  assert.equal(item.latestTopSignalPercentage, 68);
});

test('dashboard and workspace builders project canonical lifecycle and latest result data', async () => {
  const db = createFakeDb({
    inventory: [
      {
        assessmentId: 'assessment-2',
        assessmentKey: 'discovery',
        title: 'Discovery',
        description: 'Processing assessment',
        assessmentVersionId: 'version-2',
        versionTag: '1.1.0',
        publishedAt: '2026-01-02T00:00:00.000Z',
      },
      {
        assessmentId: 'assessment-1',
        assessmentKey: 'wplp80',
        title: 'WPLP-80',
        description: 'Signals assessment',
        assessmentVersionId: 'version-1',
        versionTag: '1.0.0',
        publishedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    attempts: [
      {
        attemptId: 'attempt-1',
        userId: 'user-1',
        assessmentId: 'assessment-1',
        assessmentVersionId: 'version-1',
        lifecycleStatus: 'RESULT_READY',
        startedAt: '2026-01-01T00:00:00.000Z',
        submittedAt: '2026-01-01T00:15:00.000Z',
        completedAt: '2026-01-01T00:16:00.000Z',
        lastActivityAt: '2026-01-01T00:16:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:16:00.000Z',
      },
      {
        attemptId: 'attempt-2',
        userId: 'user-1',
        assessmentId: 'assessment-2',
        assessmentVersionId: 'version-2',
        lifecycleStatus: 'SUBMITTED',
        startedAt: '2026-01-03T00:00:00.000Z',
        submittedAt: '2026-01-03T00:20:00.000Z',
        completedAt: '2026-01-03T00:20:00.000Z',
        lastActivityAt: '2026-01-03T00:20:00.000Z',
        createdAt: '2026-01-03T00:00:00.000Z',
        updatedAt: '2026-01-03T00:20:00.000Z',
      },
    ],
    results: [
      {
        resultId: 'result-1',
        attemptId: 'attempt-1',
        assessmentId: 'assessment-1',
        assessmentVersionId: 'version-1',
        assessmentKey: 'wplp80',
        assessmentTitle: 'WPLP-80',
        versionTag: '1.0.0',
        userId: 'user-1',
        pipelineStatus: 'COMPLETED',
        readinessStatus: 'READY',
        generatedAt: '2026-01-01T00:16:00.000Z',
        failureReason: null,
        hasCanonicalResultPayload: true,
        createdAt: '2026-01-01T00:16:00.000Z',
        updatedAt: '2026-01-01T00:16:00.000Z',
        canonicalResultPayload: buildPayload({
          assessmentKey: 'wplp80',
          version: '1.0.0',
          attemptId: 'attempt-1',
          topSignalTitle: 'Core Focus',
          topSignalPercentage: 72,
        }),
      },
    ],
    responses: [
      { attemptId: 'attempt-2', questionId: 'q1' },
      { attemptId: 'attempt-2', questionId: 'q2' },
    ],
    questionCountByVersionId: {
      'version-1': 80,
      'version-2': 12,
    },
  });

  const workspace = await buildAssessmentWorkspaceViewModel({
    db,
    userId: 'user-1',
  });
  const dashboard = await buildDashboardViewModel({
    db,
    userId: 'user-1',
  });

  assert.equal(workspace.assessments.length, 2);
  assert.equal(workspace.assessments[0]?.assessmentKey, 'discovery');
  assert.equal(workspace.assessments[0]?.status, 'completed_processing');
  assert.equal(workspace.assessments[0]?.cta.label, 'Processing');
  assert.equal(workspace.assessments[1]?.assessmentKey, 'wplp80');
  assert.equal(workspace.assessments[1]?.status, 'ready');
  assert.equal(workspace.assessments[1]?.latestTopSignalTitle, 'Core Focus');

  assert.equal(dashboard.readyResultCount, 1);
  assert.equal(dashboard.processingCount, 1);
  assert.equal(dashboard.readyCount, 1);
  assert.equal(dashboard.recommendation?.kind, 'view_results');
  assert.equal(dashboard.latestReadyResult?.resultId, 'result-1');
  assert.equal(dashboard.latestReadyResult?.topSignalTitle, 'Core Focus');
});
