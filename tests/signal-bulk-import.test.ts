import test from 'node:test';
import assert from 'node:assert/strict';

import { parseSignalBulkImport } from '@/lib/admin/signal-bulk-import';

const existingDomains = [
  {
    domainId: 'domain-1',
    domainKey: 'leadership-style',
    label: 'Leadership Style',
  },
  {
    domainId: 'domain-2',
    domainKey: 'core-drivers',
    label: 'Core Drivers',
  },
] as const;

test('parses valid signal rows and resolves domains by key or exact label', () => {
  const result = parseSignalBulkImport({
    input: [
      'leadership-style|Directive',
      'Core Drivers|Supportive|Helps build trust.',
      'core-drivers|Achiever|achiever-v2|Explicit key row',
    ].join('\n'),
    existingDomains,
    existingSignals: [],
  });

  assert.equal(result.success, true);
  assert.deepEqual(result.parseErrors, []);
  assert.deepEqual(result.validationErrors, []);
  assert.deepEqual(
    result.previewRecords.map((record) => ({
      lineNumber: record.lineNumber,
      matchedBy: record.matchedBy,
      domainKey: record.domainKey,
      label: record.label,
      key: record.key,
      description: record.description,
    })),
    [
      {
        lineNumber: 1,
        matchedBy: 'domain_key',
        domainKey: 'leadership-style',
        label: 'Directive',
        key: 'directive',
        description: null,
      },
      {
        lineNumber: 2,
        matchedBy: 'domain_key',
        domainKey: 'core-drivers',
        label: 'Supportive',
        key: 'supportive',
        description: 'Helps build trust.',
      },
      {
        lineNumber: 3,
        matchedBy: 'domain_key',
        domainKey: 'core-drivers',
        label: 'Achiever',
        key: 'achiever-v2',
        description: 'Explicit key row',
      },
    ],
  );
});

test('rejects malformed signal rows', () => {
  const result = parseSignalBulkImport({
    input: [
      'leadership-style',
      '|Directive',
      'leadership-style|',
      'leadership-style|Directive|___|Description',
    ].join('\n'),
    existingDomains,
    existingSignals: [],
  });

  assert.equal(result.success, false);
  assert.deepEqual(
    result.parseErrors.map((error) => ({ lineNumber: error.lineNumber, code: error.code })),
    [
      { lineNumber: 1, code: 'INVALID_COLUMN_COUNT' },
      { lineNumber: 2, code: 'EMPTY_DOMAIN' },
      { lineNumber: 3, code: 'EMPTY_LABEL' },
      { lineNumber: 4, code: 'INVALID_KEY' },
    ],
  );
});

test('rejects unknown and ambiguous domains deterministically', () => {
  const result = parseSignalBulkImport({
    input: [
      'missing-domain|Directive',
      'Shared Domain|Supportive',
    ].join('\n'),
    existingDomains: [
      ...existingDomains,
      { domainId: 'domain-3', domainKey: 'shared-one', label: 'Shared Domain' },
      { domainId: 'domain-4', domainKey: 'shared-two', label: 'Shared Domain' },
    ],
    existingSignals: [],
  });

  assert.equal(result.success, false);
  assert.deepEqual(
    result.validationErrors.map((error) => ({ lineNumber: error.lineNumber, code: error.code })),
    [
      { lineNumber: 1, code: 'UNKNOWN_DOMAIN' },
      { lineNumber: 2, code: 'AMBIGUOUS_DOMAIN' },
    ],
  );
});

test('detects row limits, duplicates, and conflicts against existing signals', () => {
  const result = parseSignalBulkImport({
    input: [
      'leadership-style|Directive',
      'Leadership Style|directive',
      'core-drivers|Supportive|supportive|Description',
    ].join('\n'),
    existingDomains,
    existingSignals: [
      {
        signalId: 'signal-1',
        domainId: 'domain-1',
        signalKey: 'supportive',
        label: 'Listener',
      },
      {
        signalId: 'signal-2',
        domainId: 'domain-1',
        signalKey: 'existing-key',
        label: 'Directive',
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
      { lineNumber: 1, code: 'DUPLICATE_SIGNAL_KEY' },
      { lineNumber: 1, code: 'DUPLICATE_SIGNAL_LABEL_IN_DOMAIN' },
      { lineNumber: 1, code: 'EXISTING_SIGNAL_LABEL_IN_DOMAIN_CONFLICT' },
      { lineNumber: 2, code: 'DUPLICATE_SIGNAL_KEY' },
      { lineNumber: 2, code: 'DUPLICATE_SIGNAL_LABEL_IN_DOMAIN' },
      { lineNumber: 2, code: 'EXISTING_SIGNAL_LABEL_IN_DOMAIN_CONFLICT' },
      { lineNumber: 3, code: 'EXISTING_SIGNAL_KEY_CONFLICT' },
    ],
  );
});
