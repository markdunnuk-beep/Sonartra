import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const dashboardPath = join(
  process.cwd(),
  'components',
  'admin',
  'admin-assessments-dashboard.tsx',
);

function readSource(): string {
  return readFileSync(dashboardPath, 'utf8');
}

test('assessment index uses a tighter top hero and simpler card CTA hierarchy', () => {
  const source = readSource();

  assert.match(source, /Manage drafts, published versions, and what needs attention next\./);
  assert.match(source, /Open builder/);
  assert.match(source, /Create draft version/);
  assert.match(source, /const createVersionHref = `\$\{assessment\.actionHref\}\/versions\/new`;/);
  assert.match(source, /Review and publish/);
  assert.match(source, /Review draft/);
  assert.match(source, /Creates a new assessment with its first editable draft\./);
  assert.match(source, /Current live version/);
  assert.match(source, /No draft in progress/);
  assert.doesNotMatch(source, /Starts a new assessment with draft version/);
  assert.doesNotMatch(source, /Assessment list/);
  assert.doesNotMatch(source, /Current published/);
  assert.doesNotMatch(source, /AssessmentVersionsList/);
  assert.doesNotMatch(source, /View assessment/);
});
