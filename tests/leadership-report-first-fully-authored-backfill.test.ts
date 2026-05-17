import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import XLSX from 'xlsx';

const workbookPath = join(
  process.cwd(),
  'content',
  'assessment-packages',
  'leadership-approach',
  'sonartra_report_first_fully_authored_LEADERSHIP_APPROACH.xlsx',
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

const leadershipSignals = ['results', 'process', 'vision', 'people'] as const;

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

test('Leadership clean report-first workbook exists and loads', () => {
  assert.equal(existsSync(workbookPath), true);
  assert.doesNotThrow(() => workbook());
});

test('Leadership workbook contains only the clean RFA sheets', () => {
  const template = workbook();
  assert.deepEqual(template.SheetNames, [...requiredSheets]);

  for (const legacySheet of [
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
  ]) {
    assert.equal(template.Sheets[legacySheet], undefined, `${legacySheet} must not exist`);
  }
});

test('Leadership workbook contains exactly four active scored signals', () => {
  const signalRows = records(workbook().Sheets['01_Signals']);
  const activeSignals = signalRows.filter((row) => row.status === 'active' && row.is_scored === 'TRUE');

  assert.equal(activeSignals.length, 4);
  assert.deepEqual(
    activeSignals.map((row) => String(row.signal_key)).sort(),
    [...leadershipSignals].sort(),
  );
});

test('Leadership ranked patterns contain all twenty-four signal permutations', () => {
  const patternRows = records(workbook().Sheets['05_Ranked_Patterns']);
  const activePatterns = patternRows.filter((row) => row.status === 'active');

  assert.equal(activePatterns.length, 24);
  assert.equal(new Set(activePatterns.map((row) => String(row.pattern_key))).size, 24);

  for (const pattern of activePatterns) {
    const tuple = [
      pattern.rank_1_signal_key,
      pattern.rank_2_signal_key,
      pattern.rank_3_signal_key,
      pattern.rank_4_signal_key,
    ].map(String);

    assert.deepEqual([...tuple].sort(), [...leadershipSignals].sort());
    assert.equal(pattern.pattern_key, tuple.join('_'));
  }
});

test('Leadership report templates cover one row per ranked pattern', () => {
  const template = workbook();
  const patternRows = records(template.Sheets['05_Ranked_Patterns']);
  const reportRows = records(template.Sheets['06_Report_Templates']);
  const patternKeys = new Set(patternRows.map((row) => String(row.pattern_key)));
  const [reportHeaders] = rows(template.Sheets['06_Report_Templates']);

  assert.equal(reportHeaders.includes('score_shape'), false);
  assert.equal(reportRows.length, 24);
  assert.equal(new Set(reportRows.map((row) => String(row.pattern_key))).size, 24);

  for (const row of reportRows) {
    assert.equal(row.report_contract, 'report_first_canonical_payload_v1');
    assert.equal(patternKeys.has(String(row.pattern_key)), true);
    assert.notEqual(row.rank_1_signal_key, '');
    assert.notEqual(row.rank_2_signal_key, '');
    assert.notEqual(row.rank_3_signal_key, '');
    assert.notEqual(row.rank_4_signal_key, '');
  }
});

test('Leadership report templates do not expand into score-shape variants', () => {
  const template = workbook();
  const reportRows = records(template.Sheets['06_Report_Templates']);
  const [reportHeaders] = rows(template.Sheets['06_Report_Templates']);

  assert.equal(reportRows.length, 24);
  assert.equal(reportHeaders.includes('score_shape'), false);

  const variantValues = new Set(['concentrated', 'paired', 'graduated', 'balanced']);
  for (const row of reportRows) {
    assert.equal(variantValues.has(String(row.pattern_key)), false);
    assert.equal(variantValues.has(String(row.report_title)), false);
  }
});

test('active Leadership report rows contain valid structured report JSON', () => {
  const reportRows = records(workbook().Sheets['06_Report_Templates']);

  for (const row of reportRows) {
    assert.notEqual(row.report_body_json, '');
    assert.doesNotThrow(() => JSON.parse(String(row.report_body_json)));

    if (row.status === 'active') {
      const parsed = JSON.parse(String(row.report_body_json));
      assert.equal(parsed.metadata?.contractName, 'report_first_canonical_payload_v1');
      assert.equal(parsed.patternKey, row.pattern_key);
    } else {
      assert.match(String(row.authoring_notes), /missing|Draft|placeholder|compilation/i);
    }
  }
});

test('Leadership clean workbook lookups include required clean values', () => {
  const lookupRows = records(workbook().Sheets['09_Lookups']);
  const lookupKeys = lookupRows.map((row) => String(row.lookup_key));

  for (const expectedKey of [
    'report_first_canonical_payload_v1',
    'draft',
    'active',
    'inactive',
    'report_first_fully_authored_ranked_pattern_v1',
  ]) {
    assert.equal(lookupKeys.includes(expectedKey), true, `09_Lookups must include ${expectedKey}`);
  }
});
