import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const previewFiles = [
  'content/authoring/leadership-approach/report-first/previews/process_results_people_vision.preview.html',
  'content/authoring/leadership-approach/report-first/previews/results_process_people_vision.preview.html',
  'content/authoring/leadership-approach/report-first/previews/people_process_results_vision.preview.html',
  'content/authoring/leadership-approach/report-first/previews/vision_people_process_results.preview.html',
] as const;

const forbiddenReaderTerms = [
  '# Editorial QA Notes',
  'Initial quality estimate',
  'Main risk to watch',
  'Suitability for 24-report model',
  'pattern_key',
  'canonical_result_payload',
  'report_status',
  'quality_score_target',
  'field-map',
  'PSV',
] as const;

function readerBody(html: string): string {
  return html.split('<aside class="appendix"')[0] ?? html;
}

function ids(html: string): Set<string> {
  return new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]).filter(Boolean));
}

function railLinks(html: string): string[] {
  return [...html.matchAll(/<a href="#([^"]+)">/g)].map((match) => match[1]).filter(Boolean) as string[];
}

test('all four static preview HTML files include required report surfaces', async () => {
  for (const filePath of previewFiles) {
    const html = await readFile(filePath, 'utf8');

    assert.match(html, /<h1>.+<\/h1>/, filePath);
    assert.match(html, /Reading rail/, filePath);
    assert.match(html, /Evidence behind your result/, filePath);
    assert.match(html, /Key insight/, filePath);
    assert.match(html, /Chapter 1 — How your leadership creates value/, filePath);
    assert.match(html, /Closing synthesis/, filePath);
    assert.match(html, /PDF export CTA/, filePath);
    assert.match(html, /Static preview status: non-production authoring prototype/, filePath);
  }
});

test('reader-facing preview body excludes QA notes and forbidden authoring terms', async () => {
  for (const filePath of previewFiles) {
    const html = await readFile(filePath, 'utf8');
    const reader = readerBody(html);

    for (const term of forbiddenReaderTerms) {
      assert.doesNotMatch(reader, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `${filePath}: ${term}`);
    }
  }
});

test('reading rail links point to existing anchors', async () => {
  for (const filePath of previewFiles) {
    const html = await readFile(filePath, 'utf8');
    const knownIds = ids(html);

    for (const link of railLinks(html)) {
      assert.ok(knownIds.has(link), `${filePath}: missing anchor ${link}`);
    }
  }
});

test('static appendix is separated from reader-facing report body', async () => {
  for (const filePath of previewFiles) {
    const html = await readFile(filePath, 'utf8');
    const appendixIndex = html.indexOf('<aside class="appendix"');

    assert.ok(appendixIndex > 0, `${filePath}: missing appendix`);
    assert.doesNotMatch(readerBody(html), /Authoring-only static preview appendix/, filePath);
    assert.match(html.slice(appendixIndex), /Editorial QA Notes stripped from reader output:/, filePath);
  }
});
