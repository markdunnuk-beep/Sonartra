import assert from 'node:assert/strict';
import test from 'node:test';

import {
  rankedPatternExample,
  rankedPatternSectionOrder,
  validateRankedPatternExample,
} from '@/content/draft-result/ranked-pattern-example';

test('ranked pattern draft result fixture preserves the required schema sections', () => {
  assert.deepEqual(Object.keys(rankedPatternExample), rankedPatternSectionOrder);
});

test('ranked pattern draft result fixture passes static validation', () => {
  assert.doesNotThrow(() => validateRankedPatternExample());
});
