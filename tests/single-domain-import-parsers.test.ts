import test from 'node:test';
import assert from 'node:assert/strict';

import { getSingleDomainImportHeaderColumns } from '@/lib/assessment-language/single-domain-import-headers';
import { mapSingleDomainNarrativeRowsToLegacyDataset } from '@/lib/assessment-language/single-domain-import-mappers';
import { parseSingleDomainImportInput } from '@/lib/assessment-language/single-domain-import-parsers';

test('parseSingleDomainImportInput accepts the locked intro header and row shape', () => {
  const rawInput = [
    'domain_key|section_key|domain_title|domain_definition|domain_scope|interpretation_guidance|intro_note',
    'leadership-style|intro|Leadership style|What this domain measures|Where it applies|How to read it|Optional note',
  ].join('\n');

  const result = parseSingleDomainImportInput('SINGLE_DOMAIN_INTRO', rawInput);

  assert.equal(result.success, true);
  assert.equal(result.parseErrors.length, 0);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0]?.domain_key, 'leadership-style');
  assert.equal(result.rows[0]?.section_key, 'intro');
});

test('parseSingleDomainImportInput enforces the exact header contract for all six datasets', () => {
  const samples = {
    SINGLE_DOMAIN_INTRO:
      'leadership-style|intro|Leadership style|What this domain measures|Where it applies|How to read it|Optional note',
    SINGLE_DOMAIN_HERO:
      'leadership-style|hero|directive_structured|Firm structured delivery|The defining pattern.|How it expands.|Why it works.',
    SINGLE_DOMAIN_DRIVERS:
      'leadership-style|drivers|directive_structured|directive|primary_driver|driver_primary|Directive sets the pace.|core|1',
    SINGLE_DOMAIN_PAIR:
      'leadership-style|pair|directive_structured|Directive + Structured|How they interact.|What the synergy creates.|Where it tightens.|Overall outcome.',
    SINGLE_DOMAIN_LIMITATION:
      'leadership-style|limitation|directive_structured|Compressed reconsideration|The pattern narrows.|Range gets tighter.|reflective|Reflective range arrives late.',
    SINGLE_DOMAIN_APPLICATION:
      'leadership-style|application|directive_supportive_reflective_structured|directive_supportive|rely_on|applied_strength|primary_driver|directive|1|Use fast decision clarity.|applied_strength',
  } as const;

  for (const datasetKey of Object.keys(samples) as Array<keyof typeof samples>) {
    const rawInput = [
      getSingleDomainImportHeaderColumns(datasetKey).join('|'),
      samples[datasetKey],
    ].join('\n');

    const result = parseSingleDomainImportInput(datasetKey, rawInput);

    assert.equal(result.success, true, datasetKey);
    assert.equal(result.parseErrors.length, 0, datasetKey);
    assert.equal(result.rows.length, 1, datasetKey);
  }
});

test('parseSingleDomainImportInput rejects reordered headers', () => {
  const rawInput = [
    'section_key|domain_key|domain_title|domain_definition|domain_scope|interpretation_guidance|intro_note',
    'intro|leadership-style|Leadership style|What this domain measures|Where it applies|How to read it|Optional note',
  ].join('\n');

  const result = parseSingleDomainImportInput('SINGLE_DOMAIN_INTRO', rawInput);

  assert.equal(result.success, false);
  assert.equal(result.rows.length, 0);
  assert.match(result.parseErrors[0]?.message ?? '', /Invalid headers/);
});

test('parseSingleDomainImportInput fails clearly when a six-section dataset uses another section header order', () => {
  const rawInput = [
    getSingleDomainImportHeaderColumns('SINGLE_DOMAIN_PAIR').join('|'),
    'leadership-style|application|directive_structured|rely_on|applied_strength|directive|Use fast decision clarity.|driver_primary|1',
  ].join('\n');

  const result = parseSingleDomainImportInput('SINGLE_DOMAIN_APPLICATION', rawInput);

  assert.equal(result.success, false);
  assert.match(result.parseErrors[0]?.message ?? '', /Invalid headers/);
});

test('parseSingleDomainImportInput rejects the old application header', () => {
  const rawInput = [
    'domain_key|section_key|pair_key|focus_area|guidance_type|signal_key|guidance_text|linked_claim_type|priority',
    'leadership-style|application|directive_structured|rely_on|applied_strength|directive|Use fast decision clarity.|applied_strength|1',
  ].join('\n');

  const result = parseSingleDomainImportInput('SINGLE_DOMAIN_APPLICATION', rawInput);

  assert.equal(result.success, false);
  assert.match(result.parseErrors[0]?.message ?? '', /Invalid headers/);
});

test('single-domain application rows map into the full-pattern storage bundle shape', () => {
  const result = mapSingleDomainNarrativeRowsToLegacyDataset('SINGLE_DOMAIN_APPLICATION', [
    {
      domain_key: 'leadership-style',
      section_key: 'application',
      pattern_key: 'directive_supportive_reflective_structured',
      pair_key: 'directive_supportive',
      focus_area: 'rely_on',
      guidance_type: 'applied_strength',
      driver_role: 'primary_driver',
      signal_key: 'directive',
      guidance_text: 'Lean on fast decision clarity.',
      linked_claim_type: 'applied_strength',
      priority: '1',
    },
    {
      domain_key: 'leadership-style',
      section_key: 'application',
      pattern_key: 'directive_supportive_reflective_structured',
      pair_key: 'directive_supportive',
      focus_area: 'notice',
      guidance_type: 'watchout',
      driver_role: 'secondary_driver',
      signal_key: 'directive',
      guidance_text: 'Watch for over-compression.',
      linked_claim_type: 'watchout',
      priority: '2',
    },
    {
      domain_key: 'leadership-style',
      section_key: 'application',
      pattern_key: 'directive_supportive_reflective_structured',
      pair_key: 'directive_supportive',
      focus_area: 'develop',
      guidance_type: 'development_focus',
      driver_role: 'supporting_context',
      signal_key: 'directive',
      guidance_text: 'Build more patience for context.',
      linked_claim_type: 'development_focus',
      priority: '3',
    },
  ]);

  assert.equal(result.datasetKey, 'APPLICATION_STATEMENTS');
  assert.deepEqual(result.rows, [
    {
      domain_key: 'leadership-style',
      pattern_key: 'directive_supportive_reflective_structured',
      pair_key: 'directive_supportive',
      focus_area: 'rely_on',
      guidance_type: 'applied_strength',
      driver_role: 'primary_driver',
      signal_key: 'directive',
      priority: 1,
      guidance_text: 'Lean on fast decision clarity.',
      linked_claim_type: 'applied_strength',
      strength_statement_1: '',
      strength_statement_2: '',
      watchout_statement_1: '',
      watchout_statement_2: '',
      development_statement_1: '',
      development_statement_2: '',
    },
    {
      domain_key: 'leadership-style',
      pattern_key: 'directive_supportive_reflective_structured',
      pair_key: 'directive_supportive',
      focus_area: 'notice',
      guidance_type: 'watchout',
      driver_role: 'secondary_driver',
      signal_key: 'directive',
      priority: 2,
      guidance_text: 'Watch for over-compression.',
      linked_claim_type: 'watchout',
      strength_statement_1: '',
      strength_statement_2: '',
      watchout_statement_1: '',
      watchout_statement_2: '',
      development_statement_1: '',
      development_statement_2: '',
    },
    {
      domain_key: 'leadership-style',
      pattern_key: 'directive_supportive_reflective_structured',
      pair_key: 'directive_supportive',
      focus_area: 'develop',
      guidance_type: 'development_focus',
      driver_role: 'supporting_context',
      signal_key: 'directive',
      priority: 3,
      guidance_text: 'Build more patience for context.',
      linked_claim_type: 'development_focus',
      strength_statement_1: '',
      strength_statement_2: '',
      watchout_statement_1: '',
      watchout_statement_2: '',
      development_statement_1: '',
      development_statement_2: '',
    },
  ]);
});

test('single-domain drivers rows map to pair-scoped driver claims without signal collapse', () => {
  const pairKeys = [
    'process_results',
    'process_vision',
    'process_people',
    'results_vision',
    'results_people',
    'vision_people',
  ];
  const roles = [
    {
      driver_role: 'primary_driver',
      claim_type: 'driver_primary',
      materiality: 'core',
      signal_key: 'process',
    },
    {
      driver_role: 'secondary_driver',
      claim_type: 'driver_secondary',
      materiality: 'core',
      signal_key: 'results',
    },
    {
      driver_role: 'supporting_context',
      claim_type: 'driver_supporting_context',
      materiality: 'supporting',
      signal_key: 'people',
    },
    {
      driver_role: 'range_limitation',
      claim_type: 'driver_range_limitation',
      materiality: 'material_underplay',
      signal_key: 'vision',
    },
  ] as const;

  const rows = pairKeys.flatMap((pairKey) =>
    roles.map((role, index) => ({
      domain_key: 'leadership',
      section_key: 'drivers' as const,
      pair_key: pairKey,
      signal_key: role.signal_key,
      driver_role: role.driver_role,
      claim_type: role.claim_type,
      claim_text: `${pairKey} ${role.driver_role}`,
      materiality: role.materiality,
      priority: String(index + 1),
    })),
  );

  const result = mapSingleDomainNarrativeRowsToLegacyDataset('SINGLE_DOMAIN_DRIVERS', rows);

  assert.equal(result.datasetKey, 'DRIVER_CLAIMS');
  assert.equal(result.rows.length, 24);
  assert.equal(new Set(result.rows.map((row) => row.pair_key)).size, 6);
  assert.equal(new Set(result.rows.map((row) => row.signal_key)).size, 4);
  assert.deepEqual(result.rows[0], {
    domain_key: 'leadership',
    pair_key: 'process_results',
    signal_key: 'process',
    driver_role: 'primary_driver',
    claim_type: 'driver_primary',
    claim_text: 'process_results primary_driver',
    materiality: 'core',
    priority: 1,
  });
});
