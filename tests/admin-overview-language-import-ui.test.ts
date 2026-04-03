import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentPath = join(
  process.cwd(),
  'components',
  'admin',
  'admin-overview-language-import.tsx',
);
const languageStepPath = join(
  process.cwd(),
  'components',
  'admin',
  'admin-assessment-language-step.tsx',
);
const reportComponentPath = join(
  process.cwd(),
  'components',
  'admin',
  'admin-report-language-import.tsx',
);

function readSource(path: string): string {
  return readFileSync(path, 'utf8');
}

test('overview templates panel binds explicit preview and import actions for the active version', () => {
  const source = readSource(componentPath);

  assert.match(source, /previewOverviewLanguageAction\.bind\(null, \{ assessmentVersionId \}\)/);
  assert.match(source, /importOverviewLanguageAction\.bind\(null, \{ assessmentVersionId \}\)/);
});

test('overview templates panel enforces preview-before-import against the current textarea state', () => {
  const source = readSource(componentPath);

  assert.match(source, /resultState\.rawInput === rawInput/);
  assert.match(source, /Preview again before importing/);
  assert.match(source, /disabled=\{!canImport\}/);
});

test('report-oriented import panel binds the shared report-language actions for hero sections', () => {
  const source = readSource(reportComponentPath);

  assert.match(source, /previewReportLanguageAction\.bind\(null, \{ assessmentVersionId, reportSection \}\)/);
  assert.match(source, /importReportLanguageAction\.bind\(null, \{ assessmentVersionId, reportSection \}\)/);
});

test('language step renders the shared report-language import panel for hero authoring', () => {
  const source = readSource(languageStepPath);

  assert.match(source, /reportSection="hero"/);
  assert.match(source, /title="Hero Language"/);
  assert.doesNotMatch(source, /<AdminOverviewLanguageImport/);
});
