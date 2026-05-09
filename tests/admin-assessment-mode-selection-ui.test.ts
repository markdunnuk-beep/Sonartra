import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readSource(...segments: string[]): string {
  return readFileSync(join(process.cwd(), ...segments), 'utf8');
}

test('assessment type selection page presents ranked-pattern workflow as active and legacy builders as archived', () => {
  const source = readSource('app', '(admin)', 'admin', 'assessments', 'new', 'page.tsx');

  assert.match(source, /Ranked-Pattern Package Workflow/);
  assert.match(source, /Legacy Builders/);
  assert.match(source, /new active builds/i);
  assert.match(source, /href="\/admin\/assessments\/single-domain"/);
  assert.match(source, /href="\/admin\/assessments\/create"/);
  assert.doesNotMatch(source, /Continue to multi-domain builder/);
  assert.doesNotMatch(source, /Continue to single-domain builder/);
});

test('single-domain entry page points operators to ranked-pattern package workflow', () => {
  const source = readSource('app', '(admin)', 'admin', 'assessments', 'single-domain', 'page.tsx');

  assert.match(source, /Ranked-pattern package workflow/);
  assert.match(source, /Recommended active workflow/);
  assert.match(source, /Start from an existing single-domain assessment/);
  assert.match(source, /const workflowHref = `\/admin\/assessments\/ranked-pattern\/\$\{assessment\.assessmentKey\}\/workflow`;/);
  assert.match(source, /Open import workflow/);
  assert.match(source, /href=\{workflowHref\}/);
  assert.match(source, /Create draft version/);
  assert.match(source, /Open legacy builder review/);
  assert.match(source, /href=\{`\$\{assessment\.actionHref\}\/review`\}/);
  assert.match(source, /Open legacy single-domain shell/);
  assert.match(source, /href="\/admin\/assessments\/single-domain\/new"/);
  assert.doesNotMatch(source, /Open assessment dashboard/);
});

test('assessment dashboard create actions route through the ranked-pattern workflow entry and show mode labels', () => {
  const source = readSource('components', 'admin', 'admin-assessments-dashboard.tsx');

  assert.match(source, /href="\/admin\/assessments\/new"/);
  assert.match(source, /assessment\.modeLabel/);
  assert.match(source, /rankedPatternWorkflowHref/);
  assert.match(source, /\/admin\/assessments\/ranked-pattern\/\$\{assessment\.assessmentKey\}\/workflow/);
  assert.match(source, /Create ranked-pattern assessment/);
  assert.match(source, /Open package workflow/);
  assert.match(source, /Active ranked-pattern packages/);
  assert.match(source, /Open import panel/);
  assert.match(source, /Create ranked-pattern draft/);
  assert.doesNotMatch(source, /Creates a new assessment with its first editable draft/);
});

test('single-domain create route is labelled as a legacy scaffold', () => {
  const source = readSource('app', '(admin)', 'admin', 'assessments', 'single-domain', 'new', 'page.tsx');

  assert.match(source, /mode="single_domain"/);
  assert.match(source, /Legacy single-domain shell/);
  assert.match(source, /Do not use this path to bypass ranked-pattern package import, publish audit, or explicit publish/i);
  assert.match(source, /showIntroCard=\{false\}/);
});
