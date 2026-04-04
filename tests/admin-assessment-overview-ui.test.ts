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
  'overview',
  'page.tsx',
);

function readPageSource(): string {
  return readFileSync(pagePath, 'utf8');
}

test('overview page stays lightweight and leaves governance copy out of the route', () => {
  const source = readPageSource();

  assert.match(source, /description="Assessment identity and current version status\."/);
  assert.match(source, /label="Version label"/);
  assert.match(source, /label="Status"/);
  assert.match(source, /label="Assessment key"/);
  assert.match(source, /label="Current published"/);
  assert.doesNotMatch(source, /label="Publish check"/);
  assert.doesNotMatch(source, /Check before publishing/);
  assert.doesNotMatch(source, /Review the full checks in Review/);
});
