import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPairLanguagePreview,
  canonicalizeSignalPairKey,
  parsePairLanguageRows,
  validatePairLanguageRows,
} from '@/lib/admin/pair-language-import';

test('valid textarea input parses correctly', () => {
  const result = parsePairLanguageRows(
    'driver_analyst | summary | You combine forward momentum with structured thinking.',
  );

  assert.equal(result.success, true);
  assert.deepEqual(result.records, [
    {
      lineNumber: 1,
      rawLine: 'driver_analyst | summary | You combine forward momentum with structured thinking.',
      signalPair: 'driver_analyst',
      section: 'summary',
      content: 'You combine forward momentum with structured thinking.',
    },
  ]);
});

test('blank lines are ignored', () => {
  const result = parsePairLanguageRows(
    ['driver_analyst|summary|Fast and structured', '', ' ', 'driver_analyst|strength|Decisive logic'].join('\n'),
  );

  assert.equal(result.success, true);
  assert.deepEqual(
    result.records.map((row) => row.lineNumber),
    [1, 4],
  );
});

test('malformed rows fail validation at parse time', () => {
  const result = parsePairLanguageRows('driver_analyst|summary');

  assert.equal(result.success, false);
  assert.equal(result.errors[0]?.code, 'INVALID_COLUMN_COUNT');
});

test('invalid pair format fails validation', () => {
  const parsed = parsePairLanguageRows('driver_analyst_extra|summary|Text');
  const validation = validatePairLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['driver', 'analyst'],
  });

  assert.equal(validation.success, false);
  assert.equal(validation.errors[0]?.code, 'INVALID_PAIR_FORMAT');
});

test('unknown signal keys fail validation', () => {
  const parsed = parsePairLanguageRows('driver_unknown|summary|Text');
  const validation = validatePairLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['driver', 'analyst'],
  });

  assert.equal(validation.success, false);
  assert.equal(validation.errors[0]?.code, 'UNKNOWN_SIGNAL_KEY');
});

test('self-pairs fail validation', () => {
  const parsed = parsePairLanguageRows('driver_driver|summary|Text');
  const validation = validatePairLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['driver', 'analyst'],
  });

  assert.equal(validation.success, false);
  assert.equal(validation.errors[0]?.code, 'SELF_PAIR_NOT_ALLOWED');
});

test('invalid sections fail validation', () => {
  const result = parsePairLanguageRows('driver_analyst|development|Text');

  assert.equal(result.success, false);
  assert.equal(result.errors[0]?.code, 'INVALID_SECTION');
});

test('duplicate canonical pair and section rows fail validation', () => {
  const parsed = parsePairLanguageRows(
    ['driver_analyst|summary|First', 'driver_analyst|summary|Second'].join('\n'),
  );
  const validation = validatePairLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['driver', 'analyst'],
  });

  assert.equal(validation.success, false);
  assert.deepEqual(
    validation.errors.map((error) => error.code),
    ['DUPLICATE_PAIR_SECTION', 'DUPLICATE_PAIR_SECTION'],
  );
});

test('reversed pair duplicates are treated as duplicates', () => {
  const parsed = parsePairLanguageRows(
    ['driver_analyst|summary|First', 'analyst_driver|summary|Second'].join('\n'),
  );
  const validation = validatePairLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['driver', 'analyst'],
  });

  assert.equal(validation.success, false);
  assert.equal(validation.errors[0]?.code, 'DUPLICATE_PAIR_SECTION');
});

test('valid preview groups rows correctly by canonical pair', () => {
  const parsed = parsePairLanguageRows(
    [
      'driver_analyst|watchout|Watch out',
      'analyst_driver|summary|Summary',
      'driver_analyst|strength|Strength',
    ].join('\n'),
  );
  const validation = validatePairLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['driver', 'analyst'],
  });
  const preview = buildPairLanguagePreview({
    rows: validation.validRows,
    signalKeysInOrder: ['driver', 'analyst'],
  });

  assert.deepEqual(preview.map((group) => group.canonicalSignalPair), ['analyst_driver']);
  assert.deepEqual(
    preview[0]?.entries.map((entry) => entry.section),
    ['summary', 'strength', 'watchout'],
  );
});

test('canonical ordering rule is enforced consistently', () => {
  assert.deepEqual(canonicalizeSignalPairKey('driver_analyst'), {
    success: true,
    signalKeys: ['analyst', 'driver'],
    canonicalSignalPair: 'analyst_driver',
  });
  assert.deepEqual(canonicalizeSignalPairKey('analyst_driver'), {
    success: true,
    signalKeys: ['analyst', 'driver'],
    canonicalSignalPair: 'analyst_driver',
  });
});
