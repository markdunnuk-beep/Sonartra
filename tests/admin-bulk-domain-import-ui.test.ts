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

test('bulk domain import panel binds the import action for the active version', () => {
  const source = readSource(bulkComponentPath);

  assert.match(source, /importDomainBulkAction\.bind\(null, \{ assessmentVersionId \}\)/);
  assert.doesNotMatch(source, /previewDomainBulkImportAction/);
});

test('bulk domain import panel keeps textarea input client-side and resets imported state after edits', () => {
  const source = readSource(bulkComponentPath);

  assert.match(source, /const nextRawInput = event\.currentTarget\.value/);
  assert.match(source, /setRawInput\(nextRawInput\)/);
  assert.match(source, /setSuccessMessage\(null\)/);
  assert.match(source, /successMessage \? 'Imported' : 'Import'/);
});

test('bulk domain import panel uses one primary import action without preview or clear controls', () => {
  const source = readSource(bulkComponentPath);

  assert.match(source, /Importing\.\.\./);
  assert.match(source, /successMessage \? 'Imported' : 'Import'/);
  assert.match(source, /disabled=\{!canImport\}/);
  assert.doesNotMatch(source, /Previewing\.\.\./);
  assert.doesNotMatch(source, /'Preview'/);
  assert.doesNotMatch(source, /Clear/);
});

test('bulk domain import panel shows append guidance and retry guidance for operator clarity', () => {
  const source = readSource(bulkComponentPath);

  assert.match(source, /existingDomainCount: number/);
  assert.match(source, /This will append new domains after the existing set/);
  assert.match(source, /No valid rows were found to import\. Fix the rejected rows and try again\./);
  assert.match(source, /Review the rejected rows below, then try importing again\./);
});

test('domain authoring renders the bulk panel only in domains mode and omits the manual create form', () => {
  const source = readSource(authoringComponentPath);

  assert.match(source, /\{mode === 'domains' \? \(\s*<AdminBulkDomainImport/);
  assert.doesNotMatch(source, /CreateDomainForm/);
  assert.doesNotMatch(source, /createDomainAction/);
});
