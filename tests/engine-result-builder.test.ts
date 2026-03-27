import test from 'node:test';
import assert from 'node:assert/strict';

import { isCanonicalResultPayload } from '@/lib/engine/result-contract';
import { buildCanonicalResultPayload } from '@/lib/engine/result-builder';
import type { CanonicalResultBuilderInput } from '@/lib/engine/result-builder';
import type { NormalizedDomainSummary, NormalizedSignalScore } from '@/lib/engine/types';

function buildNormalizedSignal(params: {
  signalId: string;
  signalKey: string;
  title?: string;
  domainId: string;
  domainKey: string;
  domainSource?: 'question_section' | 'signal_group';
  rawTotal: number;
  percentage: number;
  domainPercentage: number;
  rank: number;
  isOverlay?: boolean;
  overlayType?: 'none' | 'decision' | 'role';
}): NormalizedSignalScore {
  return {
    signalId: params.signalId,
    signalKey: params.signalKey,
    signalTitle: params.title ?? params.signalKey,
    domainId: params.domainId,
    domainKey: params.domainKey,
    domainSource: params.domainSource ?? 'signal_group',
    isOverlay: params.isOverlay ?? false,
    overlayType: params.overlayType ?? 'none',
    rawTotal: params.rawTotal,
    normalizedValue: params.percentage,
    percentage: params.percentage,
    domainPercentage: params.domainPercentage,
    rank: params.rank,
  };
}

function buildDomainSummary(params: {
  domainId: string;
  domainKey: string;
  title?: string;
  domainSource?: 'question_section' | 'signal_group';
  rawTotal: number;
  percentage: number;
  signalScores: readonly NormalizedSignalScore[];
  answeredQuestionCount?: number;
}): NormalizedDomainSummary {
  return {
    domainId: params.domainId,
    domainKey: params.domainKey,
    domainTitle: params.title ?? params.domainKey,
    domainSource: params.domainSource ?? 'signal_group',
    rawTotal: params.rawTotal,
    normalizedValue: params.percentage,
    percentage: params.percentage,
    signalScores: params.signalScores,
    signalCount: params.signalScores.length,
    answeredQuestionCount: params.answeredQuestionCount ?? 0,
    rankedSignalIds: Object.freeze(
      [...params.signalScores]
        .sort((left, right) => left.rank - right.rank)
        .map((signalScore) => signalScore.signalId),
    ),
  };
}

function buildNormalizedResultFixture(overrides?: {
  signalScores?: readonly NormalizedSignalScore[];
  domainSummaries?: readonly NormalizedDomainSummary[];
  topSignalId?: string | null;
  zeroMass?: boolean;
  normalizationWarnings?: readonly string[];
  scoringWarnings?: readonly string[];
  answeredQuestions?: number;
  totalQuestions?: number;
}): CanonicalResultBuilderInput {
  const signalScores =
    overrides?.signalScores ??
    Object.freeze([
      buildNormalizedSignal({
        signalId: 'signal-focus',
        signalKey: 'focus',
        title: 'Focus',
        domainId: 'domain-signals',
        domainKey: 'signals',
        rawTotal: 5,
        percentage: 50,
        domainPercentage: 50,
        rank: 1,
      }),
      buildNormalizedSignal({
        signalId: 'signal-drive',
        signalKey: 'drive',
        title: 'Drive',
        domainId: 'domain-signals',
        domainKey: 'signals',
        rawTotal: 3,
        percentage: 30,
        domainPercentage: 30,
        rank: 2,
      }),
      buildNormalizedSignal({
        signalId: 'signal-balance',
        signalKey: 'balance',
        title: 'Balance',
        domainId: 'domain-signals',
        domainKey: 'signals',
        rawTotal: 2,
        percentage: 20,
        domainPercentage: 20,
        rank: 3,
      }),
    ]);

  const domainSummaries =
    overrides?.domainSummaries ??
    Object.freeze([
      buildDomainSummary({
        domainId: 'domain-section',
        domainKey: 'section_a',
        title: 'Section A',
        domainSource: 'question_section',
        rawTotal: 0,
        percentage: 0,
        signalScores: Object.freeze([]),
        answeredQuestionCount: 3,
      }),
      buildDomainSummary({
        domainId: 'domain-signals',
        domainKey: 'signals',
        title: 'Signals',
        domainSource: 'signal_group',
        rawTotal: 10,
        percentage: 100,
        signalScores,
        answeredQuestionCount: 3,
      }),
    ]);

  const answeredQuestions = overrides?.answeredQuestions ?? 3;
  const totalQuestions = overrides?.totalQuestions ?? 4;

  return {
    metadata: {
      assessmentKey: 'wplp80',
      version: '1.0.0',
      attemptId: 'attempt-1',
    },
    scoringDiagnostics: {
      scoringMethod: 'option_signal_weights_only',
      totalQuestions,
      answeredQuestions,
      unansweredQuestions: totalQuestions - answeredQuestions,
      totalResponsesProcessed: answeredQuestions,
      totalWeightsApplied: answeredQuestions,
      totalScoreMass: signalScores.reduce((sum, signalScore) => sum + signalScore.rawTotal, 0),
      zeroScoreSignalCount: signalScores.filter((signalScore) => signalScore.rawTotal === 0).length,
      zeroAnswerSubmission: answeredQuestions === 0,
      warnings: overrides?.scoringWarnings ?? Object.freeze(['incomplete_response_set']),
      generatedAt: '2026-01-01T00:01:00.000Z',
    },
    signalScores,
    domainSummaries,
    topSignalId: overrides?.topSignalId ?? signalScores[0]?.signalId ?? null,
    diagnostics: {
      normalizationMethod: 'largest_remainder_integer_percentages',
      totalScoreMass: signalScores.reduce((sum, signalScore) => sum + signalScore.rawTotal, 0),
      zeroMass: overrides?.zeroMass ?? false,
      globalPercentageSum: signalScores.reduce((sum, signalScore) => sum + signalScore.percentage, 0),
      domainPercentageSums: Object.freeze(
        Object.fromEntries(
          domainSummaries.map((domainSummary) => [
            domainSummary.domainId,
            domainSummary.signalScores.reduce((sum, signalScore) => sum + signalScore.domainPercentage, 0),
          ]),
        ),
      ),
      roundingAdjustmentsApplied: 0,
      zeroScoreSignalCount: signalScores.filter((signalScore) => signalScore.rawTotal === 0).length,
      warnings: overrides?.normalizationWarnings ?? Object.freeze([]),
      generatedAt: '2026-01-01T00:01:00.000Z',
    },
  };
}

test('minimal valid payload construction returns a complete canonical result payload', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture(),
  });

  assert.ok(isCanonicalResultPayload(payload));
  assert.equal(payload.metadata.assessmentKey, 'wplp80');
  assert.equal(payload.metadata.version, '1.0.0');
  assert.equal(payload.metadata.attemptId, 'attempt-1');
});

test('top signal projection matches normalization ranking', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture(),
  });

  assert.equal(payload.topSignal?.signalId, 'signal-focus');
  assert.equal(payload.topSignal?.percentage, 50);
  assert.equal(payload.topSignal?.rank, 1);
});

test('ranked signals include all signals in deterministic ranked order', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture(),
  });

  assert.deepEqual(
    payload.rankedSignals.map((signal) => signal.signalId),
    ['signal-focus', 'signal-drive', 'signal-balance'],
  );
});

test('normalized scores preserve canonical stable projection and metadata', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture(),
  });

  assert.deepEqual(
    payload.normalizedScores.map((signal) => signal.signalId),
    ['signal-focus', 'signal-drive', 'signal-balance'],
  );
  assert.equal(payload.normalizedScores[0]?.domainKey, 'signals');
  assert.equal(payload.normalizedScores[0]?.rawTotal, 5);
});

test('domain summaries include all domains including empty question-section domains', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture(),
  });

  assert.deepEqual(
    payload.domainSummaries.map((domain) => domain.domainId),
    ['domain-section', 'domain-signals'],
  );
  assert.equal(payload.domainSummaries[0]?.signalScores.length, 0);
  assert.equal(payload.domainSummaries[0]?.domainSource, 'question_section');
});

test('overview summary classification is deterministic for concentrated profiles', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture(),
  });

  assert.equal(payload.overviewSummary.headline, 'A clear operating preference is coming through');
  assert.match(payload.overviewSummary.narrative, /dependable way to approach work/i);
});

test('overview summary uses top-signal interpretation when a mapped signal leads', () => {
  const mappedSignals = Object.freeze([
    buildNormalizedSignal({
      signalId: 'signal-analyst',
      signalKey: 'style_analyst',
      title: 'Analyst',
      domainId: 'domain-style',
      domainKey: 'signal_style',
      rawTotal: 5,
      percentage: 46,
      domainPercentage: 46,
      rank: 1,
    }),
    buildNormalizedSignal({
      signalId: 'signal-evidence',
      signalKey: 'decision_evidence',
      title: 'Evidence',
      domainId: 'domain-decision',
      domainKey: 'signal_decision',
      rawTotal: 3,
      percentage: 31,
      domainPercentage: 31,
      rank: 2,
      isOverlay: true,
      overlayType: 'decision',
    }),
    buildNormalizedSignal({
      signalId: 'signal-mastery',
      signalKey: 'mot_mastery',
      title: 'Mastery',
      domainId: 'domain-mot',
      domainKey: 'signal_mot',
      rawTotal: 2,
      percentage: 23,
      domainPercentage: 23,
      rank: 3,
    }),
  ]);

  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: mappedSignals,
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-analyst',
    }),
  });

  assert.equal(payload.overviewSummary.headline, 'Structured, thoughtful and evidence-led');
  assert.match(payload.overviewSummary.narrative, /logic rather than impulse/i);
  assert.match(payload.overviewSummary.narrative, /accuracy, sound judgement, and careful problem-solving/i);
});

test('overview summary uses secondary support language for balanced profiles', () => {
  const balancedSignals = Object.freeze([
    buildNormalizedSignal({
      signalId: 'signal-a',
      signalKey: 'style_driver',
      title: 'Driver',
      domainId: 'domain-style',
      domainKey: 'signal_style',
      rawTotal: 4,
      percentage: 36,
      domainPercentage: 36,
      rank: 1,
    }),
    buildNormalizedSignal({
      signalId: 'signal-b',
      signalKey: 'mot_achievement',
      title: 'Achievement',
      domainId: 'domain-mot',
      domainKey: 'signal_mot',
      rawTotal: 4,
      percentage: 34,
      domainPercentage: 34,
      rank: 2,
    }),
    buildNormalizedSignal({
      signalId: 'signal-c',
      signalKey: 'decision_agility',
      title: 'Agility',
      domainId: 'domain-decision',
      domainKey: 'signal_decision',
      rawTotal: 3,
      percentage: 30,
      domainPercentage: 30,
      rank: 3,
    }),
  ]);

  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: balancedSignals,
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-a',
    }),
  });

  assert.match(payload.overviewSummary.narrative, /close secondary signal in Achievement/i);
  assert.match(payload.overviewSummary.narrative, /extra energy in that direction/i);
});

test('strengths are generated deterministically from top-ranked signals', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: Object.freeze([
        buildNormalizedSignal({
          signalId: 'signal-driver',
          signalKey: 'style_driver',
          title: 'Driver',
          domainId: 'domain-style',
          domainKey: 'signal_style',
          rawTotal: 5,
          percentage: 50,
          domainPercentage: 50,
          rank: 1,
        }),
        buildNormalizedSignal({
          signalId: 'signal-results',
          signalKey: 'lead_results',
          title: 'Results',
          domainId: 'domain-lead',
          domainKey: 'signal_lead',
          rawTotal: 3,
          percentage: 30,
          domainPercentage: 30,
          rank: 2,
        }),
        buildNormalizedSignal({
          signalId: 'signal-achievement',
          signalKey: 'mot_achievement',
          title: 'Achievement',
          domainId: 'domain-mot',
          domainKey: 'signal_mot',
          rawTotal: 2,
          percentage: 20,
          domainPercentage: 20,
          rank: 3,
        }),
      ]),
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-driver',
    }),
  });

  assert.equal(payload.strengths.length, 3);
  assert.equal(payload.strengths[0]?.signalId, 'signal-driver');
  assert.match(payload.strengths[0]?.detail ?? '', /direction, urgency, or firmer calls/i);
  assert.doesNotMatch(payload.strengths[0]?.detail ?? '', /\d+%/);
});

test('watchouts are generated deterministically from overuse, pressure rules, and lower-access signals', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: Object.freeze([
        buildNormalizedSignal({
          signalId: 'signal-driver',
          signalKey: 'style_driver',
          title: 'Driver',
          domainId: 'domain-style',
          domainKey: 'signal_style',
          rawTotal: 5,
          percentage: 42,
          domainPercentage: 42,
          rank: 1,
        }),
        buildNormalizedSignal({
          signalId: 'signal-control',
          signalKey: 'stress_control',
          title: 'Control',
          domainId: 'domain-stress',
          domainKey: 'signal_stress',
          rawTotal: 4,
          percentage: 33,
          domainPercentage: 33,
          rank: 2,
        }),
        buildNormalizedSignal({
          signalId: 'signal-avoid',
          signalKey: 'conflict_avoid',
          title: 'Avoid',
          domainId: 'domain-conflict',
          domainKey: 'signal_conflict',
          rawTotal: 1,
          percentage: 10,
          domainPercentage: 10,
          rank: 3,
        }),
      ]),
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-driver',
    }),
  });

  assert.equal(payload.watchouts[0]?.title, 'Overused Driver');
  assert.match(payload.watchouts[0]?.detail ?? '', /too forceful, too fast, or too impatient/i);
  assert.match(payload.watchouts[1]?.detail ?? '', /over-control/i);
  assert.equal(payload.watchouts[2]?.title, 'Lower access to Avoid');
});

test('development focus is generated deterministically from lower-ranked signals', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: Object.freeze([
        buildNormalizedSignal({
          signalId: 'signal-driver',
          signalKey: 'style_driver',
          title: 'Driver',
          domainId: 'domain-style',
          domainKey: 'signal_style',
          rawTotal: 5,
          percentage: 55,
          domainPercentage: 55,
          rank: 1,
        }),
        buildNormalizedSignal({
          signalId: 'signal-collaborate',
          signalKey: 'conflict_collaborate',
          title: 'Collaborate',
          domainId: 'domain-conflict',
          domainKey: 'signal_conflict',
          rawTotal: 3,
          percentage: 29,
          domainPercentage: 29,
          rank: 2,
        }),
        buildNormalizedSignal({
          signalId: 'signal-evidence',
          signalKey: 'decision_evidence',
          title: 'Evidence',
          domainId: 'domain-decision',
          domainKey: 'signal_decision',
          rawTotal: 1,
          percentage: 10,
          domainPercentage: 10,
          rank: 3,
        }),
        buildNormalizedSignal({
          signalId: 'signal-people',
          signalKey: 'lead_people',
          title: 'People',
          domainId: 'domain-lead',
          domainKey: 'signal_lead',
          rawTotal: 1,
          percentage: 6,
          domainPercentage: 6,
          rank: 4,
        }),
      ]),
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-driver',
    }),
  });

  assert.equal(payload.developmentFocus.length, 2);
  assert.equal(payload.developmentFocus[0]?.signalId, 'signal-evidence');
  assert.match(payload.developmentFocus[0]?.detail ?? '', /concise evidence checks/i);
  assert.equal(payload.developmentFocus[1]?.signalId, 'signal-people');
});

test('zero-mass behavior remains explicit and still builds successfully', () => {
  const zeroSignals = Object.freeze([
    buildNormalizedSignal({
      signalId: 'signal-focus',
      signalKey: 'focus',
      title: 'Focus',
      domainId: 'domain-signals',
      domainKey: 'signals',
      rawTotal: 0,
      percentage: 0,
      domainPercentage: 0,
      rank: 1,
    }),
    buildNormalizedSignal({
      signalId: 'signal-drive',
      signalKey: 'drive',
      title: 'Drive',
      domainId: 'domain-signals',
      domainKey: 'signals',
      rawTotal: 0,
      percentage: 0,
      domainPercentage: 0,
      rank: 2,
    }),
  ]);

  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: zeroSignals,
      domainSummaries: Object.freeze([
        buildDomainSummary({
          domainId: 'domain-section',
          domainKey: 'section_a',
          title: 'Section A',
          domainSource: 'question_section',
          rawTotal: 0,
          percentage: 0,
          signalScores: Object.freeze([]),
          answeredQuestionCount: 0,
        }),
        buildDomainSummary({
          domainId: 'domain-signals',
          domainKey: 'signals',
          title: 'Signals',
          rawTotal: 0,
          percentage: 0,
          signalScores: zeroSignals,
          answeredQuestionCount: 0,
        }),
      ]),
      topSignalId: 'signal-focus',
      zeroMass: true,
      normalizationWarnings: Object.freeze(['zero_score_mass']),
      answeredQuestions: 0,
      totalQuestions: 4,
      scoringWarnings: Object.freeze(['incomplete_response_set', 'no_answers_submitted']),
    }),
  });

  assert.ok(payload.topSignal);
  assert.equal(payload.diagnostics.zeroMass, true);
  assert.equal(payload.diagnostics.zeroMassTopSignalFallbackApplied, true);
  assert.ok(payload.diagnostics.warnings.includes('zero_score_mass'));
});

test('overlay-like signals remain valid in ranked and normalized outputs', () => {
  const overlaySignals = Object.freeze([
    buildNormalizedSignal({
      signalId: 'signal-core',
      signalKey: 'core',
      title: 'Core',
      domainId: 'domain-signals',
      domainKey: 'signals',
      rawTotal: 4,
      percentage: 80,
      domainPercentage: 80,
      rank: 1,
    }),
    buildNormalizedSignal({
      signalId: 'signal-overlay',
      signalKey: 'role_executor',
      title: 'Role Executor',
      domainId: 'domain-signals',
      domainKey: 'signals',
      rawTotal: 1,
      percentage: 20,
      domainPercentage: 20,
      rank: 2,
      isOverlay: true,
      overlayType: 'role',
    }),
  ]);

  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: overlaySignals,
      domainSummaries: Object.freeze([
        buildDomainSummary({
          domainId: 'domain-signals',
          domainKey: 'signals',
          title: 'Signals',
          rawTotal: 5,
          percentage: 100,
          signalScores: overlaySignals,
          answeredQuestionCount: 2,
        }),
      ]),
      topSignalId: 'signal-core',
    }),
  });

  assert.equal(payload.rankedSignals[1]?.signalId, 'signal-overlay');
  assert.equal(payload.rankedSignals[1]?.isOverlay, true);
  assert.equal(payload.normalizedScores[1]?.overlayType, 'role');
});

test('repeated runs with the same normalized input are byte-stable', () => {
  const normalizedResult = buildNormalizedResultFixture();

  const first = buildCanonicalResultPayload({ normalizedResult });
  const second = buildCanonicalResultPayload({ normalizedResult });

  assert.equal(JSON.stringify(first), JSON.stringify(second));
});
