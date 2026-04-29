import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSingleDomainImportValidationContext,
  normalizeSingleDomainImportRowsForRuntimePairKeys,
  validateSingleDomainImportRows,
} from '@/lib/assessment-language/single-domain-import-validators';
import type {
  SingleDomainApplicationFocusArea,
  SingleDomainApplicationGuidanceType,
  SingleDomainApplicationImportRow,
  SingleDomainDriverRole,
} from '@/lib/assessment-language/single-domain-narrative-types';

const LEADERSHIP_SIGNALS = ['results', 'vision', 'people', 'process'] as const;
const LEADERSHIP_PAIR_KEYS = [
  'results_vision',
  'results_people',
  'results_process',
  'vision_people',
  'process_vision',
  'process_people',
] as const;
const APPLICATION_FOCUS_GUIDANCE = [
  ['rely_on', 'applied_strength'],
  ['notice', 'watchout'],
  ['develop', 'development_focus'],
] as const satisfies readonly [
  SingleDomainApplicationFocusArea,
  SingleDomainApplicationGuidanceType,
][];
const APPLICATION_ROLE_PRIORITY = [
  ['primary_driver', '1'],
  ['secondary_driver', '2'],
  ['supporting_context', '3'],
  ['range_limitation', '4'],
] as const satisfies readonly [SingleDomainDriverRole, string][];

function buildValidFullPatternApplicationRows(): SingleDomainApplicationImportRow[] {
  return LEADERSHIP_PAIR_KEYS.flatMap((pairKey) => {
    const pairSignals = pairKey.split('_');
    const remainingSignals = LEADERSHIP_SIGNALS.filter((signalKey) => !pairSignals.includes(signalKey));
    const patternKeys = [
      [...pairSignals, ...remainingSignals].join('_'),
      [...pairSignals, ...[...remainingSignals].reverse()].join('_'),
    ];

    return patternKeys.flatMap((patternKey) => {
      const patternSignals = patternKey.split('_');

      return APPLICATION_FOCUS_GUIDANCE.flatMap(([focusArea, guidanceType]) =>
        APPLICATION_ROLE_PRIORITY.map(([driverRole, priority], roleIndex) => ({
          domain_key: 'leadership-approach',
          section_key: 'application' as const,
          pattern_key: patternKey,
          pair_key: pairKey,
          focus_area: focusArea,
          guidance_type: guidanceType,
          driver_role: driverRole,
          signal_key: patternSignals[roleIndex] ?? '',
          priority,
          guidance_text: 'Placeholder application guidance.',
          linked_claim_type: guidanceType,
        })),
      );
    });
  });
}

function validateApplicationFixture(rows: readonly SingleDomainApplicationImportRow[]) {
  const context = buildSingleDomainImportValidationContext({
    datasetKey: 'SINGLE_DOMAIN_APPLICATION',
    currentDomainKey: 'leadership-approach',
    signalKeys: [...LEADERSHIP_SIGNALS],
  });

  return validateSingleDomainImportRows(context, rows);
}

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
      pattern_key: 'directive_supportive_directive_supportive',
      pair_key: 'directive_supportive',
      focus_area: 'observe' as never,
      guidance_type: 'watchout',
      driver_role: 'primary_driver',
      signal_key: 'reflective',
      priority: '1',
      guidance_text: 'Notice what gets missed.',
      linked_claim_type: 'watchout',
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

test('single-domain validation rejects reversed pair keys for pair-owned sections', () => {
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

  assert.equal(result.success, false);
  assert.match(
    result.validationErrors.map((issue) => issue.message).join('\n'),
    /pair_key "process_results" must be canonical for the current signal order/i,
  );
  assert.equal(normalized[0]?.pair_key, 'process_results');
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
    buildValidFullPatternApplicationRows(),
  );

  assert.equal(hero.success, true);
  assert.equal(limitation.success, true);
  assert.equal(application.success, true);
});

test('application validation accepts the deterministic 144-row full-pattern shape', () => {
  const rows = buildValidFullPatternApplicationRows();
  const result = validateApplicationFixture(rows);

  assert.equal(rows.length, 144);
  assert.equal(result.success, true);
});

test('application validation rejects missing pattern_key', () => {
  const rows = buildValidFullPatternApplicationRows();
  rows[0] = { ...rows[0]!, pattern_key: '' };

  const result = validateApplicationFixture(rows);

  assert.equal(result.success, false);
  assert.match(result.validationErrors.map((issue) => issue.message).join('\n'), /pattern_key is required/i);
});

test('application validation rejects missing driver_role', () => {
  const rows = buildValidFullPatternApplicationRows();
  rows[0] = { ...rows[0]!, driver_role: '' as never };

  const result = validateApplicationFixture(rows);

  assert.equal(result.success, false);
  assert.match(result.validationErrors.map((issue) => issue.message).join('\n'), /driver_role is required/i);
});

test('application validation rejects malformed pattern_key signal counts', () => {
  const rows = buildValidFullPatternApplicationRows();
  rows[0] = { ...rows[0]!, pattern_key: 'results_vision_people' };

  const result = validateApplicationFixture(rows);

  assert.equal(result.success, false);
  assert.match(
    result.validationErrors.map((issue) => issue.message).join('\n'),
    /pattern_key must contain exactly 4 signals/i,
  );
});

test('application validation rejects pair_key that does not match pattern_key prefix', () => {
  const rows = buildValidFullPatternApplicationRows();
  rows[0] = { ...rows[0]!, pair_key: 'results_people' };

  const result = validateApplicationFixture(rows);

  assert.equal(result.success, false);
  assert.match(
    result.validationErrors.map((issue) => issue.message).join('\n'),
    /pair_key must match the first two signals in pattern_key/i,
  );
});

test('application validation rejects driver_role that does not match pattern signal position', () => {
  const rows = buildValidFullPatternApplicationRows();
  rows[0] = { ...rows[0]!, driver_role: 'secondary_driver', priority: '2' };

  const result = validateApplicationFixture(rows);

  assert.equal(result.success, false);
  assert.match(
    result.validationErrors.map((issue) => issue.message).join('\n'),
    /driver_role does not match signal position in pattern_key/i,
  );
});

test('application validation rejects priority that does not match driver_role', () => {
  const rows = buildValidFullPatternApplicationRows();
  rows[0] = { ...rows[0]!, priority: '2' };

  const result = validateApplicationFixture(rows);

  assert.equal(result.success, false);
  assert.match(
    result.validationErrors.map((issue) => issue.message).join('\n'),
    /priority does not match driver_role/i,
  );
});

test('application validation rejects duplicates by full pattern key', () => {
  const rows = buildValidFullPatternApplicationRows();
  rows.push({ ...rows[0]! });

  const result = validateApplicationFixture(rows);

  assert.equal(result.success, false);
  assert.match(
    result.validationErrors.map((issue) => issue.message).join('\n'),
    /duplicate application row for "leadership-approach\|results_vision_people_process\|rely_on\|applied_strength\|primary_driver"/i,
  );
});

test('application validation rejects missing role rows within a pattern focus group', () => {
  const rows = buildValidFullPatternApplicationRows().filter(
    (row) =>
      row.pattern_key !== 'results_vision_people_process'
      || row.focus_area !== 'rely_on'
      || row.driver_role !== 'range_limitation',
  );

  const result = validateApplicationFixture(rows);

  assert.equal(result.success, false);
  assert.match(
    result.validationErrors.map((issue) => issue.message).join('\n'),
    /focus_area "rely_on" must contain exactly one range_limitation row \(found 0\)/i,
  );
});

test('application validation rejects extra role rows within a pattern focus group', () => {
  const rows = buildValidFullPatternApplicationRows();
  rows.push({
    ...rows[0]!,
    driver_role: 'range_limitation',
    signal_key: 'process',
    priority: '4',
  });

  const result = validateApplicationFixture(rows);

  assert.equal(result.success, false);
  assert.match(
    result.validationErrors.map((issue) => issue.message).join('\n'),
    /focus_area "rely_on" must contain exactly one range_limitation row \(found 2\)/i,
  );
});

test('application validation rejects wrong focus area and guidance type combinations', () => {
  const rows = buildValidFullPatternApplicationRows();
  rows[0] = { ...rows[0]!, guidance_type: 'watchout', linked_claim_type: 'watchout' };

  const result = validateApplicationFixture(rows);

  assert.equal(result.success, false);
  assert.match(
    result.validationErrors.map((issue) => issue.message).join('\n'),
    /focus_area "rely_on" must use guidance_type "applied_strength"/i,
  );
});

test('application validation rejects blank required fields', () => {
  const rows = buildValidFullPatternApplicationRows();
  rows[0] = { ...rows[0]!, guidance_text: '' };

  const result = validateApplicationFixture(rows);

  assert.equal(result.success, false);
  assert.match(result.validationErrors.map((issue) => issue.message).join('\n'), /guidance_text is required/i);
});

test('application validation allows multiple pattern_keys under the same pair_key', () => {
  const rows = buildValidFullPatternApplicationRows();
  const result = validateApplicationFixture(rows);
  const resultsVisionPatternKeys = new Set(
    rows
      .filter((row) => row.pair_key === 'results_vision')
      .map((row) => row.pattern_key),
  );

  assert.equal(resultsVisionPatternKeys.size, 2);
  assert.equal(result.success, true);
});

test('drivers validation requires canonical pair keys and exact runtime tuple coverage', () => {
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
    /Missing drivers row for exact tuple "leadership-approach\|results_process\|results\|primary_driver"/i,
  );
});
