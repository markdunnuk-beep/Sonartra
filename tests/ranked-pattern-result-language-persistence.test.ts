import test from 'node:test';
import assert from 'node:assert/strict';

import type { RankedPatternImportSheetKey } from '@/content/assessment-packages/import-contract/ranked-pattern-import-manifest';
import { normaliseRankedPatternWorkbook } from '@/content/assessment-packages/import-contract/ranked-pattern-import-normalise';
import {
  persistRankedPatternResultLanguage,
  planRankedPatternResultLanguagePersistence,
} from '@/content/assessment-packages/import-contract/ranked-pattern-import-persistence';
import { parseRankedPatternWorkbookFile } from '@/content/assessment-packages/import-contract/ranked-pattern-workbook-parser';
import type {
  ParsedRankedPatternWorkbookFile,
  ParsedRankedPatternWorkbookRow,
  ParsedRankedPatternWorkbookSheet,
} from '@/content/assessment-packages/import-contract/ranked-pattern-workbook-parser';

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
    category:
      sheetKey < '05_Context'
        ? 'runtime_definition'
        : sheetKey < '15_Report_Preview'
          ? 'runtime_result_content'
          : 'admin_import_support',
    headers: Object.freeze(Object.keys(rows[0]?.values ?? {})),
    rows,
    rowCount: rows.length,
    emptyRowCount: 0,
  });
}

function workbook(
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

function patternRow(overrides: Readonly<Record<string, unknown>> = {}, rowNumber = 2) {
  return parsedRow(
    {
      domain_key: 'domain_key',
      pattern_key: 'signal_a_signal_b_signal_c_signal_d',
      score_shape: 'balanced',
      rank_1_signal_key: 'signal_a',
      rank_2_signal_key: 'signal_b',
      rank_3_signal_key: 'signal_c',
      rank_4_signal_key: 'signal_d',
      headline: 'Headline',
      recognition_statement: 'Recognition statement',
      status: 'active',
      lookup_key: 'pattern::balanced',
      ...overrides,
    },
    rowNumber,
  );
}

function baseResultWorkbook(
  overrides: Partial<Record<RankedPatternImportSheetKey, ParsedRankedPatternWorkbookSheet>> = {},
): ParsedRankedPatternWorkbookFile {
  return workbook({
    '00_Metadata': parsedSheet('00_Metadata', [
      parsedRow({
        domain_key: 'domain_key',
        model: 'single_domain_ranked_pattern',
        mode: 'single_domain',
        status: 'active',
      }),
    ]),
    '05_Context': parsedSheet('05_Context', [
      parsedRow({
        domain_key: 'domain_key',
        section_key: 'context',
        domain_title: 'Domain',
        domain_definition: 'Definition',
        status: 'active',
        lookup_key: 'context::domain',
      }),
    ]),
    '06_Orientation': parsedSheet('06_Orientation', [
      patternRow({
        orientation_title: 'Orientation',
        orientation_summary: 'Summary',
        lookup_key: 'orientation::balanced',
      }),
    ]),
    '07_Recognition': parsedSheet('07_Recognition', [patternRow({ lookup_key: 'recognition::balanced' })]),
    '08_Signal_Roles': parsedSheet('08_Signal_Roles', [
      parsedRow({
        domain_key: 'domain_key',
        signal_key: 'signal_a',
        signal_label: 'Signal A',
        rank_position: '1',
        title: 'Role',
        description: 'Role description',
        status: 'active',
        lookup_key: 'role::a::1',
      }),
    ]),
    '09_Pattern_Mechanics': parsedSheet('09_Pattern_Mechanics', [
      patternRow({ mechanics_title: 'Mechanics', lookup_key: 'mechanics::balanced' }),
    ]),
    '10_Pattern_Synthesis': parsedSheet('10_Pattern_Synthesis', [
      patternRow({ synthesis_title: 'Synthesis', lookup_key: 'synthesis::balanced' }),
    ]),
    '11_Strengths': parsedSheet('11_Strengths', [
      parsedRow({
        domain_key: 'domain_key',
        pattern_key: 'signal_a_signal_b_signal_c_signal_d',
        strength_key: 'strength_1',
        priority: '1',
        strength_title: 'Strength',
        strength_text: 'Strength text',
        linked_signal_key: 'signal_a',
        status: 'active',
        lookup_key: 'strength::1',
      }),
    ]),
    '12_Narrowing': parsedSheet('12_Narrowing', [
      parsedRow({
        domain_key: 'domain_key',
        pattern_key: 'signal_a_signal_b_signal_c_signal_d',
        narrowing_key: 'narrowing_1',
        priority: '1',
        narrowing_title: 'Narrowing',
        narrowing_text: 'Narrowing text',
        missing_range_signal_key: 'signal_d',
        status: 'active',
        lookup_key: 'narrowing::1',
      }),
    ]),
    '13_Application': parsedSheet('13_Application', [
      parsedRow({
        domain_key: 'domain_key',
        pattern_key: 'signal_a_signal_b_signal_c_signal_d',
        application_key: 'application_1',
        priority: '1',
        application_title: 'Application',
        application_text: 'Application text',
        linked_signal_key: 'signal_a',
        status: 'active',
        lookup_key: 'application::1',
      }),
    ]),
    '14_Closing_Integration': parsedSheet('14_Closing_Integration', [
      parsedRow({
        domain_key: 'domain_key',
        pattern_key: 'signal_a_signal_b_signal_c_signal_d',
        score_shape: 'balanced',
        closing_summary: 'Closing',
        status: 'active',
        lookup_key: 'closing::balanced',
      }),
    ]),
    '15_Report_Preview': parsedSheet('15_Report_Preview', [
      parsedRow({
        preview_case_key: 'case_1',
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
        status: 'active',
        lookup_key: 'preview::1',
      }),
    ]),
    '16_Import_Summary': parsedSheet('16_Import_Summary', [
      parsedRow({ import_summary_key: 'summary_1', status: 'active', lookup_key: 'summary::1' }),
    ]),
    '18_Lookups': parsedSheet('18_Lookups', [
      parsedRow({ lookup_group: 'statuses', lookup_key: 'active', lookup_value: 'active' }),
    ]),
    ...overrides,
  });
}

function planFromWorkbook(
  parsedWorkbook: ParsedRankedPatternWorkbookFile,
  assessmentVersionId = 'assessment-version-id',
) {
  return planRankedPatternResultLanguagePersistence({
    normalisedPackage: normaliseRankedPatternWorkbook(parsedWorkbook),
    assessmentVersionId,
    dryRun: true,
  });
}

function permutations<T>(items: readonly T[]): readonly (readonly T[])[] {
  if (items.length === 0) {
    return Object.freeze([Object.freeze([])]);
  }

  return Object.freeze(
    items.flatMap((item, index) =>
      permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) =>
        Object.freeze([item, ...rest]),
      ),
    ),
  );
}

test('dry-run planner creates section definitions exactly for runtime result sheets 05 through 14', () => {
  const plan = planFromWorkbook(baseResultWorkbook());
  const sectionDefinitionOps = plan.operations.filter(
    (operation) => operation.table === 'assessment_result_section_definitions',
  );
  const sourceSheets = sectionDefinitionOps.map((operation) => operation.sourceSheetKey);

  assert.equal(sectionDefinitionOps.length, 10);
  assert.deepEqual(sourceSheets, [
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
  ]);
  assert.equal(sourceSheets.includes('15_Report_Preview'), false);
  assert.equal(sourceSheets.includes('18_Lookups'), false);
});

test('dry-run planner creates result language rows for sheets 05 through 14 only', () => {
  const plan = planFromWorkbook(baseResultWorkbook());
  const languageOps = plan.operations.filter(
    (operation) => operation.table === 'assessment_result_language_rows',
  );
  const sourceSheets = new Set(languageOps.map((operation) => operation.sourceSheetKey));

  assert.equal(languageOps.length, 10);
  assert.equal(sourceSheets.has('05_Context'), true);
  assert.equal(sourceSheets.has('14_Closing_Integration'), true);
  assert.equal(sourceSheets.has('15_Report_Preview'), false);
  assert.equal(sourceSheets.has('16_Import_Summary'), false);
  assert.equal(sourceSheets.has('18_Lookups'), false);
});

test('dry-run planner creates preview cases without creating runtime result rows for preview sheet', () => {
  const plan = planFromWorkbook(baseResultWorkbook());

  assert.equal(plan.operationCountsByTable.assessment_report_preview_cases, 1);
  assert.equal(
    plan.operations.some(
      (operation) =>
        operation.table === 'assessment_result_language_rows' &&
        operation.sourceSheetKey === '15_Report_Preview',
    ),
    false,
  );
});

test('ranked patterns are derived and duplicate matching tuples are deduplicated', () => {
  const plan = planFromWorkbook(
    baseResultWorkbook({
      '06_Orientation': parsedSheet('06_Orientation', [
        patternRow({ lookup_key: 'orientation::balanced::1' }, 2),
        patternRow({ lookup_key: 'orientation::balanced::2' }, 3),
      ]),
    }),
  );

  assert.equal(plan.operationCountsByTable.assessment_ranked_patterns, 1);
  assert.equal(
    plan.diagnostics.some((diagnostic) => diagnostic.code === 'CONFLICTING_RANKED_PATTERN_TUPLE'),
    false,
  );
});

test('ranked pattern derivation merges active status from matching rank-bearing sections', () => {
  const plan = planFromWorkbook(
    baseResultWorkbook({
      '06_Orientation': parsedSheet('06_Orientation', [
        patternRow({ status: 'draft', lookup_key: 'orientation::balanced' }, 2),
      ]),
      '07_Recognition': parsedSheet('07_Recognition', [
        patternRow({ status: 'active', lookup_key: 'recognition::balanced' }, 3),
      ]),
    }),
  );
  const rankedPatternOps = plan.operations.filter(
    (operation) => operation.table === 'assessment_ranked_patterns',
  );

  assert.equal(rankedPatternOps.length, 1);
  assert.equal(rankedPatternOps[0]?.values.status, 'active');
  assert.equal(
    plan.diagnostics.some((diagnostic) => diagnostic.code === 'RESULT_LANGUAGE_UNKNOWN_PATTERN'),
    false,
  );
});

test('conflicting duplicate pattern tuple is blocked with source row number', () => {
  const plan = planFromWorkbook(
    baseResultWorkbook({
      '06_Orientation': parsedSheet('06_Orientation', [
        patternRow({ lookup_key: 'orientation::balanced::1' }, 2),
        patternRow(
          {
            rank_4_signal_key: 'signal_x',
            lookup_key: 'orientation::balanced::2',
          },
          9,
        ),
      ]),
    }),
  );
  const conflict = plan.diagnostics.find(
    (diagnostic) => diagnostic.code === 'CONFLICTING_RANKED_PATTERN_TUPLE',
  );

  assert.equal(conflict?.rowNumber, 9);
});

test('active result language rows cannot reference an unknown ranked pattern', () => {
  const plan = planFromWorkbook(
    baseResultWorkbook({
      '11_Strengths': parsedSheet('11_Strengths', [
        parsedRow(
          {
            domain_key: 'domain_key',
            pattern_key: 'signal_a_signal_b_signal_d_signal_c',
            strength_key: 'strength_1',
            priority: '1',
            strength_title: 'Strength',
            strength_text: 'Strength text',
            linked_signal_key: 'signal_a',
            status: 'active',
            lookup_key: 'strength::unknown',
          },
          11,
        ),
      ]),
    }),
  );
  const unknownPattern = plan.diagnostics.find(
    (diagnostic) => diagnostic.code === 'RESULT_LANGUAGE_UNKNOWN_PATTERN',
  );

  assert.equal(unknownPattern?.sheetKey, '11_Strengths');
  assert.equal(unknownPattern?.rowNumber, 11);
});

test('non-rank-bearing pattern rows are accepted when they resolve to a derived pattern', () => {
  const plan = planFromWorkbook(baseResultWorkbook());

  assert.equal(
    plan.diagnostics.some((diagnostic) => diagnostic.code === 'RESULT_LANGUAGE_UNKNOWN_PATTERN'),
    false,
  );
});

test('pattern key mismatch, invalid score shape, and invalid rank position are blocked', () => {
  const plan = planFromWorkbook(
    baseResultWorkbook({
      '06_Orientation': parsedSheet('06_Orientation', [
        patternRow(
          {
            pattern_key: 'signal_a_signal_b_signal_d_signal_c',
            score_shape: 'unsupported_shape',
            lookup_key: 'orientation::bad',
          },
          5,
        ),
      ]),
      '08_Signal_Roles': parsedSheet('08_Signal_Roles', [
        parsedRow(
          {
            domain_key: 'domain_key',
            signal_key: 'signal_a',
            rank_position: '5',
            title: 'Role',
            status: 'active',
            lookup_key: 'role::bad',
          },
          8,
        ),
      ]),
    }),
  );
  const codes = new Set(plan.diagnostics.map((diagnostic) => diagnostic.code));

  assert.equal(codes.has('PATTERN_KEY_RANK_ORDER_MISMATCH'), true);
  assert.equal(codes.has('UNSUPPORTED_SCORE_SHAPE'), true);
  assert.equal(codes.has('UNSUPPORTED_RANK_POSITION'), true);
});

test('all twenty-four permutations of four generic signals are accepted by the planner', () => {
  const signalPermutations = permutations(['signal_a', 'signal_b', 'signal_c', 'signal_d']);
  const patternRows = signalPermutations.map((signals, index) =>
    patternRow(
      {
        pattern_key: signals.join('_'),
        rank_1_signal_key: signals[0],
        rank_2_signal_key: signals[1],
        rank_3_signal_key: signals[2],
        rank_4_signal_key: signals[3],
        lookup_key: `orientation::${index + 1}`,
      },
      index + 2,
    ),
  );
  const plan = planFromWorkbook(
    baseResultWorkbook({
      '06_Orientation': parsedSheet('06_Orientation', patternRows),
      '07_Recognition': parsedSheet('07_Recognition', []),
      '09_Pattern_Mechanics': parsedSheet('09_Pattern_Mechanics', []),
      '10_Pattern_Synthesis': parsedSheet('10_Pattern_Synthesis', []),
      '11_Strengths': parsedSheet('11_Strengths', []),
      '12_Narrowing': parsedSheet('12_Narrowing', []),
      '13_Application': parsedSheet('13_Application', []),
      '14_Closing_Integration': parsedSheet('14_Closing_Integration', []),
    }),
  );

  assert.equal(plan.operationCountsByTable.assessment_ranked_patterns, 24);
  assert.equal(
    plan.diagnostics.some((diagnostic) =>
      [
        'CONFLICTING_RANKED_PATTERN_TUPLE',
        'PATTERN_KEY_RANK_ORDER_MISMATCH',
        'RESULT_LANGUAGE_UNKNOWN_PATTERN',
      ].includes(diagnostic.code),
    ),
    false,
  );
});

test('Flow State workbook plans twenty-four active ranked patterns without unknown result-language patterns', () => {
  const parsedWorkbook = parseRankedPatternWorkbookFile(
    'content/assessment-packages/flow-state/sonartra_reader_first_import_schema_FLOW_STATE_EXAMPLE.xlsx',
  );
  const plan = planFromWorkbook(parsedWorkbook);
  const activeRankedPatternOps = plan.operations.filter(
    (operation) =>
      operation.table === 'assessment_ranked_patterns' && operation.values.status === 'active',
  );

  assert.equal(activeRankedPatternOps.length, 24);
  assert.equal(
    plan.diagnostics.some((diagnostic) => diagnostic.code === 'RESULT_LANGUAGE_UNKNOWN_PATTERN'),
    false,
  );
});

test('result language rows preserve field values', () => {
  const plan = planFromWorkbook(baseResultWorkbook());
  const contextOperation = plan.operations.find(
    (operation) =>
      operation.table === 'assessment_result_language_rows' && operation.sourceSheetKey === '05_Context',
  );

  assert.deepEqual(contextOperation?.values.field_values, {
    domain_title: 'Domain',
    domain_definition: 'Definition',
  });
});

test('dry-run result returns plan without database writes', async () => {
  const result = await persistRankedPatternResultLanguage({
    normalisedPackage: normaliseRankedPatternWorkbook(baseResultWorkbook()),
    assessmentVersionId: 'assessment-version-id',
    dryRun: true,
  });

  assert.equal(result.dryRun, true);
  assert.equal(result.countsByTable.assessment_result_language_rows, 0);
  assert.equal(result.plan.operationCountsByTable.assessment_result_language_rows, 10);
});

test('apply mode aborts before database connect when blocking diagnostics exist', async () => {
  let connected = false;
  const result = await persistRankedPatternResultLanguage({
    normalisedPackage: normaliseRankedPatternWorkbook(
      baseResultWorkbook({
        '06_Orientation': parsedSheet('06_Orientation', [
          patternRow({ pattern_key: 'bad_pattern', lookup_key: 'orientation::bad' }),
        ]),
      }),
    ),
    assessmentVersionId: 'assessment-version-id',
    dryRun: false,
    db: {
      async connect() {
        connected = true;
        throw new Error('SHOULD_NOT_CONNECT');
      },
    },
  });

  assert.equal(connected, false);
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.severity === 'error'), true);
});
