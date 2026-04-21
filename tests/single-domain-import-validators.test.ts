import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSingleDomainImportValidationContext,
  validateSingleDomainImportRows,
} from '@/lib/assessment-language/single-domain-import-validators';

test('drivers validation rejects materially underplayed signals authored as supporting context', () => {
  const context = buildSingleDomainImportValidationContext({
    datasetKey: 'SINGLE_DOMAIN_DRIVERS',
    currentDomainKey: 'leadership-style',
    signalKeys: ['directive', 'supportive', 'reflective'],
  });

  const result = validateSingleDomainImportRows(context, [
    {
      domain_key: 'leadership-style',
      section_key: 'drivers',
      pair_key: 'directive_supportive',
      signal_key: 'directive',
      driver_role: 'primary_driver',
      claim_type: 'driver_primary',
      claim_text: 'Directive sets the pace.',
      materiality: 'core',
      priority: '1',
    },
    {
      domain_key: 'leadership-style',
      section_key: 'drivers',
      pair_key: 'directive_supportive',
      signal_key: 'supportive',
      driver_role: 'secondary_driver',
      claim_type: 'driver_secondary',
      claim_text: 'Supportive reinforces the tone.',
      materiality: 'core',
      priority: '2',
    },
    {
      domain_key: 'leadership-style',
      section_key: 'drivers',
      pair_key: 'directive_supportive',
      signal_key: 'reflective',
      driver_role: 'supporting_context',
      claim_type: 'driver_supporting_context',
      claim_text: 'Reflective range is notably thin.',
      materiality: 'material_underplay',
      priority: '3',
    },
  ]);

  assert.equal(result.success, false);
  assert.match(
    result.validationErrors.map((issue) => issue.message).join('\n'),
    /materially underplayed signals must be authored as range_limitation/i,
  );
});

test('limitation validation requires weaker signal linkage when weaker_signal_key is present', () => {
  const context = buildSingleDomainImportValidationContext({
    datasetKey: 'SINGLE_DOMAIN_LIMITATION',
    currentDomainKey: 'leadership-style',
    signalKeys: ['directive', 'supportive', 'reflective'],
  });

  const result = validateSingleDomainImportRows(context, [
    {
      domain_key: 'leadership-style',
      section_key: 'limitation',
      pair_key: 'directive_supportive',
      limitation_label: 'Compressed range',
      pattern_cost: 'The pattern narrows too quickly.',
      range_narrowing: 'It can reduce patience for context.',
      weaker_signal_key: 'reflective',
      weaker_signal_link: '',
    },
  ]);

  assert.equal(result.success, false);
  assert.match(
    result.validationErrors.map((issue) => issue.message).join('\n'),
    /weaker_signal_key and weaker_signal_link must both be present/i,
  );
});

test('application validation rejects invalid focus areas and unresolved signals', () => {
  const context = buildSingleDomainImportValidationContext({
    datasetKey: 'SINGLE_DOMAIN_APPLICATION',
    currentDomainKey: 'leadership-style',
    signalKeys: ['directive', 'supportive'],
  });

  const result = validateSingleDomainImportRows(context, [
    {
      domain_key: 'leadership-style',
      section_key: 'application',
      pair_key: 'directive_supportive',
      focus_area: 'observe' as never,
      guidance_type: 'watchout',
      signal_key: 'reflective',
      guidance_text: 'Notice what gets missed.',
      linked_claim_type: 'watchout',
      priority: '1',
    },
  ]);

  assert.equal(result.success, false);
  assert.match(
    result.validationErrors.map((issue) => issue.message).join('\n'),
    /focus_area "observe" is invalid/i,
  );
  assert.match(
    result.validationErrors.map((issue) => issue.message).join('\n'),
    /signal_key "reflective" is not resolvable/i,
  );
});
