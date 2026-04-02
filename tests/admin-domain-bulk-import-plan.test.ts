import test from 'node:test';
import assert from 'node:assert/strict';

import { parseDomainBulkImport } from '@/lib/admin/domain-bulk-import';
import { planDomainBulkImport } from '@/lib/server/admin-domain-bulk-import-plan';

function createAssessmentVersion(lifecycleStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' = 'DRAFT') {
  return {
    assessmentVersionId: 'version-1',
    lifecycleStatus,
  } as const;
}

test('valid batch assigns sequential order indexes after existing authored domains', () => {
  const parserResult = parseDomainBulkImport({
    input: ['Leadership Style', 'Core Drivers|Description'].join('\n'),
    existingDomains: [],
  });

  const result = planDomainBulkImport({
    assessmentVersion: createAssessmentVersion(),
    existingDomains: [
      {
        domainId: 'domain-1',
        domainKey: 'existing-domain',
        label: 'Existing Domain',
        orderIndex: 2,
        domainType: 'SIGNAL_GROUP',
      },
    ],
    parserResult,
  });

  assert.equal(result.ok, true);
  assert.equal(result.canImport, true);
  assert.deepEqual(
    result.accepted.map((row) => ({
      line: row.sourceLineNumber,
      key: row.domainKey,
      orderIndex: row.orderIndex,
    })),
    [
      { line: 1, key: 'leadership-style', orderIndex: 3 },
      { line: 2, key: 'core-drivers', orderIndex: 4 },
    ],
  );
});

test('conflict with existing domain key is rejected', () => {
  const parserResult = parseDomainBulkImport({
    input: 'Leadership Style',
    existingDomains: [],
  });

  const result = planDomainBulkImport({
    assessmentVersion: createAssessmentVersion(),
    existingDomains: [
      {
        domainId: 'domain-1',
        domainKey: 'leadership-style',
        label: 'Leadership Archive',
        orderIndex: 0,
        domainType: 'SIGNAL_GROUP',
      },
    ],
    parserResult,
  });

  assert.equal(result.ok, false);
  assert.equal(result.canImport, false);
  assert.equal(result.rejected[0]?.reasonCode, 'DOMAIN_KEY_CONFLICT');
});

test('existing domain label conflicts remain importable when keys do not collide', () => {
  const parserResult = parseDomainBulkImport({
    input: 'Leadership Style',
    existingDomains: [],
  });

  const result = planDomainBulkImport({
    assessmentVersion: createAssessmentVersion(),
    existingDomains: [
      {
        domainId: 'domain-1',
        domainKey: 'existing-domain',
        label: 'Leadership Style',
        orderIndex: 0,
        domainType: 'SIGNAL_GROUP',
      },
    ],
    parserResult,
  });

  assert.equal(result.ok, true);
  assert.equal(result.accepted.length, 1);
  assert.equal(result.accepted[0]?.domainKey, 'leadership-style');
});

test('non-draft version blocks import', () => {
  const parserResult = parseDomainBulkImport({
    input: 'Leadership Style',
    existingDomains: [],
  });

  const result = planDomainBulkImport({
    assessmentVersion: createAssessmentVersion('PUBLISHED'),
    existingDomains: [],
    parserResult,
  });

  assert.equal(result.ok, false);
  assert.equal(result.canImport, false);
  assert.equal(result.rejected[0]?.reasonCode, 'VERSION_NOT_DRAFT');
});

test('mixed valid and invalid rows return structured accepted and rejected output', () => {
  const parserResult = parseDomainBulkImport({
    input: ['Leadership Style', '***', 'Existing Domain|existing-domain|Taken'].join('\n'),
    existingDomains: [],
  });

  const result = planDomainBulkImport({
    assessmentVersion: createAssessmentVersion(),
    existingDomains: [
      {
        domainId: 'domain-1',
        domainKey: 'existing-domain',
        label: 'Existing Domain',
        orderIndex: 0,
        domainType: 'SIGNAL_GROUP',
      },
    ],
    parserResult,
  });

  assert.equal(result.ok, false);
  assert.equal(result.canImport, true);
  assert.deepEqual(
    result.accepted.map((row) => row.domainKey),
    ['leadership-style'],
  );
  assert.deepEqual(
    result.rejected.map((row) => ({ line: row.sourceLineNumber, code: row.reasonCode })),
    [
      { line: 2, code: 'INVALID_PARSED_ROW' },
      { line: 3, code: 'DOMAIN_KEY_CONFLICT' },
    ],
  );
});
