import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  getLeadershipReportFirstPackageCoverage,
  leadershipReportFirstExpectedPatternKeys,
  leadershipReportFirstRepresentativeParagraphs,
  leadershipReportFirstRequiredHeadings,
} from '@/lib/server/leadership-report-first-package';
import { buildAdminReportFirstPreview } from '@/lib/server/admin-report-first-preview';

const expectedPatternKeys = [
  'results_process_vision_people',
  'results_process_people_vision',
  'results_vision_process_people',
  'results_vision_people_process',
  'results_people_process_vision',
  'results_people_vision_process',
  'process_results_vision_people',
  'process_results_people_vision',
  'process_vision_results_people',
  'process_vision_people_results',
  'process_people_results_vision',
  'process_people_vision_results',
  'vision_results_process_people',
  'vision_results_people_process',
  'vision_process_results_people',
  'vision_process_people_results',
  'vision_people_results_process',
  'vision_people_process_results',
  'people_results_process_vision',
  'people_results_vision_process',
  'people_process_results_vision',
  'people_process_vision_results',
  'people_vision_results_process',
  'people_vision_process_results',
] as const;

test('leadership report-first package declares all twenty-four ranked pattern keys', () => {
  assert.deepEqual(leadershipReportFirstExpectedPatternKeys(), expectedPatternKeys);
});

test('leadership report-first package coverage reports available and missing templates explicitly', async () => {
  const coverage = await getLeadershipReportFirstPackageCoverage();

  assert.equal(coverage.manifest.assessment_key, 'leadership-approach');
  assert.equal(coverage.manifest.domain_key, 'leadership-approach');
  assert.equal(coverage.expectedCount, 24);
  assert.equal(coverage.presentCount, 4);
  assert.equal(coverage.missingCount, 20);
  assert.equal(coverage.publishable, false);
  assert.deepEqual(
    coverage.presentPatternKeys.sort(),
    [
      'people_process_results_vision',
      'process_results_people_vision',
      'results_process_people_vision',
      'vision_people_process_results',
    ],
  );
  assert.ok(coverage.missingPatternKeys.includes('results_process_vision_people'));
  assert.ok(coverage.missingPatternKeys.includes('people_vision_process_results'));
});

test('available leadership report-first markdown templates compile into full structured JSON', async () => {
  const coverage = await getLeadershipReportFirstPackageCoverage();
  const processTemplate = coverage.availableTemplates.find(
    (template) => template.compiled.pattern_key === 'process_results_people_vision',
  );

  assert.ok(processTemplate);
  assert.equal(processTemplate.readyForImport, true);
  assert.equal(processTemplate.compiled.report_contract, 'report_first_canonical_payload_v1');
  assert.equal(processTemplate.compiled.report_template_json.report.chapters.length, 10);
  assert.deepEqual(processTemplate.missingHeadings, []);
  assert.deepEqual(processTemplate.forbiddenLabels, []);

  const reportText = JSON.stringify(processTemplate.compiled.report_template_json);
  assert.equal(leadershipReportFirstRequiredHeadings.length, 17);
  for (const paragraph of leadershipReportFirstRepresentativeParagraphs) {
    assert.ok(reportText.includes(paragraph), `Expected compiled report to include ${paragraph}`);
  }
});

test('missing leadership report-first templates do not satisfy publishable coverage', async () => {
  const coverage = await getLeadershipReportFirstPackageCoverage();
  const manifestMissing = coverage.manifest.templates.filter((template) => template.status === 'missing');

  assert.equal(manifestMissing.length, 20);
  assert.ok(manifestMissing.every((template) => template.ready_for_import === false));
  assert.ok(manifestMissing.every((template) => template.publishable === false));
  assert.equal(coverage.availableTemplates.length, 4);
  assert.notEqual(coverage.availableTemplates.length, coverage.expectedCount);
});

test('admin preview remains compatible with the package-backed available template manifest', async () => {
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

  assert.equal(preview.payload.patternKey, 'process_results_people_vision');
  assert.equal(preview.payload.reportFirst.reportKey, 'process_results_people_vision');
  assert.equal(preview.options.length, 4);
  assert.ok(preview.options.some((option) => option.patternKey === 'vision_people_process_results'));
  assert.equal(preview.review.requiredHeadingsPresent, true);
  assert.equal(preview.review.readerInternalLabelsAbsent, true);
});

test('report-first package work does not alter user result retrieval or scoring paths', () => {
  const previewSource = readFileSync(join(process.cwd(), 'lib', 'server', 'admin-report-first-preview.ts'), 'utf8');
  const userRouteSource = readFileSync(
    join(process.cwd(), 'app', '(user)', 'app', 'results', 'single-domain', '[resultId]', 'page.tsx'),
    'utf8',
  );
  const completionSource = readFileSync(join(process.cwd(), 'lib', 'server', 'single-domain-completion.ts'), 'utf8');

  assert.match(previewSource, /buildLeadershipReportFirstImportArtifact/);
  assert.doesNotMatch(userRouteSource, /leadership-report-first-package|canonical-reports|compileReportFirstTemplate/);
  assert.doesNotMatch(completionSource, /leadership-report-first-package|canonical-reports/);
});
