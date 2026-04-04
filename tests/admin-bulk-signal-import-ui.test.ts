import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const bulkComponentPath = join(
  process.cwd(),
  'components',
  'admin',
  'admin-bulk-signal-import.tsx',
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

test('bulk signal import panel binds the import action for the active version', () => {
  const source = readSource(bulkComponentPath);

  assert.match(source, /importSignalBulkAction\.bind\(null, \{ assessmentVersionId \}\)/);
  assert.doesNotMatch(source, /previewSignalBulkImportAction/);
});

test('bulk signal import panel keeps textarea input client-side and resets imported state after edits', () => {
  const source = readSource(bulkComponentPath);

  assert.match(source, /const nextRawInput = event\.currentTarget\.value/);
  assert.match(source, /setRawInput\(nextRawInput\)/);
  assert.match(source, /setSuccessMessage\(null\)/);
  assert.match(source, /successMessage \? 'Imported' : 'Import'/);
});

test('bulk signal import panel uses one primary import action without preview or clear controls', () => {
  const source = readSource(bulkComponentPath);

  assert.match(source, /Importing\.\.\./);
  assert.match(source, /successMessage \? 'Imported' : 'Import'/);
  assert.match(source, /disabled=\{!canImport\}/);
  assert.doesNotMatch(source, /Previewing\.\.\./);
  assert.doesNotMatch(source, /'Preview'/);
  assert.doesNotMatch(source, /Clear/);
});

test('bulk signal import panel groups accepted preview rows using authored domain order', () => {
  const source = readSource(bulkComponentPath);

  assert.match(source, /function buildAcceptedPreviewGroups/);
  assert.match(source, /\.map\(\(domain\) => \(\{/);
  assert.match(source, /acceptedByDomainId\.get\(domain\.domainId\) \?\? \[\]/);
});

test('bulk signal import panel shows domain-required and append guidance for operator clarity', () => {
  const source = readSource(bulkComponentPath);

  assert.match(source, /Add at least one domain before importing signals\./);
  assert.match(source, /This will append new signals within each matched domain/);
  assert.match(source, /No valid rows were found to import\. Fix the rejected rows and try again\./);
  assert.match(source, /Review the rejected rows below, then try importing again\./);
});

test('signal authoring renders the bulk panel only in signals mode without a manual add-signal section', () => {
  const source = readSource(authoringComponentPath);

  assert.match(source, /\{mode === 'signals' \? \(\s*<AdminBulkSignalImport/);
  assert.match(source, /<AdminBulkSignalImport[\s\S]*\{domains\.length === 0 \?/);
  assert.doesNotMatch(source, /\{mode === 'domains' \? \(\s*<AdminBulkSignalImport/);
  assert.doesNotMatch(source, /sonartra-page-eyebrow">Add signal/);
  assert.doesNotMatch(source, /idleLabel="Add signal"/);
  assert.doesNotMatch(source, /pendingLabel="Adding signal\.\.\."/);
});
