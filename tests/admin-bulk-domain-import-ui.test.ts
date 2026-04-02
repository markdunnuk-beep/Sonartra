import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const bulkComponentPath = join(
  process.cwd(),
  'components',
  'admin',
  'admin-bulk-domain-import.tsx',
);
const authoringComponentPath = join(
  process.cwd(),
  'components',
  'admin',
  'admin-domain-signal-authoring.tsx',
);

function readSource(path: string): string {
  return readFileSync(path, 'utf8');
}

test('bulk domain import panel binds explicit preview and import actions for the active version', () => {
  const source = readSource(bulkComponentPath);

  assert.match(source, /previewDomainBulkImportAction\.bind\(null, \{ assessmentVersionId \}\)/);
  assert.match(source, /importDomainBulkAction\.bind\(null, \{ assessmentVersionId \}\)/);
});

test('bulk domain import panel keeps textarea input client-side and invalidates stale preview state after edits', () => {
  const source = readSource(bulkComponentPath);

  assert.match(source, /const nextRawInput = event\.currentTarget\.value/);
  assert.match(source, /setRawInput\(nextRawInput\)/);
  assert.match(source, /resultState\.rawInput === rawInput/);
  assert.match(source, /Preview again before importing/);
});

test('bulk domain import panel enables import only with a current valid preview and clears after success', () => {
  const source = readSource(bulkComponentPath);

  assert.match(source, /resultState\.accepted\.length > 0/);
  assert.match(source, /disabled=\{!canImport\}/);
  assert.match(source, /setRawInput\(''\)/);
  assert.match(source, /setResultState\(initialAdminDomainBulkImportState\)/);
});

test('bulk domain import panel shows append guidance and no-valid-rows guidance for operator clarity', () => {
  const source = readSource(bulkComponentPath);

  assert.match(source, /existingDomainCount: number/);
  assert.match(source, /This will append new domains after the existing set/);
  assert.match(source, /No valid rows were found to import\. Fix the rejected rows and preview again\./);
});

test('domain authoring renders the bulk panel only in domains mode above the manual create form', () => {
  const source = readSource(authoringComponentPath);

  assert.match(source, /\{mode === 'domains' \? \(\s*<AdminBulkDomainImport/);
  assert.match(source, /<AdminBulkDomainImport[\s\S]*<CreateDomainForm/);
});
