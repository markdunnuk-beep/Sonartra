import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentPath = join(
  process.cwd(),
  'components',
  'admin',
  'admin-domain-language-import.tsx',
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

test('domain language panel binds explicit preview and import actions for the active version', () => {
  const source = readSource(componentPath);

  assert.match(source, /previewDomainLanguageAction\.bind\(null, \{ assessmentVersionId \}\)/);
  assert.match(source, /importDomainLanguageAction\.bind\(null, \{ assessmentVersionId \}\)/);
});

test('domain language panel enforces preview-before-import against the current textarea state', () => {
  const source = readSource(componentPath);

  assert.match(source, /resultState\.rawInput === rawInput/);
  assert.match(source, /Preview again before importing/);
  assert.match(source, /disabled=\{!canImport\}/);
});

test('language step renders the shared report-language import panel for domain chapters', () => {
  const source = readSource(languageStepPath);

  assert.match(source, /reportSection="domain"/);
  assert.match(source, /title="Domain Chapter Language"/);
  assert.doesNotMatch(source, /<AdminDomainLanguageImport/);
});
