import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  parseReportFirstMarkdown,
  renderReportFirstHtml,
} from '@/scripts/authoring/render-report-first-preview';

const canonicalReports = [
  'content/authoring/leadership-approach/report-first/canonical-reports/process_results_people_vision.md',
  'content/authoring/leadership-approach/report-first/canonical-reports/results_process_people_vision.md',
  'content/authoring/leadership-approach/report-first/canonical-reports/people_process_results_vision.md',
  'content/authoring/leadership-approach/report-first/canonical-reports/vision_people_process_results.md',
] as const;

const sampleReport = `Leadership Approach — Test

You lead by making the future usable

Opening paragraph one.

Opening paragraph two.

Editorial introduction

Reader-facing intro text.

Pattern at a glance

| Rank | Role in your pattern | What it means in practice |
|---|---|---|
| 1 | Vision — the first future direction | Direction text. |

Evidence behind your result

Assessment: Leadership Approach

| Signal | Normalised score |
|---|---:|
| Vision | 42% |

Key insight

The future has to become usable.

Chapter 1 — How your leadership creates value

Value chapter.

Chapter 2 — How others experience your leadership

Others chapter.

Chapter 3 — Decision behaviour

Decision chapter.

Chapter 4 — Communication behaviour

Communication chapter.

Chapter 5 — What happens under pressure

Pressure chapter.

Chapter 6 — The strength of this pattern

Strength chapter.

Chapter 7 — Where the pattern can tighten

Tightening chapter.

Chapter 8 — How Process expands your leadership

Process range chapter.

Chapter 9 — How Results expands your leadership

Results range chapter.

Chapter 10 — Development focus

Development chapter.

Closing synthesis

Closing text.

Final line

Final sentence.

PDF export CTA

Download your Leadership Approach report as a PDF.

# Editorial QA Notes

This internal QA note must not render in the reader-facing report.
`;

function withoutSection(source: string, heading: string): string {
  const lines = source.split('\n');
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) {
    return source;
  }
  const end = lines.findIndex((line, index) => index > start && /^[A-Z#].+/.test(line.trim()) && !line.startsWith('This '));
  return [...lines.slice(0, start), ...lines.slice(end === -1 ? lines.length : end)].join('\n');
}

test('parses a valid canonical report into required sections', () => {
  const model = parseReportFirstMarkdown(sampleReport);

  assert.equal(model.reportTitle, 'Leadership Approach — Test');
  assert.equal(model.heroTitle, 'You lead by making the future usable');
  assert.equal(model.editorialQaNotesDetected, true);
  assert.equal(model.chapters.length, 10);
  assert.equal(model.evidence.heading, 'Evidence behind your result');
  assert.equal(model.keyInsight.heading, 'Key insight');
});

test('renders HTML with hero, evidence panel, reading rail, chapters, key insight, closing, and PDF CTA', () => {
  const model = parseReportFirstMarkdown(sampleReport);
  const html = renderReportFirstHtml(model, 'sample.md');

  assert.match(html, /<h1>You lead by making the future usable<\/h1>/);
  assert.match(html, /Reading rail/);
  assert.match(html, /Evidence behind your result/);
  assert.match(html, /Key insight/);
  assert.match(html, /Chapter 1 — How your leadership creates value/);
  assert.match(html, /Closing synthesis/);
  assert.match(html, /PDF export CTA/);
});

test('excludes Editorial QA Notes from reader-facing output', () => {
  const model = parseReportFirstMarkdown(sampleReport);
  const html = renderReportFirstHtml(model, 'sample.md');

  assert.doesNotMatch(html, /This internal QA note must not render/);
  assert.doesNotMatch(html, /# Editorial QA Notes/);
});

test('allows admin appendix to state that QA notes were stripped without including QA content', () => {
  const model = parseReportFirstMarkdown(sampleReport);
  const html = renderReportFirstHtml(model, 'sample.md');

  assert.match(html, /Editorial QA Notes stripped from reader output: yes/);
  assert.doesNotMatch(html, /This internal QA note must not render/);
});

test('fails when hero title is missing', () => {
  assert.throws(() => parseReportFirstMarkdown(sampleReport.replace('You lead by making the future usable\n\n', '')), {
    message: /Missing required hero title/,
  });
});

test('fails when evidence section is missing', () => {
  assert.throws(() => parseReportFirstMarkdown(withoutSection(sampleReport, 'Evidence behind your result')), {
    message: /Missing required evidence section/,
  });
});

test('fails when key insight is missing', () => {
  assert.throws(() => parseReportFirstMarkdown(withoutSection(sampleReport, 'Key insight')), {
    message: /Missing required key insight section/,
  });
});

test('fails when no chapters are present', () => {
  const noChapters = sampleReport.replace(/Chapter \d+ — [\s\S]+?(?=Closing synthesis)/, '');

  assert.throws(() => parseReportFirstMarkdown(noChapters), {
    message: /No chapters found/,
  });
});

test('fails when PDF CTA is missing', () => {
  assert.throws(() => parseReportFirstMarkdown(withoutSection(sampleReport, 'PDF export CTA')), {
    message: /Missing PDF CTA section/,
  });
});

test('does not expose forbidden authoring or runtime terms in reader-facing output', () => {
  assert.throws(() => parseReportFirstMarkdown(sampleReport.replace('Value chapter.', 'Value chapter with runtime payload.')), {
    message: /forbidden authoring\/runtime term/,
  });
});

test('generates deterministic output in test mode', () => {
  const model = parseReportFirstMarkdown(sampleReport);
  const first = renderReportFirstHtml(model, 'sample.md');
  const second = renderReportFirstHtml(model, 'sample.md');

  assert.equal(first, second);
});

test('can render all four current canonical reports', async () => {
  for (const filePath of canonicalReports) {
    const source = await readFile(filePath, 'utf8');
    const model = parseReportFirstMarkdown(source);
    const html = renderReportFirstHtml(model, filePath);

    assert.ok(model.chapters.length >= 10, filePath);
    assert.match(html, /Static preview status: non-production authoring prototype/);
    assert.doesNotMatch(html, /# Editorial QA Notes/);
  }
});
