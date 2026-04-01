import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentPath = join(
  process.cwd(),
  'components',
  'admin',
  'admin-pair-language-import.tsx',
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

test('pair language panel binds explicit preview and import actions for the active version', () => {
  const source = readSource(componentPath);

  assert.match(source, /previewPairLanguageAction\.bind\(null, \{ assessmentVersionId \}\)/);
  assert.match(source, /importPairLanguageAction\.bind\(null, \{ assessmentVersionId \}\)/);
});

test('pair language panel enforces preview-before-import against the current textarea state', () => {
  const source = readSource(componentPath);

  assert.match(source, /resultState\.rawInput === rawInput/);
  assert.match(source, /Preview again before importing/);
  assert.match(source, /disabled=\{!canImport\}/);
});

test('language step renders the live pair language import panel and removes the pair placeholder card', () => {
  const source = readSource(languageStepPath);

  assert.match(source, /<AdminPairLanguageImport/);
  assert.doesNotMatch(source, /Structured bulk import for signal-pair summaries and watchouts will follow this panel pattern/);
});
