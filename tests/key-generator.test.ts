import test from 'node:test';
import assert from 'node:assert/strict';

import {
  generateDomainKey,
  generateOptionKey,
  generateQuestionKey,
  generateSignalKey,
  slugify,
} from '@/lib/utils/key-generator';

test('slugify normalizes input into deterministic snake_case', () => {
  assert.equal(slugify(' Leadership Style '), 'leadership_style');
  assert.equal(slugify('Decision / Quality'), 'decision_quality');
  assert.equal(slugify('Already__set'), 'already_set');
});

test('domain and signal keys derive stable snake_case values', () => {
  assert.equal(generateDomainKey('Leadership Style'), 'leadership_style');
  assert.equal(
    generateSignalKey('leadership_style', 'Directive Energy'),
    'leadership_style_directive_energy',
  );
});

test('question and option keys derive deterministic indexed values', () => {
  assert.equal(generateQuestionKey(1), 'q01');
  assert.equal(generateQuestionKey(12), 'q12');
  assert.equal(generateOptionKey(1, 'A'), 'q01_a');
  assert.equal(generateOptionKey(12, 'D'), 'q12_d');
});
