import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getNextSingleDomainBuilderStep,
  getPreviousSingleDomainBuilderStep,
  singleDomainBuilderSteps,
} from '@/lib/admin/single-domain-builder-steps';

test('single-domain builder step model contains the exact eight scaffold steps in order', () => {
  assert.deepEqual(
    singleDomainBuilderSteps.map((step) => step.label),
    ['Overview', 'Domain', 'Signals', 'Questions', 'Responses', 'Weightings', 'Language', 'Review'],
  );
  assert.deepEqual(
    singleDomainBuilderSteps.map((step) => step.key),
    ['overview', 'domain', 'signals', 'questions', 'responses', 'weightings', 'language', 'review'],
  );
});

test('single-domain builder step model exposes stable previous and next navigation', () => {
  assert.equal(getPreviousSingleDomainBuilderStep('overview'), null);
  assert.equal(getNextSingleDomainBuilderStep('overview')?.key, 'domain');
  assert.equal(getPreviousSingleDomainBuilderStep('review')?.key, 'language');
  assert.equal(getNextSingleDomainBuilderStep('review'), null);
});
