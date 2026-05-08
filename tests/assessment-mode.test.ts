import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getAssessmentModeLabel,
  getAssessmentResultHref,
  isMultiDomain,
  isSingleDomain,
  resolveAssessmentMode,
  UnsupportedAssessmentModeError,
} from '@/lib/utils/assessment-mode';

test('resolveAssessmentMode defaults undefined and empty values to multi_domain', () => {
  assert.equal(resolveAssessmentMode(undefined), 'multi_domain');
  assert.equal(resolveAssessmentMode(null), 'multi_domain');
  assert.equal(resolveAssessmentMode(''), 'multi_domain');
});

test('resolveAssessmentMode preserves explicit modes and rejects unknown values', () => {
  assert.equal(resolveAssessmentMode('single_domain'), 'single_domain');
  assert.equal(resolveAssessmentMode('multi_domain'), 'multi_domain');
  assert.throws(
    () => resolveAssessmentMode('experimental_mode'),
    UnsupportedAssessmentModeError,
  );
  assert.throws(() => isSingleDomain('experimental_mode'), UnsupportedAssessmentModeError);
  assert.throws(() => isMultiDomain('experimental_mode'), UnsupportedAssessmentModeError);
});

test('mode labels and result hrefs use explicit supported modes only', () => {
  assert.equal(getAssessmentModeLabel(undefined), 'Multi-Domain');
  assert.equal(getAssessmentModeLabel('single_domain'), 'Single-Domain');
  assert.throws(() => getAssessmentModeLabel('unexpected_mode'), UnsupportedAssessmentModeError);
  assert.equal(getAssessmentResultHref('result-1', 'single_domain'), '/app/results/single-domain/result-1');
  assert.throws(() => getAssessmentResultHref('result-1', 'unexpected_mode'), UnsupportedAssessmentModeError);
});
