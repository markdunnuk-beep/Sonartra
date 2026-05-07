import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readSource(...segments: string[]): string {
  return readFileSync(join(process.cwd(), ...segments), 'utf8');
}

test('ranked-pattern import panel renders the four separate admin workflow controls', () => {
  const source = readSource('components', 'admin', 'ranked-pattern-import-panel.tsx');

  assert.match(source, /Workbook file path or package reference/);
  assert.match(source, /Audit package/);
  assert.match(source, /Dry-run import/);
  assert.match(source, /Apply import/);
  assert.match(source, /Run publish audit/);
  assert.match(source, /auditRankedPatternPackageAction\.bind/);
  assert.match(source, /dryRunRankedPatternImportAction\.bind/);
  assert.match(source, /applyRankedPatternImportAction\.bind/);
  assert.match(source, /auditRankedPatternPublishReadinessAction\.bind/);
});

test('ranked-pattern import panel explains safety and draft-version workflow', () => {
  const source = readSource('components', 'admin', 'ranked-pattern-import-panel.tsx');

  assert.match(source, /Audit and dry-run do not write to the database/);
  assert.match(source, /Apply import writes package data but does\s+not publish/);
  assert.match(source, /Publish audit is read-only/);
  assert.match(source, /publishing remains a separate explicit action/);
  assert.match(source, /Existing completed results remain tied to their original assessment version/);
  assert.match(source, /Create or open the next draft version/);
  assert.match(source, /Completed results continue to render from their persisted payload/);
});

test('ranked-pattern import panel displays counts and diagnostics without workbook contents', () => {
  const source = readSource('components', 'admin', 'ranked-pattern-import-panel.tsx');

  assert.match(source, /Runtime definition planned counts/);
  assert.match(source, /Result-language planned counts/);
  assert.match(source, /Runtime definition applied counts/);
  assert.match(source, /Result-language applied counts/);
  assert.match(source, /Blocking diagnostics/);
  assert.match(source, /Warnings/);
  assert.match(source, /sheetKey/);
  assert.match(source, /rowNumber/);
  assert.doesNotMatch(source, /rawValues/);
  assert.doesNotMatch(source, /sourceValues/);
});

test('ranked-pattern import panel is wired into the existing single-domain review route only', () => {
  const reviewSource = readSource('components', 'admin', 'single-domain-structural-authoring.tsx');
  const genericReviewSource = readSource(
    'app',
    '(admin)',
    'admin',
    'assessments',
    '[assessmentKey]',
    'review',
    'page.tsx',
  );

  assert.match(reviewSource, /<RankedPatternImportPanel/);
  assert.match(reviewSource, /assessmentId=\{assessment\.assessmentId\}/);
  assert.match(reviewSource, /latestDraftVersion=\{assessment\.latestDraftVersion\}/);
  assert.doesNotMatch(genericReviewSource, /RankedPatternImportPanel/);
});

test('ranked-pattern import UI stays assessment agnostic', () => {
  const source = readSource('components', 'admin', 'ranked-pattern-import-panel.tsx');

  assert.doesNotMatch(source, /flow state/i);
  assert.doesNotMatch(source, /flow_state/i);
  assert.doesNotMatch(source, /operating-style/i);
  assert.doesNotMatch(source, /results_vision/i);
});
