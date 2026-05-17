import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import XLSX from 'xlsx';

const workbookPath = join(
  process.cwd(),
  'content',
  'assessment-packages',
  'TEMPLATE',
  'sonartra_report_first_fully_authored_TEMPLATE.xlsx',
);
const readmePath = join(
  process.cwd(),
  'content',
  'assessment-packages',
  'TEMPLATE',
  'report-first-fully-authored-README.md',
);

const requiredSheets = [
  '00_Assessment',
  '01_Signals',
  '02_Questions',
  '03_Options',
  '04_Option_Weights',
  '05_Ranked_Patterns',
  '06_Report_Templates',
  '07_Report_QA_Cases',
  '08_Import_Summary',
  '09_Lookups',
] as const;

const requiredHeadersBySheet: Record<string, readonly string[]> = {
  '00_Assessment': [
    'assessment_key',
    'assessment_title',
    'assessment_description',
    'version',
    'domain_key',
    'domain_title',
    'domain_definition',
    'domain_scope',
    'model_key',
    'report_contract',
    'status',
  ],
  '01_Signals': [
    'domain_key',
    'signal_key',
    'signal_label',
    'signal_short_label',
    'signal_description',
    'signal_order',
    'is_scored',
    'status',
  ],
  '02_Questions': ['domain_key', 'question_key', 'question_order', 'prompt', 'status'],
  '03_Options': ['domain_key', 'question_key', 'option_key', 'option_order', 'option_label', 'option_text', 'status'],
  '04_Option_Weights': ['domain_key', 'question_key', 'option_key', 'signal_key', 'weight', 'status'],
  '05_Ranked_Patterns': [
    'domain_key',
    'pattern_key',
    'rank_1_signal_key',
    'rank_2_signal_key',
    'rank_3_signal_key',
    'rank_4_signal_key',
    'pattern_order',
    'status',
  ],
  '06_Report_Templates': [
    'assessment_key',
    'version',
    'domain_key',
    'pattern_key',
    'rank_1_signal_key',
    'rank_2_signal_key',
    'rank_3_signal_key',
    'rank_4_signal_key',
    'report_title',
    'report_subtitle',
    'concise_takeaway',
    'opening_summary',
    'report_body_json',
    'closing_summary',
    'memorable_line',
    'report_contract',
    'status',
  ],
  '07_Report_QA_Cases': [
    'qa_case_key',
    'assessment_key',
    'version',
    'domain_key',
    'pattern_key',
    'rank_1_signal_key',
    'rank_2_signal_key',
    'rank_3_signal_key',
    'rank_4_signal_key',
    'expected_report_contract',
    'expected_report_title',
    'status',
  ],
  '08_Import_Summary': [
    'import_summary_key',
    'assessment_key',
    'version',
    'package_identifier',
    'source_name',
    'generated_at',
    'generated_by',
    'expected_signal_count',
    'expected_pattern_count',
    'expected_report_template_count',
    'status',
  ],
  '09_Lookups': [
    'lookup_group',
    'lookup_key',
    'lookup_label',
    'sort_order',
    'applies_to_sheet',
    'applies_to_field',
    'status',
  ],
};

function workbook() {
  return XLSX.readFile(workbookPath, { cellDates: false, WTF: true });
}

function rows(sheet: XLSX.WorkSheet): readonly unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: '',
    raw: false,
  });
}

function records(sheet: XLSX.WorkSheet): readonly Record<string, unknown>[] {
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });
}

test('clean report-first fully authored workbook exists and loads with the xlsx parser', () => {
  assert.equal(existsSync(workbookPath), true);
  assert.doesNotThrow(() => workbook());
});

test('clean workbook contains exactly the RFA sheet model', () => {
  const template = workbook();

  assert.deepEqual(template.SheetNames, [...requiredSheets]);

  const forbiddenSheets = [
    '00_Metadata',
    '05_Context',
    '06_Orientation',
    '07_Recognition',
    '08_Signal_Roles',
    '09_Pattern_Mechanics',
    '10_Pattern_Synthesis',
    '11_Strengths',
    '12_Narrowing',
    '13_Application',
    '14_Closing_Integration',
    '15_Report_Preview',
    '16_Score_Shape_Rules',
    '17_Admin_Workflow',
    '18_Lookups',
  ];

  for (const sheetName of forbiddenSheets) {
    assert.equal(template.Sheets[sheetName], undefined, `${sheetName} must not exist in the clean template`);
  }
});

test('clean workbook sheets include the required contract headers', () => {
  const template = workbook();

  for (const sheetName of requiredSheets) {
    const [headerRow] = rows(template.Sheets[sheetName]);
    const headers = new Set(headerRow.map((header) => String(header)));

    for (const requiredHeader of requiredHeadersBySheet[sheetName]) {
      assert.equal(headers.has(requiredHeader), true, `${sheetName} must include ${requiredHeader}`);
    }
  }
});

test('report templates are pattern-level authored reports without score-shape fields', () => {
  const template = workbook();
  const reportSheet = template.Sheets['06_Report_Templates'];
  const [headerRow] = rows(reportSheet);
  const reportRows = records(reportSheet);

  assert.equal(headerRow.includes('score_shape'), false);
  assert.equal(reportRows.length, 24);

  const patternKeys = reportRows.map((row) => String(row.pattern_key));
  assert.equal(new Set(patternKeys).size, 24);

  for (const row of reportRows) {
    assert.equal(row.report_contract, 'report_first_canonical_payload_v1');
    assert.equal(row.status, 'draft');
    assert.doesNotThrow(() => JSON.parse(String(row.report_body_json)));
  }
});

test('ranked patterns provide twenty-four unique signal-order permutations', () => {
  const template = workbook();
  const rankedPatternRows = records(template.Sheets['05_Ranked_Patterns']);

  assert.equal(rankedPatternRows.length, 24);

  const patternKeys = rankedPatternRows.map((row) => String(row.pattern_key));
  const rankTuples = rankedPatternRows.map((row) =>
    [
      row.rank_1_signal_key,
      row.rank_2_signal_key,
      row.rank_3_signal_key,
      row.rank_4_signal_key,
    ].map(String),
  );

  assert.equal(new Set(patternKeys).size, 24);
  assert.equal(new Set(rankTuples.map((tuple) => tuple.join('|'))).size, 24);

  for (const [index, tuple] of rankTuples.entries()) {
    assert.equal(new Set(tuple).size, 4);
    assert.equal(patternKeys[index], tuple.join('_'));
  }
});

test('lookups include required clean model controlled values', () => {
  const template = workbook();
  const lookupValues = records(template.Sheets['09_Lookups']).map((row) => String(row.lookup_key));

  for (const expectedValue of [
    'report_first_canonical_payload_v1',
    'draft',
    'active',
    'inactive',
    'report_first_fully_authored_ranked_pattern_v1',
  ]) {
    assert.equal(lookupValues.includes(expectedValue), true, `09_Lookups must include ${expectedValue}`);
  }
});

test('clean workbook does not include score-shape variants or old modular authoring values', () => {
  const template = workbook();
  const workbookText = template.SheetNames.flatMap((sheetName) =>
    rows(template.Sheets[sheetName]).flatMap((row) => row.map((value) => String(value))),
  ).join('\n');

  for (const forbiddenValue of ['score_shape', 'concentrated', 'paired', 'graduated', 'balanced']) {
    assert.doesNotMatch(workbookText, new RegExp(forbiddenValue, 'i'));
  }
});

test('clean template README explains the report-first package model', () => {
  assert.equal(existsSync(readmePath), true);
  const readme = readFileSync(readmePath, 'utf8');

  assert.match(readme, /06_Report_Templates/);
  assert.match(readme, /twenty-four report rows/i);
  assert.match(readme, /score-shape report variants/i);
  assert.match(readme, /persisted `canonical_result_payload`/i);
});
