import test from 'node:test';
import assert from 'node:assert/strict';

import { parseSignalBulkImport } from '@/lib/admin/signal-bulk-import';
import { planSignalBulkImport } from '@/lib/server/admin-signal-bulk-import-plan';

const existingDomains = [
  {
    domainId: 'domain-1',
    domainKey: 'leadership-style',
    label: 'Leadership Style',
    orderIndex: 0,
    domainType: 'SIGNAL_GROUP' as const,
  },
  {
    domainId: 'domain-2',
    domainKey: 'core-drivers',
    label: 'Core Drivers',
    orderIndex: 1,
    domainType: 'SIGNAL_GROUP' as const,
  },
] as const;

function createAssessmentVersion(lifecycleStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' = 'DRAFT') {
  return {
    assessmentVersionId: 'version-1',
    lifecycleStatus,
  } as const;
}

test('valid batch assigns sequential order indexes per domain', () => {
  const parserResult = parseSignalBulkImport({
    input: [
      'leadership-style|Directive',
      'leadership-style|Supportive',
      'core-drivers|Achiever',
    ].join('\n'),
    existingDomains,
    existingSignals: [],
  });

  const result = planSignalBulkImport({
    assessmentVersion: createAssessmentVersion(),
    existingDomains,
    existingSignals: [
      {
        signalId: 'signal-1',
        domainId: 'domain-1',
        signalKey: 'existing-1',
        label: 'Existing 1',
        orderIndex: 2,
      },
      {
        signalId: 'signal-2',
        domainId: 'domain-2',
        signalKey: 'existing-2',
        label: 'Existing 2',
        orderIndex: 5,
      },
    ],
    parserResult,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(
    result.accepted.map((row) => ({
      key: row.signalKey,
      domainKey: row.domainKey,
      orderIndex: row.orderIndex,
    })),
    [
      { key: 'directive', domainKey: 'leadership-style', orderIndex: 3 },
      { key: 'supportive', domainKey: 'leadership-style', orderIndex: 4 },
      { key: 'achiever', domainKey: 'core-drivers', orderIndex: 6 },
    ],
  );
});

test('accepted rows are grouped under the resolved domain', () => {
  const parserResult = parseSignalBulkImport({
    input: ['Leadership Style|Directive', 'core-drivers|Achiever'].join('\n'),
    existingDomains,
    existingSignals: [],
  });

  const result = planSignalBulkImport({
    assessmentVersion: createAssessmentVersion(),
    existingDomains,
    existingSignals: [],
    parserResult,
  });

  assert.deepEqual(
    result.acceptedByDomain.map((group) => ({
      domainKey: group.domainKey,
      count: group.createdCount,
    })),
    [
      { domainKey: 'core-drivers', count: 1 },
      { domainKey: 'leadership-style', count: 1 },
    ],
  );
});

test('conflict with existing signal key is rejected', () => {
  const parserResult = parseSignalBulkImport({
    input: 'leadership-style|Directive',
    existingDomains,
    existingSignals: [],
  });

  const result = planSignalBulkImport({
    assessmentVersion: createAssessmentVersion(),
    existingDomains,
    existingSignals: [
      {
        signalId: 'signal-1',
        domainId: 'domain-2',
        signalKey: 'directive',
        label: 'Existing Directive',
        orderIndex: 0,
      },
    ],
    parserResult,
  });

  assert.equal(result.ok, false);
  assert.equal(result.canImport, false);
  assert.equal(result.rejected[0]?.reasonCode, 'SIGNAL_KEY_CONFLICT');
});

test('duplicate label within the same domain is rejected against current state', () => {
  const parserResult = parseSignalBulkImport({
    input: 'leadership-style|Directive',
    existingDomains,
    existingSignals: [],
  });

  const result = planSignalBulkImport({
    assessmentVersion: createAssessmentVersion(),
    existingDomains,
    existingSignals: [
      {
        signalId: 'signal-1',
        domainId: 'domain-1',
        signalKey: 'existing-key',
        label: 'Directive',
        orderIndex: 0,
      },
    ],
    parserResult,
  });

  assert.equal(result.ok, false);
  assert.equal(result.canImport, false);
  assert.equal(result.rejected[0]?.reasonCode, 'SIGNAL_LABEL_CONFLICT');
});

test('non-draft version blocks import', () => {
  const parserResult = parseSignalBulkImport({
    input: 'leadership-style|Directive',
    existingDomains,
    existingSignals: [],
  });

  const result = planSignalBulkImport({
    assessmentVersion: createAssessmentVersion('PUBLISHED'),
    existingDomains,
    existingSignals: [],
    parserResult,
  });

  assert.equal(result.ok, false);
  assert.equal(result.canImport, false);
  assert.equal(result.rejected[0]?.reasonCode, 'VERSION_NOT_DRAFT');
});

test('mixed valid and invalid rows return structured accepted and rejected output', () => {
  const parserResult = parseSignalBulkImport({
    input: [
      'leadership-style|Directive',
      'leadership-style',
      'core-drivers|Supportive',
    ].join('\n'),
    existingDomains,
    existingSignals: [],
  });

  const result = planSignalBulkImport({
    assessmentVersion: createAssessmentVersion(),
    existingDomains,
    existingSignals: [
      {
        signalId: 'signal-1',
        domainId: 'domain-2',
        signalKey: 'supportive',
        label: 'Existing Supportive',
        orderIndex: 0,
      },
    ],
    parserResult,
  });

  assert.equal(result.ok, false);
  assert.equal(result.canImport, true);
  assert.deepEqual(
    result.accepted.map((row) => row.signalKey),
    ['directive'],
  );
  assert.deepEqual(
    result.rejected.map((row) => ({ line: row.sourceLineNumber, code: row.reasonCode })),
    [
      { line: 2, code: 'INVALID_PARSED_ROW' },
      { line: 3, code: 'SIGNAL_KEY_CONFLICT' },
    ],
  );
});
