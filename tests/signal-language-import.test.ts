import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSignalLanguagePreview,
  parseDelimitedLanguageRows,
  validateSignalLanguageRows,
} from '@/lib/admin/signal-language-import';

test('valid textarea input parses correctly', () => {
  const result = parseDelimitedLanguageRows(
    'driver | summary | You tend to move quickly and take initiative.',
  );

  assert.equal(result.success, true);
  assert.deepEqual(result.records, [
    {
      lineNumber: 1,
      rawLine: 'driver | summary | You tend to move quickly and take initiative.',
      signalKey: 'driver',
      section: 'summary',
      content: 'You tend to move quickly and take initiative.',
    },
  ]);
});

test('blank lines are ignored', () => {
  const result = parseDelimitedLanguageRows(
    ['driver|summary|Fast start', '', ' ', 'analyst|strength|Careful thinking'].join('\n'),
  );

  assert.equal(result.success, true);
  assert.equal(result.records.length, 2);
  assert.deepEqual(
    result.records.map((row) => row.lineNumber),
    [1, 4],
  );
});

test('malformed rows fail validation at parse time', () => {
  const result = parseDelimitedLanguageRows('driver|summary');

  assert.equal(result.success, false);
  assert.equal(result.errors[0]?.code, 'INVALID_COLUMN_COUNT');
});

test('invalid sections fail validation', () => {
  const result = parseDelimitedLanguageRows('driver|headline|Text');

  assert.equal(result.success, false);
  assert.equal(result.errors[0]?.code, 'INVALID_SECTION');
});

test('invalid signal keys fail validation against the active version signal set', () => {
  const parsed = parseDelimitedLanguageRows('unknown|summary|Text');
  const validation = validateSignalLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['driver', 'analyst'],
  });

  assert.equal(validation.success, false);
  assert.equal(validation.errors[0]?.code, 'INVALID_SIGNAL_KEY');
});

test('duplicate signal_key and section rows fail validation', () => {
  const parsed = parseDelimitedLanguageRows(
    ['driver|summary|First', 'driver|summary|Second'].join('\n'),
  );
  const validation = validateSignalLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['driver'],
  });

  assert.equal(validation.success, false);
  assert.deepEqual(
    validation.errors.map((error) => error.code),
    ['DUPLICATE_SIGNAL_SECTION', 'DUPLICATE_SIGNAL_SECTION'],
  );
});

test('valid preview groups rows correctly using authored signal order and section order', () => {
  const parsed = parseDelimitedLanguageRows(
    [
      'driver|watchout|Watch out',
      'analyst|strength|Strong analysis',
      'driver|summary|Driver summary',
      'driver|development|Slow down slightly',
    ].join('\n'),
  );
  const validation = validateSignalLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['analyst', 'driver'],
  });

  const preview = buildSignalLanguagePreview({
    rows: validation.validRows,
    signalKeysInOrder: ['analyst', 'driver'],
  });

  assert.deepEqual(
    preview.map((group) => group.signalKey),
    ['analyst', 'driver'],
  );
  assert.deepEqual(
    preview[1]?.entries.map((entry) => entry.section),
    ['summary', 'watchout', 'development'],
  );
});
