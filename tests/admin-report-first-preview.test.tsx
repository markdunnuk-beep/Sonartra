import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { ReportFirstResultReport } from '@/components/results/report-first-result-report';
import {
  adminReportFirstRequiredPreviewHeadings,
  buildAdminReportFirstPreview,
} from '@/lib/server/admin-report-first-preview';

const representativeParagraphs = [
  'Others may experience your leadership as dependable, grounded, and useful.',
  'You are likely to make decisions by organising available information into a practical route.',
  'You tend to communicate through clarity, structure, and expectation.',
  'Under pressure, your leadership may tighten toward control, sequence, and delivery discipline.',
  'People expands this pattern by turning clarity into shared ownership.',
  'Vision expands this pattern by connecting reliable action to a larger direction.',
  'The development work is not to abandon structure or delivery.',
  'At your best, you give people more than a process to follow.',
] as const;

function textFromMarkup(markup: string): string {
  return markup
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

test('admin report-first preview assembles a renderer-compatible full report payload', async () => {
  const preview = await buildAdminReportFirstPreview({
    assessmentKey: 'leadership-approach',
    assessmentTitle: 'Leadership Approach',
    assessmentVersionId: 'version-admin-preview',
    assessmentVersionTag: 'admin-preview',
    patternKey: 'process_results_people_vision',
    scoreShape: 'paired',
  });

  assert.equal(preview.status, 'ready');
  if (preview.status !== 'ready') {
    throw new Error('Expected ready preview.');
  }

  assert.equal(preview.payload.metadata.contractName, 'report_first_canonical_payload_v1');
  assert.equal(preview.payload.metadata.reportModel, 'report_first_canonical');
  assert.equal(preview.payload.patternKey, 'process_results_people_vision');
  assert.equal(preview.payload.scoreShape.value, 'paired');
  assert.equal(preview.review.requiredHeadingsPresent, true);
  assert.equal(preview.review.evidenceRenderable, true);
  assert.equal(preview.review.readerInternalLabelsAbsent, true);

  const markup = renderToStaticMarkup(<ReportFirstResultReport payload={preview.payload} />);
  const renderedText = textFromMarkup(markup);

  assert.match(markup, /data-report-first-result="true"/);
  assert.match(markup, /data-report-first-signal-stack="true"/);
  for (const heading of adminReportFirstRequiredPreviewHeadings) {
    assert.ok(renderedText.includes(heading), `Expected heading: ${heading}`);
  }
  for (const paragraph of representativeParagraphs) {
    assert.ok(renderedText.includes(paragraph), `Expected paragraph: ${paragraph}`);
  }
});

test('admin report-first preview keeps internal diagnostics out of the paid-user report area', async () => {
  const preview = await buildAdminReportFirstPreview({
    assessmentKey: 'leadership-approach',
    assessmentTitle: 'Leadership Approach',
    assessmentVersionId: 'version-admin-preview',
    assessmentVersionTag: 'admin-preview',
    patternKey: 'process_results_people_vision',
    scoreShape: 'balanced',
  });

  assert.equal(preview.status, 'ready');
  if (preview.status !== 'ready') {
    throw new Error('Expected ready preview.');
  }

  const renderedText = textFromMarkup(renderToStaticMarkup(<ReportFirstResultReport payload={preview.payload} />));

  assert.doesNotMatch(renderedText, /admin-preview-process_results_people_vision/);
  assert.doesNotMatch(renderedText, /content hash/i);
  assert.doesNotMatch(renderedText, /lookup key/i);
  assert.doesNotMatch(renderedText, /pattern_key/i);
  assert.doesNotMatch(renderedText, /persisted result payload/i);
  assert.doesNotMatch(renderedText, /draft-only/i);
  assert.doesNotMatch(renderedText, /raw JSON/i);
  assert.doesNotMatch(renderedText, /undefined/);
  assert.doesNotMatch(renderedText, /\bnull\b/i);
});

test('admin report-first preview fails clearly when selected template data is unavailable', async () => {
  const preview = await buildAdminReportFirstPreview({
    assessmentKey: 'leadership-approach',
    assessmentTitle: 'Leadership Approach',
    assessmentVersionId: 'version-admin-preview',
    assessmentVersionTag: 'admin-preview',
    patternKey: 'missing_results_people_vision',
    scoreShape: 'paired',
  });

  assert.equal(preview.status, 'error');
  if (preview.status !== 'error') {
    throw new Error('Expected error preview.');
  }

  assert.equal(preview.code, 'REPORT_FIRST_PREVIEW_TEMPLATE_NOT_FOUND');
  assert.match(preview.message, /No canonical report-first template is available/);
  assert.ok(preview.options.length >= 1);
});

test('admin report-first preview is wired to the ranked-pattern workflow without changing user result routes', () => {
  const workflowSource = readFileSync(
    join(
      process.cwd(),
      'app',
      '(admin)',
      'admin',
      'assessments',
      'ranked-pattern',
      '[assessmentKey]',
      'workflow',
      'page.tsx',
    ),
    'utf8',
  );
  const previewRouteSource = readFileSync(
    join(
      process.cwd(),
      'app',
      '(admin)',
      'admin',
      'assessments',
      'ranked-pattern',
      '[assessmentKey]',
      'workflow',
      'report-first-preview',
      'page.tsx',
    ),
    'utf8',
  );
  const userRouteSource = readFileSync(
    join(process.cwd(), 'app', '(user)', 'app', 'results', 'single-domain', '[resultId]', 'page.tsx'),
    'utf8',
  );

  assert.match(workflowSource, /Preview report-first output/);
  assert.match(previewRouteSource, /buildAdminReportFirstPreview/);
  assert.match(previewRouteSource, /ReportFirstResultReport/);
  assert.match(previewRouteSource, /Does not create user results/);
  assert.doesNotMatch(userRouteSource, /buildAdminReportFirstPreview|admin-report-first-preview/);
  assert.doesNotMatch(userRouteSource, /compileReportFirstTemplate|canonical-reports/);
});
