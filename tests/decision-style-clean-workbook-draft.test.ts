import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import XLSX from 'xlsx';

import {
  decisionStyleWorkbookRelativePath,
  writeDecisionStyleCleanWorkbook,
} from '@/scripts/authoring/generate-decision-style-clean-workbook';

const workbookPath = path.join(process.cwd(), decisionStyleWorkbookRelativePath);

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

const finalSignals = ['evidence', 'judgement', 'standards', 'practicality'] as const;
const oldSignals = ['instinct', 'principle', 'pragmatism'] as const;
const scoreShapeValues = ['score_shape', 'concentrated', 'paired', 'graduated', 'balanced'] as const;
const decisionStyleLabels = [
  'Key insight',
  'Decision value',
  "Others' experience",
  'Decision mechanics',
  'Explaining the decision',
  'Judgement under pressure',
  'Decision strengths',
  'Decision tightening',
  'Wider perspective',
  'Decision range',
  'Development',
  'Closing',
] as const;

function workbook() {
  writeDecisionStyleCleanWorkbook();
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

function workbookText(template: XLSX.WorkBook): string {
  return template.SheetNames.flatMap((sheetName) =>
    rows(template.Sheets[sheetName]).flatMap((row) => row.map((value) => String(value))),
  ).join('\n');
}

test('Decision Style clean workbook is generated and loads with xlsx', () => {
  writeDecisionStyleCleanWorkbook();

  assert.equal(existsSync(workbookPath), true);
  assert.doesNotThrow(() => XLSX.readFile(workbookPath, { cellDates: false, WTF: true }));
});

test('Decision Style workbook contains exactly the clean RFA sheets', () => {
  const template = workbook();

  assert.deepEqual(template.SheetNames, [...requiredSheets]);

  for (const legacySheet of [
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
  ]) {
    assert.equal(template.Sheets[legacySheet], undefined, `${legacySheet} must not exist`);
  }
});

test('Decision Style assessment and signal sheets use the final signal model', () => {
  const template = workbook();
  const assessmentRows = records(template.Sheets['00_Assessment']);
  const signalRows = records(template.Sheets['01_Signals']);

  assert.equal(assessmentRows[0]?.assessment_key, 'decision-style');
  assert.equal(assessmentRows[0]?.domain_key, 'decision_style');
  assert.deepEqual(
    signalRows.map((row) => String(row.signal_key)),
    [...finalSignals],
  );
});

test('Decision Style workbook preserves question, option, and one-signal weight counts', () => {
  const template = workbook();
  const questionRows = records(template.Sheets['02_Questions']);
  const optionRows = records(template.Sheets['03_Options']);
  const weightRows = records(template.Sheets['04_Option_Weights']);

  assert.equal(questionRows.length, 24);
  assert.equal(optionRows.length, 96);
  assert.equal(weightRows.length, 96);

  const optionCounts = new Map<string, number>();
  for (const option of optionRows) {
    optionCounts.set(String(option.question_key), (optionCounts.get(String(option.question_key)) ?? 0) + 1);
  }
  for (const question of questionRows) {
    assert.equal(optionCounts.get(String(question.question_key)), 4, `${question.question_key} must have 4 options`);
  }

  const signalCounts = new Map<string, number>();
  for (const weight of weightRows) {
    assert.equal(weight.weight, '1');
    assert.equal(finalSignals.includes(String(weight.signal_key) as (typeof finalSignals)[number]), true);
    signalCounts.set(String(weight.signal_key), (signalCounts.get(String(weight.signal_key)) ?? 0) + 1);
  }
  for (const signal of finalSignals) {
    assert.equal(signalCounts.get(signal), 24, `${signal} must appear 24 times`);
  }
});

test('Decision Style ranked patterns cover all final-signal permutations exactly once', () => {
  const patternRows = records(workbook().Sheets['05_Ranked_Patterns']);

  assert.equal(patternRows.length, 24);
  assert.equal(new Set(patternRows.map((row) => String(row.pattern_key))).size, 24);

  const tuples = patternRows.map((row) =>
    [
      row.rank_1_signal_key,
      row.rank_2_signal_key,
      row.rank_3_signal_key,
      row.rank_4_signal_key,
    ].map(String),
  );

  assert.equal(new Set(tuples.map((tuple) => tuple.join('|'))).size, 24);
  for (const tuple of tuples) {
    assert.deepEqual([...tuple].sort(), [...finalSignals].sort());
  }
});

test('Decision Style report templates are draft placeholders without score-shape variants', () => {
  const template = workbook();
  const reportRows = records(template.Sheets['06_Report_Templates']);
  const [reportHeaders] = rows(template.Sheets['06_Report_Templates']);

  assert.equal(reportHeaders.includes('score_shape'), false);
  assert.equal(reportRows.length, 24);

  for (const row of reportRows) {
    assert.equal(row.status, 'draft');
    assert.equal(row.report_contract, 'report_first_canonical_payload_v1');
    assert.equal(String(row.report_body_json).includes('score_shape'), false);

    const parsed = JSON.parse(String(row.report_body_json));
    assert.equal(parsed.contract, 'report_first_canonical_payload_v1');
    assert.equal(parsed.status, 'draft_placeholder');
    assert.equal(parsed.patternKey, row.pattern_key);
    assert.equal(parsed.sections.length, 12);
    const labels = parsed.sections.map((section: { label: string }) => section.label);
    for (const label of decisionStyleLabels) {
      assert.equal(labels.includes(label), true, `report_body_json must include ${label}`);
    }
  }
});

test('Decision Style workbook excludes old signal keys and score-shape values', () => {
  const text = workbookText(workbook()).toLowerCase();

  for (const oldSignal of oldSignals) {
    assert.equal(text.includes(oldSignal), false, `${oldSignal} must not appear`);
  }

  for (const forbiddenValue of scoreShapeValues) {
    assert.equal(text.includes(forbiddenValue), false, `${forbiddenValue} must not appear`);
  }
});

test('Decision Style QA, import summary, and lookups match the clean draft contract', () => {
  const template = workbook();
  const qaRows = records(template.Sheets['07_Report_QA_Cases']);
  const importSummaryRows = records(template.Sheets['08_Import_Summary']);
  const lookupRows = records(template.Sheets['09_Lookups']);
  const lookupKeys = lookupRows.map((row) => String(row.lookup_key));

  assert.equal(qaRows.length >= 8, true);
  assert.equal(importSummaryRows[0]?.expected_signal_count, '4');
  assert.equal(importSummaryRows[0]?.expected_pattern_count, '24');
  assert.equal(importSummaryRows[0]?.expected_report_template_count, '24');

  for (const expected of [
    'report_first_canonical_payload_v1',
    'draft',
    'active',
    'inactive',
    'report_first_fully_authored_ranked_pattern_v1',
    ...finalSignals,
  ]) {
    assert.equal(lookupKeys.includes(expected), true, `09_Lookups must include ${expected}`);
  }

  for (const forbidden of scoreShapeValues) {
    assert.equal(lookupKeys.includes(forbidden), false, `09_Lookups must exclude ${forbidden}`);
  }
});
