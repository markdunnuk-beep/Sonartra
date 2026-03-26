import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeScoreResult } from '@/lib/engine/normalization';
import type { RawDomainScoreSummary, RawSignalScore, ScoreResult } from '@/lib/engine/types';

function buildSignalScore(params: {
  signalId: string;
  signalKey: string;
  signalTitle?: string;
  domainId: string;
  domainKey: string;
  domainSource?: 'question_section' | 'signal_group';
  rawTotal: number;
  orderIndex: number;
  isOverlay?: boolean;
  overlayType?: 'none' | 'decision' | 'role';
}): RawSignalScore {
  return {
    signalId: params.signalId,
    signalKey: params.signalKey,
    signalTitle: params.signalTitle ?? params.signalKey,
    domainId: params.domainId,
    domainKey: params.domainKey,
    domainSource: params.domainSource ?? 'signal_group',
    isOverlay: params.isOverlay ?? false,
    overlayType: params.overlayType ?? 'none',
    orderIndex: params.orderIndex,
    rawTotal: params.rawTotal,
  };
}

function buildDomainSummary(params: {
  domainId: string;
  domainKey: string;
  domainTitle?: string;
  domainSource?: 'question_section' | 'signal_group';
  rawTotal: number;
  signalScores: RawSignalScore[];
  answeredQuestionCount?: number;
}): RawDomainScoreSummary {
  return {
    domainId: params.domainId,
    domainKey: params.domainKey,
    domainTitle: params.domainTitle ?? params.domainKey,
    domainSource: params.domainSource ?? 'signal_group',
    rawTotal: params.rawTotal,
    signalScores: params.signalScores,
    signalCount: params.signalScores.length,
    answeredQuestionCount: params.answeredQuestionCount ?? 0,
  };
}

function buildScoreResult(params?: {
  signalScores?: RawSignalScore[];
  domainSummaries?: RawDomainScoreSummary[];
  totalScoreMass?: number;
}): ScoreResult {
  const signalScores =
    params?.signalScores ??
    [
      buildSignalScore({
        signalId: 'signal-a',
        signalKey: 'signal_a',
        domainId: 'domain-signals',
        domainKey: 'signals',
        rawTotal: 2,
        orderIndex: 1,
      }),
      buildSignalScore({
        signalId: 'signal-b',
        signalKey: 'signal_b',
        domainId: 'domain-signals',
        domainKey: 'signals',
        rawTotal: 1,
        orderIndex: 2,
      }),
    ];

  const domainSummaries =
    params?.domainSummaries ??
    [
      buildDomainSummary({
        domainId: 'domain-section',
        domainKey: 'section_a',
        domainTitle: 'Section A',
        domainSource: 'question_section',
        rawTotal: 0,
        signalScores: [],
        answeredQuestionCount: 2,
      }),
      buildDomainSummary({
        domainId: 'domain-signals',
        domainKey: 'signals',
        domainTitle: 'Signals',
        domainSource: 'signal_group',
        rawTotal: signalScores.reduce((total, signalScore) => total + signalScore.rawTotal, 0),
        signalScores,
        answeredQuestionCount: 2,
      }),
    ];

  return {
    signalScores: Object.freeze(signalScores),
    domainSummaries: Object.freeze(domainSummaries),
    diagnostics: {
      scoringMethod: 'option_signal_weights_only',
      totalQuestions: 2,
      answeredQuestions: 2,
      unansweredQuestions: 0,
      totalResponsesProcessed: 2,
      totalWeightsApplied: 2,
      totalScoreMass: params?.totalScoreMass ?? signalScores.reduce((total, signalScore) => total + signalScore.rawTotal, 0),
      zeroScoreSignalCount: signalScores.filter((signalScore) => signalScore.rawTotal === 0).length,
      zeroAnswerSubmission: false,
      warnings: Object.freeze([]),
      generatedAt: '2026-01-01T00:01:00.000Z',
    },
  };
}

test('normalizes a minimal non-zero score result', () => {
  const result = normalizeScoreResult({ scoreResult: buildScoreResult() });

  assert.deepEqual(
    result.signalScores.map((signalScore) => signalScore.percentage),
    [67, 33],
  );
  assert.equal(result.topSignalId, 'signal-a');
});

test('global percentages sum exactly to 100 for non-zero score mass', () => {
  const result = normalizeScoreResult({ scoreResult: buildScoreResult() });
  const total = result.signalScores.reduce((sum, signalScore) => sum + signalScore.percentage, 0);

  assert.equal(total, 100);
  assert.equal(result.diagnostics.globalPercentageSum, 100);
});

test('domain-local percentages sum exactly to 100 for non-zero score-bearing domains', () => {
  const result = normalizeScoreResult({ scoreResult: buildScoreResult() });
  const domain = result.domainSummaries.find((summary) => summary.domainId === 'domain-signals');

  assert.ok(domain);
  assert.equal(domain.signalScores.reduce((sum, signalScore) => sum + signalScore.domainPercentage, 0), 100);
  assert.equal(result.diagnostics.domainPercentageSums['domain-signals'], 100);
});

test('one-signal domain normalizes to 100', () => {
  const onlySignal = buildSignalScore({
    signalId: 'signal-only',
    signalKey: 'signal_only',
    domainId: 'domain-single',
    domainKey: 'single',
    rawTotal: 5,
    orderIndex: 1,
  });

  const result = normalizeScoreResult({
    scoreResult: buildScoreResult({
      signalScores: [onlySignal],
      domainSummaries: [
        buildDomainSummary({
          domainId: 'domain-single',
          domainKey: 'single',
          rawTotal: 5,
          signalScores: [onlySignal],
          answeredQuestionCount: 1,
        }),
      ],
    }),
  });

  assert.equal(result.signalScores[0]?.percentage, 100);
  assert.equal(result.signalScores[0]?.domainPercentage, 100);
  assert.equal(result.domainSummaries[0]?.percentage, 100);
});

test('zero-total score result returns all zero percentages', () => {
  const zeroSignals = [
    buildSignalScore({
      signalId: 'signal-a',
      signalKey: 'signal_a',
      domainId: 'domain-signals',
      domainKey: 'signals',
      rawTotal: 0,
      orderIndex: 1,
    }),
    buildSignalScore({
      signalId: 'signal-b',
      signalKey: 'signal_b',
      domainId: 'domain-signals',
      domainKey: 'signals',
      rawTotal: 0,
      orderIndex: 2,
    }),
  ];

  const result = normalizeScoreResult({
    scoreResult: buildScoreResult({
      signalScores: zeroSignals,
      domainSummaries: [
        buildDomainSummary({
          domainId: 'domain-section',
          domainKey: 'section_a',
          domainSource: 'question_section',
          rawTotal: 0,
          signalScores: [],
          answeredQuestionCount: 0,
        }),
        buildDomainSummary({
          domainId: 'domain-signals',
          domainKey: 'signals',
          rawTotal: 0,
          signalScores: zeroSignals,
          answeredQuestionCount: 0,
        }),
      ],
      totalScoreMass: 0,
    }),
  });

  assert.deepEqual(result.signalScores.map((signalScore) => signalScore.percentage), [0, 0]);
  assert.equal(result.diagnostics.zeroMass, true);
  assert.equal(result.diagnostics.globalPercentageSum, 0);
});

test('zero-total domain returns zero domain-local percentages', () => {
  const signals = [
    buildSignalScore({
      signalId: 'signal-a',
      signalKey: 'signal_a',
      domainId: 'domain-signals',
      domainKey: 'signals',
      rawTotal: 0,
      orderIndex: 1,
    }),
  ];

  const result = normalizeScoreResult({
    scoreResult: buildScoreResult({
      signalScores: signals,
      domainSummaries: [
        buildDomainSummary({
          domainId: 'domain-signals',
          domainKey: 'signals',
          rawTotal: 0,
          signalScores: signals,
          answeredQuestionCount: 0,
        }),
      ],
      totalScoreMass: 0,
    }),
  });

  assert.deepEqual(result.domainSummaries[0]?.signalScores.map((signalScore) => signalScore.domainPercentage), [0]);
  assert.equal(result.diagnostics.domainPercentageSums['domain-signals'], 0);
});

test('uses deterministic largest-remainder rounding', () => {
  const signals = [
    buildSignalScore({
      signalId: 'signal-a',
      signalKey: 'signal_a',
      domainId: 'domain-signals',
      domainKey: 'signals',
      rawTotal: 1,
      orderIndex: 1,
    }),
    buildSignalScore({
      signalId: 'signal-b',
      signalKey: 'signal_b',
      domainId: 'domain-signals',
      domainKey: 'signals',
      rawTotal: 1,
      orderIndex: 2,
    }),
    buildSignalScore({
      signalId: 'signal-c',
      signalKey: 'signal_c',
      domainId: 'domain-signals',
      domainKey: 'signals',
      rawTotal: 1,
      orderIndex: 3,
    }),
  ];

  const result = normalizeScoreResult({
    scoreResult: buildScoreResult({
      signalScores: signals,
      domainSummaries: [
        buildDomainSummary({
          domainId: 'domain-signals',
          domainKey: 'signals',
          rawTotal: 3,
          signalScores: signals,
          answeredQuestionCount: 1,
        }),
      ],
    }),
  });

  assert.deepEqual(result.signalScores.map((signalScore) => signalScore.percentage), [34, 33, 33]);
});

test('handles ranking ties deterministically', () => {
  const signals = [
    buildSignalScore({
      signalId: 'signal-a',
      signalKey: 'signal_a',
      domainId: 'domain-signals',
      domainKey: 'signals',
      rawTotal: 2,
      orderIndex: 1,
    }),
    buildSignalScore({
      signalId: 'signal-b',
      signalKey: 'signal_b',
      domainId: 'domain-signals',
      domainKey: 'signals',
      rawTotal: 2,
      orderIndex: 2,
    }),
  ];

  const result = normalizeScoreResult({
    scoreResult: buildScoreResult({
      signalScores: signals,
      domainSummaries: [
        buildDomainSummary({
          domainId: 'domain-signals',
          domainKey: 'signals',
          rawTotal: 4,
          signalScores: signals,
          answeredQuestionCount: 1,
        }),
      ],
    }),
  });

  assert.deepEqual(result.signalScores.map((signalScore) => signalScore.rank), [1, 2]);
  assert.equal(result.topSignalId, 'signal-a');
});

test('preserves domain ordering', () => {
  const result = normalizeScoreResult({ scoreResult: buildScoreResult() });

  assert.deepEqual(result.domainSummaries.map((summary) => summary.domainId), [
    'domain-section',
    'domain-signals',
  ]);
});

test('normalizes overlay-compatible signals normally', () => {
  const signals = [
    buildSignalScore({
      signalId: 'signal-core',
      signalKey: 'core_focus',
      domainId: 'domain-signals',
      domainKey: 'signals',
      rawTotal: 4,
      orderIndex: 1,
    }),
    buildSignalScore({
      signalId: 'signal-overlay',
      signalKey: 'role_executor',
      domainId: 'domain-signals',
      domainKey: 'signals',
      rawTotal: 1,
      orderIndex: 2,
      isOverlay: true,
      overlayType: 'role',
    }),
  ];

  const result = normalizeScoreResult({
    scoreResult: buildScoreResult({
      signalScores: signals,
      domainSummaries: [
        buildDomainSummary({
          domainId: 'domain-signals',
          domainKey: 'signals',
          rawTotal: 5,
          signalScores: signals,
          answeredQuestionCount: 1,
        }),
      ],
    }),
  });

  const overlay = result.signalScores.find((signalScore) => signalScore.signalId === 'signal-overlay');
  assert.equal(overlay?.percentage, 20);
  assert.equal(overlay?.isOverlay, true);
});

test('keeps question-section domains with no signal scores valid', () => {
  const result = normalizeScoreResult({ scoreResult: buildScoreResult() });
  const questionSection = result.domainSummaries.find((summary) => summary.domainId === 'domain-section');

  assert.ok(questionSection);
  assert.equal(questionSection?.domainSource, 'question_section');
  assert.equal(questionSection?.signalScores.length, 0);
  assert.equal(questionSection?.percentage, 0);
});

test('repeated runs produce byte-stable equivalent output', () => {
  const scoreResult = buildScoreResult();

  const first = normalizeScoreResult({ scoreResult });
  const second = normalizeScoreResult({ scoreResult });

  assert.equal(JSON.stringify(first), JSON.stringify(second));
});
