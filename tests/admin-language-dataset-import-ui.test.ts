import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentPath = join(process.cwd(), 'components', 'admin', 'admin-language-dataset-import.tsx');
const languageStepPath = join(process.cwd(), 'components', 'admin', 'admin-assessment-language-step.tsx');

function readSource(): string {
  return readFileSync(componentPath, 'utf8');
}

function readLanguageStepSource(): string {
  return readFileSync(languageStepPath, 'utf8');
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

test('language step renders hero datasets first and drives chapter imports from a local tab state', () => {
  const source = readLanguageStepSource();

  assert.match(source, /'use client';/);
  assert.match(source, /const \[activeDomainTab, setActiveDomainTab\] = useState<DomainChapterTab>\('domain'\);/);
  assert.match(source, /title="Import Hero engine datasets"/);
  assert.match(source, /title="Domain Chapters"/);
  assert.match(source, /label: 'Domain Chapter'/);
  assert.match(source, /label: 'Signal Chapter'/);
  assert.match(source, /label: 'Signal Pair'/);
  assert.match(source, /aria-pressed=\{isSelected\}/);
  assert.match(source, /onClick=\{\(\) => setActiveDomainTab\(tab\.key\)\}/);
  assert.match(source, /dataset=\{\s*activeDomainTab === 'domain'/);
  assert.match(source, /\? 'domain'/);
  assert.match(source, /\? 'signal'/);
  assert.match(source, /: 'pair'/);

  const heroIndex = source.indexOf('title="Import Hero engine datasets"');
  const domainIndex = source.indexOf('title="Domain Chapters"');

  assert.ok(heroIndex >= 0);
  assert.ok(domainIndex > heroIndex);
  assert.doesNotMatch(source, /dataset="domain"/);
  assert.doesNotMatch(source, /dataset="signal"/);
  assert.doesNotMatch(source, /dataset="pair"/);
});
