import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentPath = join(
  process.cwd(),
  'components',
  'admin',
  'admin-bulk-option-import.tsx',
);
const authoringComponentPath = join(
  process.cwd(),
  'components',
  'admin',
  'admin-question-option-authoring.tsx',
);

function readComponentSource(): string {
  return readFileSync(componentPath, 'utf8');
}

function readAuthoringSource(): string {
  return readFileSync(authoringComponentPath, 'utf8');
}

test('bulk option import panel shows the required format help and action labels', () => {
  const source = readComponentSource();

  assert.match(source, /question_number \| option_label \| option_text/);
  assert.match(source, /Preview import/);
  assert.match(source, /Import options/);
  assert.match(source, /Clear/);
});

test('bulk option import panel uses canonical server actions and refreshes after successful import', () => {
  const source = readComponentSource();

  assert.match(source, /previewBulkOptionsAction\.bind\(null, \{ assessmentVersionId \}\)/);
  assert.match(source, /importBulkOptionsAction\.bind\(null, \{ assessmentVersionId \}\)/);
  assert.match(source, /if \(nextState\.success\) \{\s*router\.refresh\(\);/);
});

test('bulk option import panel keeps textarea input client-side and snapshots event values before updates', () => {
  const source = readComponentSource();

  assert.match(source, /const \[rawInput, setRawInput\] = useState\(''\)/);
  assert.match(source, /const nextRawInput = event\.currentTarget\.value/);
  assert.match(source, /setRawInput\(nextRawInput\)/);
  assert.doesNotMatch(source, /setRawInput\(resultState\.rawInput\)/);
});

test('bulk option import panel enforces preview-before-import and draft-only execution in button state', () => {
  const source = readComponentSource();

  assert.match(source, /const canImport =[\s\S]*isEditableAssessmentVersion[\s\S]*resultState\.canImport/);
  assert.match(source, /disabled=\{!canImport\}/);
  assert.match(source, /Bulk import is only available for draft assessment versions\./);
});

test('bulk option import panel renders staged result sections in pipeline order', () => {
  const source = readComponentSource();

  const summaryIndex = source.indexOf('title="Summary"');
  const parseIndex = source.indexOf('title="Parse errors"');
  const groupIndex = source.indexOf('title="Question set errors"');
  const planIndex = source.indexOf('title="Assessment mapping errors"');
  const warningIndex = source.indexOf('title="Warnings"');
  const previewIndex = source.indexOf('title="Question preview"');
  const resultIndex = source.indexOf('title="Import result summary"');

  assert.ok(summaryIndex >= 0);
  assert.ok(parseIndex > summaryIndex);
  assert.ok(groupIndex > parseIndex);
  assert.ok(planIndex > groupIndex);
  assert.ok(warningIndex > planIndex);
  assert.ok(previewIndex > warningIndex);
  assert.ok(resultIndex > previewIndex);
});

test('responses authoring flow includes the bulk option import panel', () => {
  const source = readAuthoringSource();

  assert.match(source, /import \{ AdminBulkOptionImport \} from '@\/components\/admin\/admin-bulk-option-import';/);
  assert.match(source, /<AdminBulkOptionImport[\s\S]*assessmentVersionId=\{assessmentVersionId\}[\s\S]*isEditableAssessmentVersion/);
});
