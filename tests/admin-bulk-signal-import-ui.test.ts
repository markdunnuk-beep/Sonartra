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

test('bulk signal import panel binds explicit preview and import actions for the active version', () => {
  const source = readSource(bulkComponentPath);

  assert.match(source, /previewSignalBulkImportAction\.bind\(null, \{ assessmentVersionId \}\)/);
  assert.match(source, /importSignalBulkAction\.bind\(null, \{ assessmentVersionId \}\)/);
});

test('bulk signal import panel keeps textarea input client-side and invalidates stale preview state after edits', () => {
  const source = readSource(bulkComponentPath);

  assert.match(source, /const nextRawInput = event\.currentTarget\.value/);
  assert.match(source, /setRawInput\(nextRawInput\)/);
  assert.match(source, /resultState\.rawInput === rawInput/);
  assert.match(source, /Preview again before importing/);
});

test('bulk signal import panel enables import only with a current valid preview and clears after success', () => {
  const source = readSource(bulkComponentPath);

  assert.match(source, /resultState\.accepted\.length > 0/);
  assert.match(source, /disabled=\{!canImport\}/);
  assert.match(source, /setRawInput\(''\)/);
  assert.match(source, /setResultState\(initialAdminSignalBulkImportState\)/);
});

test('bulk signal import panel groups accepted preview rows using authored domain order', () => {
  const source = readSource(bulkComponentPath);

  assert.match(source, /function buildAcceptedPreviewGroups/);
  assert.match(source, /\.map\(\(domain\) => \(\{/);
  assert.match(source, /acceptedByDomainId\.get\(domain\.domainId\) \?\? \[\]/);
});

test('bulk signal import panel shows domain-required and append guidance for operator clarity', () => {
  const source = readSource(bulkComponentPath);

  assert.match(source, /Add at least one domain before previewing signal imports\./);
  assert.match(source, /This will append new signals within each matched domain/);
  assert.match(source, /No valid rows were found to import\. Fix the rejected rows and preview again\./);
});

test('signal authoring renders the bulk panel only in signals mode above the manual signal cards', () => {
  const source = readSource(authoringComponentPath);

  assert.match(source, /\{mode === 'signals' \? \(\s*<AdminBulkSignalImport/);
  assert.match(source, /<AdminBulkSignalImport[\s\S]*\{domains\.length === 0 \?/);
  assert.doesNotMatch(source, /\{mode === 'domains' \? \(\s*<AdminBulkSignalImport/);
});
