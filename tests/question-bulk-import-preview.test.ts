import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildBulkQuestionByDomainPreview,
  buildBulkQuestionPreview,
} from '@/lib/admin/question-bulk-import-preview';

const domains = [
  {
    domainId: 'domain-1',
    domainKey: 'operating-style',
    label: 'Operating Style',
  },
  {
    domainId: 'domain-2',
    domainKey: 'core-drivers',
    label: 'Core Drivers',
  },
] as const;

test('single-domain preview returns accepted counts and resolved domain metadata', () => {
  const result = buildBulkQuestionPreview({
    rawInput: ['First question', '', 'Second question'].join('\n'),
    selectedDomainId: 'domain-1',
    domains,
  });

  assert.equal(result.rowCount, 2);
  assert.equal(result.acceptedCount, 2);
  assert.equal(result.rejectedCount, 0);
  assert.equal(result.canImport, true);
  assert.deepEqual(
    result.accepted.map((row) => ({
      lineNumber: row.lineNumber,
      prompt: row.prompt,
      domainKey: row.domainKey,
    })),
    [
      { lineNumber: 1, prompt: 'First question', domainKey: 'operating-style' },
      { lineNumber: 3, prompt: 'Second question', domainKey: 'operating-style' },
    ],
  );
});

test('single-domain preview rejects missing selected domain cleanly', () => {
  const result = buildBulkQuestionPreview({
    rawInput: 'First question',
    selectedDomainId: '',
    domains,
  });

  assert.equal(result.acceptedCount, 0);
  assert.equal(result.canImport, false);
  assert.equal(result.rejected[0]?.message, 'Select a domain before previewing questions.');
});

test('domain preview surfaces mixed valid and invalid rows with line-level messages', () => {
  const result = buildBulkQuestionByDomainPreview({
    rawInput: [
      'operating-style|First question',
      'missing-domain|Second question',
      'core-drivers|   ',
      'too|many|pipes',
      'Core Drivers|Fourth question',
    ].join('\n'),
    domains,
  });

  assert.equal(result.rowCount, 5);
  assert.equal(result.acceptedCount, 2);
  assert.equal(result.rejectedCount, 3);
  assert.equal(result.canImport, true);
  assert.deepEqual(
    result.rejected,
    [
      { lineNumber: 2, message: 'domain not found.' },
      { lineNumber: 3, message: 'missing question text.' },
      { lineNumber: 4, message: 'must use exactly one | separator in the format domain|question text.' },
    ],
  );
});
