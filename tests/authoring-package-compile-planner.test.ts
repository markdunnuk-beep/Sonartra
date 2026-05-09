import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  REQUIRED_PACKAGE_SHEETS,
  planAuthoringPackageCompile,
  runAuthoringPackageCompilerCli,
  type AuthoringPackageCompilerArgs,
} from '../scripts/authoring/compile-assessment-package';

const leadershipArgs: AuthoringPackageCompilerArgs = {
  assessmentKey: 'leadership-approach',
  domainKey: 'leadership_approach',
  authoringDir: 'content/authoring/leadership-approach',
  generatedDir: 'content/authoring/generated',
  templateWorkbook:
    'content/assessment-packages/leadership-approach/sonartra_reader_first_import_schema_LEADERSHIP_APPROACH_TEST.xlsx',
  outputWorkbook:
    'tmp/compiled-packages/leadership-approach/sonartra_reader_first_import_schema_LEADERSHIP_APPROACH_COMPILED.xlsx',
  dryRun: true,
  write: false,
};

test('dry-run discovers Leadership Approach authoring config metadata', () => {
  const plan = planAuthoringPackageCompile(leadershipArgs);

  assert.equal(plan.mode, 'dry-run');
  assert.equal(plan.configPath, 'content/authoring/leadership-approach/00-assessment-authoring-config.json');
  assert.equal(plan.configMetadata.assessmentKey, 'leadership-approach');
  assert.equal(plan.configMetadata.domainKey, 'leadership-approach');
  assert.equal(plan.configMetadata.signals.map((signal) => signal.key).join(','), 'results,process,vision,people');
  assert.equal(plan.wroteWorkbook, false);
});

test('dry-run discovers generated Leadership Approach PSV sources for every result-language section', () => {
  const plan = planAuthoringPackageCompile(leadershipArgs);
  const discoveredSections = new Set(plan.generatedSources.map((source) => source.sectionKey));

  for (const section of REQUIRED_PACKAGE_SHEETS.slice(6, 15)) {
    const generatedSection = section as (typeof plan.generatedSources)[number]['sectionKey'];
    assert.equal(discoveredSections.has(generatedSection), true, `${section} should have a generated source`);
  }

  const recognitionSources = plan.generatedSources.filter((source) => source.sectionKey === '07_Recognition');
  const recognitionSheetPlan = plan.plannedSheets.find((source) => source.sheet === '07_Recognition');
  assert.equal(recognitionSources.some((source) => source.sourceKind === 'combined'), true);
  assert.equal(recognitionSources.some((source) => source.sourceKind === 'split'), true);
  assert.equal(recognitionSources.every((source) => source.rowCount > 0), true);
  assert.equal(recognitionSources.every((source) => source.headers.length > 0), true);
  assert.equal(recognitionSheetPlan?.rowCount, 96);
  assert.deepEqual(recognitionSheetPlan?.filePaths, [
    'content/authoring/generated/07-recognition-leadership-approach.psv',
  ]);
});

test('dry-run reports all required sheets from the template workbook', () => {
  const plan = planAuthoringPackageCompile(leadershipArgs);

  for (const sheet of REQUIRED_PACKAGE_SHEETS) {
    assert.equal(plan.templateSheets.includes(sheet), true, `${sheet} should exist in template workbook`);
    assert.equal(plan.plannedSheets.some((source) => source.sheet === sheet), true, `${sheet} should be planned`);
  }

  assert.deepEqual(plan.missingTemplateSheets, []);
});

test('missing generated section is reported clearly', () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), 'authoring-package-planner-'));
  try {
    const generatedDir = path.join(tempRoot, 'generated');
    mkdirSync(generatedDir);
    writeFileSync(
      path.join(generatedDir, '06-orientation-leadership-approach.psv'),
      'lookup_key|body\norientation_1|Example\n',
    );

    const plan = planAuthoringPackageCompile({
      ...leadershipArgs,
      generatedDir,
    });

    assert.equal(plan.generatedSources.length, 1);
    assert.match(
      plan.diagnostics.map((diagnostic) => diagnostic.message).join('\n'),
      /No generated PSV source was found for 07_Recognition/,
    );
    assert.equal(
      plan.diagnostics.filter((diagnostic) => diagnostic.code === 'GENERATED_SECTION_MISSING').length,
      8,
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('--write returns not implemented and does not write workbook', () => {
  const errors: string[] = [];
  const originalError = console.error;
  console.error = (message?: unknown) => {
    errors.push(String(message));
  };
  try {
    const exitCode = runAuthoringPackageCompilerCli([
      '--assessment-key',
      leadershipArgs.assessmentKey,
      '--domain-key',
      leadershipArgs.domainKey,
      '--authoring-dir',
      leadershipArgs.authoringDir,
      '--generated-dir',
      leadershipArgs.generatedDir,
      '--template-workbook',
      leadershipArgs.templateWorkbook,
      '--output-workbook',
      leadershipArgs.outputWorkbook,
      '--write',
    ]);

    assert.equal(exitCode, 1);
    assert.match(errors.join('\n'), /Write mode is not implemented yet/);
    assert.equal(existsSync(leadershipArgs.outputWorkbook), false);
  } finally {
    console.error = originalError;
  }
});

test('dry-run CLI does not write the output workbook', () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), 'authoring-package-output-'));
  const outputWorkbook = path.join(tempRoot, 'compiled.xlsx');
  const originalLog = console.log;
  console.log = () => undefined;
  try {
    const exitCode = runAuthoringPackageCompilerCli([
      '--assessment-key',
      leadershipArgs.assessmentKey,
      '--domain-key',
      leadershipArgs.domainKey,
      '--authoring-dir',
      leadershipArgs.authoringDir,
      '--generated-dir',
      leadershipArgs.generatedDir,
      '--template-workbook',
      leadershipArgs.templateWorkbook,
      '--output-workbook',
      outputWorkbook,
      '--dry-run',
    ]);

    assert.equal(exitCode, 0);
    assert.equal(existsSync(outputWorkbook), false);
  } finally {
    console.log = originalLog;
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
