import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import XLSX from 'xlsx';

import {
  rankedPatternImportManifest,
  rankedPatternImportSheetKeys,
} from '@/content/assessment-packages/import-contract/ranked-pattern-import-manifest';

const workbookPath = join(
  process.cwd(),
  'content',
  'assessment-packages',
  'TEMPLATE',
  'sonartra_report_first_fully_authored_import_TEMPLATE.xlsx',
);
const readmePath = join(
  process.cwd(),
  'content',
  'assessment-packages',
  'TEMPLATE',
  'report-first-fully-authored-README.md',
);
const reportFirstSheetName = '19_Report_First_Templates';
const reportFirstTemplateHeaders = [
  'assessment_key',
  'assessment_version',
  'package_key',
  'package_version',
  'domain_key',
  'pattern_key',
  'report_key',
  'report_contract',
  'score_shape_policy',
  'score_shape',
  'supported_score_shapes',
  'source_markdown_path',
  'source_content_hash',
  'content_hash',
  'report_template_json',
  'status',
  'manifest_status',
  'publishable',
  'ready_for_import',
  'generation_metadata',
  'lookup_key',
] as const;

function workbook() {
  return XLSX.readFile(workbookPath, { cellDates: false, WTF: true });
}

function sheetRows(sheet: XLSX.WorkSheet): readonly unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: '',
    raw: true,
  });
}

function records(sheet: XLSX.WorkSheet): readonly Record<string, unknown>[] {
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });
}

function permutations(values: readonly string[]): readonly string[][] {
  if (values.length === 0) {
    return [[]];
  }

  return values.flatMap((value, index) => {
    const remaining = [...values.slice(0, index), ...values.slice(index + 1)];
    return permutations(remaining).map((permutation) => [value, ...permutation]);
  });
}

test('report-first fully authored workbook template exists with importer sheets in contract order', () => {
  assert.equal(existsSync(workbookPath), true);
  const template = workbook();

  assert.deepEqual(template.SheetNames, [...rankedPatternImportSheetKeys, reportFirstSheetName]);

  for (const entry of rankedPatternImportManifest) {
    const sheet = template.Sheets[entry.sheet_key];
    assert.ok(sheet, `${entry.sheet_key} must exist`);
    const [headerRow] = sheetRows(sheet);
    assert.deepEqual(headerRow, [...entry.required_columns, ...entry.optional_columns]);
  }
});

test('report-first fully authored workbook template is structurally readable as xlsx', () => {
  assert.doesNotThrow(() => workbook());
  const template = workbook();

  assert.equal(template.SheetNames.length, rankedPatternImportSheetKeys.length + 1);
  assert.ok(template.Sheets['00_Metadata'], '00_Metadata must parse from the workbook package');
  assert.ok(
    template.Sheets[reportFirstSheetName],
    `${reportFirstSheetName} must parse from the workbook package`,
  );
});

test('report-first template sheet is pattern-level and contains exactly twenty-four placeholder reports', () => {
  const template = workbook();
  const sheet = template.Sheets[reportFirstSheetName];
  assert.ok(sheet, `${reportFirstSheetName} must exist`);

  const [headerRow] = sheetRows(sheet);
  assert.deepEqual(headerRow, [...reportFirstTemplateHeaders]);

  const rows = records(sheet);
  assert.equal(rows.length, 24);

  const expectedPatternKeys = permutations(['signal_a', 'signal_b', 'signal_c', 'signal_d'])
    .map((signals) => signals.join('_'))
    .sort((left, right) => left.localeCompare(right));
  const actualPatternKeys = rows
    .map((row) => String(row.pattern_key))
    .sort((left, right) => left.localeCompare(right));

  assert.deepEqual(actualPatternKeys, expectedPatternKeys);
  assert.equal(new Set(actualPatternKeys).size, 24);

  for (const row of rows) {
    assert.equal(row.report_contract, 'report_first_canonical_payload_v1');
    assert.equal(row.score_shape_policy, 'pattern_level_score_shape_neutral');
    assert.equal(row.score_shape, '');
    assert.equal(row.status, 'active');
    assert.equal(row.manifest_status, 'ready_for_import');
    assert.equal(row.publishable, 'TRUE');
    assert.equal(row.ready_for_import, 'TRUE');
    assert.doesNotThrow(() => JSON.parse(String(row.report_template_json)));
  }
});

test('report-first workbook template does not encode score-shape report variants or legacy authoring terms', () => {
  const template = workbook();
  const workbookValues = template.SheetNames.flatMap((sheetName) =>
    sheetRows(template.Sheets[sheetName] ?? {}).slice(1).flatMap((row) => row.map((value) => String(value))),
  );
  const reportFirstRows = records(template.Sheets[reportFirstSheetName]);
  const forbiddenScoreShapeValues = new Set(['concentrated', 'paired', 'graduated', 'balanced']);

  for (const row of reportFirstRows) {
    assert.equal(forbiddenScoreShapeValues.has(String(row.score_shape)), false);
    assert.equal(String(row.supported_score_shapes), '[]');
  }

  const forbiddenTerms = [
    'WPLP',
    'multi-domain',
    'pair-oriented',
    'archetype',
    'threshold',
    'sentence library',
    'rule engine',
    'single-domain builder',
  ];
  const valueText = workbookValues.join('\n');

  for (const term of forbiddenTerms) {
    assert.doesNotMatch(valueText, new RegExp(term, 'i'), `workbook values must not contain ${term}`);
  }
});

test('report-first fully authored README states the current twenty-four report model', () => {
  assert.equal(existsSync(readmePath), true);
  const readme = readFileSync(readmePath, 'utf8');

  assert.match(readme, /twenty-four ranked signal patterns/i);
  assert.match(readme, /one fully authored report per `pattern_key`/i);
  assert.match(readme, /does not use:\n\n- score-shape language variants/i);
  assert.match(readme, /old single-domain builder is legacy/i);
  assert.match(readme, /Runtime must not read this workbook directly/i);
  assert.match(readme, /score_shape` must stay blank\/null/i);
});
