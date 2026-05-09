import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import XLSX from 'xlsx';

import { auditRankedPatternWorkbookFile } from '@/content/assessment-packages/import-contract/ranked-pattern-package-audit';
import {
  REQUIRED_PACKAGE_SHEETS,
  compileAuthoringPackageWorkbook,
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
  overwrite: false,
};

test('dry-run discovers Leadership Approach authoring config metadata', () => {
  const plan = planAuthoringPackageCompile(leadershipArgs);

  assert.equal(plan.mode, 'dry-run');
  assert.equal(plan.configPath, 'content/authoring/leadership-approach/00-assessment-authoring-config.json');
  assert.equal(plan.configMetadata.assessmentKey, 'leadership-approach');
  assert.equal(plan.configMetadata.domainKey, 'leadership_approach');
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

test('--write no longer returns not implemented and creates an output workbook', () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), 'authoring-package-write-'));
  const outputWorkbook = path.join(tempRoot, 'compiled.xlsx');
  try {
    const result = compileAuthoringPackageWorkbook({
      ...leadershipArgs,
      outputWorkbook,
      write: true,
      overwrite: false,
    });

    assert.equal(existsSync(outputWorkbook), true);
    assert.equal(result.audit.pass, true);
    assert.equal(result.rowCountsBySheet['00_Metadata'], 1);
    assert.equal(result.rowCountsBySheet['01_Signals'], 4);
    assert.equal(result.rowCountsBySheet['06_Orientation'], 96);
    assert.equal(result.rowCountsBySheet['14_Closing_Integration'], 96);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('written workbook has all package sheets and preserves template headers', () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), 'authoring-package-headers-'));
  const outputWorkbook = path.join(tempRoot, 'compiled.xlsx');
  try {
    compileAuthoringPackageWorkbook({
      ...leadershipArgs,
      outputWorkbook,
      write: true,
      overwrite: false,
    });

    const template = XLSX.readFile(leadershipArgs.templateWorkbook);
    const output = XLSX.readFile(outputWorkbook);
    assert.deepEqual(output.SheetNames, [...REQUIRED_PACKAGE_SHEETS]);
    for (const sheet of REQUIRED_PACKAGE_SHEETS) {
      const templateHeader = XLSX.utils.sheet_to_json<unknown[]>(template.Sheets[sheet]!, { header: 1, defval: '' })[0];
      const outputHeader = XLSX.utils.sheet_to_json<unknown[]>(output.Sheets[sheet]!, { header: 1, defval: '' })[0];
      assert.deepEqual(outputHeader, templateHeader, `${sheet} header should match template`);
    }
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('write refuses overwrite unless --overwrite is supplied', () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), 'authoring-package-overwrite-'));
  const outputWorkbook = path.join(tempRoot, 'compiled.xlsx');
  try {
    compileAuthoringPackageWorkbook({
      ...leadershipArgs,
      outputWorkbook,
      write: true,
      overwrite: false,
    });

    assert.throws(
      () =>
        compileAuthoringPackageWorkbook({
          ...leadershipArgs,
          outputWorkbook,
          write: true,
          overwrite: false,
        }),
      /already exists/,
    );

    assert.doesNotThrow(() =>
      compileAuthoringPackageWorkbook({
        ...leadershipArgs,
        outputWorkbook,
        write: true,
        overwrite: true,
      }),
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('output workbook passes package audit for Leadership Approach', () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), 'authoring-package-audit-'));
  const outputWorkbook = path.join(tempRoot, 'compiled.xlsx');
  try {
    compileAuthoringPackageWorkbook({
      ...leadershipArgs,
      outputWorkbook,
      write: true,
      overwrite: false,
    });
    const audit = auditRankedPatternWorkbookFile(outputWorkbook);

    assert.equal(audit.pass, true);
    assert.equal(audit.diagnosticCounts.error, 0);
    assert.equal(audit.normalisationDiagnosticCounts.error, 0);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('domain_key mismatch fails clearly in write mode', () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), 'authoring-package-domain-'));
  const outputWorkbook = path.join(tempRoot, 'compiled.xlsx');
  try {
    assert.throws(
      () =>
        compileAuthoringPackageWorkbook({
          ...leadershipArgs,
          domainKey: 'leadership-approach',
          outputWorkbook,
          write: true,
          overwrite: false,
        }),
      /domain_key mismatch/,
    );
    assert.equal(existsSync(outputWorkbook), false);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('--write CLI no longer returns not implemented', () => {
  const errors: string[] = [];
  const logs: string[] = [];
  const tempRoot = mkdtempSync(path.join(tmpdir(), 'authoring-package-cli-write-'));
  const outputWorkbook = path.join(tempRoot, 'compiled.xlsx');
  const originalError = console.error;
  const originalLog = console.log;
  console.error = (message?: unknown) => {
    errors.push(String(message));
  };
  console.log = (message?: unknown) => {
    logs.push(String(message));
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
      outputWorkbook,
      '--write',
      '--overwrite',
    ]);

    assert.equal(exitCode, 0);
    assert.doesNotMatch(errors.join('\n'), /not implemented/i);
    assert.match(logs.join('\n'), /Authoring package workbook written/);
    assert.equal(existsSync(outputWorkbook), true);
  } finally {
    console.error = originalError;
    console.log = originalLog;
    rmSync(tempRoot, { recursive: true, force: true });
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
