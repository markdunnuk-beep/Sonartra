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

test('language step renders the live overview templates import panel and removes the overview placeholder card', () => {
  const source = readSource(languageStepPath);

  assert.match(source, /<AdminOverviewLanguageImport/);
  assert.doesNotMatch(source, /Structured bulk import for overview template patterns will be added after signal language\./);
});
