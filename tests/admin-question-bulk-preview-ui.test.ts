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
  assert.doesNotMatch(source, /function CreateQuestionForm\(/);
});

test('question bulk imported state resets via keyed remount and clears after edits', () => {
  const source = readSource();

  assert.match(source, /setHasImported\(false\)/);
  assert.match(
    source,
    /<BulkQuestionByDomainFormFields[\s\S]*key=\{\s*currentState\.createdQuestions\.length > 0[\s\S]*question\.questionId\)\.join\('\|'\)[\s\S]*: 'draft'/,
  );
  assert.match(
    source,
    /useState\(\s*currentState\.createdQuestions\.length > 0 \? '' : currentState\.values\.questionLines,\s*\)/,
  );
  assert.match(source, /useState\(currentState\.createdQuestions\.length > 0\)/);
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
  assert.doesNotMatch(source, /Add a question/);
});
