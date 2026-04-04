import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentPath = join(
  process.cwd(),
  'components',
  'admin',
  'admin-question-option-authoring.tsx',
);

function readSource(): string {
  return readFileSync(componentPath, 'utf8');
}

test('question bulk import forms use a single import action with imported state', () => {
  const source = readSource();

  assert.match(source, /function BulkImportAction/);
  assert.match(source, /Importing\.\.\./);
  assert.match(source, /hasImported \? 'Imported' : 'Import'/);
  assert.match(source, /disabled=\{pending \|\| !canImport\}/);
  assert.doesNotMatch(source, /Previewing\.\.\./);
  assert.doesNotMatch(source, /function BulkQuestionForm\(/);
});

test('question bulk imported state resets when textarea or domain selection changes', () => {
  const source = readSource();

  assert.match(source, /setHasImported\(false\)/);
  assert.match(source, /setQuestionLines\(''\);/);
  assert.doesNotMatch(source, /setSelectedDomainId/);
});

test('question bulk forms remove preview-specific helpers and guidance', () => {
  const source = readSource();

  assert.doesNotMatch(source, /function BulkQuestionPreviewPanel/);
  assert.doesNotMatch(source, /buildBulkQuestionPreview/);
  assert.doesNotMatch(source, /buildBulkQuestionByDomainPreview/);
  assert.doesNotMatch(source, /Preview again before importing/);
});

test('questions authoring keeps the pipe-delimited bulk import flow', () => {
  const source = readSource();

  assert.match(source, /Bulk paste questions by domain/);
  assert.match(source, /domain\|question text/);
  assert.match(source, /Each imported question gets the canonical A-D option scaffold\./);
});
