import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentPath = join(process.cwd(), 'components', 'admin', 'admin-language-dataset-import.tsx');

function readSource(): string {
  return readFileSync(componentPath, 'utf8');
}

test('language dataset import uses a selector-driven single-action flow', () => {
  const source = readSource();

  assert.match(source, /datasetKeys\?: readonly LanguageImportDataset\[];/);
  assert.match(source, /sectionTitle = 'Import report language'/);
  assert.match(source, /Dataset type/);
  assert.match(source, /Hero Header Language/);
  assert.match(source, /Domain Chapter Language/);
  assert.match(source, /chapterOpening rows for report domains/);
  assert.match(source, /supports chapterOpening only/);
  assert.match(source, /Signal Chapter Language/);
  assert.match(source, /supports chapterSummary only/);
  assert.match(source, /Signal Pair Chapter Language/);
  assert.match(source, /supports chapterSummary, pressureFocus, and environmentFocus only/);
  assert.match(source, /availableOptions\.length > 1/);
  assert.match(source, /isImportPending \? 'Importing\.\.\.' : hasImported \? 'Imported' : 'Import'/);
  assert.match(source, /setHasImported\(false\)/);
  assert.match(source, /window\.location\.reload\(\)/);
  assert.doesNotMatch(source, /Preview import/);
  assert.doesNotMatch(source, /Import Hero Header language/);
  assert.doesNotMatch(source, /Import domain chapter language/);
  assert.doesNotMatch(source, /Import signal language/);
  assert.doesNotMatch(source, /Import pair chapter language/);
});
