import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOverviewLanguagePreview,
  parseOverviewLanguageRows,
  validateOverviewLanguageRows,
} from '@/lib/admin/overview-language-import';

test('valid textarea input parses correctly', () => {
  const result = parseOverviewLanguageRows(
    'driver_analyst | summary | You combine pace with analysis and tend to move quickly toward a considered conclusion.',
  );

  assert.equal(result.success, true);
  assert.deepEqual(result.records, [
    {
      lineNumber: 1,
      rawLine:
        'driver_analyst | summary | You combine pace with analysis and tend to move quickly toward a considered conclusion.',
      patternKey: 'driver_analyst',
      section: 'summary',
      content:
        'You combine pace with analysis and tend to move quickly toward a considered conclusion.',
    },
  ]);
});

test('blank lines are ignored', () => {
  const result = parseOverviewLanguageRows(
    ['driver_analyst|headline|Fast, structured, decisive.', '', ' ', 'driver_analyst|summary|Fast and thoughtful'].join(
      '\n',
    ),
  );

  assert.equal(result.success, true);
  assert.deepEqual(
    result.records.map((row) => row.lineNumber),
    [1, 4],
  );
});

test('malformed rows fail validation at parse time', () => {
  const result = parseOverviewLanguageRows('driver_analyst|summary');

  assert.equal(result.success, false);
  assert.equal(result.errors[0]?.code, 'INVALID_COLUMN_COUNT');
});

test('invalid pattern keys fail validation', () => {
  const parsed = parseOverviewLanguageRows('driver_analyst_extra|summary|Text');
  const validation = validateOverviewLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['driver', 'analyst'],
  });

  assert.equal(validation.success, false);
  assert.equal(validation.errors[0]?.code, 'INVALID_PATTERN_KEY');
});

test('reversed pattern keys normalize correctly', () => {
  const parsed = parseOverviewLanguageRows('analyst_driver|summary|Text');
  const validation = validateOverviewLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['driver', 'analyst'],
  });

  assert.equal(validation.success, true);
  assert.equal(validation.validRows[0]?.canonicalPatternKey, 'analyst_driver');
});

test('self-pairs fail validation', () => {
  const parsed = parseOverviewLanguageRows('driver_driver|summary|Text');
  const validation = validateOverviewLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['driver', 'analyst'],
  });

  assert.equal(validation.success, false);
  assert.equal(validation.errors[0]?.code, 'SELF_PAIR_NOT_ALLOWED');
});

test('invalid sections fail validation', () => {
  const result = parseOverviewLanguageRows('driver_analyst|strength|Text');

  assert.equal(result.success, false);
  assert.equal(result.errors[0]?.code, 'INVALID_SECTION');
});

test('duplicate canonical pattern and section rows fail validation', () => {
  const parsed = parseOverviewLanguageRows(
    ['driver_analyst|summary|First', 'analyst_driver|summary|Second'].join('\n'),
  );
  const validation = validateOverviewLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['driver', 'analyst'],
  });

  assert.equal(validation.success, false);
  assert.deepEqual(
    validation.errors.map((error) => error.code),
    ['DUPLICATE_PATTERN_SECTION', 'DUPLICATE_PATTERN_SECTION'],
  );
});

test('valid preview groups rows correctly', () => {
  const parsed = parseOverviewLanguageRows(
    [
      'driver_analyst|development|Build in pauses',
      'analyst_driver|summary|Balanced summary',
      'driver_analyst|headline|Fast, structured, decisive.',
      'driver_analyst|watchouts|Speed can narrow input',
      'driver_analyst|strengths|Strong momentum',
    ].join('\n'),
  );
  const validation = validateOverviewLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['driver', 'analyst'],
  });
  const preview = buildOverviewLanguagePreview({
    rows: validation.validRows,
    signalKeysInOrder: ['driver', 'analyst'],
  });

  assert.deepEqual(preview.map((group) => group.canonicalPatternKey), ['analyst_driver']);
  assert.deepEqual(
    preview[0]?.entries.map((entry) => entry.section),
    ['headline', 'summary', 'strengths', 'watchouts', 'development'],
  );
});

test('preview ordering is deterministic', () => {
  const parsed = parseOverviewLanguageRows(
    [
      'advisor_driver|summary|Advisor driver summary',
      'analyst_driver|summary|Analyst driver summary',
      'driver_facilitator|summary|Driver facilitator summary',
    ].join('\n'),
  );
  const validation = validateOverviewLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['driver', 'analyst', 'advisor', 'facilitator'],
  });
  const preview = buildOverviewLanguagePreview({
    rows: validation.validRows,
    signalKeysInOrder: ['driver', 'analyst', 'advisor', 'facilitator'],
  });

  assert.deepEqual(preview.map((group) => group.canonicalPatternKey), [
    'driver_facilitator',
    'analyst_driver',
    'advisor_driver',
  ]);
});
