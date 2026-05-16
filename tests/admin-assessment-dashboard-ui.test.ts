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
  assert.match(source, /Import new assessment/);
  assert.match(source, /Open import workflow/);
  assert.match(source, /href="\/admin\/assessments\/ranked-pattern\/workflow"/);
  assert.match(source, /Published assessments/);
  assert.match(source, /Drafts and imports/);
  assert.match(source, /Archived or test records/);
  assert.match(source, /Archived assessment records/);
  assert.match(source, /isTestOrLegacyAssessment/);
  assert.match(source, /isRankedPatternPackageCompatibleAssessment/);
  assert.match(source, /hasDefaultInventoryState/);
  assert.match(source, /assessment\.hasActiveImportWorkflow/);
  assert.match(source, /haystack\.includes\('test'\)/);
  assert.match(source, /Legacy \/ archive/);
  assert.match(source, /Legacy builder unavailable/);
  assert.match(source, /isCompatibleRankedPattern \? 'Ranked-pattern' : assessment\.modeLabel/);
  assert.doesNotMatch(source, /Test and older builder-created records stay secondary\./);
  assert.doesNotMatch(source, /Open legacy builder/);
  assert.match(source, /Create draft/);
  assert.match(source, /const rankedPatternWorkflowHref = `\/admin\/assessments\/ranked-pattern\/\$\{assessment\.assessmentKey\}\/workflow`;/);
  assert.match(source, /const createVersionHref = isCompatibleRankedPattern/);
  assert.match(source, /Open workflow/);
  assert.match(source, /Review and publish/);
  assert.match(source, /Review draft/);
  assert.match(source, /Current live version/);
  assert.match(source, /No draft in progress/);
  assert.match(source, /tone === 'active' && assessment\.publishedVersion/);
  assert.doesNotMatch(source, /Starts a new assessment with draft version/);
  assert.doesNotMatch(source, /Creates a new assessment with its first editable draft/);
  assert.doesNotMatch(source, /Assessment list/);
  assert.doesNotMatch(source, /Current published/);
  assert.doesNotMatch(source, /AssessmentVersionsList/);
  assert.doesNotMatch(source, /View assessment/);
});
