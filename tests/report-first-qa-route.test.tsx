import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import sitemap from '@/app/sitemap';
import { ReportFirstResultReport } from '@/components/results/report-first-result-report';
import {
  buildAdminReportFirstPreview,
  buildAdminReportFirstPreviewWithArtifact,
} from '@/lib/server/admin-report-first-preview';

function readSource(...segments: string[]): string {
  return readFileSync(join(process.cwd(), ...segments), 'utf8');
}

function textFromMarkup(markup: string): string {
  return markup
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

test('report-first QA route is admin-gated and noindexed', () => {
  const adminLayoutSource = readSource('app', '(admin)', 'layout.tsx');
  const qaRouteSource = readSource('app', '(admin)', 'admin', 'qa', 'report-first', 'page.tsx');

  assert.match(adminLayoutSource, /requireAdminRequestUserContext/);
  assert.match(qaRouteSource, /export const metadata: Metadata/);
  assert.match(qaRouteSource, /index: false/);
  assert.match(qaRouteSource, /follow: false/);
  assert.match(qaRouteSource, /data-report-first-qa-banner="true"/);
  assert.match(qaRouteSource, /Internal QA preview - not a live user result/);
  assert.match(qaRouteSource, /ReportFirstResultReport/);
  assert.match(qaRouteSource, /buildAdminReportFirstPreview/);
});

test('report-first QA route avoids authoring markdown fallback at request time', () => {
  const qaRouteSource = readSource('app', '(admin)', 'admin', 'qa', 'report-first', 'page.tsx');
  const previewHelperSource = readSource('lib', 'server', 'admin-report-first-preview.ts');

  assert.match(qaRouteSource, /getGeneratedLeadershipReportFirstImportArtifact/);
  assert.doesNotMatch(qaRouteSource, /buildLeadershipReportFirstImportArtifact/);
  assert.doesNotMatch(qaRouteSource, /compileReportFirstTemplate|canonical-reports|source_markdown_path/);

  assert.match(previewHelperSource, /getGeneratedLeadershipReportFirstImportArtifact/);
  assert.doesNotMatch(previewHelperSource, /buildLeadershipReportFirstImportArtifact/);
  assert.doesNotMatch(previewHelperSource, /compileReportFirstTemplate|canonical-reports/);
});

test('report-first QA default preview renders the full report body without internal labels', async () => {
  const preview = await buildAdminReportFirstPreview({
    assessmentKey: 'leadership-approach',
    assessmentTitle: 'Leadership Approach',
    assessmentVersionId: 'version-report-first-qa',
    assessmentVersionTag: 'qa-preview',
    patternKey: 'process_results_people_vision',
    scoreShape: 'paired',
  });

  assert.equal(preview.status, 'ready');
  if (preview.status !== 'ready') {
    throw new Error('Expected ready QA preview.');
  }
  assert.equal(preview.review.sourceStatus, 'Loaded from generated report-first import artifact');

  const markup = renderToStaticMarkup(<ReportFirstResultReport payload={preview.payload} />);
  const renderedText = textFromMarkup(markup);

  assert.match(markup, /data-report-first-result="true"/);
  for (const heading of [
    'Editorial introduction',
    'Pattern at a glance',
    'Evidence behind your result',
    'Chapter 1',
    'Chapter 10',
    'Closing synthesis',
    'Save this report',
  ]) {
    assert.ok(renderedText.includes(heading), `Expected heading ${heading}`);
  }
  for (const paragraph of [
    'Others may experience your leadership as dependable, grounded, and useful.',
    'Under pressure, your leadership may tighten toward control, sequence, and delivery discipline.',
    'People expands this pattern by turning clarity into shared ownership.',
    'At your best, you give people more than a process to follow.',
  ]) {
    assert.ok(renderedText.includes(paragraph), `Expected representative body paragraph ${paragraph}`);
  }
  for (const label of [
    'pattern_key',
    'template id',
    'content hash',
    'lookup key',
    'persisted result payload',
    'draft-only',
    'raw JSON',
    'undefined',
  ]) {
    assert.doesNotMatch(renderedText, new RegExp(label, 'i'));
  }
  assert.doesNotMatch(renderedText, /\bnull\b/i);
});

test('report-first QA route exposes coverage and selectable available templates only', () => {
  const qaRouteSource = readSource('app', '(admin)', 'admin', 'qa', 'report-first', 'page.tsx');
  const importPanelSource = readSource('components', 'admin', 'report-first-template-import-panel.tsx');

  assert.match(qaRouteSource, /artifact\.coverage\.generated_import_ready_count/);
  assert.match(qaRouteSource, /artifact\.coverage\.expected_template_count/);
  assert.match(qaRouteSource, /Publish status/);
  assert.match(qaRouteSource, /Blocked/);
  assert.match(qaRouteSource, /preview\.options\.map/);
  assert.match(importPanelSource, /href="\/admin\/qa\/report-first"/);
  assert.match(importPanelSource, /Open report-first QA route/);
});

test('report-first QA route shows static score-shape policy instead of active selector', () => {
  const qaRouteSource = readSource('app', '(admin)', 'admin', 'qa', 'report-first', 'page.tsx');

  assert.doesNotMatch(qaRouteSource, /rankedPatternSupportedScoreShapes/);
  assert.doesNotMatch(qaRouteSource, /name="scoreShape"/);
  assert.doesNotMatch(qaRouteSource, /query\.scoreShape/);
  assert.match(qaRouteSource, /Score-shape policy/);
  assert.match(qaRouteSource, /Pattern-level, score-shape neutral/);
  assert.match(qaRouteSource, /does not vary by score shape/);
  assert.match(qaRouteSource, /Score shape remains part\s+of runtime scoring evidence/);
});

test('report-first QA missing template state remains admin-readable', async () => {
  const preview = await buildAdminReportFirstPreview({
    assessmentKey: 'leadership-approach',
    assessmentTitle: 'Leadership Approach',
    assessmentVersionId: 'version-report-first-qa',
    assessmentVersionTag: 'qa-preview',
    patternKey: 'missing_report_first_template',
    scoreShape: 'paired',
  });

  assert.equal(preview.status, 'error');
  if (preview.status !== 'error') {
    throw new Error('Expected missing template error.');
  }
  assert.equal(preview.code, 'REPORT_FIRST_PREVIEW_TEMPLATE_NOT_FOUND');
  assert.match(preview.message, /No generated or imported report-first template is available/);
  assert.deepEqual(preview.sourceAttempts, [
    'Imported draft template storage',
    'Generated report-first import artifact',
  ]);
});

test('report-first QA artifact failure returns controlled admin error', async () => {
  const preview = await buildAdminReportFirstPreviewWithArtifact({
    assessmentKey: 'leadership-approach',
    assessmentTitle: 'Leadership Approach',
    assessmentVersionId: 'version-report-first-qa',
    assessmentVersionTag: 'qa-preview',
    patternKey: 'process_results_people_vision',
    scoreShape: 'paired',
  }, () => {
    throw new Error('missing generated artifact');
  });

  assert.equal(preview.status, 'error');
  if (preview.status !== 'error') {
    throw new Error('Expected artifact error.');
  }
  assert.equal(preview.code, 'REPORT_FIRST_PREVIEW_ARTIFACT_UNAVAILABLE');
  assert.match(preview.message, /generated report-first import artifact is unavailable or malformed/i);
  assert.deepEqual(preview.sourceAttempts, [
    'Imported draft template storage',
    'Generated report-first import artifact',
  ]);
});

test('report-first QA route is absent from public sitemap and public route registry', () => {
  const urls = sitemap().map((entry) => entry.url);
  const publicRoutesSource = readSource('lib', 'public', 'public-routes.ts');
  const adminShellSource = readSource('components', 'admin', 'admin-shell.tsx');

  assert.ok(!urls.some((url) => url.includes('/admin/qa/report-first')));
  assert.doesNotMatch(publicRoutesSource, /admin\/qa\/report-first/);
  assert.doesNotMatch(adminShellSource, /admin\/qa\/report-first/);
});
