import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDomainLanguagePreview,
  parseDomainLanguageRows,
  validateDomainLanguageRows,
} from '@/lib/admin/domain-language-import';

test('valid textarea input parses correctly', () => {
  const result = parseDomainLanguageRows(
    'behaviour_style | summary | You tend to operate with visible pace, structure, and interpersonal impact.',
  );

  assert.equal(result.success, true);
  assert.deepEqual(result.records, [
    {
      lineNumber: 1,
      rawLine:
        'behaviour_style | summary | You tend to operate with visible pace, structure, and interpersonal impact.',
      domainKey: 'behaviour_style',
      section: 'summary',
      content: 'You tend to operate with visible pace, structure, and interpersonal impact.',
    },
  ]);
});

test('blank lines are ignored', () => {
  const result = parseDomainLanguageRows(
    ['behaviour_style|summary|Summary', '', ' ', 'decision_pattern|focus|Focused contribution'].join(
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
  const result = parseDomainLanguageRows('behaviour_style|summary');

  assert.equal(result.success, false);
  assert.equal(result.errors[0]?.code, 'INVALID_COLUMN_COUNT');
});

test('invalid domain keys fail validation against the active version domain set', () => {
  const parsed = parseDomainLanguageRows('unknown|summary|Text');
  const validation = validateDomainLanguageRows({
    rows: parsed.records,
    validDomainKeys: ['behaviour_style', 'decision_pattern'],
  });

  assert.equal(validation.success, false);
  assert.equal(validation.errors[0]?.code, 'INVALID_DOMAIN_KEY');
});

test('invalid sections fail validation', () => {
  const result = parseDomainLanguageRows('behaviour_style|headline|Text');

  assert.equal(result.success, false);
  assert.equal(result.errors[0]?.code, 'INVALID_SECTION');
});

test('duplicate domain_key and section rows fail validation', () => {
  const parsed = parseDomainLanguageRows(
    ['behaviour_style|summary|First', 'behaviour_style|summary|Second'].join('\n'),
  );
  const validation = validateDomainLanguageRows({
    rows: parsed.records,
    validDomainKeys: ['behaviour_style'],
  });

  assert.equal(validation.success, false);
  assert.deepEqual(
    validation.errors.map((error) => error.code),
    ['DUPLICATE_DOMAIN_SECTION', 'DUPLICATE_DOMAIN_SECTION'],
  );
});

test('valid preview groups rows correctly using authored domain order and section order', () => {
  const parsed = parseDomainLanguageRows(
    [
      'behaviour_style|pressure|Pressure',
      'decision_pattern|focus|Focus',
      'behaviour_style|summary|Summary',
      'behaviour_style|environment|Environment',
    ].join('\n'),
  );
  const validation = validateDomainLanguageRows({
    rows: parsed.records,
    validDomainKeys: ['decision_pattern', 'behaviour_style'],
  });

  const preview = buildDomainLanguagePreview({
    rows: validation.validRows,
    domainKeysInOrder: ['decision_pattern', 'behaviour_style'],
  });

  assert.deepEqual(
    preview.map((group) => group.domainKey),
    ['decision_pattern', 'behaviour_style'],
  );
  assert.deepEqual(
    preview[1]?.entries.map((entry) => entry.section),
    ['summary', 'pressure', 'environment'],
  );
});
