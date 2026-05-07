import test from 'node:test';
import assert from 'node:assert/strict';

import type { RankedPatternImportSheetKey } from '@/content/assessment-packages/import-contract/ranked-pattern-import-manifest';
import { normaliseRankedPatternWorkbook } from '@/content/assessment-packages/import-contract/ranked-pattern-import-normalise';
import {
  persistRankedPatternRuntimeDefinition,
  planRankedPatternRuntimeDefinitionPersistence,
} from '@/content/assessment-packages/import-contract/ranked-pattern-import-persistence';
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

function baseRuntimeDefinitionWorkbook(
  overrides: Partial<Record<RankedPatternImportSheetKey, ParsedRankedPatternWorkbookSheet>> = {},
): ParsedRankedPatternWorkbookFile {
  const signals = ['signal_a', 'signal_b', 'signal_c', 'signal_d'];
  const questionRows = [
    parsedRow({
      domain_key: 'domain_key',
      question_key: 'question_1',
      question_order: '1',
      question_text: 'Question text',
      status: 'active',
      lookup_key: 'question::1',
    }),
  ];
  const optionRows = [
    parsedRow({
      domain_key: 'domain_key',
      question_key: 'question_1',
      option_key: 'A',
      option_order: 'A',
      option_text: 'Option text',
      is_scored: 'true',
      status: 'active',
      lookup_key: 'option::1::a',
    }),
  ];

  return workbook({
    '00_Metadata': parsedSheet('00_Metadata', [
      parsedRow({
        assessment_key: 'assessment_key',
        version: '1',
        assessment_title: 'Assessment title',
        assessment_description: 'Assessment description',
        model: 'single_domain_ranked_pattern',
        mode: 'single_domain',
        result_model_key: 'ranked_pattern',
        domain_key: 'domain_key',
        domain_title: 'Domain title',
        lifecycle_status: 'draft',
        status: 'active',
        lookup_key: 'metadata::1',
      }),
    ]),
    '01_Signals': parsedSheet(
      '01_Signals',
      signals.map((signalKey, index) =>
        parsedRow(
          {
            domain_key: 'domain_key',
            signal_key: signalKey,
            signal_label: `Signal ${index + 1}`,
            signal_description: 'Signal description',
            signal_order: String(index + 1),
            scored: 'true',
            status: 'active',
            lookup_key: `signal::${index + 1}`,
          },
          index + 2,
        ),
      ),
    ),
    '02_Questions': parsedSheet('02_Questions', questionRows),
    '03_Options': parsedSheet('03_Options', optionRows),
    '04_Option_Weights': parsedSheet('04_Option_Weights', [
      parsedRow({
        domain_key: 'domain_key',
        question_key: 'question_1',
        option_key: 'A',
        signal_key: 'signal_a',
        weight: '1',
        status: 'active',
        lookup_key: 'weight::1::a',
      }),
    ]),
    ...overrides,
  });
}

function planFromWorkbook(
  parsedWorkbook: ParsedRankedPatternWorkbookFile,
) {
  return planRankedPatternRuntimeDefinitionPersistence(normaliseRankedPatternWorkbook(parsedWorkbook));
}

test('dry-run planner accepts repeated A-D option keys across different questions', () => {
  const optionKeys = ['A', 'B', 'C', 'D'];
  const questions = ['question_1', 'question_2'];
  const plan = planFromWorkbook(
    baseRuntimeDefinitionWorkbook({
      '02_Questions': parsedSheet(
        '02_Questions',
        questions.map((questionKey, index) =>
          parsedRow(
            {
              domain_key: 'domain_key',
              question_key: questionKey,
              question_order: String(index + 1),
              question_text: `Question ${index + 1}`,
              status: 'active',
              lookup_key: `question::${index + 1}`,
            },
            index + 2,
          ),
        ),
      ),
      '03_Options': parsedSheet(
        '03_Options',
        questions.flatMap((questionKey, questionIndex) =>
          optionKeys.map((optionKey, optionIndex) =>
            parsedRow(
              {
                domain_key: 'domain_key',
                question_key: questionKey,
                option_key: optionKey,
                option_order: optionKey,
                option_text: `Option ${optionKey} for ${questionKey}`,
                is_scored: 'true',
                status: 'active',
                lookup_key: `option::${questionIndex + 1}::${optionKey.toLowerCase()}`,
              },
              questionIndex * optionKeys.length + optionIndex + 2,
            ),
          ),
        ),
      ),
      '04_Option_Weights': parsedSheet(
        '04_Option_Weights',
        questions.flatMap((questionKey, questionIndex) =>
          optionKeys.map((optionKey, optionIndex) =>
            parsedRow(
              {
                domain_key: 'domain_key',
                question_key: questionKey,
                option_key: optionKey,
                signal_key: `signal_${optionKey.toLowerCase()}`,
                weight: '1',
                status: 'active',
                lookup_key: `weight::${questionIndex + 1}::${optionKey.toLowerCase()}`,
              },
              questionIndex * optionKeys.length + optionIndex + 2,
            ),
          ),
        ),
      ),
    }),
  );

  assert.deepEqual(plan.diagnostics, []);
  assert.equal(plan.operationCountsByTable.questions, 2);
  assert.equal(plan.operationCountsByTable.options, 8);
  assert.equal(plan.operationCountsByTable.option_signal_weights, 8);
  assert.equal(plan.operations.some((operation) => operation.key === 'question_1::A'), true);
  assert.equal(plan.operations.some((operation) => operation.key === 'question_2::A'), true);
  assert.equal(
    plan.operations.some(
      (operation) =>
        operation.table === 'option_signal_weights'
        && operation.key === 'question_2::A::signal_a'
        && operation.values.question_key === 'question_2'
        && operation.values.option_key === 'A'
        && operation.values.signal_key === 'signal_a',
    ),
    true,
  );
});

test('dry-run planner rejects duplicate option keys within the same question', () => {
  const plan = planFromWorkbook(
    baseRuntimeDefinitionWorkbook({
      '03_Options': parsedSheet('03_Options', [
        parsedRow({
          domain_key: 'domain_key',
          question_key: 'question_1',
          option_key: 'A',
          option_order: '1',
          option_text: 'First option text',
          is_scored: 'true',
          status: 'active',
          lookup_key: 'option::1::a',
        }),
        parsedRow(
          {
            domain_key: 'domain_key',
            question_key: 'question_1',
            option_key: 'A',
            option_order: '2',
            option_text: 'Duplicate option text',
            is_scored: 'true',
            status: 'active',
            lookup_key: 'option::1::a-duplicate',
          },
          3,
        ),
      ]),
    }),
  );

  const duplicate = plan.diagnostics.find(
    (diagnostic) => diagnostic.code === 'DUPLICATE_QUESTION_OPTION_KEY',
  );

  assert.equal(duplicate?.rowNumber, 3);
  assert.equal(duplicate?.fieldKey, 'option_key');
});

test('dry-run planner accepts one single-domain ranked-pattern metadata row', () => {
  const plan = planFromWorkbook(baseRuntimeDefinitionWorkbook());

  assert.equal(plan.assessmentKey, 'assessment_key');
  assert.equal(plan.version, '1');
  assert.equal(plan.domainKey, 'domain_key');
  assert.deepEqual(plan.diagnostics, []);
  assert.equal(plan.operationCountsByTable.assessments, 1);
  assert.equal(plan.operationCountsByTable.assessment_versions, 1);
  assert.equal(plan.operationCountsByTable.domains, 1);
});

test('dry-run planner rejects unsupported mode and result model key', () => {
  const plan = planFromWorkbook(
    baseRuntimeDefinitionWorkbook({
      '00_Metadata': parsedSheet('00_Metadata', [
        parsedRow({
          assessment_key: 'assessment_key',
          version: '1',
          mode: 'unsupported_mode',
          result_model_key: 'unsupported_model',
          domain_key: 'domain_key',
          status: 'active',
          lookup_key: 'metadata::bad',
        }),
      ]),
    }),
  );
  const codes = new Set(plan.diagnostics.map((diagnostic) => diagnostic.code));

  assert.equal(codes.has('UNSUPPORTED_ASSESSMENT_MODE'), true);
  assert.equal(codes.has('UNSUPPORTED_RESULT_MODEL'), true);
});

test('dry-run planner accepts legacy-compatible model when result model key is absent', () => {
  const plan = planFromWorkbook(
    baseRuntimeDefinitionWorkbook({
      '00_Metadata': parsedSheet('00_Metadata', [
        parsedRow({
          assessment_key: 'assessment_key',
          version: '1',
          model: 'single_domain_ranked_pattern',
          mode: 'single_domain',
          domain_key: 'domain_key',
          status: 'active',
          lookup_key: 'metadata::legacy-compatible',
        }),
      ]),
    }),
  );

  assert.equal(
    plan.diagnostics.some((diagnostic) => diagnostic.code === 'UNSUPPORTED_RESULT_MODEL'),
    false,
  );
  assert.equal(plan.operationCountsByTable.assessment_versions, 1);
});

test('dry-run planner requires exactly four active scored signals', () => {
  const plan = planFromWorkbook(
    baseRuntimeDefinitionWorkbook({
      '01_Signals': parsedSheet('01_Signals', [
        parsedRow({
          domain_key: 'domain_key',
          signal_key: 'signal_a',
          signal_label: 'Signal A',
          signal_order: '1',
          scored: 'true',
          status: 'active',
          lookup_key: 'signal::a',
        }),
      ]),
    }),
  );

  assert.equal(
    plan.diagnostics.some((diagnostic) => diagnostic.code === 'INVALID_ACTIVE_SIGNAL_COUNT'),
    true,
  );
});

test('dry-run planner rejects option weights that reference unknown options or signals', () => {
  const plan = planFromWorkbook(
    baseRuntimeDefinitionWorkbook({
      '04_Option_Weights': parsedSheet('04_Option_Weights', [
        parsedRow(
          {
            domain_key: 'domain_key',
            question_key: 'question_1',
            option_key: 'Z',
            signal_key: 'signal_z',
            weight: '1',
            status: 'active',
            lookup_key: 'weight::bad',
          },
          42,
        ),
      ]),
    }),
  );
  const unknownOption = plan.diagnostics.find(
    (diagnostic) => diagnostic.code === 'WEIGHT_UNKNOWN_OPTION',
  );
  const unknownSignal = plan.diagnostics.find(
    (diagnostic) => diagnostic.code === 'WEIGHT_UNKNOWN_SIGNAL',
  );

  assert.equal(unknownOption?.rowNumber, 42);
  assert.equal(unknownSignal?.rowNumber, 42);
});

test('dry-run planner produces operations only for runtime definition sheets 00 through 04', () => {
  const plan = planFromWorkbook(
    baseRuntimeDefinitionWorkbook({
      '05_Context': parsedSheet('05_Context', [
        parsedRow({ domain_key: 'domain_key', status: 'active', lookup_key: 'context::1' }),
      ]),
      '18_Lookups': parsedSheet('18_Lookups', [
        parsedRow({ lookup_group: 'statuses', lookup_key: 'active', status: 'active' }),
      ]),
    }),
  );
  const sourceSheets = new Set(plan.operations.map((operation) => operation.sourceSheetKey));

  assert.equal(sourceSheets.has('00_Metadata'), true);
  assert.equal(sourceSheets.has('01_Signals'), true);
  assert.equal(sourceSheets.has('02_Questions'), true);
  assert.equal(sourceSheets.has('03_Options'), true);
  assert.equal(sourceSheets.has('04_Option_Weights'), true);
  assert.equal(sourceSheets.has('05_Context'), false);
  assert.equal(sourceSheets.has('18_Lookups'), false);
});

test('dry-run result returns plan without requiring a database client', async () => {
  const normalisedPackage = normaliseRankedPatternWorkbook(baseRuntimeDefinitionWorkbook());
  const result = await persistRankedPatternRuntimeDefinition({
    normalisedPackage,
    dryRun: true,
  });

  assert.equal(result.dryRun, true);
  assert.equal(result.assessmentId, null);
  assert.equal(result.assessmentVersionId, null);
  assert.equal(result.plan.operationCountsByTable.option_signal_weights, 1);
});

test('apply mode aborts before database writes when blocking diagnostics exist', async () => {
  let connected = false;
  const normalisedPackage = normaliseRankedPatternWorkbook(
    baseRuntimeDefinitionWorkbook({
      '01_Signals': parsedSheet('01_Signals', []),
    }),
  );

  const result = await persistRankedPatternRuntimeDefinition({
    normalisedPackage,
    dryRun: false,
    db: {
      async connect() {
        connected = true;
        throw new Error('SHOULD_NOT_CONNECT');
      },
    },
  });

  assert.equal(connected, false);
  assert.equal(result.assessmentId, null);
  assert.equal(
    result.diagnostics.some((diagnostic) => diagnostic.code === 'INVALID_ACTIVE_SIGNAL_COUNT'),
    true,
  );
});
