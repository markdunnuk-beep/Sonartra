import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRankedPatternKeyFromResultSignals,
  classifyRankedPatternResultSignals,
} from '@/lib/server/single-domain-completion';
import {
  RANKED_PATTERN_SCORE_SHAPE_POLICY_KEY,
  RANKED_PATTERN_SCORE_SHAPE_POLICY_VERSION,
} from '@/content/assessment-packages/import-contract/ranked-pattern-score-shape-policy';

function rankedSignals(percentages: readonly number[]) {
  return percentages.map((normalized_score, index) => ({
    signal_key: ['alpha', 'beta', 'gamma', 'delta'][index]!,
    rank: index + 1,
    normalized_score,
  }));
}

test('runtime score-shape adapter classifies fixed-policy examples from normalized percentages', () => {
  assert.equal(classifyRankedPatternResultSignals(rankedSignals([55, 25, 12, 8])).scoreShape, 'concentrated');
  assert.equal(classifyRankedPatternResultSignals(rankedSignals([38, 36, 16, 10])).scoreShape, 'paired');
  assert.equal(classifyRankedPatternResultSignals(rankedSignals([28, 26, 24, 22])).scoreShape, 'balanced');
  assert.equal(classifyRankedPatternResultSignals(rankedSignals([40, 30, 20, 10])).scoreShape, 'graduated');
});

test('runtime score-shape adapter preserves normalized percentages and ranked signal order', () => {
  const signals = rankedSignals([38, 36, 16, 10]);
  const before = JSON.stringify(signals);
  const result = classifyRankedPatternResultSignals(signals);

  assert.equal(result.scoreShape, 'paired');
  assert.equal(JSON.stringify(signals), before);
  assert.deepEqual(signals.map((signal) => signal.signal_key), ['alpha', 'beta', 'gamma', 'delta']);
  assert.deepEqual(signals.map((signal) => signal.normalized_score), [38, 36, 16, 10]);
});

test('runtime pattern key is generated from rank one through rank four signal keys', () => {
  const signals = [
    { signal_key: 'gamma', rank: 3 },
    { signal_key: 'alpha', rank: 1 },
    { signal_key: 'delta', rank: 4 },
    { signal_key: 'beta', rank: 2 },
  ];

  assert.equal(buildRankedPatternKeyFromResultSignals(signals), 'alpha_beta_gamma_delta');
});

test('runtime score-shape metadata is ready for canonical payload persistence', () => {
  const result = classifyRankedPatternResultSignals(rankedSignals([28, 26, 24, 22]));
  const scoreShape = {
    value: result.scoreShape,
    policyKey: result.policyKey,
    policyVersion: result.policyVersion,
  };

  assert.deepEqual(scoreShape, {
    value: 'balanced',
    policyKey: RANKED_PATTERN_SCORE_SHAPE_POLICY_KEY,
    policyVersion: RANKED_PATTERN_SCORE_SHAPE_POLICY_VERSION,
  });
  assert.equal(result.diagnostics.length, 0);
});

test('runtime adapter does not assemble reader-first result language sections', () => {
  const result = classifyRankedPatternResultSignals(rankedSignals([40, 30, 20, 10]));

  assert.equal('context' in result, false);
  assert.equal('orientation' in result, false);
  assert.equal('patternSynthesis' in result, false);
});
