import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentPath = join(process.cwd(), 'components', 'admin', 'admin-language-dataset-import.tsx');

function readSource(): string {
  return readFileSync(componentPath, 'utf8');
}

test('language dataset import is a dedicated single-dataset module', () => {
  const source = readSource();

  assert.match(source, /dataset: LanguageImportDataset;/);
  assert.match(source, /Hero Header Language/);
  assert.match(source, /Domain Chapter Language/);
  assert.match(source, /chapterOpening rows for report domains/);
  assert.match(source, /supports chapterOpening only/);
  assert.match(source, /domain \| operating-style \| chapterOpening \|/);
  assert.match(source, /Signal Chapter Language/);
  assert.match(source, /supports chapterSummary only/);
  assert.match(source, /signal \| driver \| chapterSummary \|/);
  assert.match(source, /Signal Pair Chapter Language/);
  assert.match(source, /supports chapterSummary, pressureFocus, and environmentFocus only/);
  assert.match(source, /pair \| driver_analyst \| chapterSummary \|/);
  assert.match(source, /const selectedOption = DATASET_OPTIONS\.find\(\(option\) => option\.key === dataset\)/);
  assert.match(source, /resolvedSectionTitle = sectionTitle \?\? selectedOption\.title/);
  assert.match(source, /isImportPending \? 'Importing\.\.\.' : hasImported \? 'Imported' : 'Import'/);
  assert.match(source, /setHasImported\(false\)/);
  assert.match(source, /window\.location\.reload\(\)/);
  assert.doesNotMatch(source, /Dataset type/);
  assert.doesNotMatch(source, /datasetKeys\?: readonly LanguageImportDataset\[];/);
  assert.doesNotMatch(source, /defaultDataset\?: LanguageImportDataset;/);
  assert.doesNotMatch(source, /selectedDataset/);
  assert.doesNotMatch(source, /availableOptions/);
  assert.doesNotMatch(source, /Import report language/);
  assert.doesNotMatch(source, /signal_style/);
  assert.doesNotMatch(source, /style_driver/);
});
