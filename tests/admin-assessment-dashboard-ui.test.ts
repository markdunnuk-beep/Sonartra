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

test('assessment index presents ranked-pattern package operations as the active path', () => {
  const source = readSource();

  assert.match(source, /Assessment packages/);
  assert.match(source, /Start ranked-pattern package workflow/);
  assert.match(source, /Open package workflow/);
  assert.match(source, /href="\/admin\/assessments\/ranked-pattern\/workflow"/);
  assert.match(source, /Active ranked-pattern packages/);
  assert.match(source, /Draft\/import work/);
  assert.match(source, /Legacy builders/);
  assert.match(source, /Archived builder paths/);
  assert.match(source, /isTestOrLegacyAssessment/);
  assert.match(source, /isRankedPatternPackageCompatibleAssessment/);
  assert.match(source, /haystack\.includes\('test'\)/);
  assert.match(source, /Legacy \/ archive/);
  assert.match(source, /Old test records and builder-created assessments stay secondary\./);
  assert.match(source, /Open legacy builder/);
  assert.match(source, /Create ranked-pattern draft/);
  assert.match(source, /const rankedPatternWorkflowHref = `\/admin\/assessments\/ranked-pattern\/\$\{assessment\.assessmentKey\}\/workflow`;/);
  assert.match(source, /const createVersionHref = isCompatibleRankedPattern/);
  assert.match(source, /Open import panel/);
  assert.match(source, /Review and publish/);
  assert.match(source, /Review draft/);
  assert.match(source, /Current live version/);
  assert.match(source, /No draft in progress/);
  assert.doesNotMatch(source, /Starts a new assessment with draft version/);
  assert.doesNotMatch(source, /Creates a new assessment with its first editable draft/);
  assert.doesNotMatch(source, /Assessment list/);
  assert.doesNotMatch(source, /Current published/);
  assert.doesNotMatch(source, /AssessmentVersionsList/);
  assert.doesNotMatch(source, /View assessment/);
});
