import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  compileReportFirstTemplateFromMarkdown,
  REPORT_FIRST_CONTRACT,
  type ReportFirstTemplateBlock,
} from '@/scripts/authoring/compile-report-first-template';

const processReportPath =
  'content/authoring/leadership-approach/report-first/canonical-reports/process_results_people_vision.md';

const canonicalReportPaths = [
  processReportPath,
  'content/authoring/leadership-approach/report-first/canonical-reports/results_process_people_vision.md',
  'content/authoring/leadership-approach/report-first/canonical-reports/people_process_results_vision.md',
  'content/authoring/leadership-approach/report-first/canonical-reports/vision_people_process_results.md',
] as const;

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

function compile(source: string, inputPath = processReportPath) {
  return compileReportFirstTemplateFromMarkdown(source, { inputPath });
}

async function processReportSource(): Promise<string> {
  return readFile(processReportPath, 'utf8');
}

function removeSection(source: string, heading: string): string {
  const normalized = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const nextHeading =
    '(?:Editorial introduction|Pattern at a glance|Evidence behind your result|Key insight|Chapter \\d+ \\u2014 .+|Closing synthesis|Final line|PDF export CTA|# Editorial QA Notes)';
  return normalized.replace(new RegExp(`\\n${escapedHeading}\\n[\\s\\S]*?(?=\\n${nextHeading}\\n|$)`, 'u'), '');
}

function allBlocks(compiled: ReturnType<typeof compile>): readonly ReportFirstTemplateBlock[] {
  return [
    ...compiled.report_template_json.report.opening,
    ...compiled.report_template_json.report.patternSummary.blocks,
    compiled.report_template_json.report.keyInsight,
    ...compiled.report_template_json.evidenceTemplate.blocks,
    ...compiled.report_template_json.report.chapters.flatMap((chapter) => chapter.blocks),
    ...compiled.report_template_json.report.closing.synthesis,
  ];
}

test('compiles process-led canonical report into a report-first template', async () => {
  const compiled = compile(await processReportSource());

  assert.equal(compiled.report_contract, REPORT_FIRST_CONTRACT);
  assert.equal(compiled.report_template_json.metadata.contractName, REPORT_FIRST_CONTRACT);
  assert.equal(compiled.report_key, 'process_results_people_vision');
  assert.equal(compiled.pattern_key, 'process_results_people_vision');
  assert.equal(compiled.domain_key, 'leadership-approach');
  assert.match(compiled.content_hash, /^[a-f0-9]{64}$/);
  assert.equal(compiled.report_template_json.report.hero.title, 'You lead by turning complexity into structured progress');
});

test('compiled template preserves ordered report sections and chapters', async () => {
  const compiled = compile(await processReportSource());
  const chapters = compiled.report_template_json.report.chapters;

  assert.deepEqual(
    chapters.map((chapter) => chapter.chapterKey),
    requiredChapterKeys,
  );
  assert.deepEqual(
    chapters.map((chapter) => chapter.chapterNumber),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
  assert.deepEqual(
    compiled.report_template_json.report.readerNavigation.map((item) => item.label),
    ['Overview', 'Pattern', 'Evidence', 'Insight', 'Value', 'Others', 'Decisions', 'Communication', 'Pressure', 'Strengths', 'Tightening', 'Range', 'Range', 'Development', 'Closing'],
  );
});

test('compiled template preserves paragraph, table, evidence, card, and prompt structure', async () => {
  const compiled = compile(await processReportSource());
  const blocks = allBlocks(compiled);

  assert.ok(blocks.some((block) => block.type === 'paragraph'));
  assert.ok(blocks.some((block) => block.type === 'table'));
  assert.ok(blocks.some((block) => block.type === 'signal_stack'));
  assert.ok(blocks.some((block) => block.type === 'strength_card'));
  assert.ok(blocks.some((block) => block.type === 'tightening_card'));
  assert.ok(blocks.some((block) => block.type === 'development_action'));
  assert.ok(blocks.some((block) => block.type === 'prompt_group'));

  const scoreTable = compiled.report_template_json.evidenceTemplate.blocks.find(
    (block): block is Extract<ReportFirstTemplateBlock, { type: 'table' }> => block.type === 'table',
  );
  assert.ok(scoreTable);
  assert.deepEqual(scoreTable.columns.map((column) => column.label), ['Signal', 'Normalised score']);
  assert.deepEqual(scoreTable.rows[0]?.map((cell) => cell.text), ['Process', '42%']);
});

test('compiled template content hash is deterministic', async () => {
  const source = await processReportSource();
  const first = compile(source);
  const second = compile(source);

  assert.equal(first.content_hash, second.content_hash);
  assert.deepEqual(first.report_template_json, second.report_template_json);
});

test('compiler fails clearly when a required section is missing', async () => {
  const source = removeSection(await processReportSource(), 'Evidence behind your result');

  assert.throws(() => compile(source), {
    message: /Missing required report-first section: Evidence behind your result/,
  });
});

test('compiler fails clearly when filename pattern_key is invalid', async () => {
  const source = await processReportSource();

  assert.throws(() => compile(source, 'content/authoring/leadership-approach/report-first/canonical-reports/bad-key.md'), {
    message: /Invalid report-first pattern_key/,
  });
});

test('compiler handles the current canonical report batch without one-report overfit', async () => {
  for (const filePath of canonicalReportPaths) {
    const compiled = compile(await readFile(filePath, 'utf8'), filePath);

    assert.equal(compiled.report_contract, REPORT_FIRST_CONTRACT, filePath);
    assert.equal(compiled.report_template_json.report.chapters.length, 10, filePath);
    assert.deepEqual(
      compiled.report_template_json.report.chapters.map((chapter) => chapter.chapterKey),
      requiredChapterKeys,
      filePath,
    );
  }
});

test('compiler stays authoring-only and does not touch runtime, importer, or database write paths', async () => {
  const compilerSource = await readFile('scripts/authoring/compile-report-first-template.ts', 'utf8');

  assert.doesNotMatch(compilerSource, /from ['"]pg['"]/);
  assert.doesNotMatch(compilerSource, /db\.query|Pool|createPool/);
  assert.doesNotMatch(compilerSource, /assessment_report_first_templates/);
  assert.doesNotMatch(compilerSource, /assessment-completion|single-domain-completion|results-service|workspace-service/);
  assert.doesNotMatch(compilerSource, /app\/|components\//);
});
