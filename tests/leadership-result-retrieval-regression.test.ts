import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { Queryable } from '@/lib/engine/repository-sql';
import type { CanonicalResultPayload } from '@/lib/engine/types';
import { createAssessmentRunnerService } from '@/lib/server/assessment-runner-service';
import {
  buildAssessmentWorkspaceViewModel,
  buildDashboardViewModel,
} from '@/lib/server/dashboard-workspace-view-model';
import { createResultReadModelService } from '@/lib/server/result-read-model';
import {
  AssessmentResultNotFoundError,
  AssessmentResultPayloadError,
} from '@/lib/server/result-read-model-types';
import { createResultsService } from '@/lib/server/results-service';

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

function buildLeadershipPayload(params?: {
  attemptId?: string;
  topSignalTitle?: string;
  topSignalPercentage?: number;
  chapterOpening?: string | null;
  assessmentDescription?: string | null;
}): CanonicalResultPayload {
  const topSignalTitle = params?.topSignalTitle ?? 'Decisive Direction';
  const topSignalPercentage = params?.topSignalPercentage ?? 68;

  const chapterOpening =
    params && 'chapterOpening' in params
      ? params.chapterOpening ?? null
      : `${topSignalTitle} gives this leadership result its clearest shape.`;

  return {
    metadata: {
      assessmentKey: 'leadership',
      assessmentTitle: 'Leadership',
      version: '2026.04',
      attemptId: params?.attemptId ?? 'attempt-leadership-1',
      completedAt: '2026-04-18T10:05:00.000Z',
      assessmentDescription: params?.assessmentDescription ?? null,
    },
    intro: {
      assessmentDescription: params?.assessmentDescription ?? null,
    },
    hero: {
      headline: `${topSignalTitle} leads the current leadership pattern`,
      subheadline: null,
      summary: null,
      narrative: `${topSignalTitle} is the dominant persisted signal in this leadership result.`,
      pressureOverlay: null,
      environmentOverlay: null,
      primaryPattern: {
        label: topSignalTitle,
        signalKey: 'decisive_direction',
        signalLabel: topSignalTitle,
      },
      heroPattern: null,
      domainPairWinners: [],
      traitTotals: [],
      matchedPatterns: [],
      domainHighlights: [{
        domainKey: 'leadership-approach',
        domainLabel: 'Leadership Approach',
        primarySignalKey: 'decisive_direction',
        primarySignalLabel: topSignalTitle,
        summary: `${topSignalTitle} is the clearest signal in this result.`,
      }],
    },
    domains: [{
      domainKey: 'leadership-approach',
      domainLabel: 'Leadership Approach',
      chapterOpening,
      signalBalance: {
        items: [{
          signalKey: 'decisive_direction',
          signalLabel: topSignalTitle,
          withinDomainPercent: topSignalPercentage,
          rank: 1,
          isPrimary: true,
          isSecondary: false,
          summary: null,
        }],
      },
      primarySignal: {
        signalKey: 'decisive_direction',
        signalLabel: topSignalTitle,
        summary: null,
        strength: null,
        watchout: null,
        development: null,
      },
      secondarySignal: null,
      signalPair: null,
      pressureFocus: null,
      environmentFocus: null,
    }],
    actions: {
      strengths: [{
        signalKey: 'decisive_direction',
        signalLabel: topSignalTitle,
        text: 'Set direction quickly when ambiguity starts to slow the work.',
      }],
      watchouts: [{
        signalKey: 'decisive_direction',
        signalLabel: topSignalTitle,
        text: 'Avoid outrunning alignment when speed becomes the default move.',
      }],
      developmentFocus: [{
        signalKey: 'decisive_direction',
        signalLabel: topSignalTitle,
        text: 'Deliberately add moments of context before commitment.',
      }],
    },
    application: {
      thesis: {
        headline: 'Leadership pattern in practice',
        summary: 'This result is persisted and should be retrieved without recomputation.',
        sourceKeys: {
          heroPatternKey: '',
        },
      },
      signatureContribution: {
        title: 'Where you create the most value',
        summary: '',
        items: [],
      },
      patternRisks: {
        title: 'Where this pattern can work against you',
        summary: '',
        items: [],
      },
      rangeBuilder: {
        title: 'Where to build more range',
        summary: '',
        items: [],
      },
      actionPlan30: {
        keepDoing: '',
        watchFor: '',
        practiceNext: '',
        askOthers: '',
      },
    },
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
        generatedAt: '2026-04-18T10:05:00.000Z',
      },
      normalization: {
        normalizationMethod: 'largest_remainder_integer_percentages',
        totalScoreMass: 7,
        zeroMass: false,
        globalPercentageSum: 100,
        domainPercentageSums: Object.freeze({
          'domain-leadership-approach': 100,
        }),
        roundingAdjustmentsApplied: 0,
        zeroScoreSignalCount: 0,
        warnings: Object.freeze([]),
        generatedAt: '2026-04-18T10:05:00.000Z',
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
      generatedAt: '2026-04-18T10:05:00.000Z',
    },
  };
}

function createResultRetrievalDb(params: {
  inventory: InventoryFixture[];
  attempts?: AttemptFixture[];
  responses?: ResponseFixture[];
  results?: ResultFixture[];
  questionCountByVersionId?: Record<string, number>;
  missingModeColumns?: boolean;
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

      if (text.includes('FROM assessments a') && text.includes('WHERE a.assessment_key = $1')) {
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

        return {
          rows: (row
            ? ([{
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
              }] as unknown[])
            : []) as T[],
        };
      }

      if (text.includes('FROM attempts') && !text.includes("AND lifecycle_status = 'IN_PROGRESS'")) {
        const [userId, assessmentId] = queryParams as [string, string];
        const row = attempts
          .filter((attempt) => attempt.userId === userId && attempt.assessmentId === assessmentId)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

        return {
          rows: (row
            ? ([{
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
              }] as unknown[])
            : []) as T[],
        };
      }

      if (text.includes('COUNT(DISTINCT question_id) AS answered_questions')) {
        const attemptId = queryParams?.[0] as string;
        return {
          rows: ([{
            answered_questions: new Set(
              responses
                .filter((response) => response.attemptId === attemptId)
                .map((response) => response.questionId),
            ).size,
          }] as unknown[]) as T[],
        };
      }

      if (text.includes('canonical_result_payload IS NOT NULL AS has_canonical_result_payload')) {
        const attemptId = queryParams?.[0] as string;
        const row = results
          .filter((result) => result.attemptId === attemptId)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

        return {
          rows: (row
            ? ([{
                result_id: row.resultId,
                attempt_id: row.attemptId,
                pipeline_status: row.pipelineStatus,
                readiness_status: row.readinessStatus,
                generated_at: row.generatedAt,
                failure_reason: row.failureReason,
                has_canonical_result_payload: row.hasCanonicalResultPayload,
                created_at: row.createdAt,
                updated_at: row.updatedAt,
              }] as unknown[])
            : []) as T[],
        };
      }

      if (text.includes('COUNT(*) AS total_questions')) {
        const assessmentVersionId = queryParams?.[0] as string;
        return {
          rows: ([{ total_questions: questionCountByVersionId[assessmentVersionId] ?? 0 }] as unknown[]) as T[],
        };
      }

      if (text.includes('ORDER BY COALESCE(r.generated_at, r.created_at) DESC, r.id DESC')) {
        if (text.includes('COALESCE(av.mode, a.mode) AS assessment_mode') && params.missingModeColumns) {
          throw new Error('WITHIN GROUP is required for ordered-set aggregate mode');
        }

        const userId = queryParams?.[0] as string;
        const filtered = results
          .filter((result) =>
            result.userId === userId
            && result.readinessStatus === 'READY'
            && result.canonicalResultPayload !== null,
          )
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
            assessment_mode: 'multi_domain',
            assessment_title: inventoryById.get(row.assessmentId)?.title ?? row.assessmentTitle,
            version_tag: row.versionTag,
            readiness_status: row.readinessStatus,
            generated_at: row.generatedAt,
            created_at: row.createdAt,
            canonical_result_payload: row.canonicalResultPayload,
          })) as T[],
        };
      }

      if (text.includes('FROM results r') && text.includes('WHERE r.id = $1')) {
        if (text.includes('COALESCE(av.mode, a.mode) AS assessment_mode') && params.missingModeColumns) {
          throw new Error('WITHIN GROUP is required for ordered-set aggregate mode');
        }

        const [resultId, userId] = queryParams as [string, string];
        const row = results.find(
          (entry) =>
            entry.resultId === resultId
            && entry.userId === userId
            && entry.readinessStatus === 'READY'
            && entry.canonicalResultPayload !== null,
        );

        return {
          rows: (row
            ? ([{
                result_id: row.resultId,
                attempt_id: row.attemptId,
                assessment_id: row.assessmentId,
                assessment_key: row.assessmentKey,
                assessment_mode: 'multi_domain',
                assessment_title: row.assessmentTitle,
                version_tag: row.versionTag,
                readiness_status: row.readinessStatus,
                generated_at: row.generatedAt,
                created_at: row.createdAt,
                canonical_result_payload: row.canonicalResultPayload,
              }] as unknown[])
            : []) as T[],
        };
      }

      return { rows: [] as T[] };
    },
  };
}

test('ready Leadership results stay visible in workspace, dashboard, and results list using persisted newest-ready data only', async () => {
  const db = createResultRetrievalDb({
    inventory: [{
      assessmentId: 'assessment-leadership',
      assessmentKey: 'leadership',
      title: 'Leadership',
      description: 'Leadership assessment',
      assessmentVersionId: 'version-leadership',
      versionTag: '2026.04',
      publishedAt: '2026-04-01T00:00:00.000Z',
    }],
    attempts: [
      {
        attemptId: 'attempt-leadership-1',
        userId: 'user-1',
        assessmentId: 'assessment-leadership',
        assessmentVersionId: 'version-leadership',
        lifecycleStatus: 'RESULT_READY',
        startedAt: '2026-04-17T08:00:00.000Z',
        submittedAt: '2026-04-17T08:10:00.000Z',
        completedAt: '2026-04-17T08:12:00.000Z',
        lastActivityAt: '2026-04-17T08:12:00.000Z',
        createdAt: '2026-04-17T08:00:00.000Z',
        updatedAt: '2026-04-17T08:12:00.000Z',
      },
      {
        attemptId: 'attempt-leadership-2',
        userId: 'user-1',
        assessmentId: 'assessment-leadership',
        assessmentVersionId: 'version-leadership',
        lifecycleStatus: 'RESULT_READY',
        startedAt: '2026-04-18T09:00:00.000Z',
        submittedAt: '2026-04-18T09:10:00.000Z',
        completedAt: '2026-04-18T09:12:00.000Z',
        lastActivityAt: '2026-04-18T09:12:00.000Z',
        createdAt: '2026-04-18T09:00:00.000Z',
        updatedAt: '2026-04-18T09:12:00.000Z',
      },
    ],
    results: [
      {
        resultId: 'result-leadership-1',
        attemptId: 'attempt-leadership-1',
        assessmentId: 'assessment-leadership',
        assessmentVersionId: 'version-leadership',
        assessmentKey: 'leadership',
        assessmentTitle: 'Leadership',
        versionTag: '2026.04',
        userId: 'user-1',
        pipelineStatus: 'COMPLETED',
        readinessStatus: 'READY',
        generatedAt: '2026-04-17T08:12:00.000Z',
        failureReason: null,
        hasCanonicalResultPayload: true,
        createdAt: '2026-04-17T08:12:00.000Z',
        updatedAt: '2026-04-17T08:12:00.000Z',
        canonicalResultPayload: buildLeadershipPayload({
          attemptId: 'attempt-leadership-1',
          topSignalTitle: 'Steady Alignment',
          topSignalPercentage: 61,
        }),
      },
      {
        resultId: 'result-leadership-2',
        attemptId: 'attempt-leadership-2',
        assessmentId: 'assessment-leadership',
        assessmentVersionId: 'version-leadership',
        assessmentKey: 'leadership',
        assessmentTitle: 'Leadership',
        versionTag: '2026.04',
        userId: 'user-1',
        pipelineStatus: 'COMPLETED',
        readinessStatus: 'READY',
        generatedAt: '2026-04-18T09:12:00.000Z',
        failureReason: null,
        hasCanonicalResultPayload: true,
        createdAt: '2026-04-18T09:12:00.000Z',
        updatedAt: '2026-04-18T09:12:00.000Z',
        canonicalResultPayload: buildLeadershipPayload({
          attemptId: 'attempt-leadership-2',
          topSignalTitle: 'Decisive Direction',
          topSignalPercentage: 68,
        }),
      },
      {
        resultId: 'result-processing',
        attemptId: 'attempt-processing',
        assessmentId: 'assessment-leadership',
        assessmentVersionId: 'version-leadership',
        assessmentKey: 'leadership',
        assessmentTitle: 'Leadership',
        versionTag: '2026.04',
        userId: 'user-1',
        pipelineStatus: 'RUNNING',
        readinessStatus: 'PROCESSING',
        generatedAt: null,
        failureReason: null,
        hasCanonicalResultPayload: false,
        createdAt: '2026-04-18T09:15:00.000Z',
        updatedAt: '2026-04-18T09:15:00.000Z',
        canonicalResultPayload: null,
      },
      {
        resultId: 'result-failed',
        attemptId: 'attempt-failed',
        assessmentId: 'assessment-leadership',
        assessmentVersionId: 'version-leadership',
        assessmentKey: 'leadership',
        assessmentTitle: 'Leadership',
        versionTag: '2026.04',
        userId: 'user-1',
        pipelineStatus: 'FAILED',
        readinessStatus: 'FAILED',
        generatedAt: null,
        failureReason: 'pipeline_failed',
        hasCanonicalResultPayload: false,
        createdAt: '2026-04-18T09:16:00.000Z',
        updatedAt: '2026-04-18T09:16:00.000Z',
        canonicalResultPayload: null,
      },
    ],
    responses: [{ attemptId: 'attempt-leadership-2', questionId: 'q1' }],
    questionCountByVersionId: {
      'version-leadership': 40,
    },
  });

  const workspace = await buildAssessmentWorkspaceViewModel({ db, userId: 'user-1' });
  const dashboard = await buildDashboardViewModel({ db, userId: 'user-1' });
  const resultsService = createResultsService({ db });

  assert.equal(workspace.assessments.length, 1);
  assert.equal(workspace.assessments[0]?.assessmentKey, 'leadership');
  assert.equal(workspace.assessments[0]?.status, 'ready');
  assert.equal(workspace.assessments[0]?.latestReadyResultId, 'result-leadership-2');
  assert.equal(workspace.assessments[0]?.latestTopSignalTitle, 'Decisive Direction');
  assert.equal(workspace.assessments[0]?.cta.href, '/app/results/result-leadership-2');

  assert.equal(dashboard.readyResultCount, 2);
  assert.equal(dashboard.processingCount, 0);
  assert.equal(dashboard.latestReadyResult?.resultId, 'result-leadership-2');
  assert.equal(dashboard.latestReadyResult?.assessmentKey, 'leadership');
  assert.equal(dashboard.latestReadyResult?.topSignalTitle, 'Decisive Direction');
  assert.equal(dashboard.latestReadyResult?.href, '/app/results/result-leadership-2');

  const firstList = await resultsService.listResults({ userId: 'user-1' });
  const secondList = await resultsService.listResults({ userId: 'user-1' });

  assert.deepEqual(
    firstList.map((result) => result.resultId),
    ['result-leadership-2', 'result-leadership-1'],
  );
  assert.equal(firstList[0]?.assessmentTitle, 'Leadership');
  assert.equal(firstList[0]?.href, '/app/results/result-leadership-2');
  assert.equal(JSON.stringify(firstList), JSON.stringify(secondList));
});

test('Leadership result detail retrieval is persisted, structurally complete, and stable on revisit', async () => {
  const payload = buildLeadershipPayload({
    attemptId: 'attempt-leadership-2',
    topSignalTitle: 'Calm Authority',
    topSignalPercentage: 64,
  });
  const service = createResultReadModelService({
    db: createResultRetrievalDb({
      inventory: [{
        assessmentId: 'assessment-leadership',
        assessmentKey: 'leadership',
        title: 'Leadership',
        description: 'Leadership assessment',
        assessmentVersionId: 'version-leadership',
        versionTag: '2026.04',
        publishedAt: '2026-04-01T00:00:00.000Z',
      }],
      results: [{
        resultId: 'result-leadership-2',
        attemptId: 'attempt-leadership-2',
        assessmentId: 'assessment-leadership',
        assessmentVersionId: 'version-leadership',
        assessmentKey: 'leadership',
        assessmentTitle: 'Leadership',
        versionTag: '2026.04',
        userId: 'user-1',
        pipelineStatus: 'COMPLETED',
        readinessStatus: 'READY',
        generatedAt: '2026-04-18T09:12:00.000Z',
        failureReason: null,
        hasCanonicalResultPayload: true,
        createdAt: '2026-04-18T09:12:00.000Z',
        updatedAt: '2026-04-18T09:12:00.000Z',
        canonicalResultPayload: payload,
      }],
    }),
  });

  const first = await service.getAssessmentResultDetail({
    userId: 'user-1',
    resultId: 'result-leadership-2',
  });
  const second = await service.getAssessmentResultDetail({
    userId: 'user-1',
    resultId: 'result-leadership-2',
  });

  assert.equal(first.assessmentKey, 'leadership');
  assert.equal(first.mode, 'multi_domain');
  assert.equal(first.hero.headline, payload.hero.headline);
  assert.equal(first.overviewSummary.narrative, payload.hero.narrative);
  assert.equal(first.domains[0]?.domainLabel, 'Leadership Approach');
  assert.equal(first.application?.thesis.headline, 'Leadership pattern in practice');
  assert.equal(first.strengths[0]?.signalLabel, 'Calm Authority');
  assert.equal(first.topSignal?.title, 'Calm Authority');
  assert.equal(first.metadata.attemptId, 'attempt-leadership-2');
  assert.equal(JSON.stringify(first), JSON.stringify(second));
});

test('Leadership ready-result re-entry resolves to the persisted result route instead of runner state', async () => {
  const db = createResultRetrievalDb({
    inventory: [{
      assessmentId: 'assessment-leadership',
      assessmentKey: 'leadership',
      title: 'Leadership',
      description: 'Leadership assessment',
      assessmentVersionId: 'version-leadership',
      versionTag: '2026.04',
      publishedAt: '2026-04-01T00:00:00.000Z',
    }],
    results: [{
      resultId: 'result-leadership-2',
      attemptId: 'attempt-leadership-2',
      assessmentId: 'assessment-leadership',
      assessmentVersionId: 'version-leadership',
      assessmentKey: 'leadership',
      assessmentTitle: 'Leadership',
      versionTag: '2026.04',
      userId: 'user-1',
      pipelineStatus: 'COMPLETED',
      readinessStatus: 'READY',
      generatedAt: '2026-04-18T09:12:00.000Z',
      failureReason: null,
      hasCanonicalResultPayload: true,
      createdAt: '2026-04-18T09:12:00.000Z',
      updatedAt: '2026-04-18T09:12:00.000Z',
      canonicalResultPayload: buildLeadershipPayload({
        attemptId: 'attempt-leadership-2',
      }),
    }],
  });

  const service = createAssessmentRunnerService({
    db,
    lifecycleService: {
      async getAssessmentAttemptLifecycle() {
        return {
          attemptId: 'attempt-leadership-2',
          assessmentId: 'assessment-leadership',
          assessmentKey: 'leadership',
          assessmentVersionId: 'version-leadership',
          versionTag: '2026.04',
          status: 'ready',
          startedAt: '2026-04-18T09:00:00.000Z',
          updatedAt: '2026-04-18T09:12:00.000Z',
          completedAt: '2026-04-18T09:12:00.000Z',
          totalQuestions: 40,
          answeredQuestions: 40,
          completionPercentage: 100,
          latestResultId: 'result-leadership-2',
          latestResultReady: true,
          latestResultStatus: 'READY',
          lastError: null,
        };
      },
      async startAssessmentAttempt() {
        throw new Error('startAssessmentAttempt should not be called for ready Leadership results');
      },
    },
  });

  const resolution = await service.resolveAssessmentEntry({
    userId: 'user-1',
    assessmentKey: 'leadership',
  });

  assert.deepEqual(resolution, {
    kind: 'result',
    assessmentKey: 'leadership',
    resultId: 'result-leadership-2',
    href: '/app/results/result-leadership-2',
  });
});

test('Leadership retrieval tolerates optional display fields when the canonical payload is still valid', async () => {
  const payload = buildLeadershipPayload({
    attemptId: 'attempt-leadership-3',
    chapterOpening: null,
    assessmentDescription: null,
  });
  const db = createResultRetrievalDb({
    inventory: [{
      assessmentId: 'assessment-leadership',
      assessmentKey: 'leadership',
      title: 'Leadership',
      description: 'Leadership assessment',
      assessmentVersionId: 'version-leadership',
      versionTag: '2026.04',
      publishedAt: '2026-04-01T00:00:00.000Z',
    }],
    attempts: [{
      attemptId: 'attempt-leadership-3',
      userId: 'user-1',
      assessmentId: 'assessment-leadership',
      assessmentVersionId: 'version-leadership',
      lifecycleStatus: 'RESULT_READY',
      startedAt: '2026-04-18T09:30:00.000Z',
      submittedAt: '2026-04-18T09:40:00.000Z',
      completedAt: '2026-04-18T09:42:00.000Z',
      lastActivityAt: '2026-04-18T09:42:00.000Z',
      createdAt: '2026-04-18T09:30:00.000Z',
      updatedAt: '2026-04-18T09:42:00.000Z',
    }],
    results: [{
      resultId: 'result-leadership-3',
      attemptId: 'attempt-leadership-3',
      assessmentId: 'assessment-leadership',
      assessmentVersionId: 'version-leadership',
      assessmentKey: 'leadership',
      assessmentTitle: 'Leadership',
      versionTag: '2026.04',
      userId: 'user-1',
      pipelineStatus: 'COMPLETED',
      readinessStatus: 'READY',
      generatedAt: '2026-04-18T09:42:00.000Z',
      failureReason: null,
      hasCanonicalResultPayload: true,
      createdAt: '2026-04-18T09:42:00.000Z',
      updatedAt: '2026-04-18T09:42:00.000Z',
      canonicalResultPayload: payload,
    }],
    questionCountByVersionId: {
      'version-leadership': 40,
    },
  });

  const workspace = await buildAssessmentWorkspaceViewModel({ db, userId: 'user-1' });
  const detail = await createResultReadModelService({ db }).getAssessmentResultDetail({
    userId: 'user-1',
    resultId: 'result-leadership-3',
  });

  assert.equal(workspace.assessments[0]?.latestReadyResultId, 'result-leadership-3');
  assert.equal(detail.metadata.assessmentDescription, null);
  assert.equal(detail.intro.assessmentDescription, null);
  assert.equal(detail.domains[0]?.chapterOpening, null);
  assert.equal(detail.hero.subheadline, null);
});

test('Leadership missing, unauthorized, malformed, and empty ready-result states fail cleanly', async () => {
  const emptyDb = createResultRetrievalDb({
    inventory: [{
      assessmentId: 'assessment-leadership',
      assessmentKey: 'leadership',
      title: 'Leadership',
      description: 'Leadership assessment',
      assessmentVersionId: 'version-leadership',
      versionTag: '2026.04',
      publishedAt: '2026-04-01T00:00:00.000Z',
    }],
    attempts: [{
      attemptId: 'attempt-processing',
      userId: 'user-1',
      assessmentId: 'assessment-leadership',
      assessmentVersionId: 'version-leadership',
      lifecycleStatus: 'SUBMITTED',
      startedAt: '2026-04-18T09:00:00.000Z',
      submittedAt: '2026-04-18T09:10:00.000Z',
      completedAt: '2026-04-18T09:10:00.000Z',
      lastActivityAt: '2026-04-18T09:10:00.000Z',
      createdAt: '2026-04-18T09:00:00.000Z',
      updatedAt: '2026-04-18T09:10:00.000Z',
    }],
    questionCountByVersionId: {
      'version-leadership': 40,
    },
  });

  const emptyWorkspace = await buildAssessmentWorkspaceViewModel({ db: emptyDb, userId: 'user-1' });
  const emptyDashboard = await buildDashboardViewModel({ db: emptyDb, userId: 'user-1' });
  const emptyList = await createResultsService({ db: emptyDb }).listResults({ userId: 'user-1' });

  assert.equal(emptyWorkspace.assessments[0]?.status, 'completed_processing');
  assert.equal(emptyWorkspace.assessments[0]?.latestReadyResultId, null);
  assert.equal(emptyDashboard.latestReadyResult, null);
  assert.equal(emptyDashboard.readyResultCount, 0);
  assert.deepEqual(emptyList, []);

  const malformedService = createResultReadModelService({
    db: createResultRetrievalDb({
      inventory: [{
        assessmentId: 'assessment-leadership',
        assessmentKey: 'leadership',
        title: 'Leadership',
        description: 'Leadership assessment',
        assessmentVersionId: 'version-leadership',
        versionTag: '2026.04',
        publishedAt: '2026-04-01T00:00:00.000Z',
      }],
      results: [{
        resultId: 'result-bad',
        attemptId: 'attempt-bad',
        assessmentId: 'assessment-leadership',
        assessmentVersionId: 'version-leadership',
        assessmentKey: 'leadership',
        assessmentTitle: 'Leadership',
        versionTag: '2026.04',
        userId: 'user-1',
        pipelineStatus: 'COMPLETED',
        readinessStatus: 'READY',
        generatedAt: '2026-04-18T09:12:00.000Z',
        failureReason: null,
        hasCanonicalResultPayload: true,
        createdAt: '2026-04-18T09:12:00.000Z',
        updatedAt: '2026-04-18T09:12:00.000Z',
        canonicalResultPayload: { invalid: true },
      }],
    }),
  });

  await assert.rejects(
    () => malformedService.getAssessmentResultDetail({ userId: 'user-1', resultId: 'result-bad' }),
    AssessmentResultPayloadError,
  );

  const notOwnedService = createResultReadModelService({
    db: createResultRetrievalDb({
      inventory: [{
        assessmentId: 'assessment-leadership',
        assessmentKey: 'leadership',
        title: 'Leadership',
        description: 'Leadership assessment',
        assessmentVersionId: 'version-leadership',
        versionTag: '2026.04',
        publishedAt: '2026-04-01T00:00:00.000Z',
      }],
      results: [{
        resultId: 'result-secret',
        attemptId: 'attempt-secret',
        assessmentId: 'assessment-leadership',
        assessmentVersionId: 'version-leadership',
        assessmentKey: 'leadership',
        assessmentTitle: 'Leadership',
        versionTag: '2026.04',
        userId: 'other-user',
        pipelineStatus: 'COMPLETED',
        readinessStatus: 'READY',
        generatedAt: '2026-04-18T09:12:00.000Z',
        failureReason: null,
        hasCanonicalResultPayload: true,
        createdAt: '2026-04-18T09:12:00.000Z',
        updatedAt: '2026-04-18T09:12:00.000Z',
        canonicalResultPayload: buildLeadershipPayload({ attemptId: 'attempt-secret' }),
      }],
    }),
  });

  await assert.rejects(
    () => notOwnedService.getAssessmentResultDetail({ userId: 'user-1', resultId: 'result-secret' }),
    AssessmentResultNotFoundError,
  );
  await assert.rejects(
    () => notOwnedService.getAssessmentResultDetail({ userId: 'user-1', resultId: 'missing-result' }),
    AssessmentResultNotFoundError,
  );
});

test('Leadership result routes stay anchored to persisted retrieval paths and notFound handling', () => {
  const resultsPageSource = readFileSync(
    path.join(process.cwd(), 'app', '(user)', 'app', 'results', 'page.tsx'),
    'utf8',
  );
  const resultDetailPageSource = readFileSync(
    path.join(process.cwd(), 'app', '(user)', 'app', 'results', '[resultId]', 'page.tsx'),
    'utf8',
  );

  assert.match(resultsPageSource, /persisted canonical result payload/i);
  assert.match(resultDetailPageSource, /createResultReadModelService/);
  assert.match(resultDetailPageSource, /AssessmentResultNotFoundError/);
  assert.match(resultDetailPageSource, /notFound\(\)/);
});
