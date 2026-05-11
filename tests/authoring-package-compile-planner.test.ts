import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
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

const flowStateArgs: AuthoringPackageCompilerArgs = {
  assessmentKey: 'flow-state',
  domainKey: 'flow_state',
  authoringDir: 'content/assessment-packages/flow-state',
  generatedDir: 'content/authoring/generated',
  templateWorkbook:
    'content/assessment-packages/flow-state/sonartra_reader_first_import_schema_FLOW_STATE_EXAMPLE.xlsx',
  outputWorkbook:
    'tmp/compiled-packages/flow-state/sonartra_reader_first_import_schema_FLOW_STATE_COMPILED.xlsx',
  dryRun: true,
  write: false,
  overwrite: false,
};

function copyGeneratedDir(tempRoot: string): string {
  const generatedDir = path.join(tempRoot, 'generated');
  cpSync('content/authoring/generated', generatedDir, { recursive: true });
  return generatedDir;
}

function mutatePsv(generatedDir: string, fileName: string, mutate: (lines: string[]) => string[]): void {
  const filePath = path.join(generatedDir, fileName);
  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
  writeFileSync(filePath, mutate(lines).join('\n'));
}

function mutatePatternPriorityField(
  generatedDir: string,
  fileName: string,
  patternKey: string,
  priority: string,
  fieldName: string,
  value: string,
): void {
  mutatePsv(generatedDir, fileName, (lines) => {
    const headers = lines[0]!.split('|');
    const patternIndex = headers.indexOf('pattern_key');
    const priorityIndex = headers.indexOf('priority');
    const fieldIndex = headers.indexOf(fieldName);
    assert.notEqual(patternIndex, -1);
    assert.notEqual(priorityIndex, -1);
    assert.notEqual(fieldIndex, -1);

    return lines.map((line, index) => {
      if (index === 0 || line.trim().length === 0) {
        return line;
      }
      const cells = line.split('|');
      if (cells[patternIndex] === patternKey && cells[priorityIndex] === priority) {
        cells[fieldIndex] = value;
        return cells.join('|');
      }
      return line;
    });
  });
}

function writeWithGeneratedDir(generatedDir: string, tempRoot: string): void {
  compileAuthoringPackageWorkbook({
    ...leadershipArgs,
    generatedDir,
    outputWorkbook: path.join(tempRoot, 'compiled.xlsx'),
    write: true,
    overwrite: false,
  });
}

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

test('output workbook compiles Flow State signal keys that contain underscores', () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), 'flow-state-package-audit-'));
  const outputWorkbook = path.join(tempRoot, 'compiled.xlsx');
  try {
    const result = compileAuthoringPackageWorkbook({
      ...flowStateArgs,
      outputWorkbook,
      write: true,
      overwrite: false,
    });

    assert.equal(result.audit.pass, true);
    assert.equal(result.audit.diagnosticCounts.error, 0);
    assert.equal(result.audit.normalisationDiagnosticCounts.error, 0);
    assert.equal(result.rowCountsBySheet['00_Metadata'], 1);
    assert.equal(result.rowCountsBySheet['01_Signals'], 4);
    assert.equal(result.rowCountsBySheet['02_Questions'], 24);
    assert.equal(result.rowCountsBySheet['03_Options'], 96);
    assert.equal(result.rowCountsBySheet['04_Option_Weights'], 96);
    assert.equal(result.rowCountsBySheet['06_Orientation'], 96);
    assert.equal(result.rowCountsBySheet['14_Closing_Integration'], 96);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('write fails when generated rows contain duplicate lookup keys', () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), 'authoring-package-duplicate-'));
  try {
    const generatedDir = copyGeneratedDir(tempRoot);
    mutatePsv(generatedDir, '06-orientation-leadership-approach.psv', (lines) => {
      const firstDataCells = lines[1]!.split('|');
      const duplicateLookupKey = firstDataCells[firstDataCells.length - 1]!;
      const secondDataCells = lines[2]!.split('|');
      secondDataCells[secondDataCells.length - 1] = duplicateLookupKey;
      return [lines[0]!, lines[1]!, secondDataCells.join('|'), ...lines.slice(3)];
    });

    assert.throws(() => writeWithGeneratedDir(generatedDir, tempRoot), /DUPLICATE_LOOKUP_KEY/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('write fails when a generated section source is missing', () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), 'authoring-package-missing-section-'));
  try {
    const generatedDir = copyGeneratedDir(tempRoot);
    for (const fileName of readdirSync(generatedDir)) {
      if (fileName.startsWith('14-closing-integration-leadership-approach')) {
        rmSync(path.join(generatedDir, fileName), { force: true });
      }
    }

    assert.throws(() => writeWithGeneratedDir(generatedDir, tempRoot), /Generated result-language source is missing for 14_Closing_Integration/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('write fails when generated score-shape coverage is missing', () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), 'authoring-package-score-shape-'));
  try {
    const generatedDir = copyGeneratedDir(tempRoot);
    mutatePsv(generatedDir, '06-orientation-leadership-approach.psv', (lines) => [lines[0]!, ...lines.slice(2)]);

    assert.throws(() => writeWithGeneratedDir(generatedDir, tempRoot), /SCORE_SHAPE_COVERAGE_MISSING/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('write fails when a signal role rank is missing', () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), 'authoring-package-signal-role-'));
  try {
    const generatedDir = copyGeneratedDir(tempRoot);
    mutatePsv(generatedDir, '08-signal-roles-leadership-approach.psv', (lines) => [lines[0]!, ...lines.slice(2)]);

    assert.throws(() => writeWithGeneratedDir(generatedDir, tempRoot), /SIGNAL_ROLE_COVERAGE_MISSING/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('write fails when pattern_key does not match ranked signals', () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), 'authoring-package-rank-mismatch-'));
  try {
    const generatedDir = copyGeneratedDir(tempRoot);
    mutatePsv(generatedDir, '07-recognition-leadership-approach.psv', (lines) => {
      const cells = lines[1]!.split('|');
      cells[1] = 'results_process_people_vision';
      return [lines[0]!, cells.join('|'), ...lines.slice(2)];
    });

    assert.throws(() => writeWithGeneratedDir(generatedDir, tempRoot), /PATTERN_RANK_MISMATCH/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('write fails when generated text fields are blank', () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), 'authoring-package-blank-field-'));
  try {
    const generatedDir = copyGeneratedDir(tempRoot);
    mutatePsv(generatedDir, '06-orientation-leadership-approach.psv', (lines) => {
      const headers = lines[0]!.split('|');
      const titleIndex = headers.indexOf('orientation_title');
      const cells = lines[1]!.split('|');
      cells[titleIndex] = '';
      return [lines[0]!, cells.join('|'), ...lines.slice(2)];
    });

    assert.throws(() => writeWithGeneratedDir(generatedDir, tempRoot), /BLANK_REQUIRED_FIELD/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('write fails when generated score shape is unsupported', () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), 'authoring-package-unsupported-shape-'));
  try {
    const generatedDir = copyGeneratedDir(tempRoot);
    mutatePsv(generatedDir, '09-pattern-mechanics-leadership-approach.psv', (lines) => {
      const headers = lines[0]!.split('|');
      const shapeIndex = headers.indexOf('score_shape');
      const cells = lines[1]!.split('|');
      cells[shapeIndex] = 'unsupported_shape';
      return [lines[0]!, cells.join('|'), ...lines.slice(2)];
    });

    assert.throws(() => writeWithGeneratedDir(generatedDir, tempRoot), /UNSUPPORTED_SCORE_SHAPE/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

for (const [priority, wrongSignal] of [
  ['1', 'process'],
  ['2', 'results'],
  ['3', 'people'],
] as const) {
  test(`write fails when 11_Strengths priority ${priority} points to the wrong ranked signal`, () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), 'authoring-package-strength-link-'));
    try {
      const generatedDir = copyGeneratedDir(tempRoot);
      mutatePatternPriorityField(
        generatedDir,
        '11-strengths-leadership-approach.psv',
        'results_process_vision_people',
        priority,
        'linked_signal_key',
        wrongSignal,
      );

      assert.throws(() => writeWithGeneratedDir(generatedDir, tempRoot), /11_STRENGTH_LINKED_SIGNAL_MISMATCH/);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
}

test('write fails when 11_Strengths repeats linked_signal_key within one pattern', () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), 'authoring-package-strength-duplicate-'));
  try {
    const generatedDir = copyGeneratedDir(tempRoot);
    mutatePatternPriorityField(
      generatedDir,
      '11-strengths-leadership-approach.psv',
      'results_process_vision_people',
      '3',
      'linked_signal_key',
      'process',
    );

    assert.throws(() => writeWithGeneratedDir(generatedDir, tempRoot), /11_STRENGTH_LINKED_SIGNAL_DUPLICATE/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

for (const [priority, wrongSignal] of [
  ['1', 'people'],
  ['2', 'process'],
  ['3', 'vision'],
] as const) {
  test(`write fails when 12_Narrowing priority ${priority} points to the wrong missing range signal`, () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), 'authoring-package-narrowing-link-'));
    try {
      const generatedDir = copyGeneratedDir(tempRoot);
      mutatePatternPriorityField(
        generatedDir,
        '12-narrowing-leadership-approach.psv',
        'results_process_vision_people',
        priority,
        'missing_range_signal_key',
        wrongSignal,
      );

      assert.throws(() => writeWithGeneratedDir(generatedDir, tempRoot), /12_NARROWING_MISSING_RANGE_MISMATCH/);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
}

test('write fails when 12_Narrowing repeats missing_range_signal_key within one pattern', () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), 'authoring-package-narrowing-duplicate-'));
  try {
    const generatedDir = copyGeneratedDir(tempRoot);
    mutatePatternPriorityField(
      generatedDir,
      '12-narrowing-leadership-approach.psv',
      'results_process_vision_people',
      '3',
      'missing_range_signal_key',
      'vision',
    );

    assert.throws(() => writeWithGeneratedDir(generatedDir, tempRoot), /12_NARROWING_MISSING_RANGE_DUPLICATE/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('13_Application Policy B passes for valid Leadership Approach data', () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), 'authoring-package-application-policy-b-'));
  try {
    const generatedDir = copyGeneratedDir(tempRoot);
    assert.doesNotThrow(() => writeWithGeneratedDir(generatedDir, tempRoot));
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('write fails when 13_Application does not follow selected Policy B linkage', () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), 'authoring-package-application-link-'));
  try {
    const generatedDir = copyGeneratedDir(tempRoot);
    mutatePatternPriorityField(
      generatedDir,
      '13-application-leadership-approach.psv',
      'results_process_vision_people',
      '3',
      'linked_signal_key',
      'vision',
    );

    assert.throws(() => writeWithGeneratedDir(generatedDir, tempRoot), /13_APPLICATION_LINKED_SIGNAL_POLICY_MISMATCH/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('write regenerates import summary row counts from compiled workbook rows', () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), 'authoring-package-summary-'));
  const outputWorkbook = path.join(tempRoot, 'compiled.xlsx');
  try {
    compileAuthoringPackageWorkbook({
      ...leadershipArgs,
      outputWorkbook,
      write: true,
      overwrite: false,
    });
    const workbook = XLSX.readFile(outputWorkbook);
    const summaryRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['16_Import_Summary']!, {
      defval: '',
      raw: true,
    });

    assert.equal(String(summaryRows[0]?.runtime_definition_row_count), '149');
    assert.equal(String(summaryRows[0]?.runtime_result_content_row_count), '713');
    assert.equal(String(summaryRows[0]?.preview_row_count), '4');
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
