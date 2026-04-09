import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readSource(...segments: string[]): string {
  return readFileSync(join(process.cwd(), ...segments), 'utf8');
}

test('authoring layout switches into published-no-draft banner mode', () => {
  const source = readSource(
    'app',
    '(admin)',
    'admin',
    'assessments',
    '[assessmentKey]',
    'layout.tsx',
  );

  assert.match(source, /assessment\.builderMode === 'published_no_draft'/);
  assert.match(source, /Browse the published assessment and create a draft when you are ready to change it\./);
  assert.match(source, /<AdminPublishedNoDraftBanner/);
  assert.match(source, /space-y-4 sm:space-y-5 lg:space-y-6/);
  assert.match(source, /overflow-hidden p-4 sm:p-5 lg:p-6/);
});

test('guarded authoring stages route published assessments into the reusable read-only state', () => {
  const domainsSource = readSource(
    'app',
    '(admin)',
    'admin',
    'assessments',
    '[assessmentKey]',
    'domains',
    'page.tsx',
  );
  const introSource = readSource('components', 'admin', 'admin-assessment-intro-editor.tsx');

  assert.match(domainsSource, /assessment\.builderMode === 'published_no_draft'/);
  assert.match(domainsSource, /<AdminPublishedNoDraftStageState/);
  assert.match(introSource, /Assessment intro is currently read-only/);
  assert.match(introSource, /Create a draft version before authoring assessment intro content for the next release\./);
});

test('authoring layout tightens header chrome for small screens without removing builder context', () => {
  const source = readSource(
    'app',
    '(admin)',
    'admin',
    'assessments',
    '[assessmentKey]',
    'layout.tsx',
  );

  assert.doesNotMatch(source, /Admin Workspace/);
  assert.match(source, /text-\[1\.72rem\].*sm:text-\[2rem\].*lg:text-\[2\.2rem\]/);
});
