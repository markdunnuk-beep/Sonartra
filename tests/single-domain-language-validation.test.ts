import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseSingleDomainDatasetRows,
  singleDomainLanguageSchemaRegistry,
  validateSingleDomainDatasetHeaders,
} from '@/lib/validation/single-domain-language';
import {
  APPLICATION_STATEMENTS_COLUMNS,
  DOMAIN_FRAMING_COLUMNS,
  HERO_PAIRS_COLUMNS,
  SIGNAL_CHAPTERS_COLUMNS,
  SINGLE_DOMAIN_LANGUAGE_DATASET_KEYS,
} from '@/lib/types/single-domain-language';

function buildRow(columns: readonly string[], values: readonly string[]): Record<string, string> {
  return Object.fromEntries(columns.map((column, index) => [column, values[index] ?? '']));
}

test('accepts valid DOMAIN_FRAMING headers and rows', () => {
  const headers = [...DOMAIN_FRAMING_COLUMNS];
  const headerValidation = validateSingleDomainDatasetHeaders('DOMAIN_FRAMING', headers);

  assert.equal(headerValidation.success, true);

  const rows = parseSingleDomainDatasetRows('DOMAIN_FRAMING', [
    buildRow(DOMAIN_FRAMING_COLUMNS, [
      ' execution ',
      'Section title',
      'Intro paragraph',
      'Meaning paragraph',
      'Bridge to signals',
      'Blueprint context',
    ]),
  ]);

  assert.deepEqual(rows, [{
    domain_key: 'execution',
    section_title: 'Section title',
    intro_paragraph: 'Intro paragraph',
    meaning_paragraph: 'Meaning paragraph',
    bridge_to_signals: 'Bridge to signals',
    blueprint_context_line: 'Blueprint context',
  }]);
});

test('rejects missing SIGNAL_CHAPTERS columns', () => {
  const headers = SIGNAL_CHAPTERS_COLUMNS.slice(0, -1);
  const validation = validateSingleDomainDatasetHeaders('SIGNAL_CHAPTERS', headers);

  assert.equal(validation.success, false);
  assert.match(validation.message, /Invalid headers for SIGNAL_CHAPTERS/i);
  assert.match(validation.message, /Expected columns:/i);
  assert.match(validation.message, /Received columns:/i);
});

test('rejects extra HERO_PAIRS columns', () => {
  const validation = validateSingleDomainDatasetHeaders('HERO_PAIRS', [
    ...HERO_PAIRS_COLUMNS,
    'extra_column',
  ]);

  assert.equal(validation.success, false);
  assert.match(validation.message, /Invalid headers for HERO_PAIRS/i);
  assert.match(validation.message, /extra_column/);
});

test('rejects empty string field values', () => {
  assert.throws(
    () => parseSingleDomainDatasetRows('DOMAIN_FRAMING', [
      buildRow(DOMAIN_FRAMING_COLUMNS, [
        'execution',
        'Section title',
        '   ',
        'Meaning paragraph',
        'Bridge to signals',
        'Blueprint context',
      ]),
    ]),
    /Invalid row 2 for DOMAIN_FRAMING\. Field "intro_paragraph" must be a non-empty string\./i,
  );
});

test('rejects wrong dataset key', () => {
  const validation = validateSingleDomainDatasetHeaders('WRONG_DATASET', DOMAIN_FRAMING_COLUMNS);

  assert.equal(validation.success, false);
  assert.match(validation.message, /Invalid single-domain dataset key "WRONG_DATASET"/i);
});

test('rejects out-of-order headers', () => {
  const validation = validateSingleDomainDatasetHeaders('APPLICATION_STATEMENTS', [
    'signal_key',
    'strength_statement_2',
    'strength_statement_1',
    'watchout_statement_1',
    'watchout_statement_2',
    'development_statement_1',
    'development_statement_2',
  ]);

  assert.equal(validation.success, false);
  assert.match(validation.message, /Invalid headers for APPLICATION_STATEMENTS/i);
});

test('accepts exact APPLICATION_STATEMENTS rows', () => {
  const rows = parseSingleDomainDatasetRows('APPLICATION_STATEMENTS', [
    buildRow(APPLICATION_STATEMENTS_COLUMNS, [
      'lead_people',
      'Strength one',
      'Strength two',
      'Watchout one',
      'Watchout two',
      'Development one',
      'Development two',
    ]),
  ]);

  assert.deepEqual(rows, [{
    signal_key: 'lead_people',
    strength_statement_1: 'Strength one',
    strength_statement_2: 'Strength two',
    watchout_statement_1: 'Watchout one',
    watchout_statement_2: 'Watchout two',
    development_statement_1: 'Development one',
    development_statement_2: 'Development two',
  }]);
});

test('registry includes all six agreed datasets', () => {
  assert.deepEqual(
    Object.keys(singleDomainLanguageSchemaRegistry).sort(),
    [...SINGLE_DOMAIN_LANGUAGE_DATASET_KEYS].sort(),
  );
});
