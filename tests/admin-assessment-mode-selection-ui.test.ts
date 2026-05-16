import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readSource(...segments: string[]): string {
  return readFileSync(join(process.cwd(), ...segments), 'utf8');
}

test('assessment type selection page presents ranked-pattern workflow as the only active authoring path', () => {
  const source = readSource('app', '(admin)', 'admin', 'assessments', 'new', 'page.tsx');

  assert.match(source, /Ranked-Pattern Package Workflow/);
  assert.match(source, /Legacy builder access removed/);
  assert.match(source, /active assessment authoring/i);
  assert.match(source, /href="\/admin\/assessments\/ranked-pattern\/workflow"/);
  assert.match(source, /Start from workbook metadata/);
  assert.doesNotMatch(source, /href="\/admin\/assessments\/create"/);
  assert.doesNotMatch(source, /Continue to multi-domain builder/);
  assert.doesNotMatch(source, /Continue to single-domain builder/);
  assert.doesNotMatch(source, /Open legacy multi-domain builder/);
});

test('single-domain entry page is retired and points operators to ranked-pattern package workflow', () => {
  const source = readSource('app', '(admin)', 'admin', 'assessments', 'single-domain', 'page.tsx');

  assert.match(source, /Legacy single-domain builder retired/);
  assert.match(source, /Open ranked-pattern workflow/);
  assert.match(source, /href="\/admin\/assessments\/ranked-pattern\/workflow"/);
  assert.match(source, /Back to assessment packages/);
  assert.doesNotMatch(source, /Open legacy builder review/);
  assert.doesNotMatch(source, /href="\/admin\/assessments\/single-domain\/new"/);
  assert.doesNotMatch(source, /Open assessment dashboard/);
});

test('assessment dashboard create actions route through the ranked-pattern workflow entry and show mode labels', () => {
  const source = readSource('components', 'admin', 'admin-assessments-dashboard.tsx');

  assert.match(source, /href="\/admin\/assessments\/ranked-pattern\/workflow"/);
  assert.match(source, /assessment\.modeLabel/);
  assert.match(source, /rankedPatternWorkflowHref/);
  assert.match(source, /\/admin\/assessments\/ranked-pattern\/\$\{assessment\.assessmentKey\}\/workflow/);
  assert.match(source, /Import new assessment/);
  assert.match(source, /Open import workflow/);
  assert.match(source, /Published assessments/);
  assert.match(source, /Open workflow/);
  assert.match(source, /Create draft/);
  assert.match(source, /isRankedPatternPackageCompatibleAssessment/);
  assert.doesNotMatch(source, /Creates a new assessment with its first editable draft/);
});

test('single-domain create route redirects to ranked-pattern workflow', () => {
  const source = readSource('app', '(admin)', 'admin', 'assessments', 'single-domain', 'new', 'page.tsx');

  assert.match(source, /redirect\('\/admin\/assessments\/ranked-pattern\/workflow'\)/);
  assert.doesNotMatch(source, /mode="single_domain"/);
  assert.doesNotMatch(source, /Create single-domain assessment/);
});
