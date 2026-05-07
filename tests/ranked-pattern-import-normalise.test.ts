import test from 'node:test';
import assert from 'node:assert/strict';

import type { RankedPatternImportSheetKey } from '@/content/assessment-packages/import-contract/ranked-pattern-import-manifest';
import { auditParsedRankedPatternWorkbook } from '@/content/assessment-packages/import-contract/ranked-pattern-package-audit';
import {
  getNormalisedAdminImportSupportCount,
  getNormalisedRuntimeDefinitionCount,
  getNormalisedRuntimeResultContentCount,
  normaliseRankedPatternWorkbook,
} from '@/content/assessment-packages/import-contract/ranked-pattern-import-normalise';
import type {
  ParsedRankedPatternWorkbookFile,
  ParsedRankedPatternWorkbookRow,
  ParsedRankedPatternWorkbookSheet,
} from '@/content/assessment-packages/import-contract/ranked-pattern-workbook-parser';
import { parseRankedPatternWorkbookFile } from '@/content/assessment-packages/import-contract/ranked-pattern-workbook-parser';

function parsedRow(
  values: Readonly<Record<string, unknown>>,
  rowNumber = 2,
): ParsedRankedPatternWorkbookRow {
  return Object.freeze({
    ...values,
    rowNumber,
    values,
    rawValues: Object.freeze(Object.values(values)),
  });
}

function parsedSheet(
  sheetKey: RankedPatternImportSheetKey,
  rows: readonly ParsedRankedPatternWorkbookRow[],
): ParsedRankedPatternWorkbookSheet {
  return Object.freeze({
    sheetKey,
    sheetName: sheetKey,
    category: sheetKey < '05_Context' ? 'runtime_definition' : sheetKey < '15_Report_Preview' ? 'runtime_result_content' : 'admin_import_support',
    headers: Object.freeze(Object.keys(rows[0]?.values ?? {})),
    rows,
    rowCount: rows.length,
    emptyRowCount: 0,
  });
}

function parsedWorkbook(
  sheets: Partial<Record<RankedPatternImportSheetKey, ParsedRankedPatternWorkbookSheet>>,
): ParsedRankedPatternWorkbookFile {
  return Object.freeze({
    sourcePath: 'memory.xlsx',
    workbookName: 'memory.xlsx',
    sheets,
    missingSheets: Object.freeze([]),
    unexpectedSheets: Object.freeze([]),
    parsedAt: '2026-05-07T00:00:00.000Z',
  });
}

test('metadata rows normalise identity, mode, result model, domain, status, and source row number', () => {
  const normalised = normaliseRankedPatternWorkbook(
    parsedWorkbook({
      '00_Metadata': parsedSheet('00_Metadata', [
        parsedRow({
          assessment_key: ' assessment_key ',
          version: '1',
          assessment_title: 'Example assessment',
          assessment_description: 'Example description',
          model: 'single_domain_ranked_pattern',
          mode: 'single_domain',
          result_model_key: 'ranked_pattern',
          domain_key: 'domain_key',
          domain_title: 'Domain title',
          lifecycle_status: 'DRAFT',
          status: 'ACTIVE',
          lookup_key: 'metadata::1',
        }),
      ]),
    }),
  );

  assert.equal(normalised.metadata[0]?.assessmentKey, 'assessment_key');
  assert.equal(normalised.metadata[0]?.mode, 'single_domain');
  assert.equal(normalised.metadata[0]?.resultModelKey, 'ranked_pattern');
  assert.equal(normalised.metadata[0]?.domainKey, 'domain_key');
  assert.equal(normalised.metadata[0]?.lifecycleStatus, 'draft');
  assert.equal(normalised.metadata[0]?.status, 'active');
  assert.equal(normalised.metadata[0]?.sourceRowNumber, 2);
  assert.deepEqual(normalised.diagnostics, []);
});

test('runtime definition rows normalise typed fields without scoring or persistence', () => {
  const normalised = normaliseRankedPatternWorkbook(
    parsedWorkbook({
      '01_Signals': parsedSheet('01_Signals', [
        parsedRow({
          domain_key: 'domain_key',
          signal_key: 'signal_a',
          signal_label: 'Signal A',
          signal_description: 'Description',
          signal_order: '1',
          scored: 'TRUE',
          status: 'active',
          lookup_key: 'signal::a',
        }),
      ]),
      '02_Questions': parsedSheet('02_Questions', [
        parsedRow({
          domain_key: 'domain_key',
          question_key: 'question_1',
          question_order: '2',
          question_text: 'What happens next?',
          status: 'active',
          lookup_key: 'question::1',
        }),
      ]),
      '03_Options': parsedSheet('03_Options', [
        parsedRow({
          domain_key: 'domain_key',
          question_key: 'question_1',
          option_key: 'A',
          option_order: 'A',
          option_text: 'I start with structure.',
          is_scored: 'yes',
          status: 'active',
          lookup_key: 'option::1::a',
        }),
      ]),
      '04_Option_Weights': parsedSheet('04_Option_Weights', [
        parsedRow({
          domain_key: 'domain_key',
          question_key: 'question_1',
          option_key: 'A',
          signal_key: 'signal_a',
          weight: '1.5',
          status: 'active',
          lookup_key: 'weight::1::a',
        }),
      ]),
    }),
  );

  assert.equal(normalised.signals[0]?.signalKey, 'signal_a');
  assert.equal(normalised.signals[0]?.signalOrder, 1);
  assert.equal(normalised.signals[0]?.scored, true);
  assert.equal(normalised.questions[0]?.questionOrder, 2);
  assert.equal(normalised.questions[0]?.questionText, 'What happens next?');
  assert.equal(normalised.options[0]?.optionKey, 'A');
  assert.equal(normalised.options[0]?.optionOrder, 1);
  assert.equal(normalised.options[0]?.isScored, true);
  assert.equal(normalised.optionWeights[0]?.weight, 1.5);
  assert.equal(getNormalisedRuntimeDefinitionCount(normalised), 4);
});

test('result content rows preserve score shape, rank position, pattern keys, and field values', () => {
  const normalised = normaliseRankedPatternWorkbook(
    parsedWorkbook({
      '06_Orientation': parsedSheet('06_Orientation', [
        parsedRow({
          domain_key: 'domain_key',
          pattern_key: 'signal_a_signal_b_signal_c_signal_d',
          score_shape: 'concentrated',
          rank_1_signal_key: 'signal_a',
          rank_2_signal_key: 'signal_b',
          rank_3_signal_key: 'signal_c',
          rank_4_signal_key: 'signal_d',
          orientation_title: 'Orientation title',
          orientation_summary: 'Orientation summary',
          status: 'active',
          lookup_key: 'orientation::1',
        }),
      ]),
      '08_Signal_Roles': parsedSheet('08_Signal_Roles', [
        parsedRow({
          domain_key: 'domain_key',
          signal_key: 'signal_a',
          signal_label: 'Signal A',
          rank_position: '4',
          rank_role: 'supporting',
          title: 'Role title',
          description: 'Role description',
          status: 'active',
          lookup_key: 'role::a::4',
        }),
      ]),
    }),
  );

  assert.equal(normalised.orientation[0]?.scoreShape, 'concentrated');
  assert.equal(normalised.orientation[0]?.patternKey, 'signal_a_signal_b_signal_c_signal_d');
  assert.equal(normalised.orientation[0]?.fieldValues.orientation_title, 'Orientation title');
  assert.equal(normalised.signalRoles[0]?.rankPosition, 4);
  assert.equal(normalised.signalRoles[0]?.fieldValues.title, 'Role title');
  assert.equal(getNormalisedRuntimeResultContentCount(normalised), 2);
});

test('Flow State workbook runtime result content rows normalise as publishable active rows', () => {
  const normalised = normaliseRankedPatternWorkbook(
    parseRankedPatternWorkbookFile(
      'content/assessment-packages/flow-state/sonartra_reader_first_import_schema_FLOW_STATE_EXAMPLE.xlsx',
    ),
  );
  const runtimeSections = [
    normalised.context,
    normalised.orientation,
    normalised.recognition,
    normalised.signalRoles,
    normalised.patternMechanics,
    normalised.patternSynthesis,
    normalised.strengths,
    normalised.narrowing,
    normalised.application,
    normalised.closingIntegration,
  ];

  assert.equal(normalised.orientation.length, 96);
  assert.equal(normalised.orientation.every((row) => row.status === 'active'), true);
  assert.equal(runtimeSections.flat().every((row) => row.status === 'active'), true);
});

test('invalid score shape, rank position, pattern order, mode, model, and weight produce diagnostics', () => {
  const normalised = normaliseRankedPatternWorkbook(
    parsedWorkbook({
      '00_Metadata': parsedSheet('00_Metadata', [
        parsedRow({
          mode: 'unsupported_mode',
          result_model_key: 'unsupported_model',
          lookup_key: 'metadata::bad',
        }),
      ]),
      '04_Option_Weights': parsedSheet('04_Option_Weights', [
        parsedRow({ weight: 'not-a-number', lookup_key: 'weight::bad' }),
      ]),
      '06_Orientation': parsedSheet('06_Orientation', [
        parsedRow({
          pattern_key: 'signal_a_signal_b_signal_d_signal_c',
          score_shape: 'unsupported_shape',
          rank_1_signal_key: 'signal_a',
          rank_2_signal_key: 'signal_b',
          rank_3_signal_key: 'signal_c',
          rank_4_signal_key: 'signal_d',
          lookup_key: 'orientation::bad',
        }),
      ]),
      '08_Signal_Roles': parsedSheet('08_Signal_Roles', [
        parsedRow({ rank_position: '5', lookup_key: 'role::bad' }),
      ]),
    }),
  );
  const codes = new Set(normalised.diagnostics.map((diagnostic) => diagnostic.code));

  assert.equal(codes.has('UNSUPPORTED_ASSESSMENT_MODE'), true);
  assert.equal(codes.has('UNSUPPORTED_RESULT_MODEL'), true);
  assert.equal(codes.has('INVALID_NUMBER'), true);
  assert.equal(codes.has('UNSUPPORTED_SCORE_SHAPE'), true);
  assert.equal(codes.has('UNSUPPORTED_RANK_POSITION'), true);
  assert.equal(codes.has('PATTERN_KEY_RANK_ORDER_MISMATCH'), true);
  assert.equal(normalised.optionWeights[0]?.weight, null);
  assert.equal(normalised.signalRoles[0]?.rankPosition, 5);
});

test('admin support sheets normalise as admin/import records only', () => {
  const normalised = normaliseRankedPatternWorkbook(
    parsedWorkbook({
      '15_Report_Preview': parsedSheet('15_Report_Preview', [
        parsedRow({
          preview_case_key: 'case_1',
          assessment_key: 'assessment_key',
          version: '1',
          domain_key: 'domain_key',
          rank_1_signal_key: 'signal_a',
          rank_2_signal_key: 'signal_b',
          rank_3_signal_key: 'signal_c',
          rank_4_signal_key: 'signal_d',
          normalized_rank_1_percentage: '40',
          normalized_rank_2_percentage: '30',
          normalized_rank_3_percentage: '20',
          normalized_rank_4_percentage: '10',
          expected_score_shape: 'balanced',
          expected_pattern_key: 'signal_a_signal_b_signal_c_signal_d',
          expected_payload_sections: 'context,orientation',
          status: 'draft',
          lookup_key: 'preview::1',
        }),
      ]),
      '16_Import_Summary': parsedSheet('16_Import_Summary', [
        parsedRow({
          import_summary_key: 'summary_1',
          runtime_definition_row_count: '5',
          runtime_result_content_row_count: '10',
          preview_row_count: '1',
          lookup_key: 'summary::1',
        }),
      ]),
      '17_Validation_Reference': parsedSheet('17_Validation_Reference', [
        parsedRow({ validation_rule_key: 'rule_1', severity: 'ERROR', lookup_key: 'rule::1' }),
      ]),
      '18_Lookups': parsedSheet('18_Lookups', [
        parsedRow({ lookup_group: 'statuses', lookup_key: 'active', lookup_value: 'active' }),
      ]),
    }),
  );

  assert.equal(normalised.reportPreviewCases[0]?.previewCaseKey, 'case_1');
  assert.deepEqual(normalised.reportPreviewCases[0]?.normalisedScores, [40, 30, 20, 10]);
  assert.equal(normalised.importSummaryRows[0]?.runtimeDefinitionRowCount, 5);
  assert.equal(normalised.validationReferenceRows[0]?.severity, 'error');
  assert.equal(normalised.lookupRows[0]?.lookupGroup, 'statuses');
  assert.equal(getNormalisedAdminImportSupportCount(normalised), 4);
  assert.equal(getNormalisedRuntimeResultContentCount(normalised), 0);
});

test('audit wrapper exposes normalisation counts and diagnostics without changing row output', () => {
  const audit = auditParsedRankedPatternWorkbook(
    parsedWorkbook({
      '04_Option_Weights': parsedSheet('04_Option_Weights', [
        parsedRow({ weight: 'bad', lookup_key: 'weight::bad' }, 7),
      ]),
    }),
  );

  assert.equal(audit.normalisedCounts.runtimeDefinition, 1);
  assert.equal(audit.normalisationDiagnosticCounts.error, 1);
  assert.equal(audit.normalisationDiagnostics[0]?.rowNumber, 7);
  assert.equal(audit.normalisationDiagnostics[0]?.code, 'INVALID_NUMBER');
});
