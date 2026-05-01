import test from 'node:test';
import assert from 'node:assert/strict';
import type { Queryable } from '@/lib/engine/repository-sql';
import type { CanonicalResultPayload } from '@/lib/engine/types';
import { createWorkspaceService } from '@/lib/server/workspace-service';
import type { SingleDomainResultPayload } from '@/lib/types/single-domain-result';

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
  lifecycleStatus: 'IN_PROGRESS' | 'SUBMITTED' | 'RESULT_READY' | 'FAILED';
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
  mode: 'single_domain' | 'multi_domain' | null;
  pipelineStatus: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  readinessStatus: 'PROCESSING' | 'READY' | 'FAILED';
  generatedAt: string | null;
  failureReason: string | null;
  canonicalResultPayload: unknown;
  createdAt: string;
  updatedAt: string;
};

function buildSingleDomainPayload(params?: {
  assessmentKey?: string;
  attemptId?: string;
  signals?: SingleDomainResultPayload['signals'];
}): SingleDomainResultPayload {
  const signals = params?.signals ?? ([
    ['vision', 'Vision', 1, 37],
    ['delivery', 'Delivery', 2, 28],
    ['people', 'People', 3, 21],
    ['rigor', 'Rigor', 4, 14],
  ] as const).map(([signalKey, signalLabel, rank, normalizedScore]) => ({
    signal_key: signalKey,
    signal_label: signalLabel,
    rank,
    normalized_score: normalizedScore,
    raw_score: normalizedScore,
    position: rank === 1 ? 'primary' : rank === 2 ? 'secondary' : rank === 4 ? 'underplayed' : 'supporting',
    position_label: rank === 1 ? 'Primary' : rank === 2 ? 'Secondary' : rank === 4 ? 'Underplayed' : 'Supporting',
    chapter_intro: `${signalLabel} intro`,
    chapter_how_it_shows_up: `${signalLabel} shows up`,
    chapter_value_outcome: `${signalLabel} value`,
    chapter_value_team_effect: `${signalLabel} team effect`,
    chapter_risk_behaviour: `${signalLabel} risk`,
    chapter_risk_impact: `${signalLabel} impact`,
    chapter_development: `${signalLabel} development`,
  }));

  return {
    metadata: {
      assessmentKey: params?.assessmentKey ?? 'leadership',
      assessmentTitle: 'Leadership',
      version: '1.0.0',
      attemptId: params?.attemptId ?? 'attempt-ready',
      mode: 'single_domain',
      domainKey: 'leadership-style',
      generatedAt: '2026-04-30T12:00:00.000Z',
      completedAt: '2026-04-30T11:59:00.000Z',
    },
    intro: {
      section_title: 'Intro',
      intro_paragraph: 'Intro paragraph.',
      meaning_paragraph: 'Meaning paragraph.',
      bridge_to_signals: 'Bridge to signals.',
      blueprint_context_line: 'Context line.',
    },
    hero: {
      pair_key: 'vision_delivery',
      hero_headline: 'Vision and Delivery',
      hero_subheadline: 'Subheadline',
      hero_opening: 'Opening.',
      hero_strength_paragraph: 'Strength.',
      hero_tension_paragraph: 'Tension.',
      hero_close_paragraph: 'Close.',
    },
    signals,
    balancing: {
      pair_key: 'vision_delivery',
      balancing_section_title: 'Balance',
      current_pattern_paragraph: 'Current pattern.',
      practical_meaning_paragraph: 'Practical meaning.',
      system_risk_paragraph: 'System risk.',
      rebalance_intro: 'Rebalance.',
      rebalance_actions: ['Action one'],
    },
    pairSummary: {
      pair_key: 'vision_delivery',
      pair_section_title: 'Pair',
      pair_headline: 'Pair headline',
      pair_opening_paragraph: 'Pair opening.',
      pair_strength_paragraph: 'Pair strength.',
      pair_tension_paragraph: 'Pair tension.',
      pair_close_paragraph: 'Pair close.',
    },
    application: {
      strengths: signals.map((signal) => ({
        signal_key: signal.signal_key,
        signal_label: signal.signal_label,
        rank: signal.rank,
        statement: `${signal.signal_label} strength.`,
      })),
      watchouts: [],
      developmentFocus: [],
    },
    diagnostics: {
      readinessStatus: 'ready',
      scoringMethod: 'option_signal_weights_only',
      normalizationMethod: 'largest_remainder_integer_percentages',
      answeredQuestionCount: 4,
      totalQuestionCount: 4,
      signalCount: signals.length,
      derivedPairCount: 1,
      topPair: 'vision_delivery',
      counts: {
        domainCount: 1,
        questionCount: 4,
        optionCount: 8,
        weightCount: 12,
      },
      warnings: [],
    },
  };
}

function buildMultiDomainPayload(params?: {
  assessmentKey?: string;
  attemptId?: string;
}): CanonicalResultPayload {
  return {
    metadata: {
      assessmentKey: params?.assessmentKey ?? 'wplp80',
      assessmentTitle: 'WPLP-80',
      version: '1.0.0',
      attemptId: params?.attemptId ?? 'attempt-multi',
      completedAt: '2026-04-30T11:59:00.000Z',
    },
    intro: {
      assessmentDescription: null,
    },
    hero: {
      headline: 'Core Focus leads',
      subheadline: null,
      summary: null,
      narrative: 'Core Focus leads this result.',
      pressureOverlay: null,
      environmentOverlay: null,
      primaryPattern: {
        label: 'Core Focus',
        signalKey: 'core_focus',
        signalLabel: 'Core Focus',
      },
      heroPattern: null,
      domainPairWinners: [],
      traitTotals: [],
      matchedPatterns: [],
      domainHighlights: [{
        domainKey: 'signals',
        domainLabel: 'Signals',
        primarySignalKey: 'core_focus',
        primarySignalLabel: 'Core Focus',
        summary: null,
      }],
    },
    domains: [{
      domainKey: 'signals',
      domainLabel: 'Signals',
      chapterOpening: 'Core Focus leads this domain.',
      signalBalance: {
        items: [{
          signalKey: 'core_focus',
          signalLabel: 'Core Focus',
          withinDomainPercent: 70,
          rank: 1,
          isPrimary: true,
          isSecondary: false,
          chapterSummary: null,
        }],
      },
      primarySignal: {
        signalKey: 'core_focus',
        signalLabel: 'Core Focus',
        chapterSummary: null,
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
      strengths: [],
      watchouts: [],
      developmentFocus: [],
    },
    application: {
      thesis: {
        headline: '',
        summary: '',
        sourceKeys: {
          heroPatternKey: '',
        },
      },
      signatureContribution: {
        title: '',
        summary: '',
        items: [],
      },
      patternRisks: {
        title: '',
        summary: '',
        items: [],
      },
      rangeBuilder: {
        title: '',
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
        warnings: [],
        generatedAt: '2026-04-30T12:00:00.000Z',
      },
      normalization: {
        normalizationMethod: 'largest_remainder_integer_percentages',
        totalScoreMass: 7,
        zeroMass: false,
        globalPercentageSum: 100,
        domainPercentageSums: {
          signals: 100,
        },
        roundingAdjustmentsApplied: 0,
        zeroScoreSignalCount: 0,
        warnings: [],
        generatedAt: '2026-04-30T12:00:00.000Z',
      },
      answeredQuestionCount: 1,
      totalQuestionCount: 1,
      missingQuestionIds: [],
      topSignalSelectionBasis: 'normalized_rank',
      rankedSignalCount: 1,
      domainCount: 1,
      zeroMass: false,
      zeroMassTopSignalFallbackApplied: false,
      warnings: [],
      generatedAt: '2026-04-30T12:00:00.000Z',
    },
  };
}

function createAttempt(params: Partial<AttemptFixture> & Pick<AttemptFixture, 'attemptId' | 'assessmentId' | 'assessmentVersionId' | 'lifecycleStatus'>): AttemptFixture {
  return {
    userId: 'user-1',
    startedAt: '2026-04-30T10:00:00.000Z',
    submittedAt: null,
    completedAt: null,
    lastActivityAt: '2026-04-30T10:10:00.000Z',
    createdAt: '2026-04-30T10:00:00.000Z',
    updatedAt: '2026-04-30T10:10:00.000Z',
    ...params,
  };
}

function createResult(params: Partial<ResultFixture> & Pick<ResultFixture, 'resultId' | 'attemptId' | 'assessmentId' | 'assessmentVersionId' | 'assessmentKey' | 'canonicalResultPayload'>): ResultFixture {
  return {
    assessmentTitle: 'Assessment',
    versionTag: '1.0.0',
    userId: 'user-1',
    mode: 'single_domain',
    pipelineStatus: 'COMPLETED',
    readinessStatus: 'READY',
    generatedAt: '2026-04-30T12:00:00.000Z',
    failureReason: null,
    createdAt: '2026-04-30T12:00:00.000Z',
    updatedAt: '2026-04-30T12:00:00.000Z',
    ...params,
  };
}

function createFakeDb(params: {
  inventory: InventoryFixture[];
  attempts?: AttemptFixture[];
  responses?: ResponseFixture[];
  results?: ResultFixture[];
  questionCountByVersionId?: Record<string, number>;
}): Queryable {
  const inventory = [...params.inventory];
  const attempts = [...(params.attempts ?? [])];
  const responses = [...(params.responses ?? [])];
  const results = [...(params.results ?? [])];
  const questionCountByVersionId = {
    ...Object.fromEntries(inventory.map((item) => [item.assessmentVersionId, 4])),
    ...(params.questionCountByVersionId ?? {}),
  };
  const inventoryByKey = new Map(inventory.map((item) => [item.assessmentKey, item]));
  const inventoryById = new Map(inventory.map((item) => [item.assessmentId, item]));

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
            question_count: questionCountByVersionId[item.assessmentVersionId] ?? 0,
          })) as T[],
        };
      }

      if (text.includes('FROM assessments a') && text.includes('WHERE a.assessment_key = $1')) {
        const assessmentKey = queryParams?.[0] as string;
        const item = inventoryByKey.get(assessmentKey);
        return {
          rows: (item
            ? [{
                assessment_id: item.assessmentId,
                assessment_key: item.assessmentKey,
                assessment_version_id: item.assessmentVersionId,
                version_tag: item.versionTag,
              }]
            : []) as T[],
        };
      }

      if (text.includes('FROM attempts') && text.includes("AND lifecycle_status = 'IN_PROGRESS'")) {
        const [userId, assessmentId] = queryParams as [string, string];
        const row = attempts
          .filter((attempt) =>
            attempt.userId === userId
            && attempt.assessmentId === assessmentId
            && attempt.lifecycleStatus === 'IN_PROGRESS')
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

        return { rows: (row ? [toAttemptRow(row)] : []) as T[] };
      }

      if (text.includes('FROM attempts') && !text.includes("AND lifecycle_status = 'IN_PROGRESS'")) {
        const [userId, assessmentId] = queryParams as [string, string];
        const row = attempts
          .filter((attempt) => attempt.userId === userId && attempt.assessmentId === assessmentId)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

        return { rows: (row ? [toAttemptRow(row)] : []) as T[] };
      }

      if (text.includes('COUNT(*) AS total_questions')) {
        const assessmentVersionId = queryParams?.[0] as string;
        return {
          rows: [{ total_questions: questionCountByVersionId[assessmentVersionId] ?? 0 }] as T[],
        };
      }

      if (text.includes('COUNT(DISTINCT question_id) AS answered_questions')) {
        const attemptId = queryParams?.[0] as string;
        return {
          rows: [{
            answered_questions: new Set(
              responses
                .filter((response) => response.attemptId === attemptId)
                .map((response) => response.questionId),
            ).size,
          }] as T[],
        };
      }

      if (text.includes('canonical_result_payload IS NOT NULL AS has_canonical_result_payload')) {
        const attemptId = queryParams?.[0] as string;
        const row = results
          .filter((result) => result.attemptId === attemptId)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

        return {
          rows: (row
            ? [{
                result_id: row.resultId,
                attempt_id: row.attemptId,
                pipeline_status: row.pipelineStatus,
                readiness_status: row.readinessStatus,
                generated_at: row.generatedAt,
                failure_reason: row.failureReason,
                has_canonical_result_payload: row.canonicalResultPayload !== null,
                created_at: row.createdAt,
                updated_at: row.updatedAt,
              }]
            : []) as T[],
        };
      }

      if (text.includes('FROM results r') && text.includes('ORDER BY COALESCE(r.generated_at, r.created_at) DESC, r.id DESC')) {
        const userId = queryParams?.[0] as string;
        return {
          rows: results
            .filter((result) =>
              result.userId === userId
              && result.readinessStatus === 'READY'
              && result.canonicalResultPayload !== null)
            .sort((left, right) => (right.generatedAt ?? right.createdAt).localeCompare(left.generatedAt ?? left.createdAt))
            .map((result) => toResultRow(result, inventoryById)) as T[],
        };
      }

      if (text.includes('FROM results r') && text.includes('WHERE r.id = $1')) {
        const [resultId, userId] = queryParams as [string, string];
        const row = results.find((result) =>
          result.resultId === resultId
          && result.userId === userId
          && result.readinessStatus === 'READY'
          && result.canonicalResultPayload !== null);

        return {
          rows: (row ? [toResultRow(row, inventoryById)] : []) as T[],
        };
      }

      return { rows: [] as T[] };
    },
  };
}

function toAttemptRow(attempt: AttemptFixture): Record<string, unknown> {
  return {
    attempt_id: attempt.attemptId,
    user_id: attempt.userId,
    assessment_id: attempt.assessmentId,
    assessment_version_id: attempt.assessmentVersionId,
    lifecycle_status: attempt.lifecycleStatus,
    started_at: attempt.startedAt,
    submitted_at: attempt.submittedAt,
    completed_at: attempt.completedAt,
    last_activity_at: attempt.lastActivityAt,
    created_at: attempt.createdAt,
    updated_at: attempt.updatedAt,
  };
}

function toResultRow(
  result: ResultFixture,
  inventoryById: ReadonlyMap<string, InventoryFixture>,
): Record<string, unknown> {
  return {
    result_id: result.resultId,
    attempt_id: result.attemptId,
    assessment_id: result.assessmentId,
    assessment_key: result.assessmentKey,
    assessment_mode: result.mode,
    assessment_title: inventoryById.get(result.assessmentId)?.title ?? result.assessmentTitle,
    version_tag: result.versionTag,
    readiness_status: result.readinessStatus,
    generated_at: result.generatedAt,
    created_at: result.createdAt,
    canonical_result_payload: result.canonicalResultPayload,
  };
}

const baseInventory: InventoryFixture = {
  assessmentId: 'assessment-1',
  assessmentKey: 'leadership',
  title: 'Leadership',
  description: 'Leadership assessment',
  assessmentVersionId: 'version-1',
  versionTag: '1.0.0',
  publishedAt: '2026-04-30T09:00:00.000Z',
};

test('assessment index exposes a safe not-started row', async () => {
  const workspace = await createWorkspaceService({
    db: createFakeDb({ inventory: [baseInventory] }),
  }).getWorkspaceViewModel({ userId: 'user-1' });

  const row = workspace.assessments[0];
  assert.equal(row?.status, 'not_started');
  assert.equal(row?.attemptId, null);
  assert.equal(row?.resultId, null);
  assert.equal(row?.signalsForIndex, null);
  assert.equal(row?.actionLabel, 'Start assessment');
  assert.equal(row?.actionHref, '/app/assessments/leadership');
  assert.equal(row?.actionDisabled, false);
});

test('assessment index exposes in-progress lifecycle and no signal scores', async () => {
  const workspace = await createWorkspaceService({
    db: createFakeDb({
      inventory: [baseInventory],
      attempts: [createAttempt({
        attemptId: 'attempt-1',
        assessmentId: 'assessment-1',
        assessmentVersionId: 'version-1',
        lifecycleStatus: 'IN_PROGRESS',
      })],
      responses: [
        { attemptId: 'attempt-1', questionId: 'question-1' },
        { attemptId: 'attempt-1', questionId: 'question-2' },
      ],
    }),
  }).getWorkspaceViewModel({ userId: 'user-1' });

  const row = workspace.assessments[0];
  assert.equal(row?.status, 'in_progress');
  assert.equal(row?.attemptId, 'attempt-1');
  assert.equal(row?.answeredCount, 2);
  assert.equal(row?.totalQuestionCount, 4);
  assert.equal(row?.progressPercentage, 50);
  assert.equal(row?.signalsForIndex, null);
  assert.equal(row?.actionLabel, 'Resume assessment');
  assert.equal(row?.actionHref, '/app/assessments/leadership');
});

test('completed attempt without a listable ready result is completed_processing', async () => {
  const workspace = await createWorkspaceService({
    db: createFakeDb({
      inventory: [baseInventory],
      attempts: [createAttempt({
        attemptId: 'attempt-processing',
        assessmentId: 'assessment-1',
        assessmentVersionId: 'version-1',
        lifecycleStatus: 'SUBMITTED',
        submittedAt: '2026-04-30T11:00:00.000Z',
        completedAt: '2026-04-30T11:01:00.000Z',
      })],
    }),
  }).getWorkspaceViewModel({ userId: 'user-1' });

  const row = workspace.assessments[0];
  assert.equal(row?.status, 'completed_processing');
  assert.equal(row?.attemptId, 'attempt-processing');
  assert.equal(row?.submittedAt, '2026-04-30T11:00:00.000Z');
  assert.equal(row?.resultId, null);
  assert.equal(row?.signalsForIndex, null);
  assert.equal(row?.actionLabel, 'Processing');
  assert.equal(row?.actionHref, null);
  assert.equal(row?.actionDisabled, true);
});

test('ready single-domain result exposes four persisted signal summaries', async () => {
  const payload = buildSingleDomainPayload();
  const workspace = await createWorkspaceService({
    db: createFakeDb({
      inventory: [baseInventory],
      attempts: [createAttempt({
        attemptId: 'attempt-ready',
        assessmentId: 'assessment-1',
        assessmentVersionId: 'version-1',
        lifecycleStatus: 'RESULT_READY',
        submittedAt: '2026-04-30T11:59:00.000Z',
        completedAt: '2026-04-30T12:00:00.000Z',
      })],
      results: [createResult({
        resultId: 'result-ready',
        attemptId: 'attempt-ready',
        assessmentId: 'assessment-1',
        assessmentVersionId: 'version-1',
        assessmentKey: 'leadership',
        assessmentTitle: 'Leadership',
        canonicalResultPayload: payload,
      })],
      responses: payload.signals.map((_, index) => ({
        attemptId: 'attempt-ready',
        questionId: `question-${index + 1}`,
      })),
    }),
  }).getWorkspaceViewModel({ userId: 'user-1' });

  const row = workspace.assessments[0];
  assert.equal(row?.status, 'results_ready');
  assert.equal(row?.assessmentMode, 'single_domain');
  assert.equal(row?.resultId, 'result-ready');
  assert.equal(row?.resultHref, '/app/results/single-domain/result-ready');
  assert.equal(row?.actionLabel, 'View result');
  assert.equal(row?.actionHref, '/app/results/single-domain/result-ready');
  assert.deepEqual(row?.signalsForIndex, [
    { signalKey: 'vision', signalLabel: 'Vision', normalizedPercentage: 37, rank: 1, displayRole: 'Primary' },
    { signalKey: 'delivery', signalLabel: 'Delivery', normalizedPercentage: 28, rank: 2, displayRole: 'Secondary' },
    { signalKey: 'people', signalLabel: 'People', normalizedPercentage: 21, rank: 3, displayRole: 'Third' },
    { signalKey: 'rigor', signalLabel: 'Rigor', normalizedPercentage: 14, rank: 4, displayRole: 'Fourth' },
  ]);
});

test('ready single-domain signal index sorts by persisted rank and caps at four signals', async () => {
  const payload = buildSingleDomainPayload({
    signals: ([
      ['sixth', 'Sixth', 6, 2],
      ['third', 'Third Signal', 3, 21],
      ['first', 'First Signal', 1, 39],
      ['fifth', 'Fifth Signal', 5, 3],
      ['second', 'Second Signal', 2, 27],
      ['fourth', 'Fourth Signal', 4, 11],
    ] as const).map(([signalKey, signalLabel, rank, normalizedScore]) => ({
      signal_key: signalKey,
      signal_label: signalLabel,
      rank,
      normalized_score: normalizedScore,
      raw_score: normalizedScore,
      position: rank === 1 ? 'primary' : rank === 2 ? 'secondary' : 'supporting',
      position_label: rank === 1 ? 'Primary' : rank === 2 ? 'Secondary' : 'Supporting',
      chapter_intro: `${signalLabel} intro`,
      chapter_how_it_shows_up: `${signalLabel} shows up`,
      chapter_value_outcome: `${signalLabel} value`,
      chapter_value_team_effect: `${signalLabel} team effect`,
      chapter_risk_behaviour: `${signalLabel} risk`,
      chapter_risk_impact: `${signalLabel} impact`,
      chapter_development: `${signalLabel} development`,
    })),
  });
  const workspace = await createWorkspaceService({
    db: createFakeDb({
      inventory: [baseInventory],
      attempts: [createAttempt({
        attemptId: 'attempt-ranked',
        assessmentId: 'assessment-1',
        assessmentVersionId: 'version-1',
        lifecycleStatus: 'RESULT_READY',
        submittedAt: '2026-04-30T11:59:00.000Z',
        completedAt: '2026-04-30T12:00:00.000Z',
      })],
      results: [createResult({
        resultId: 'result-ranked',
        attemptId: 'attempt-ranked',
        assessmentId: 'assessment-1',
        assessmentVersionId: 'version-1',
        assessmentKey: 'leadership',
        canonicalResultPayload: payload,
      })],
    }),
  }).getWorkspaceViewModel({ userId: 'user-1' });

  assert.deepEqual(
    workspace.assessments[0]?.signalsForIndex?.map((signal) => ({
      key: signal.signalKey,
      rank: signal.rank,
      role: signal.displayRole,
      percentage: signal.normalizedPercentage,
    })),
    [
      { key: 'first', rank: 1, role: 'Primary', percentage: 39 },
      { key: 'second', rank: 2, role: 'Secondary', percentage: 27 },
      { key: 'third', rank: 3, role: 'Third', percentage: 21 },
      { key: 'fourth', rank: 4, role: 'Fourth', percentage: 11 },
    ],
  );
});

test('ready single-domain result with fewer persisted signals returns only available signals', async () => {
  const payload = buildSingleDomainPayload({
    signals: ([
      ['vision', 'Vision', 1, 61],
      ['delivery', 'Delivery', 2, 39],
    ] as const).map(([signalKey, signalLabel, rank, normalizedScore]) => ({
      signal_key: signalKey,
      signal_label: signalLabel,
      rank,
      normalized_score: normalizedScore,
      raw_score: normalizedScore,
      position: rank === 1 ? 'primary' : 'secondary',
      position_label: rank === 1 ? 'Primary' : 'Secondary',
      chapter_intro: `${signalLabel} intro`,
      chapter_how_it_shows_up: `${signalLabel} shows up`,
      chapter_value_outcome: `${signalLabel} value`,
      chapter_value_team_effect: `${signalLabel} team effect`,
      chapter_risk_behaviour: `${signalLabel} risk`,
      chapter_risk_impact: `${signalLabel} impact`,
      chapter_development: `${signalLabel} development`,
    })),
  });
  const workspace = await createWorkspaceService({
    db: createFakeDb({
      inventory: [baseInventory],
      attempts: [createAttempt({
        attemptId: 'attempt-two-signals',
        assessmentId: 'assessment-1',
        assessmentVersionId: 'version-1',
        lifecycleStatus: 'RESULT_READY',
        submittedAt: '2026-04-30T11:59:00.000Z',
        completedAt: '2026-04-30T12:00:00.000Z',
      })],
      results: [createResult({
        resultId: 'result-two-signals',
        attemptId: 'attempt-two-signals',
        assessmentId: 'assessment-1',
        assessmentVersionId: 'version-1',
        assessmentKey: 'leadership',
        canonicalResultPayload: payload,
      })],
    }),
  }).getWorkspaceViewModel({ userId: 'user-1' });

  assert.deepEqual(workspace.assessments[0]?.signalsForIndex, [
    { signalKey: 'vision', signalLabel: 'Vision', normalizedPercentage: 61, rank: 1, displayRole: 'Primary' },
    { signalKey: 'delivery', signalLabel: 'Delivery', normalizedPercentage: 39, rank: 2, displayRole: 'Secondary' },
  ]);
});

test('malformed single-domain signal data degrades without synthesized scores', async () => {
  const malformedPayload = {
    ...buildSingleDomainPayload(),
    signals: [{
      signal_key: 'vision',
      signal_label: 'Vision',
      rank: 1,
      raw_score: 5,
      position: 'primary',
      position_label: 'Primary',
      chapter_intro: 'Vision intro',
      chapter_how_it_shows_up: 'Vision shows up',
      chapter_value_outcome: 'Vision value',
      chapter_value_team_effect: 'Vision team',
      chapter_risk_behaviour: 'Vision risk',
      chapter_risk_impact: 'Vision impact',
      chapter_development: 'Vision development',
    }],
  };
  const workspace = await createWorkspaceService({
    db: createFakeDb({
      inventory: [baseInventory],
      attempts: [createAttempt({
        attemptId: 'attempt-bad',
        assessmentId: 'assessment-1',
        assessmentVersionId: 'version-1',
        lifecycleStatus: 'RESULT_READY',
        submittedAt: '2026-04-30T11:59:00.000Z',
        completedAt: '2026-04-30T12:00:00.000Z',
      })],
      results: [createResult({
        resultId: 'result-bad',
        attemptId: 'attempt-bad',
        assessmentId: 'assessment-1',
        assessmentVersionId: 'version-1',
        assessmentKey: 'leadership',
        canonicalResultPayload: malformedPayload,
      })],
    }),
  }).getWorkspaceViewModel({ userId: 'user-1' });

  const row = workspace.assessments[0];
  assert.equal(row?.status, 'completed_processing');
  assert.equal(row?.resultId, null);
  assert.equal(row?.signalsForIndex, null);
});

test('multi-domain results do not force a four-signal index', async () => {
  const workspace = await createWorkspaceService({
    db: createFakeDb({
      inventory: [baseInventory],
      attempts: [createAttempt({
        attemptId: 'attempt-multi',
        assessmentId: 'assessment-1',
        assessmentVersionId: 'version-1',
        lifecycleStatus: 'RESULT_READY',
        submittedAt: '2026-04-30T11:59:00.000Z',
        completedAt: '2026-04-30T12:00:00.000Z',
      })],
      results: [createResult({
        resultId: 'result-multi',
        attemptId: 'attempt-multi',
        assessmentId: 'assessment-1',
        assessmentVersionId: 'version-1',
        assessmentKey: 'leadership',
        mode: 'multi_domain',
        canonicalResultPayload: buildMultiDomainPayload({
          assessmentKey: 'leadership',
          attemptId: 'attempt-multi',
        }),
      })],
    }),
  }).getWorkspaceViewModel({ userId: 'user-1' });

  const row = workspace.assessments[0];
  assert.equal(row?.status, 'results_ready');
  assert.equal(row?.assessmentMode, 'multi_domain');
  assert.equal(row?.resultHref, '/app/results/result-multi');
  assert.equal(row?.signalsForIndex, null);
});
