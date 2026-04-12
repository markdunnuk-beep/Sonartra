import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readSource(...segments: string[]): string {
  return readFileSync(join(process.cwd(), ...segments), 'utf8');
}

test('assessment type selection page renders both explicit builder paths', () => {
  const source = readSource('app', '(admin)', 'admin', 'assessments', 'new', 'page.tsx');

  assert.match(source, /Multi-Domain Assessment/);
  assert.match(source, /Single-Domain Assessment/);
  assert.match(source, /href="\/admin\/assessments\/create"/);
  assert.match(source, /href="\/admin\/assessments\/single-domain"/);
});

test('single-domain entry page references one domain and full authoring support', () => {
  const source = readSource('app', '(admin)', 'admin', 'assessments', 'single-domain', 'page.tsx');

  assert.match(source, /one domain only/i);
  assert.match(source, /questions, responses, weightings, language datasets, review, and publish/i);
  assert.match(source, /Create Single-Domain Assessment/);
  assert.match(source, /href="\/admin\/assessments\/single-domain\/new"/);
});

test('assessment dashboard create actions route through the new selection page and show mode labels', () => {
  const source = readSource('components', 'admin', 'admin-assessments-dashboard.tsx');

  assert.match(source, /href="\/admin\/assessments\/new"/);
  assert.match(source, /assessment\.modeLabel/);
});

test('single-domain create route uses the explicit single_domain mode scaffold', () => {
  const source = readSource('app', '(admin)', 'admin', 'assessments', 'single-domain', 'new', 'page.tsx');

  assert.match(source, /mode="single_domain"/);
  assert.match(source, /questions, responses, weightings, and language datasets/i);
  assert.match(source, /showIntroCard=\{false\}/);
});
