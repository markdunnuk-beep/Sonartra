import {
  buildPatternKeyFromRankedSignalKeys,
  rankedPatternAssessmentMode,
  rankedPatternImportSheetKeys,
  rankedPatternResultModelKey,
  rankedPatternSupportedRankPositions,
  rankedPatternSupportedScoreShapes,
  type RankedPatternImportSheetKey,
} from './ranked-pattern-import-manifest';
import type { RankedPatternImportDiagnostic } from './ranked-pattern-import-validation';
import type {
  ParsedRankedPatternWorkbookFile,
  ParsedRankedPatternWorkbookRow,
  ParsedRankedPatternWorkbookSheet,
} from './ranked-pattern-workbook-parser';

export type NormalisedFieldValues = Readonly<Record<string, string | number | boolean | null>>;

export type NormalisedSourceRecord = {
  readonly sourceSheetKey: RankedPatternImportSheetKey;
  readonly sourceRowNumber: number;
  readonly sourceValues: Readonly<Record<string, unknown>>;
  readonly status: string | null;
  readonly lookupKey: string | null;
  readonly domainKey?: string | null;
};

export type NormalisedMetadataRecord = NormalisedSourceRecord & {
  readonly sourceSheetKey: '00_Metadata';
  readonly assessmentKey: string | null;
  readonly version: string | null;
  readonly assessmentTitle: string | null;
  readonly assessmentDescription: string | null;
  readonly model: string | null;
  readonly mode: string | null;
  readonly resultModelKey: string | null;
  readonly domainKey: string | null;
  readonly domainTitle: string | null;
  readonly lifecycleStatus: string | null;
};

export type NormalisedSignalRecord = NormalisedSourceRecord & {
  readonly sourceSheetKey: '01_Signals';
  readonly domainKey: string | null;
  readonly signalKey: string | null;
  readonly signalLabel: string | null;
  readonly signalDescription: string | null;
  readonly signalOrder: number | null;
  readonly scored: boolean | null;
};

export type NormalisedQuestionRecord = NormalisedSourceRecord & {
  readonly sourceSheetKey: '02_Questions';
  readonly domainKey: string | null;
  readonly questionKey: string | null;
  readonly questionOrder: number | null;
  readonly questionText: string | null;
};

export type NormalisedOptionRecord = NormalisedSourceRecord & {
  readonly sourceSheetKey: '03_Options';
  readonly domainKey: string | null;
  readonly questionKey: string | null;
  readonly optionKey: string | null;
  readonly optionOrder: number | null;
  readonly optionText: string | null;
  readonly isScored: boolean | null;
};

export type NormalisedOptionWeightRecord = NormalisedSourceRecord & {
  readonly sourceSheetKey: '04_Option_Weights';
  readonly domainKey: string | null;
  readonly questionKey: string | null;
  readonly optionKey: string | null;
  readonly signalKey: string | null;
  readonly weight: number | null;
};

export type NormalisedContextRecord = NormalisedSourceRecord & {
  readonly sourceSheetKey: '05_Context';
  readonly domainKey: string | null;
  readonly sectionKey: string | null;
  readonly domainTitle: string | null;
  readonly domainDefinition: string | null;
  readonly domainScope: string | null;
  readonly interpretationGuidance: string | null;
  readonly introNote: string | null;
  readonly fieldValues: NormalisedFieldValues;
};

export type NormalisedPatternScoreShapeRecord = NormalisedSourceRecord & {
  readonly domainKey: string | null;
  readonly patternKey: string | null;
  readonly scoreShape: string | null;
  readonly rank1SignalKey: string | null;
  readonly rank2SignalKey: string | null;
  readonly rank3SignalKey: string | null;
  readonly rank4SignalKey: string | null;
  readonly fieldValues: NormalisedFieldValues;
};

export type NormalisedOrientationRecord = NormalisedPatternScoreShapeRecord & {
  readonly sourceSheetKey: '06_Orientation';
};

export type NormalisedRecognitionRecord = NormalisedPatternScoreShapeRecord & {
  readonly sourceSheetKey: '07_Recognition';
};

export type NormalisedSignalRoleRecord = NormalisedSourceRecord & {
  readonly sourceSheetKey: '08_Signal_Roles';
  readonly domainKey: string | null;
  readonly signalKey: string | null;
  readonly signalLabel: string | null;
  readonly rankPosition: number | null;
  readonly rankRole: string | null;
  readonly title: string | null;
  readonly description: string | null;
  readonly productiveExpression: string | null;
  readonly riskPattern: string | null;
  readonly developmentNote: string | null;
  readonly fieldValues: NormalisedFieldValues;
};

export type NormalisedPatternMechanicsRecord = NormalisedPatternScoreShapeRecord & {
  readonly sourceSheetKey: '09_Pattern_Mechanics';
};

export type NormalisedPatternSynthesisRecord = NormalisedPatternScoreShapeRecord & {
  readonly sourceSheetKey: '10_Pattern_Synthesis';
};

export type NormalisedPatternListRecord = NormalisedSourceRecord & {
  readonly domainKey: string | null;
  readonly patternKey: string | null;
  readonly itemKey: string | null;
  readonly priority: number | null;
  readonly title: string | null;
  readonly text: string | null;
  readonly linkedSignalKey: string | null;
  readonly fieldValues: NormalisedFieldValues;
};

export type NormalisedStrengthRecord = NormalisedPatternListRecord & {
  readonly sourceSheetKey: '11_Strengths';
};

export type NormalisedNarrowingRecord = NormalisedPatternListRecord & {
  readonly sourceSheetKey: '12_Narrowing';
};

export type NormalisedApplicationRecord = NormalisedPatternListRecord & {
  readonly sourceSheetKey: '13_Application';
};

export type NormalisedClosingIntegrationRecord = NormalisedSourceRecord & {
  readonly sourceSheetKey: '14_Closing_Integration';
  readonly domainKey: string | null;
  readonly patternKey: string | null;
  readonly scoreShape: string | null;
  readonly fieldValues: NormalisedFieldValues;
};

export type NormalisedReportPreviewRecord = NormalisedSourceRecord & {
  readonly sourceSheetKey: '15_Report_Preview';
  readonly previewCaseKey: string | null;
  readonly assessmentKey: string | null;
  readonly version: string | null;
  readonly domainKey: string | null;
  readonly rankedSignalKeys: readonly (string | null)[];
  readonly normalisedScores: readonly (number | null)[];
  readonly expectedScoreShape: string | null;
  readonly expectedPatternKey: string | null;
  readonly expectedPayloadSections: string | null;
};

export type NormalisedImportSummaryRecord = NormalisedSourceRecord & {
  readonly sourceSheetKey: '16_Import_Summary';
  readonly importSummaryKey: string | null;
  readonly assessmentKey: string | null;
  readonly version: string | null;
  readonly packageIdentifier: string | null;
  readonly sourceName: string | null;
  readonly runtimeDefinitionRowCount: number | null;
  readonly runtimeResultContentRowCount: number | null;
  readonly previewRowCount: number | null;
  readonly validationNotes: string | null;
};

export type NormalisedValidationReferenceRecord = NormalisedSourceRecord & {
  readonly sourceSheetKey: '17_Validation_Reference';
  readonly validationRuleKey: string | null;
  readonly sectionKey: string | null;
  readonly fieldKey: string | null;
  readonly ruleType: string | null;
  readonly expectedValue: string | null;
  readonly validationGuidance: string | null;
  readonly severity: string | null;
};

export type NormalisedLookupRecord = NormalisedSourceRecord & {
  readonly sourceSheetKey: '18_Lookups';
  readonly lookupGroup: string | null;
  readonly lookupKey: string | null;
  readonly lookupLabel: string | null;
  readonly lookupValue: string | null;
  readonly description: string | null;
};

export type NormalisedRankedPatternPackage = {
  readonly sourcePath: string;
  readonly workbookName: string;
  readonly metadata: readonly NormalisedMetadataRecord[];
  readonly signals: readonly NormalisedSignalRecord[];
  readonly questions: readonly NormalisedQuestionRecord[];
  readonly options: readonly NormalisedOptionRecord[];
  readonly optionWeights: readonly NormalisedOptionWeightRecord[];
  readonly context: readonly NormalisedContextRecord[];
  readonly orientation: readonly NormalisedOrientationRecord[];
  readonly recognition: readonly NormalisedRecognitionRecord[];
  readonly signalRoles: readonly NormalisedSignalRoleRecord[];
  readonly patternMechanics: readonly NormalisedPatternMechanicsRecord[];
  readonly patternSynthesis: readonly NormalisedPatternSynthesisRecord[];
  readonly strengths: readonly NormalisedStrengthRecord[];
  readonly narrowing: readonly NormalisedNarrowingRecord[];
  readonly application: readonly NormalisedApplicationRecord[];
  readonly closingIntegration: readonly NormalisedClosingIntegrationRecord[];
  readonly reportPreviewCases: readonly NormalisedReportPreviewRecord[];
  readonly importSummaryRows: readonly NormalisedImportSummaryRecord[];
  readonly validationReferenceRows: readonly NormalisedValidationReferenceRecord[];
  readonly lookupRows: readonly NormalisedLookupRecord[];
  readonly diagnostics: readonly RankedPatternImportDiagnostic[];
};

type NormaliseContext = {
  readonly diagnostics: RankedPatternImportDiagnostic[];
};

function sourceRows(
  parsedWorkbook: ParsedRankedPatternWorkbookFile,
  sheetKey: RankedPatternImportSheetKey,
): readonly ParsedRankedPatternWorkbookRow[] {
  return parsedWorkbook.sheets[sheetKey]?.rows ?? [];
}

function sourceValues(row: ParsedRankedPatternWorkbookRow): Readonly<Record<string, unknown>> {
  return row.values;
}

function cell(row: ParsedRankedPatternWorkbookRow, fieldKey: string): unknown {
  return row.values[fieldKey];
}

function stringCell(row: ParsedRankedPatternWorkbookRow, fieldKey: string): string | null {
  const value = cell(row, fieldKey);
  const text = value === null || value === undefined ? '' : String(value).trim();
  return text.length === 0 ? null : text;
}

function normalisedStatus(row: ParsedRankedPatternWorkbookRow): string | null {
  return stringCell(row, 'status')?.toLowerCase() ?? null;
}

function booleanCell(
  row: ParsedRankedPatternWorkbookRow,
  sheetKey: RankedPatternImportSheetKey,
  fieldKey: string,
  context: NormaliseContext,
): boolean | null {
  const value = stringCell(row, fieldKey)?.toLowerCase();
  if (!value) {
    return null;
  }

  if (['true', 'yes', '1'].includes(value)) {
    return true;
  }
  if (['false', 'no', '0'].includes(value)) {
    return false;
  }

  addDiagnostic(context, {
    code: 'INVALID_BOOLEAN',
    message: `${fieldKey} must be a boolean-compatible value.`,
    sheetKey,
    row,
    fieldKey,
  });
  return null;
}

function integerCell(
  row: ParsedRankedPatternWorkbookRow,
  sheetKey: RankedPatternImportSheetKey,
  fieldKey: string,
  context: NormaliseContext,
): number | null {
  const value = stringCell(row, fieldKey);
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    addDiagnostic(context, {
      code: 'INVALID_INTEGER',
      message: `${fieldKey} must be an integer.`,
      sheetKey,
      row,
      fieldKey,
    });
    return null;
  }

  return parsed;
}

function optionOrderCell(
  row: ParsedRankedPatternWorkbookRow,
  context: NormaliseContext,
): number | null {
  const value = stringCell(row, 'option_order');
  if (!value) {
    return null;
  }

  const letterOrder: Readonly<Record<string, number>> = Object.freeze({
    A: 1,
    B: 2,
    C: 3,
    D: 4,
  });
  const upperValue = value.toUpperCase();
  if (letterOrder[upperValue]) {
    return letterOrder[upperValue];
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    addDiagnostic(context, {
      code: 'INVALID_INTEGER',
      message: 'option_order must be an integer or A-D option position.',
      sheetKey: '03_Options',
      row,
      fieldKey: 'option_order',
    });
    return null;
  }

  return parsed;
}

function numberCell(
  row: ParsedRankedPatternWorkbookRow,
  sheetKey: RankedPatternImportSheetKey,
  fieldKey: string,
  context: NormaliseContext,
): number | null {
  const value = stringCell(row, fieldKey);
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    addDiagnostic(context, {
      code: 'INVALID_NUMBER',
      message: `${fieldKey} must be numeric.`,
      sheetKey,
      row,
      fieldKey,
    });
    return null;
  }

  return parsed;
}

function supportedScoreShape(
  row: ParsedRankedPatternWorkbookRow,
  sheetKey: RankedPatternImportSheetKey,
  fieldKey: 'score_shape' | 'expected_score_shape',
  context: NormaliseContext,
): string | null {
  const value = stringCell(row, fieldKey);
  if (!value) {
    return null;
  }

  if (!rankedPatternSupportedScoreShapes.some((scoreShape) => scoreShape === value)) {
    addDiagnostic(context, {
      code: 'UNSUPPORTED_SCORE_SHAPE',
      message: `${fieldKey} has unsupported value ${value}.`,
      sheetKey,
      row,
      fieldKey,
    });
  }

  return value;
}

function supportedRankPosition(
  row: ParsedRankedPatternWorkbookRow,
  sheetKey: RankedPatternImportSheetKey,
  context: NormaliseContext,
): number | null {
  const value = integerCell(row, sheetKey, 'rank_position', context);
  if (value === null) {
    return null;
  }

  if (!rankedPatternSupportedRankPositions.some((rankPosition) => rankPosition === value)) {
    addDiagnostic(context, {
      code: 'UNSUPPORTED_RANK_POSITION',
      message: `rank_position has unsupported value ${value}.`,
      sheetKey,
      row,
      fieldKey: 'rank_position',
    });
  }

  return value;
}

function fieldValues(
  row: ParsedRankedPatternWorkbookRow,
  excludedFields: readonly string[],
): NormalisedFieldValues {
  const excluded = new Set(excludedFields);
  const values: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(row.values)) {
    if (excluded.has(key)) {
      continue;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      values[key] = value;
      continue;
    }

    const text = value === null || value === undefined ? '' : String(value).trim();
    values[key] = text.length === 0 ? null : text;
  }

  return Object.freeze(values);
}

function baseRecord(
  row: ParsedRankedPatternWorkbookRow,
  sourceSheetKey: RankedPatternImportSheetKey,
  domainKey?: string | null,
): NormalisedSourceRecord {
  return Object.freeze({
    sourceSheetKey,
    sourceRowNumber: row.rowNumber,
    sourceValues: sourceValues(row),
    status: normalisedStatus(row),
    lookupKey: stringCell(row, 'lookup_key'),
    domainKey,
  });
}

function addDiagnostic(
  context: NormaliseContext,
  params: {
    readonly code: string;
    readonly message: string;
    readonly sheetKey: RankedPatternImportSheetKey;
    readonly row: ParsedRankedPatternWorkbookRow;
    readonly fieldKey: string;
  },
): void {
  context.diagnostics.push({
    severity: 'error',
    code: params.code,
    message: params.message,
    sheetKey: params.sheetKey,
    rowNumber: params.row.rowNumber,
    fieldKey: params.fieldKey,
    lookupKey: stringCell(params.row, 'lookup_key') ?? undefined,
  });
}

function checkPatternKeyMatchesRankOrder(
  row: ParsedRankedPatternWorkbookRow,
  sheetKey: RankedPatternImportSheetKey,
  context: NormaliseContext,
): void {
  const patternKey = stringCell(row, 'pattern_key');
  const rank1 = stringCell(row, 'rank_1_signal_key');
  const rank2 = stringCell(row, 'rank_2_signal_key');
  const rank3 = stringCell(row, 'rank_3_signal_key');
  const rank4 = stringCell(row, 'rank_4_signal_key');

  if (!patternKey || !rank1 || !rank2 || !rank3 || !rank4) {
    return;
  }

  const expectedPatternKey = buildPatternKeyFromRankedSignalKeys(rank1, rank2, rank3, rank4);
  if (patternKey !== expectedPatternKey) {
    addDiagnostic(context, {
      code: 'PATTERN_KEY_RANK_ORDER_MISMATCH',
      message: `pattern_key ${patternKey} does not match ranked signal order ${expectedPatternKey}.`,
      sheetKey,
      row,
      fieldKey: 'pattern_key',
    });
  }
}

function normalisePatternScoreShapeRow<TSheetKey extends RankedPatternImportSheetKey>(
  row: ParsedRankedPatternWorkbookRow,
  sourceSheetKey: TSheetKey,
  context: NormaliseContext,
): NormalisedPatternScoreShapeRecord & { readonly sourceSheetKey: TSheetKey } {
  checkPatternKeyMatchesRankOrder(row, sourceSheetKey, context);
  const domainKey = stringCell(row, 'domain_key');

  return Object.freeze({
    ...baseRecord(row, sourceSheetKey, domainKey),
    sourceSheetKey,
    domainKey,
    patternKey: stringCell(row, 'pattern_key'),
    scoreShape: supportedScoreShape(row, sourceSheetKey, 'score_shape', context),
    rank1SignalKey: stringCell(row, 'rank_1_signal_key'),
    rank2SignalKey: stringCell(row, 'rank_2_signal_key'),
    rank3SignalKey: stringCell(row, 'rank_3_signal_key'),
    rank4SignalKey: stringCell(row, 'rank_4_signal_key'),
    fieldValues: fieldValues(row, [
      'domain_key',
      'pattern_key',
      'score_shape',
      'rank_1_signal_key',
      'rank_2_signal_key',
      'rank_3_signal_key',
      'rank_4_signal_key',
      'status',
      'lookup_key',
    ]),
  });
}

export function normaliseMetadataRows(
  sheet: ParsedRankedPatternWorkbookSheet | undefined,
): { readonly records: readonly NormalisedMetadataRecord[]; readonly diagnostics: readonly RankedPatternImportDiagnostic[] } {
  const context: NormaliseContext = { diagnostics: [] };
  const records = (sheet?.rows ?? []).map((row) => {
    const mode = stringCell(row, 'mode');
    const resultModelKey = stringCell(row, 'result_model_key');
    const model = stringCell(row, 'model');

    if (mode && mode !== rankedPatternAssessmentMode) {
      addDiagnostic(context, {
        code: 'UNSUPPORTED_ASSESSMENT_MODE',
        message: `assessment mode must be ${rankedPatternAssessmentMode}.`,
        sheetKey: '00_Metadata',
        row,
        fieldKey: 'mode',
      });
    }

    if (resultModelKey ? resultModelKey !== rankedPatternResultModelKey : model && model !== 'single_domain_ranked_pattern') {
      addDiagnostic(context, {
        code: 'UNSUPPORTED_RESULT_MODEL',
        message: `result model must be ${rankedPatternResultModelKey}.`,
        sheetKey: '00_Metadata',
        row,
        fieldKey: resultModelKey ? 'result_model_key' : 'model',
      });
    }

    const domainKey = stringCell(row, 'domain_key');
    return Object.freeze({
      ...baseRecord(row, '00_Metadata', domainKey),
      sourceSheetKey: '00_Metadata',
      assessmentKey: stringCell(row, 'assessment_key'),
      version: stringCell(row, 'version'),
      assessmentTitle: stringCell(row, 'assessment_title'),
      assessmentDescription: stringCell(row, 'assessment_description'),
      model,
      mode,
      resultModelKey,
      domainKey,
      domainTitle: stringCell(row, 'domain_title'),
      lifecycleStatus: stringCell(row, 'lifecycle_status')?.toLowerCase() ?? null,
    });
  });

  return { records: Object.freeze(records), diagnostics: Object.freeze(context.diagnostics) };
}

export function normaliseSignalRows(sheet: ParsedRankedPatternWorkbookSheet | undefined) {
  const context: NormaliseContext = { diagnostics: [] };
  const records = (sheet?.rows ?? []).map((row): NormalisedSignalRecord => {
    const domainKey = stringCell(row, 'domain_key');
    return Object.freeze({
      ...baseRecord(row, '01_Signals', domainKey),
      sourceSheetKey: '01_Signals',
      domainKey,
      signalKey: stringCell(row, 'signal_key'),
      signalLabel: stringCell(row, 'signal_label'),
      signalDescription: stringCell(row, 'signal_description'),
      signalOrder: integerCell(row, '01_Signals', 'signal_order', context),
      scored: booleanCell(row, '01_Signals', 'scored', context),
    });
  });
  return { records: Object.freeze(records), diagnostics: Object.freeze(context.diagnostics) };
}

export function normaliseQuestionRows(sheet: ParsedRankedPatternWorkbookSheet | undefined) {
  const context: NormaliseContext = { diagnostics: [] };
  const records = (sheet?.rows ?? []).map((row): NormalisedQuestionRecord => {
    const domainKey = stringCell(row, 'domain_key');
    return Object.freeze({
      ...baseRecord(row, '02_Questions', domainKey),
      sourceSheetKey: '02_Questions',
      domainKey,
      questionKey: stringCell(row, 'question_key'),
      questionOrder: integerCell(row, '02_Questions', 'question_order', context),
      questionText: stringCell(row, 'question_text'),
    });
  });
  return { records: Object.freeze(records), diagnostics: Object.freeze(context.diagnostics) };
}

export function normaliseOptionRows(sheet: ParsedRankedPatternWorkbookSheet | undefined) {
  const context: NormaliseContext = { diagnostics: [] };
  const records = (sheet?.rows ?? []).map((row): NormalisedOptionRecord => {
    const domainKey = stringCell(row, 'domain_key');
    return Object.freeze({
      ...baseRecord(row, '03_Options', domainKey),
      sourceSheetKey: '03_Options',
      domainKey,
      questionKey: stringCell(row, 'question_key'),
      optionKey: stringCell(row, 'option_key'),
      optionOrder: optionOrderCell(row, context),
      optionText: stringCell(row, 'option_text'),
      isScored: booleanCell(row, '03_Options', 'is_scored', context),
    });
  });
  return { records: Object.freeze(records), diagnostics: Object.freeze(context.diagnostics) };
}

export function normaliseOptionWeightRows(sheet: ParsedRankedPatternWorkbookSheet | undefined) {
  const context: NormaliseContext = { diagnostics: [] };
  const records = (sheet?.rows ?? []).map((row): NormalisedOptionWeightRecord => {
    const domainKey = stringCell(row, 'domain_key');
    return Object.freeze({
      ...baseRecord(row, '04_Option_Weights', domainKey),
      sourceSheetKey: '04_Option_Weights',
      domainKey,
      questionKey: stringCell(row, 'question_key'),
      optionKey: stringCell(row, 'option_key'),
      signalKey: stringCell(row, 'signal_key'),
      weight: numberCell(row, '04_Option_Weights', 'weight', context),
    });
  });
  return { records: Object.freeze(records), diagnostics: Object.freeze(context.diagnostics) };
}

export function normaliseContextRows(sheet: ParsedRankedPatternWorkbookSheet | undefined) {
  const records = (sheet?.rows ?? []).map((row): NormalisedContextRecord => {
    const domainKey = stringCell(row, 'domain_key');
    return Object.freeze({
      ...baseRecord(row, '05_Context', domainKey),
      sourceSheetKey: '05_Context',
      domainKey,
      sectionKey: stringCell(row, 'section_key'),
      domainTitle: stringCell(row, 'domain_title'),
      domainDefinition: stringCell(row, 'domain_definition'),
      domainScope: stringCell(row, 'domain_scope'),
      interpretationGuidance: stringCell(row, 'interpretation_guidance'),
      introNote: stringCell(row, 'intro_note'),
      fieldValues: fieldValues(row, ['domain_key', 'section_key', 'status', 'lookup_key']),
    });
  });
  return { records: Object.freeze(records), diagnostics: Object.freeze([]) };
}

export function normaliseOrientationRows(sheet: ParsedRankedPatternWorkbookSheet | undefined) {
  const context: NormaliseContext = { diagnostics: [] };
  const records = (sheet?.rows ?? []).map((row) =>
    normalisePatternScoreShapeRow(row, '06_Orientation', context),
  ) as readonly NormalisedOrientationRecord[];
  return { records: Object.freeze(records), diagnostics: Object.freeze(context.diagnostics) };
}

export function normaliseRecognitionRows(sheet: ParsedRankedPatternWorkbookSheet | undefined) {
  const context: NormaliseContext = { diagnostics: [] };
  const records = (sheet?.rows ?? []).map((row) =>
    normalisePatternScoreShapeRow(row, '07_Recognition', context),
  ) as readonly NormalisedRecognitionRecord[];
  return { records: Object.freeze(records), diagnostics: Object.freeze(context.diagnostics) };
}

export function normaliseSignalRoleRows(sheet: ParsedRankedPatternWorkbookSheet | undefined) {
  const context: NormaliseContext = { diagnostics: [] };
  const records = (sheet?.rows ?? []).map((row): NormalisedSignalRoleRecord => {
    const domainKey = stringCell(row, 'domain_key');
    return Object.freeze({
      ...baseRecord(row, '08_Signal_Roles', domainKey),
      sourceSheetKey: '08_Signal_Roles',
      domainKey,
      signalKey: stringCell(row, 'signal_key'),
      signalLabel: stringCell(row, 'signal_label'),
      rankPosition: supportedRankPosition(row, '08_Signal_Roles', context),
      rankRole: stringCell(row, 'rank_role'),
      title: stringCell(row, 'title'),
      description: stringCell(row, 'description'),
      productiveExpression: stringCell(row, 'productive_expression'),
      riskPattern: stringCell(row, 'risk_pattern'),
      developmentNote: stringCell(row, 'development_note'),
      fieldValues: fieldValues(row, ['domain_key', 'signal_key', 'rank_position', 'status', 'lookup_key']),
    });
  });
  return { records: Object.freeze(records), diagnostics: Object.freeze(context.diagnostics) };
}

export function normalisePatternMechanicsRows(sheet: ParsedRankedPatternWorkbookSheet | undefined) {
  const context: NormaliseContext = { diagnostics: [] };
  const records = (sheet?.rows ?? []).map((row) =>
    normalisePatternScoreShapeRow(row, '09_Pattern_Mechanics', context),
  ) as readonly NormalisedPatternMechanicsRecord[];
  return { records: Object.freeze(records), diagnostics: Object.freeze(context.diagnostics) };
}

export function normalisePatternSynthesisRows(sheet: ParsedRankedPatternWorkbookSheet | undefined) {
  const context: NormaliseContext = { diagnostics: [] };
  const records = (sheet?.rows ?? []).map((row) =>
    normalisePatternScoreShapeRow(row, '10_Pattern_Synthesis', context),
  ) as readonly NormalisedPatternSynthesisRecord[];
  return { records: Object.freeze(records), diagnostics: Object.freeze(context.diagnostics) };
}

type PatternListSheetKey = '11_Strengths' | '12_Narrowing' | '13_Application';

function normalisePatternListRows<TSheetKey extends PatternListSheetKey>(
  sheet: ParsedRankedPatternWorkbookSheet | undefined,
  sheetKey: TSheetKey,
  itemFieldKey: string,
  titleFieldKey: string,
  textFieldKey: string,
  linkedSignalFieldKey: string,
): {
  readonly records: readonly (NormalisedPatternListRecord & { readonly sourceSheetKey: TSheetKey })[];
  readonly diagnostics: readonly RankedPatternImportDiagnostic[];
} {
  const context: NormaliseContext = { diagnostics: [] };
  const records = (sheet?.rows ?? []).map(
    (row): NormalisedPatternListRecord & { readonly sourceSheetKey: TSheetKey } => {
      const domainKey = stringCell(row, 'domain_key');
      return Object.freeze({
        ...baseRecord(row, sheetKey, domainKey),
        sourceSheetKey: sheetKey,
        domainKey,
        patternKey: stringCell(row, 'pattern_key'),
        itemKey: stringCell(row, itemFieldKey),
        priority: integerCell(row, sheetKey, 'priority', context),
        title: stringCell(row, titleFieldKey),
        text: stringCell(row, textFieldKey),
        linkedSignalKey: stringCell(row, linkedSignalFieldKey),
        fieldValues: fieldValues(row, [
          'domain_key',
          'pattern_key',
          itemFieldKey,
          'priority',
          'status',
          'lookup_key',
        ]),
      });
    },
  );

  return { records: Object.freeze(records), diagnostics: Object.freeze(context.diagnostics) };
}

export function normaliseStrengthRows(sheet: ParsedRankedPatternWorkbookSheet | undefined) {
  return normalisePatternListRows(
    sheet,
    '11_Strengths',
    'strength_key',
    'strength_title',
    'strength_text',
    'linked_signal_key',
  );
}

export function normaliseNarrowingRows(sheet: ParsedRankedPatternWorkbookSheet | undefined) {
  return normalisePatternListRows(
    sheet,
    '12_Narrowing',
    'narrowing_key',
    'narrowing_title',
    'narrowing_text',
    'missing_range_signal_key',
  );
}

export function normaliseApplicationRows(sheet: ParsedRankedPatternWorkbookSheet | undefined) {
  return normalisePatternListRows(
    sheet,
    '13_Application',
    'application_key',
    'application_title',
    'application_text',
    'linked_signal_key',
  );
}

export function normaliseClosingIntegrationRows(sheet: ParsedRankedPatternWorkbookSheet | undefined) {
  const context: NormaliseContext = { diagnostics: [] };
  const records = (sheet?.rows ?? []).map((row): NormalisedClosingIntegrationRecord => {
    const domainKey = stringCell(row, 'domain_key');
    return Object.freeze({
      ...baseRecord(row, '14_Closing_Integration', domainKey),
      sourceSheetKey: '14_Closing_Integration',
      domainKey,
      patternKey: stringCell(row, 'pattern_key'),
      scoreShape: supportedScoreShape(row, '14_Closing_Integration', 'score_shape', context),
      fieldValues: fieldValues(row, ['domain_key', 'pattern_key', 'score_shape', 'status', 'lookup_key']),
    });
  });
  return { records: Object.freeze(records), diagnostics: Object.freeze(context.diagnostics) };
}

export function normaliseReportPreviewRows(sheet: ParsedRankedPatternWorkbookSheet | undefined) {
  const context: NormaliseContext = { diagnostics: [] };
  const records = (sheet?.rows ?? []).map((row): NormalisedReportPreviewRecord => {
    const domainKey = stringCell(row, 'domain_key');
    return Object.freeze({
      ...baseRecord(row, '15_Report_Preview', domainKey),
      sourceSheetKey: '15_Report_Preview',
      previewCaseKey: stringCell(row, 'preview_case_key'),
      assessmentKey: stringCell(row, 'assessment_key'),
      version: stringCell(row, 'version'),
      domainKey,
      rankedSignalKeys: Object.freeze([
        stringCell(row, 'rank_1_signal_key'),
        stringCell(row, 'rank_2_signal_key'),
        stringCell(row, 'rank_3_signal_key'),
        stringCell(row, 'rank_4_signal_key'),
      ]),
      normalisedScores: Object.freeze([
        numberCell(row, '15_Report_Preview', 'normalized_rank_1_percentage', context),
        numberCell(row, '15_Report_Preview', 'normalized_rank_2_percentage', context),
        numberCell(row, '15_Report_Preview', 'normalized_rank_3_percentage', context),
        numberCell(row, '15_Report_Preview', 'normalized_rank_4_percentage', context),
      ]),
      expectedScoreShape: supportedScoreShape(row, '15_Report_Preview', 'expected_score_shape', context),
      expectedPatternKey: stringCell(row, 'expected_pattern_key'),
      expectedPayloadSections: stringCell(row, 'expected_payload_sections'),
    });
  });
  return { records: Object.freeze(records), diagnostics: Object.freeze(context.diagnostics) };
}

export function normaliseImportSummaryRows(sheet: ParsedRankedPatternWorkbookSheet | undefined) {
  const context: NormaliseContext = { diagnostics: [] };
  const records = (sheet?.rows ?? []).map((row): NormalisedImportSummaryRecord =>
    Object.freeze({
      ...baseRecord(row, '16_Import_Summary'),
      sourceSheetKey: '16_Import_Summary',
      importSummaryKey: stringCell(row, 'import_summary_key'),
      assessmentKey: stringCell(row, 'assessment_key'),
      version: stringCell(row, 'version'),
      packageIdentifier: stringCell(row, 'package_identifier'),
      sourceName: stringCell(row, 'source_name'),
      runtimeDefinitionRowCount: integerCell(row, '16_Import_Summary', 'runtime_definition_row_count', context),
      runtimeResultContentRowCount: integerCell(
        row,
        '16_Import_Summary',
        'runtime_result_content_row_count',
        context,
      ),
      previewRowCount: integerCell(row, '16_Import_Summary', 'preview_row_count', context),
      validationNotes: stringCell(row, 'validation_notes'),
    }),
  );
  return { records: Object.freeze(records), diagnostics: Object.freeze(context.diagnostics) };
}

export function normaliseValidationReferenceRows(sheet: ParsedRankedPatternWorkbookSheet | undefined) {
  const records = (sheet?.rows ?? []).map((row): NormalisedValidationReferenceRecord =>
    Object.freeze({
      ...baseRecord(row, '17_Validation_Reference'),
      sourceSheetKey: '17_Validation_Reference',
      validationRuleKey: stringCell(row, 'validation_rule_key'),
      sectionKey: stringCell(row, 'section_key'),
      fieldKey: stringCell(row, 'field_key'),
      ruleType: stringCell(row, 'rule_type'),
      expectedValue: stringCell(row, 'expected_value'),
      validationGuidance: stringCell(row, 'validation_guidance'),
      severity: stringCell(row, 'severity')?.toLowerCase() ?? null,
    }),
  );
  return { records: Object.freeze(records), diagnostics: Object.freeze([]) };
}

export function normaliseLookupRows(sheet: ParsedRankedPatternWorkbookSheet | undefined) {
  const records = (sheet?.rows ?? []).map((row): NormalisedLookupRecord =>
    Object.freeze({
      ...baseRecord(row, '18_Lookups'),
      sourceSheetKey: '18_Lookups',
      lookupGroup: stringCell(row, 'lookup_group'),
      lookupKey: stringCell(row, 'lookup_key'),
      lookupLabel: stringCell(row, 'lookup_label'),
      lookupValue: stringCell(row, 'lookup_value'),
      description: stringCell(row, 'description'),
    }),
  );
  return { records: Object.freeze(records), diagnostics: Object.freeze([]) };
}

export function normaliseRankedPatternWorkbook(
  parsedWorkbook: ParsedRankedPatternWorkbookFile,
): NormalisedRankedPatternPackage {
  const metadata = normaliseMetadataRows(parsedWorkbook.sheets['00_Metadata']);
  const signals = normaliseSignalRows(parsedWorkbook.sheets['01_Signals']);
  const questions = normaliseQuestionRows(parsedWorkbook.sheets['02_Questions']);
  const options = normaliseOptionRows(parsedWorkbook.sheets['03_Options']);
  const optionWeights = normaliseOptionWeightRows(parsedWorkbook.sheets['04_Option_Weights']);
  const context = normaliseContextRows(parsedWorkbook.sheets['05_Context']);
  const orientation = normaliseOrientationRows(parsedWorkbook.sheets['06_Orientation']);
  const recognition = normaliseRecognitionRows(parsedWorkbook.sheets['07_Recognition']);
  const signalRoles = normaliseSignalRoleRows(parsedWorkbook.sheets['08_Signal_Roles']);
  const patternMechanics = normalisePatternMechanicsRows(parsedWorkbook.sheets['09_Pattern_Mechanics']);
  const patternSynthesis = normalisePatternSynthesisRows(parsedWorkbook.sheets['10_Pattern_Synthesis']);
  const strengths = normaliseStrengthRows(parsedWorkbook.sheets['11_Strengths']);
  const narrowing = normaliseNarrowingRows(parsedWorkbook.sheets['12_Narrowing']);
  const application = normaliseApplicationRows(parsedWorkbook.sheets['13_Application']);
  const closingIntegration = normaliseClosingIntegrationRows(parsedWorkbook.sheets['14_Closing_Integration']);
  const reportPreviewCases = normaliseReportPreviewRows(parsedWorkbook.sheets['15_Report_Preview']);
  const importSummaryRows = normaliseImportSummaryRows(parsedWorkbook.sheets['16_Import_Summary']);
  const validationReferenceRows = normaliseValidationReferenceRows(
    parsedWorkbook.sheets['17_Validation_Reference'],
  );
  const lookupRows = normaliseLookupRows(parsedWorkbook.sheets['18_Lookups']);

  return Object.freeze({
    sourcePath: parsedWorkbook.sourcePath,
    workbookName: parsedWorkbook.workbookName,
    metadata: metadata.records,
    signals: signals.records,
    questions: questions.records,
    options: options.records,
    optionWeights: optionWeights.records,
    context: context.records,
    orientation: orientation.records,
    recognition: recognition.records,
    signalRoles: signalRoles.records,
    patternMechanics: patternMechanics.records,
    patternSynthesis: patternSynthesis.records,
    strengths: strengths.records,
    narrowing: narrowing.records,
    application: application.records,
    closingIntegration: closingIntegration.records,
    reportPreviewCases: reportPreviewCases.records,
    importSummaryRows: importSummaryRows.records,
    validationReferenceRows: validationReferenceRows.records,
    lookupRows: lookupRows.records,
    diagnostics: Object.freeze([
      ...metadata.diagnostics,
      ...signals.diagnostics,
      ...questions.diagnostics,
      ...options.diagnostics,
      ...optionWeights.diagnostics,
      ...context.diagnostics,
      ...orientation.diagnostics,
      ...recognition.diagnostics,
      ...signalRoles.diagnostics,
      ...patternMechanics.diagnostics,
      ...patternSynthesis.diagnostics,
      ...strengths.diagnostics,
      ...narrowing.diagnostics,
      ...application.diagnostics,
      ...closingIntegration.diagnostics,
      ...reportPreviewCases.diagnostics,
      ...importSummaryRows.diagnostics,
      ...validationReferenceRows.diagnostics,
      ...lookupRows.diagnostics,
    ]),
  });
}

export function getNormalisedRuntimeDefinitionCount(
  normalisedPackage: NormalisedRankedPatternPackage,
): number {
  return (
    normalisedPackage.metadata.length +
    normalisedPackage.signals.length +
    normalisedPackage.questions.length +
    normalisedPackage.options.length +
    normalisedPackage.optionWeights.length
  );
}

export function getNormalisedRuntimeResultContentCount(
  normalisedPackage: NormalisedRankedPatternPackage,
): number {
  return (
    normalisedPackage.context.length +
    normalisedPackage.orientation.length +
    normalisedPackage.recognition.length +
    normalisedPackage.signalRoles.length +
    normalisedPackage.patternMechanics.length +
    normalisedPackage.patternSynthesis.length +
    normalisedPackage.strengths.length +
    normalisedPackage.narrowing.length +
    normalisedPackage.application.length +
    normalisedPackage.closingIntegration.length
  );
}

export function getNormalisedAdminImportSupportCount(
  normalisedPackage: NormalisedRankedPatternPackage,
): number {
  return (
    normalisedPackage.reportPreviewCases.length +
    normalisedPackage.importSummaryRows.length +
    normalisedPackage.validationReferenceRows.length +
    normalisedPackage.lookupRows.length
  );
}

export function assertRankedPatternImportSheetKeysReferenced(): readonly RankedPatternImportSheetKey[] {
  return rankedPatternImportSheetKeys;
}
