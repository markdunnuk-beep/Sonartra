import assert from 'node:assert/strict';
import test from 'node:test';

import {
  listReaderFirstPatterns,
  parseSignalList,
} from '@/scripts/authoring/list-reader-first-patterns';

const flowSignals = [
  'deep_focus',
  'creative_movement',
  'physical_rhythm',
  'social_exchange',
] as const;

test('outputs 24 patterns for four signals', () => {
  const patterns = listReaderFirstPatterns({ signals: flowSignals });

  assert.equal(patterns.length, 24);
  assert.equal(new Set(patterns).size, 24);
});

test('outputs 6 patterns for a primary signal', () => {
  const patterns = listReaderFirstPatterns({
    signals: flowSignals,
    primary: 'deep_focus',
  });

  assert.equal(patterns.length, 6);
  assert.ok(patterns.every((pattern) => pattern.startsWith('deep_focus_')));
});

test('rejects duplicate signal keys', () => {
  assert.throws(
    () =>
      listReaderFirstPatterns({
        signals: ['results', 'process', 'vision', 'results'],
      }),
    /unique/,
  );
});

test('rejects fewer or more than four signals', () => {
  assert.throws(
    () => listReaderFirstPatterns({ signals: ['results', 'process', 'vision'] }),
    /exactly four/,
  );

  assert.throws(
    () =>
      listReaderFirstPatterns({
        signals: ['results', 'process', 'vision', 'people', 'pace'],
      }),
    /exactly four/,
  );
});

test('confirms each generated pattern contains all four signals once', () => {
  const patterns = listReaderFirstPatterns({ signals: flowSignals });
  const expectedPatternSet = new Set(patterns);

  function permute(signals: readonly string[]): string[][] {
    if (signals.length === 0) {
      return [[]];
    }

    return signals.flatMap((signal, index) => {
      const remaining = [...signals.slice(0, index), ...signals.slice(index + 1)];
      return permute(remaining).map((permutation) => [signal, ...permutation]);
    });
  }

  for (const permutation of permute(flowSignals)) {
    const patternKey = permutation.join('_');

    assert.equal(expectedPatternSet.has(patternKey), true);
  }
});

test('parses comma-separated signal input', () => {
  assert.deepEqual(
    parseSignalList('results, process,vision, people'),
    ['results', 'process', 'vision', 'people'],
  );
});
