import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const governanceComponentPath = join(
  process.cwd(),
  'components',
  'admin',
  'admin-assessment-version-governance.tsx',
);

const publishActionsPath = join(
  process.cwd(),
  'components',
  'admin',
  'admin-assessment-publish-actions.tsx',
);

function readSource(path: string): string {
  return readFileSync(path, 'utf8');
}

test('review governance surfaces separate readiness summary, blocking counts, and section issues', () => {
  const source = readSource(governanceComponentPath);

  assert.match(source, /label="Blocking issues"/);
  assert.match(source, /label="Sections to fix"/);
  assert.match(source, /title="Readiness summary"/);
  assert.match(source, /title=\{issue\.severity === 'blocking' \? 'Blocking issue' : 'Warning'\}/);
  assert.match(source, /tone=\{issue\.severity === 'blocking' \? 'warning' : 'neutral'\}/);
});

test('publish actions use shared calm feedback notices for errors, success, and warnings', () => {
  const source = readSource(publishActionsPath);

  assert.match(source, /<AdminFeedbackNotice tone="danger">/);
  assert.match(source, /<AdminFeedbackNotice tone="success">/);
  assert.match(source, /<AdminFeedbackNotice tone="warning" title="Warnings">/);
});
