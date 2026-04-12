import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getAssessmentModeLabel,
  getAssessmentResultHref,
  isMultiDomain,
  isSingleDomain,
  resolveAssessmentMode,
} from '@/lib/utils/assessment-mode';

test('resolveAssessmentMode defaults undefined and empty values to multi_domain', () => {
  assert.equal(resolveAssessmentMode(undefined), 'multi_domain');
  assert.equal(resolveAssessmentMode(null), 'multi_domain');
  assert.equal(resolveAssessmentMode(''), 'multi_domain');
});

test('resolveAssessmentMode preserves explicit modes and keeps unknown values out of single_domain', () => {
  assert.equal(resolveAssessmentMode('single_domain'), 'single_domain');
  assert.equal(resolveAssessmentMode('multi_domain'), 'multi_domain');
  assert.equal(resolveAssessmentMode('experimental_mode'), 'multi_domain');
  assert.equal(isSingleDomain('experimental_mode'), false);
  assert.equal(isMultiDomain('experimental_mode'), true);
});

test('mode labels and result hrefs use the resolved safe mode', () => {
  assert.equal(getAssessmentModeLabel(undefined), 'Multi-Domain');
  assert.equal(getAssessmentModeLabel('single_domain'), 'Single-Domain');
  assert.equal(getAssessmentModeLabel('unexpected_mode'), 'Multi-Domain');
  assert.equal(getAssessmentResultHref('result-1', 'single_domain'), '/app/results/single-domain/result-1');
  assert.equal(getAssessmentResultHref('result-1', 'unexpected_mode'), '/app/results/result-1');
});
