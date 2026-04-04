import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pagePath = join(
  process.cwd(),
  'app',
  '(admin)',
  'admin',
  'assessments',
  '[assessmentKey]',
  'assessment-intro',
  'page.tsx',
);

const componentPath = join(
  process.cwd(),
  'components',
  'admin',
  'admin-assessment-intro-editor.tsx',
);

function readSource(path: string): string {
  return readFileSync(path, 'utf8');
}

test('assessment intro route delegates to the server-side view model and renders the shared editor', () => {
  const source = readSource(pagePath);

  assert.match(source, /getAdminAssessmentIntroStepViewModel\(getDbPool\(\), assessmentKey\)/);
  assert.match(source, /return <AdminAssessmentIntroEditor viewModel=\{viewModel\} \/>;/);
  assert.match(source, /notFound\(\)/);
});

test('assessment intro editor includes draft-scoped fields, save form, and preview surface', () => {
  const source = readSource(componentPath);

  assert.match(source, /label="Intro title"/);
  assert.match(source, /label="Intro summary"/);
  assert.match(source, /label="How it works"/);
  assert.match(source, /label="Estimated duration"/);
  assert.match(source, /label="Instructions"/);
  assert.match(source, /label="Confidentiality note"/);
  assert.match(source, /Save intro/);
  assert.match(source, /Set the opening content shown before Question 1 for this assessment version\./);
  assert.match(source, /When that version is published, this intro becomes/);
  assert.match(source, /Assessment intro/);
  assert.match(source, /Publish the version to make this/);
  assert.match(source, /Draft version/);
  assert.doesNotMatch(source, /Preview only\./);
});
