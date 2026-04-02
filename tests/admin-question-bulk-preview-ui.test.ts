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

test('question bulk import forms add explicit preview buttons and gate import on preview state', () => {
  const source = readSource();

  assert.match(source, /function BulkImportActions/);
  assert.match(source, /Previewing\.\.\./);
  assert.match(source, /Import questions/);
  assert.match(source, /disabled=\{pending \|\| !canImport\}/);
});

test('question bulk preview is cleared when textarea or domain selection changes', () => {
  const source = readSource();

  assert.match(source, /setPreviewResult\(null\)/);
  assert.match(source, /Preview again before importing/);
});

test('question bulk forms render lightweight preview summaries and accepted\/issue sections', () => {
  const source = readSource();

  assert.match(source, /function BulkQuestionPreviewPanel/);
  assert.match(source, /Questions parsed/);
  assert.match(source, /Accepted preview/);
  assert.match(source, /SectionBlock title="Issues"/);
});
