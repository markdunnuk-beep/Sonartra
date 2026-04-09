import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const languageImportPath = join(process.cwd(), 'components', 'admin', 'admin-language-dataset-import.tsx');
const heroImportPath = join(process.cwd(), 'components', 'admin', 'admin-hero-dataset-import.tsx');
const languageStepPath = join(process.cwd(), 'components', 'admin', 'admin-assessment-language-step.tsx');

function readSource(path: string): string {
  return readFileSync(path, 'utf8');
}

test('language dataset import keeps a single-dataset authoring surface and demotes syntax into disclosure panels', () => {
  const source = readSource(languageImportPath);

  assert.match(source, /dataset: LanguageImportDataset;/);
  assert.match(source, /Hero Header Language/);
  assert.match(source, /Domain Chapter Language/);
  assert.match(source, /Signal Chapter Language/);
  assert.match(source, /Signal Pair Chapter Language/);
  assert.match(source, /const selectedOption = DATASET_OPTIONS\.find\(\(option\) => option\.key === dataset\)/);
  assert.match(source, /Show import format/);
  assert.match(source, /Show example/);
  assert.match(source, /REPORT_ALIGNED_AUTHORING_NOTE/);
  assert.match(source, /Import replaces the selected dataset for this assessment version only\./);
  assert.match(source, /window\.location\.reload\(\)/);
  assert.doesNotMatch(source, /sonartra-page-eyebrow/);
  assert.doesNotMatch(source, /sectionEyebrow\?: string;/);
  assert.doesNotMatch(source, /<p className=\"sonartra-admin-feedback-section-title mt-3\">Example<\/p>/);
});

test('hero dataset import keeps dataset switching local while moving format guidance behind disclosure panels', () => {
  const source = readSource(heroImportPath);

  assert.match(source, /const \[selectedDataset, setSelectedDataset\] = useState<HeroImportDataset>\('pairTraitWeight'\);/);
  assert.match(source, /Dataset type/);
  assert.match(source, /Pair Trait Weights/);
  assert.match(source, /Hero Pattern Rules/);
  assert.match(source, /Hero Pattern Language/);
  assert.match(source, /Show import format/);
  assert.match(source, /Show example/);
  assert.match(source, /Import replaces the selected Hero dataset for this assessment version only\./);
  assert.doesNotMatch(source, /<p className=\"sonartra-page-eyebrow\">Hero Engine<\/p>/);
  assert.doesNotMatch(source, /Import Hero datasets/);
});

test('language step composes four bounded modules in a single coherent stage', () => {
  const source = readSource(languageStepPath);

  assert.match(source, /title=\"Assessment Introduction\"/);
  assert.match(source, /title=\"Hero Engine\"/);
  assert.match(source, /title=\"Domain Chapters\"/);
  assert.match(source, /title=\"Application Layer\"/);
  assert.match(source, /dataset=\"heroHeader\"/);
  assert.match(source, /Choose a domain language dataset/);
  assert.match(source, /Choose an application dataset/);
  assert.match(source, /Status summary/);
  assert.match(source, /This stage controls report-facing language only\./);
  assert.doesNotMatch(source, /title=\"Import Hero engine datasets\"/);
  assert.doesNotMatch(source, /eyebrow=\"Stage 9\"/);
});
