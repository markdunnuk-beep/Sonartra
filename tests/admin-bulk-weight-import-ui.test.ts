import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentPath = join(
  process.cwd(),
  'components',
  'admin',
  'admin-bulk-weight-import.tsx',
);
const authoringComponentPath = join(
  process.cwd(),
  'components',
  'admin',
  'admin-weighting-authoring.tsx',
);
const pagePath = join(
  process.cwd(),
  'app',
  '(admin)',
  'admin',
  'assessments',
  '[assessmentKey]',
  'weights',
  'page.tsx',
);

function readComponentSource(): string {
  return readFileSync(componentPath, 'utf8');
}

function readAuthoringSource(): string {
  return readFileSync(authoringComponentPath, 'utf8');
}

function readPageSource(): string {
  return readFileSync(pagePath, 'utf8');
}

test('bulk weight import panel shows the required format help and action labels', () => {
  const source = readComponentSource();

  assert.match(source, /question_number \| option_label \| signal_key \| weight/);
  assert.match(source, /Preview import/);
  assert.match(source, /Import weights/);
  assert.match(source, /Clear/);
});

test('bulk weight import panel uses canonical server actions and refreshes after successful import', () => {
  const source = readComponentSource();

  assert.match(source, /previewBulkWeightsAction\.bind\(null, \{ assessmentVersionId \}\)/);
  assert.match(source, /importBulkWeightsAction\.bind\(null, \{ assessmentVersionId \}\)/);
  assert.match(source, /if \(nextState\.success\) \{\s*router\.refresh\(\);/);
});

test('bulk weight import panel keeps textarea input client-side and snapshots event values before updates', () => {
  const source = readComponentSource();

  assert.match(source, /const \[rawInput, setRawInput\] = useState\(''\)/);
  assert.match(source, /const nextRawInput = event\.currentTarget\.value/);
  assert.match(source, /setRawInput\(nextRawInput\)/);
  assert.doesNotMatch(source, /setRawInput\(resultState\.rawInput\)/);
});

test('bulk weight import panel enforces preview-before-import and draft-only execution in button state', () => {
  const source = readComponentSource();

  assert.match(source, /const canImport =[\s\S]*isEditableAssessmentVersion[\s\S]*resultState\.canImport/);
  assert.match(source, /disabled=\{!canImport\}/);
  assert.match(source, /Bulk weight import is only available for draft assessment versions\./);
});

test('bulk weight import panel renders staged result sections in pipeline order', () => {
  const source = readComponentSource();

  const summaryIndex = source.indexOf('title="Summary"');
  const parseIndex = source.indexOf('title="Parse errors"');
  const groupIndex = source.indexOf('title="Weight group errors"');
  const planIndex = source.indexOf('title="Assessment mapping errors"');
  const warningIndex = source.indexOf('title="Warnings"');
  const previewIndex = source.indexOf('title="Weight group preview"');
  const resultIndex = source.indexOf('title="Import result summary"');

  assert.ok(summaryIndex >= 0);
  assert.ok(parseIndex > summaryIndex);
  assert.ok(groupIndex > parseIndex);
  assert.ok(planIndex > groupIndex);
  assert.ok(warningIndex > planIndex);
  assert.ok(previewIndex > warningIndex);
  assert.ok(resultIndex > previewIndex);
});

test('weighting authoring flow includes the bulk weight import panel', () => {
  const source = readAuthoringSource();

  assert.match(source, /import \{ AdminBulkWeightImport \} from '@\/components\/admin\/admin-bulk-weight-import';/);
  assert.match(source, /<AdminBulkWeightImport[\s\S]*assessmentVersionId=\{assessmentVersionId\}[\s\S]*isEditableAssessmentVersion/);
});

test('weights page passes draft editability into the weighting authoring component', () => {
  const source = readPageSource();

  assert.match(source, /isEditableAssessmentVersion=\{\s*assessment\.latestDraftVersion\.lifecycleStatus === 'DRAFT'/);
});
