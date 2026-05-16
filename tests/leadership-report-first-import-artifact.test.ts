import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildLeadershipReportFirstImportArtifact,
  leadershipReportFirstExpectedPatternKeys,
  leadershipReportFirstImportArtifactRelativePath,
} from '@/lib/server/leadership-report-first-package';
import { buildAdminReportFirstPreview } from '@/lib/server/admin-report-first-preview';

const availablePatternKeys = [
  'people_process_results_vision',
  'process_results_people_vision',
  'results_people_process_vision',
  'results_people_vision_process',
  'results_process_people_vision',
  'results_process_vision_people',
  'results_vision_people_process',
  'results_vision_process_people',
  'vision_people_process_results',
] as const;

const forbiddenLabels = [
  'persisted result payload',
  'template id',
  'lookup key',
  'pattern_key',
  'draft-only',
  'raw JSON',
] as const;

function artifactText(value: unknown): string {
  return JSON.stringify(value);
}

test('leadership report-first import artifact generates rows only for available templates', async () => {
  const artifact = await buildLeadershipReportFirstImportArtifact();

  assert.equal(artifact.artifact_contract, 'leadership_report_first_template_import_rows_v1');
  assert.equal(artifact.coverage.expected_template_count, 24);
  assert.equal(artifact.coverage.generated_import_ready_count, 9);
  assert.equal(artifact.coverage.missing_template_count, 15);
  assert.equal(artifact.coverage.publishable_full_coverage, false);
  assert.deepEqual(artifact.expected_pattern_keys, leadershipReportFirstExpectedPatternKeys());
  assert.deepEqual(artifact.import_rows.map((row) => row.pattern_key), availablePatternKeys);
  assert.equal(artifact.missing_templates.length, 15);
  assert.ok(artifact.missing_templates.every((template) => template.ready_for_import === false));
  assert.ok(artifact.missing_templates.every((template) => template.publishable === false));
});

test('leadership report-first import rows include storage-ready report template fields', async () => {
  const artifact = await buildLeadershipReportFirstImportArtifact();

  for (const row of artifact.import_rows) {
    assert.equal(row.assessment_key, 'leadership-approach');
    assert.equal(row.assessment_version, 'p9-report-first-coverage');
    assert.equal(row.domain_key, 'leadership-approach');
    assert.equal(row.status, 'active');
    assert.equal(row.manifest_status, 'ready_for_import');
    assert.equal(row.publishable, true);
    assert.equal(row.ready_for_import, true);
    assert.equal(row.report_key, row.pattern_key);
    assert.equal(row.report_contract, 'report_first_canonical_payload_v1');
    assert.equal(row.score_shape_policy, 'pattern_level_score_shape_neutral');
    assert.equal(row.score_shape, null);
    assert.deepEqual(row.supported_score_shapes, ['concentrated', 'paired', 'graduated', 'balanced']);
    assert.match(row.source_markdown_path, /^content\/authoring\/leadership-approach\/report-first\/canonical-reports\/.+\.md$/);
    assert.equal(existsSync(row.source_markdown_path), true);
    assert.match(row.content_hash, /^[a-f0-9]{64}$/);
    assert.equal(row.source_content_hash, row.content_hash);
    assert.equal(row.report_template_json.patternKey, row.pattern_key);
    assert.equal(row.report_template_json.report.chapters.length, 10);
    assert.equal(row.generation_metadata.deterministic, true);
  }
});

test('leadership report-first import rows preserve full compiled report bodies', async () => {
  const artifact = await buildLeadershipReportFirstImportArtifact();
  const processRow = artifact.import_rows.find((row) => row.pattern_key === 'process_results_people_vision');

  assert.ok(processRow);
  const report = processRow.report_template_json.report;
  assert.ok(report.opening.length > 0, 'Expected Editorial introduction blocks.');
  assert.ok(report.patternSummary.blocks.length > 0, 'Expected Pattern at a glance blocks.');
  assert.ok(processRow.report_template_json.evidenceTemplate.blocks.length > 0, 'Expected Evidence behind your result blocks.');
  assert.ok(report.keyInsight, 'Expected Key insight block.');
  assert.deepEqual(
    report.chapters.map((chapter) => chapter.chapterNumber),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
  assert.ok(report.closing.synthesis.length > 0, 'Expected Closing synthesis blocks.');
  assert.ok(report.closing.finalLine.trim().length > 0, 'Expected Final line text.');
  assert.ok(report.pdf.title.trim().length > 0, 'Expected Save this report / PDF reference title.');
  assert.ok(report.pdf.body.trim().length > 0, 'Expected Save this report / PDF reference body.');

  const text = artifactText(processRow.report_template_json);
  assert.match(text, /Others may experience your leadership as dependable, grounded, and useful\./);
  assert.match(text, /The development work is not to abandon structure or delivery\./);
  assert.match(text, /At your best, you give people more than a process to follow\./);
  for (const label of forbiddenLabels) {
    assert.doesNotMatch(text.toLowerCase(), new RegExp(label.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('leadership report-first import artifact generation is deterministic', async () => {
  const first = JSON.stringify(await buildLeadershipReportFirstImportArtifact(), null, 2);
  const second = JSON.stringify(await buildLeadershipReportFirstImportArtifact(), null, 2);

  assert.equal(first, second);
});

test('committed leadership report-first import artifact matches generated output', async () => {
  const generated = `${JSON.stringify(await buildLeadershipReportFirstImportArtifact(), null, 2)}\n`;
  const committed = readFileSync(leadershipReportFirstImportArtifactRelativePath, 'utf8');

  assert.equal(committed, generated);
});

test('admin preview remains compatible with generated import artifact rows', async () => {
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
    throw new Error('Expected ready report-first admin preview.');
  }

  assert.equal(preview.options.length, 9);
  assert.equal(preview.payload.patternKey, 'process_results_people_vision');
  assert.equal(preview.review.sourceStatus, 'Loaded from generated report-first import artifact');
  assert.equal(preview.review.requiredHeadingsPresent, true);
});

test('admin preview missing template state remains clear', async () => {
  const preview = await buildAdminReportFirstPreview({
    assessmentKey: 'leadership-approach',
    assessmentTitle: 'Leadership Approach',
    assessmentVersionId: 'version-admin-preview',
    assessmentVersionTag: 'admin-preview',
    patternKey: 'process_results_vision_people',
    scoreShape: 'paired',
  });

  assert.equal(preview.status, 'error');
  if (preview.status !== 'error') {
    throw new Error('Expected missing template error.');
  }
  assert.equal(preview.code, 'REPORT_FIRST_PREVIEW_TEMPLATE_NOT_FOUND');
  assert.match(preview.message, /No generated or imported report-first template is available/);
});
