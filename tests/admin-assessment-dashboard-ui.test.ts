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
  assert.match(source, /Review draft/);
  assert.doesNotMatch(source, /Assessment list/);
  assert.doesNotMatch(source, /Current published/);
  assert.doesNotMatch(source, /AssessmentVersionsList/);
  assert.doesNotMatch(source, /View assessment/);
});
