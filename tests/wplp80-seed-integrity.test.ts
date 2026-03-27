import test from 'node:test';
import assert from 'node:assert/strict';

import { loadWplp80Seeds } from '@/db/seed/wplp80';

test('all WPLP-80 signals have incoming option signal weights', () => {
  const seeds = loadWplp80Seeds();
  const incomingWeightCountBySignalKey = new Map<string, number>();

  for (const weight of seeds.optionSignalWeights) {
    incomingWeightCountBySignalKey.set(
      weight.signalKey,
      (incomingWeightCountBySignalKey.get(weight.signalKey) ?? 0) + 1,
    );
  }

  for (const signal of seeds.signals) {
    assert.ok(
      (incomingWeightCountBySignalKey.get(signal.key) ?? 0) > 0,
      `Signal ${signal.key} is missing incoming option signal weights`,
    );
  }
});

test('conflict_accommodate has the expected six canonical mappings', () => {
  const seeds = loadWplp80Seeds();
  const conflictWeights = seeds.optionSignalWeights.filter(
    (weight) => weight.signalKey === 'conflict_accommodate',
  );

  assert.equal(conflictWeights.length, 6);
  assert.deepEqual(
    conflictWeights.map((weight) => weight.optionKey),
    [
      'wplp80_q29_b',
      'wplp80_q30_c',
      'wplp80_q31_c',
      'wplp80_q32_b',
      'wplp80_q33_c',
      'wplp80_q34_c',
    ],
  );
});
