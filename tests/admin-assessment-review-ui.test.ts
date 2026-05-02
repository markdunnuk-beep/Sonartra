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

const remediationHelperPath = join(
  process.cwd(),
  'lib',
  'admin',
  'admin-review-remediation.ts',
);

function readSource(path: string): string {
  return readFileSync(path, 'utf8');
}

test('review governance surfaces separate readiness summary, blocking counts, and section issues', () => {
  const source = readSource(governanceComponentPath);
  const helperSource = readSource(remediationHelperPath);

  assert.match(source, /label="Blocking issues"/);
  assert.match(source, /label="Sections to fix"/);
  assert.match(source, /label="Application thesis"/);
  assert.match(source, /label="Action prompts"/);
  assert.match(source, /title="Readiness summary"/);
  assert.match(source, /title=\{issue\.severity === 'blocking' \? 'Blocking issue' : 'Warning'\}/);
  assert.match(source, /tone=\{issue\.severity === 'blocking' \? 'warning' : 'neutral'\}/);
  assert.match(source, /section\.key === 'applicationPlan'/);
  assert.match(source, /label="Contribution"/);
  assert.match(source, /label="Development"/);
  assert.match(source, /getReviewRemediationAction\(section\.key, issue\)/);
  assert.match(source, /href=\{`\/admin\/assessments\/\$\{assessmentKey\}\/\$\{remediation\.slug\}`\}/);
  assert.match(helperSource, /Fix in Review/);
});

test('single-domain review copy separates live state from authoring readiness', () => {
  const source = readSource(join(
    process.cwd(),
    'components',
    'admin',
    'single-domain-structural-authoring.tsx',
  ));

  assert.match(source, /Review authoring readiness/);
  assert.match(source, /Separate the current live version from the authoring checks/);
  assert.match(source, /Current live version remains available/);
  assert.match(source, /No draft is currently in progress/);
  assert.match(source, /They do not remove the currently published version/);
  assert.doesNotMatch(source, /Assessment is live/);
});

test('publish actions use shared calm feedback notices for errors, success, and warnings', () => {
  const source = readSource(publishActionsPath);

  assert.match(source, /<AdminFeedbackNotice tone="danger">/);
  assert.match(source, /<AdminFeedbackNotice tone="success">/);
  assert.match(source, /<AdminFeedbackNotice tone="warning" title="Warnings">/);
});
