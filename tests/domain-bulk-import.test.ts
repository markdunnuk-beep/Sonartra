import test from 'node:test';
import assert from 'node:assert/strict';

import { parseDomainBulkImport } from '@/lib/admin/domain-bulk-import';

test('parses valid domain rows and generates deterministic keys when omitted', () => {
  const result = parseDomainBulkImport({
    input: [
      'Leadership Style',
      'Core Drivers|Groups the primary drivers.',
      'Decision Profile|decision-profile|Explicit key row',
    ].join('\n'),
    existingDomains: [],
  });

  assert.equal(result.success, true);
  assert.deepEqual(result.parseErrors, []);
  assert.deepEqual(result.validationErrors, []);
  assert.deepEqual(result.previewRecords, [
    {
      lineNumber: 1,
      rawLine: 'Leadership Style',
      label: 'Leadership Style',
      key: 'leadership-style',
      description: null,
    },
    {
      lineNumber: 2,
      rawLine: 'Core Drivers|Groups the primary drivers.',
      label: 'Core Drivers',
      key: 'core-drivers',
      description: 'Groups the primary drivers.',
    },
    {
      lineNumber: 3,
      rawLine: 'Decision Profile|decision-profile|Explicit key row',
      label: 'Decision Profile',
      key: 'decision-profile',
      description: 'Explicit key row',
    },
  ]);
});

test('ignores blank lines and preserves source line numbers', () => {
  const result = parseDomainBulkImport({
    input: '\nLeadership Style\n \nCore Drivers|Groups the primary drivers.\n',
    existingDomains: [],
  });

  assert.equal(result.success, true);
  assert.deepEqual(
    result.previewRecords.map((record) => record.lineNumber),
    [2, 4],
  );
});

test('rejects malformed domain rows and invalid explicit keys', () => {
  const result = parseDomainBulkImport({
    input: [
      'Leadership|extra|too|many',
      '|description only',
      '***',
      'Decision Profile|___|Description',
    ].join('\n'),
    existingDomains: [],
  });

  assert.equal(result.success, false);
  assert.deepEqual(
    result.parseErrors.map((error) => ({ lineNumber: error.lineNumber, code: error.code })),
    [
      { lineNumber: 1, code: 'INVALID_COLUMN_COUNT' },
      { lineNumber: 2, code: 'EMPTY_LABEL' },
      { lineNumber: 3, code: 'INVALID_KEY' },
      { lineNumber: 4, code: 'INVALID_KEY' },
    ],
  );
});

test('detects row limits, batch duplicates, and existing domain key conflicts', () => {
  const result = parseDomainBulkImport({
    input: [
      'Leadership Style',
      'leadership style|Another label duplicate',
      'Decision Profile|decision-profile|Conflicting key',
    ].join('\n'),
    existingDomains: [
      {
        domainId: 'domain-1',
        domainKey: 'decision-profile',
        label: 'Decision Profile',
      },
    ],
    maxRows: 2,
  });

  assert.equal(result.success, false);
  assert.deepEqual(
    result.validationErrors.map((error) => ({
      lineNumber: error.lineNumber,
      code: error.code,
    })),
    [
      { lineNumber: null, code: 'ROW_LIMIT_EXCEEDED' },
      { lineNumber: 1, code: 'DUPLICATE_DOMAIN_KEY' },
      { lineNumber: 1, code: 'DUPLICATE_DOMAIN_LABEL' },
      { lineNumber: 2, code: 'DUPLICATE_DOMAIN_KEY' },
      { lineNumber: 2, code: 'DUPLICATE_DOMAIN_LABEL' },
      { lineNumber: 3, code: 'EXISTING_DOMAIN_KEY_CONFLICT' },
    ],
  );
});
