import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyRankedPatternScoreShape,
  getRankedPatternScoreShapePolicySummary,
  RANKED_PATTERN_SCORE_SHAPE_POLICY_KEY,
  RANKED_PATTERN_SCORE_SHAPE_POLICY_VERSION,
} from '@/content/assessment-packages/import-contract/ranked-pattern-score-shape-policy';

function entries(percentages: readonly number[]) {
  return percentages.map((normalizedPercentage, index) => ({
    signalKey: `signal_${String.fromCharCode(97 + index)}`,
    normalizedPercentage,
  }));
}

test('fixed score-shape policy exposes a named versioned summary', () => {
  const summary = getRankedPatternScoreShapePolicySummary();

  assert.equal(summary.policyKey, RANKED_PATTERN_SCORE_SHAPE_POLICY_KEY);
  assert.equal(summary.policyVersion, RANKED_PATTERN_SCORE_SHAPE_POLICY_VERSION);
  assert.deepEqual(summary.supportedScoreShapes, ['concentrated', 'paired', 'graduated', 'balanced']);
  assert.equal(summary.deterministicBasis, 'normalized_ranked_percentages');
  assert.equal(summary.thresholds.concentratedMinimumTopGap, 15);
});

test('classifies concentrated, paired, balanced, and graduated distributions', () => {
  assert.equal(classifyRankedPatternScoreShape(entries([55, 25, 12, 8])).scoreShape, 'concentrated');
  assert.equal(classifyRankedPatternScoreShape(entries([38, 36, 16, 10])).scoreShape, 'paired');
  assert.equal(classifyRankedPatternScoreShape(entries([28, 26, 24, 22])).scoreShape, 'balanced');
  assert.equal(classifyRankedPatternScoreShape(entries([40, 30, 20, 10])).scoreShape, 'graduated');
});

test('balanced is checked before paired and concentrated wins on a large top gap', () => {
  assert.equal(classifyRankedPatternScoreShape(entries([28, 27, 23, 22])).scoreShape, 'balanced');
  assert.equal(classifyRankedPatternScoreShape(entries([50, 34, 10, 6])).scoreShape, 'concentrated');
});

test('paired requires top closeness and more than a ten-point second-to-third separation', () => {
  assert.equal(classifyRankedPatternScoreShape(entries([35, 34, 24, 7])).scoreShape, 'graduated');
});

test('invalid entry count, duplicate keys, NaN, and negative percentages are diagnostic failures', () => {
  const invalidCount = classifyRankedPatternScoreShape(entries([40, 30, 20]));
  const duplicateKeys = classifyRankedPatternScoreShape([
    { signalKey: 'signal_a', normalizedPercentage: 40 },
    { signalKey: 'signal_a', normalizedPercentage: 30 },
    { signalKey: 'signal_c', normalizedPercentage: 20 },
    { signalKey: 'signal_d', normalizedPercentage: 10 },
  ]);
  const invalidNumbers = classifyRankedPatternScoreShape([
    { signalKey: 'signal_a', normalizedPercentage: Number.NaN },
    { signalKey: 'signal_b', normalizedPercentage: -1 },
    { signalKey: 'signal_c', normalizedPercentage: 20 },
    { signalKey: 'signal_d', normalizedPercentage: 10 },
  ]);

  assert.equal(invalidCount.scoreShape, null);
  assert.equal(
    invalidCount.diagnostics.some((diagnostic) => diagnostic.code === 'INVALID_SCORE_SHAPE_ENTRY_COUNT'),
    true,
  );
  assert.equal(duplicateKeys.scoreShape, null);
  assert.equal(
    duplicateKeys.diagnostics.some((diagnostic) => diagnostic.code === 'DUPLICATE_SCORE_SHAPE_SIGNAL_KEY'),
    true,
  );
  assert.equal(invalidNumbers.scoreShape, null);
  assert.equal(
    invalidNumbers.diagnostics.some((diagnostic) => diagnostic.code === 'INVALID_NORMALIZED_PERCENTAGE'),
    true,
  );
  assert.equal(
    invalidNumbers.diagnostics.some((diagnostic) => diagnostic.code === 'NEGATIVE_NORMALIZED_PERCENTAGE'),
    true,
  );
});

test('classifier sorts internally with signal-key tie-breaks for deterministic rank order', () => {
  const result = classifyRankedPatternScoreShape([
    { signalKey: 'signal_d', normalizedPercentage: 25 },
    { signalKey: 'signal_b', normalizedPercentage: 25 },
    { signalKey: 'signal_a', normalizedPercentage: 25 },
    { signalKey: 'signal_c', normalizedPercentage: 25 },
  ]);

  assert.equal(result.scoreShape, 'balanced');
  assert.deepEqual(result.rankedEntries.map((entry) => entry.signalKey), [
    'signal_a',
    'signal_b',
    'signal_c',
    'signal_d',
  ]);
});
