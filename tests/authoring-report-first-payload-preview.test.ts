import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  parseReportFirstPayload,
  renderReportFirstHtml,
} from '@/scripts/authoring/render-report-first-preview';

const fixturePath =
  'content/authoring/leadership-approach/report-first/payload-fixtures/process_results_people_vision.payload.json';

const requiredChapterKeys = [
  'value_creation',
  'others_experience',
  'decision_behaviour',
  'communication_behaviour',
  'pressure_behaviour',
  'strengths',
  'tightening',
  'rank_3_expansion',
  'rank_4_expansion',
  'development_focus',
] as const;

async function fixtureSource(): Promise<string> {
  return readFile(fixturePath, 'utf8');
}

function readerBody(html: string): string {
  return html.split('<aside class="appendix"')[0] ?? html;
}

test('can parse payload fixture', async () => {
  const model = parseReportFirstPayload(await fixtureSource(), fixturePath);

  assert.equal(model.reportTitle, 'Leadership Approach — Process, Results, People, Vision');
  assert.equal(model.heroTitle, 'You lead by turning complexity into structured progress');
  assert.equal(model.chapters.length, 10);
});

test('payload fixture has required top-level keys', async () => {
  const payload = JSON.parse(await fixtureSource()) as Record<string, unknown>;

  for (const key of ['metadata', 'assessment', 'attempt', 'scoring', 'report', 'evidence', 'diagnostics']) {
    assert.ok(key in payload, key);
  }
});

test('payload fixture has all ten required Leadership Approach chapters', async () => {
  const payload = JSON.parse(await fixtureSource()) as {
    report: { chapters: Array<{ chapterKey: string }> };
  };
  const chapterKeys = new Set(payload.report.chapters.map((chapter) => chapter.chapterKey));

  for (const key of requiredChapterKeys) {
    assert.ok(chapterKeys.has(key), key);
  }
});

test('payload rendering includes required report surfaces', async () => {
  const model = parseReportFirstPayload(await fixtureSource(), fixturePath);
  const html = renderReportFirstHtml(model, fixturePath);

  assert.match(html, /<h1>You lead by turning complexity into structured progress<\/h1>/);
  assert.match(html, /Reading rail/);
  assert.match(html, /Evidence behind your result/);
  assert.match(html, /Key insight/);
  assert.match(html, /Chapter 1 — How your leadership creates value/);
  assert.match(html, /Closing synthesis/);
  assert.match(html, /Final line/);
  assert.match(html, /PDF export CTA/);
});

test('payload rendering uses structured evidence rows', async () => {
  const model = parseReportFirstPayload(await fixtureSource(), fixturePath);
  const html = renderReportFirstHtml(model, fixturePath);

  assert.match(html, /<table>/);
  assert.match(html, /<td>Process<\/td>/);
  assert.match(html, /<td>42%<\/td>/);
  assert.doesNotMatch(readerBody(html), /Signal\s+Normalised score\s+Process\s+42%/);
});

test('payload rendering excludes Editorial QA Notes and forbidden reader terms', async () => {
  const model = parseReportFirstPayload(await fixtureSource(), fixturePath);
  const html = renderReportFirstHtml(model, fixturePath);
  const reader = readerBody(html);

  for (const term of ['Editorial QA Notes', 'report_status', 'quality_score_target', 'canonical_result_payload']) {
    assert.doesNotMatch(reader, new RegExp(term, 'i'), term);
  }
});

test('payload rendering includes separated admin/debug appendix', async () => {
  const model = parseReportFirstPayload(await fixtureSource(), fixturePath);
  const html = renderReportFirstHtml(model, fixturePath);
  const appendix = html.slice(html.indexOf('<aside class="appendix"'));

  assert.match(appendix, /Source type: payload/);
  assert.match(appendix, /Contract: report_first_canonical_payload_v1/);
  assert.match(appendix, /Report key: process_results_people_vision/);
  assert.match(appendix, /Admin notes excluded from reader output: yes/);
});

test('payload rendering supports strength_card blocks', async () => {
  const model = parseReportFirstPayload(await fixtureSource(), fixturePath);
  const html = renderReportFirstHtml(model, fixturePath);

  assert.match(html, /class="content-card strength-card"/);
  assert.match(html, /Repeatable progress/);
});

test('payload rendering supports tightening_card blocks', async () => {
  const model = parseReportFirstPayload(await fixtureSource(), fixturePath);
  const html = renderReportFirstHtml(model, fixturePath);

  assert.match(html, /class="content-card tightening-card"/);
  assert.match(html, /Range to add:/);
});

test('payload rendering supports development_action blocks', async () => {
  const model = parseReportFirstPayload(await fixtureSource(), fixturePath);
  const html = renderReportFirstHtml(model, fixturePath);

  assert.match(html, /class="content-card development-action"/);
  assert.match(html, /Invite ownership before closure/);
});

test('payload rendering supports prompt_group blocks', async () => {
  const model = parseReportFirstPayload(await fixtureSource(), fixturePath);
  const html = renderReportFirstHtml(model, fixturePath);

  assert.match(html, /class="prompt-group"/);
  assert.match(html, /Decision questions/);
});

test('payload rendering is deterministic', async () => {
  const model = parseReportFirstPayload(await fixtureSource(), fixturePath);

  assert.equal(renderReportFirstHtml(model, fixturePath), renderReportFirstHtml(model, fixturePath));
});
