import test from 'node:test';
import assert from 'node:assert/strict';

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

test('single-domain narrative rows map into the legacy storage bundle shape', () => {
  const result = mapSingleDomainNarrativeRowsToLegacyDataset('SINGLE_DOMAIN_APPLICATION', [
    {
      domain_key: 'leadership-style',
      section_key: 'application',
      pair_key: 'directive_supportive',
      focus_area: 'rely_on',
      guidance_type: 'applied_strength',
      signal_key: 'directive',
      guidance_text: 'Lean on fast decision clarity.',
      linked_claim_type: 'applied_strength',
      priority: '1',
    },
    {
      domain_key: 'leadership-style',
      section_key: 'application',
      pair_key: 'directive_supportive',
      focus_area: 'notice',
      guidance_type: 'watchout',
      signal_key: 'directive',
      guidance_text: 'Watch for over-compression.',
      linked_claim_type: 'watchout',
      priority: '2',
    },
    {
      domain_key: 'leadership-style',
      section_key: 'application',
      pair_key: 'directive_supportive',
      focus_area: 'develop',
      guidance_type: 'development_focus',
      signal_key: 'directive',
      guidance_text: 'Build more patience for context.',
      linked_claim_type: 'development_focus',
      priority: '3',
    },
  ]);

  assert.equal(result.datasetKey, 'APPLICATION_STATEMENTS');
  assert.deepEqual(result.rows, [
    {
      signal_key: 'directive',
      strength_statement_1: 'Lean on fast decision clarity.',
      strength_statement_2: '',
      watchout_statement_1: 'Watch for over-compression.',
      watchout_statement_2: '',
      development_statement_1: 'Build more patience for context.',
      development_statement_2: '',
    },
  ]);
});
