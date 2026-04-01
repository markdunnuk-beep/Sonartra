import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentPath = join(
  process.cwd(),
  'components',
  'admin',
  'admin-signal-language-import.tsx',
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

test('signal language panel binds explicit preview and import actions for the active version', () => {
  const source = readSource(componentPath);

  assert.match(source, /previewSignalLanguageAction\.bind\(null, \{ assessmentVersionId \}\)/);
  assert.match(source, /importSignalLanguageAction\.bind\(null, \{ assessmentVersionId \}\)/);
});

test('signal language panel enforces preview-before-import against the current textarea state', () => {
  const source = readSource(componentPath);

  assert.match(source, /resultState\.rawInput === rawInput/);
  assert.match(source, /Preview again before importing/);
  assert.match(source, /disabled=\{!canImport\}/);
});

test('language step renders the live signal language import panel and keeps the remaining sections as placeholders', () => {
  const source = readSource(languageStepPath);

  assert.match(source, /<AdminSignalLanguageImport/);
  assert.match(source, /<AdminPairLanguageImport/);
  assert.doesNotMatch(source, /Structured bulk import for per-signal narrative sections will live here/);
});
