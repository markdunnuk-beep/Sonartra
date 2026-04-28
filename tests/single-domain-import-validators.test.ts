import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSingleDomainImportValidationContext,
  normalizeSingleDomainImportRowsForRuntimePairKeys,
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

test('import validation enforces strict section_key ownership for the target contract', () => {
  const context = buildSingleDomainImportValidationContext({
    datasetKey: 'SINGLE_DOMAIN_PAIR',
    currentDomainKey: 'leadership-style',
    signalKeys: ['directive', 'supportive'],
  });

  const result = validateSingleDomainImportRows(context, [
    {
      domain_key: 'leadership-style',
      section_key: 'hero',
      pair_key: 'directive_supportive',
      pair_label: 'Directive + Supportive',
      interaction_claim: 'The pair acts quickly.',
      synergy_claim: 'The pair coordinates effort.',
      tension_claim: 'The pair can tighten too soon.',
      pair_outcome: 'The pair creates visible momentum.',
    },
  ]);

  assert.equal(result.success, false);
  assert.match(
    result.validationErrors.map((issue) => issue.message).join('\n'),
    /section_key must be "pair"/i,
  );
});

test('single-domain validation accepts runtime-ordered results_process pair keys', () => {
  const context = buildSingleDomainImportValidationContext({
    datasetKey: 'SINGLE_DOMAIN_PAIR',
    currentDomainKey: 'leadership-approach',
    signalKeys: ['results', 'process', 'vision', 'people'],
  });

  const result = validateSingleDomainImportRows(context, [
    {
      domain_key: 'leadership-approach',
      section_key: 'pair',
      pair_key: 'results_process',
      pair_label: 'Results and Process',
      interaction_claim: 'Results and Process combine around disciplined delivery.',
      synergy_claim: 'The pair gives execution structure and commercial pressure.',
      tension_claim: 'The pair can narrow the human range.',
      pair_outcome: 'The best use of the pair makes structure build confidence.',
    },
  ]);

  assert.equal(result.success, true);
});

test('single-domain validation accepts reversed pair keys and normalizes them to runtime order', () => {
  const context = buildSingleDomainImportValidationContext({
    datasetKey: 'SINGLE_DOMAIN_HERO',
    currentDomainKey: 'leadership-approach',
    signalKeys: ['results', 'process', 'vision', 'people'],
  });
  const rows = [
    {
      domain_key: 'leadership-approach',
      section_key: 'hero' as const,
      pair_key: 'process_results',
      pattern_label: 'Disciplined delivery',
      hero_statement: 'Direction becomes delivery.',
      hero_expansion: 'The pattern makes work more ordered.',
      hero_strength: 'The trade-off is a narrower people range.',
    },
  ];

  const result = validateSingleDomainImportRows(context, rows);
  const normalized = normalizeSingleDomainImportRowsForRuntimePairKeys(context, rows);

  assert.equal(result.success, true);
  assert.equal(normalized[0]?.pair_key, 'results_process');
});

test('pair-owned section imports no longer fail solely because pair order is runtime-first', () => {
  const base = {
    currentDomainKey: 'leadership-approach',
    signalKeys: ['results', 'process', 'vision', 'people'],
  };

  const hero = validateSingleDomainImportRows(
    buildSingleDomainImportValidationContext({ ...base, datasetKey: 'SINGLE_DOMAIN_HERO' }),
    [{
      domain_key: 'leadership-approach',
      section_key: 'hero',
      pair_key: 'results_process',
      pattern_label: 'Disciplined delivery',
      hero_statement: 'Direction becomes delivery.',
      hero_expansion: 'The pattern makes work more ordered.',
      hero_strength: 'The trade-off is a narrower people range.',
    }],
  );
  const limitation = validateSingleDomainImportRows(
    buildSingleDomainImportValidationContext({ ...base, datasetKey: 'SINGLE_DOMAIN_LIMITATION' }),
    [{
      domain_key: 'leadership-approach',
      section_key: 'limitation',
      pair_key: 'results_process',
      limitation_label: 'When structure outruns commitment',
      pattern_cost: 'The pattern can narrow the leadership field.',
      range_narrowing: 'People signals may arrive too late.',
      weaker_signal_key: 'people',
      weaker_signal_link: 'People must be included earlier.',
    }],
  );
  const application = validateSingleDomainImportRows(
    buildSingleDomainImportValidationContext({ ...base, datasetKey: 'SINGLE_DOMAIN_APPLICATION' }),
    [{
      domain_key: 'leadership-approach',
      section_key: 'application',
      pair_key: 'results_process',
      focus_area: 'notice',
      guidance_type: 'watchout',
      signal_key: 'people',
      guidance_text: 'Notice weak commitment signals early.',
      linked_claim_type: 'watchout',
      priority: '1',
    }],
  );

  assert.equal(hero.success, true);
  assert.equal(limitation.success, true);
  assert.equal(application.success, true);
});

test('drivers validation requires canonical pair keys and full pair-role coverage', () => {
  const context = buildSingleDomainImportValidationContext({
    datasetKey: 'SINGLE_DOMAIN_DRIVERS',
    currentDomainKey: 'leadership-approach',
    signalKeys: ['results', 'process', 'vision', 'people'],
  });

  const result = validateSingleDomainImportRows(context, [
    {
      domain_key: 'leadership-approach',
      section_key: 'drivers',
      pair_key: 'process_results',
      signal_key: 'results',
      driver_role: 'primary_driver',
      claim_type: 'driver_primary',
      claim_text: 'Primary claim.',
      materiality: 'core',
      priority: '1',
    },
  ]);

  assert.equal(result.success, false);
  assert.match(
    result.validationErrors.map((issue) => issue.message).join('\n'),
    /pair_key "process_results" must be canonical/i,
  );
  assert.match(
    result.validationErrors.map((issue) => issue.message).join('\n'),
    /Missing drivers row for pair_key "results_process" and driver_role "secondary_driver"/i,
  );
});
