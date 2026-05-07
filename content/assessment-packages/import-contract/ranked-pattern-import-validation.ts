import {
  buildPatternKeyFromRankedSignalKeys,
  rankedPatternAssessmentMode,
  rankedPatternAdminImportSupportSheetKeys,
  rankedPatternImportManifest,
  rankedPatternImportManifestBySheetKey,
  rankedPatternImportSheetKeys,
  rankedPatternResultModelKey,
  rankedPatternRuntimeDefinitionSheetKeys,
  rankedPatternRuntimeResultSheetKeys,
  rankedPatternSupportedRankPositions,
  rankedPatternSupportedScoreShapes,
  type RankedPatternImportSheetKey,
} from './ranked-pattern-import-manifest';

export type RankedPatternImportRow = Readonly<Record<string, unknown>>;

export type ParsedRankedPatternSheet = {
  readonly header: readonly string[];
  readonly rows: readonly RankedPatternImportRow[];
};

export type ParsedRankedPatternWorkbook = Partial<
  Record<RankedPatternImportSheetKey, ParsedRankedPatternSheet>
> & {
  readonly [sheetKey: string]: ParsedRankedPatternSheet | undefined;
};

export type RankedPatternImportDiagnosticSeverity = 'error' | 'warning';

export type RankedPatternImportDiagnostic = {
  readonly severity: RankedPatternImportDiagnosticSeverity;
  readonly code: string;
  readonly message: string;
  readonly sheetKey?: string;
  readonly rowIndex?: number;
  readonly rowNumber?: number;
  readonly fieldKey?: string;
  readonly lookupKey?: string;
};

function diagnostic(params: RankedPatternImportDiagnostic): RankedPatternImportDiagnostic {
  return params;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value);
}

function isSupportedScoreShape(value: string): boolean {
  return rankedPatternSupportedScoreShapes.some((scoreShape) => scoreShape === value);
}

function isSupportedRankPosition(value: string): boolean {
  return rankedPatternSupportedRankPositions.some((rankPosition) => String(rankPosition) === value);
}

function getRowsForSheet(
  parsedWorkbook: ParsedRankedPatternWorkbook,
  sheetKey: RankedPatternImportSheetKey,
): readonly RankedPatternImportRow[] {
  return parsedWorkbook[sheetKey]?.rows ?? [];
}

function getSheetHeader(
  parsedWorkbook: ParsedRankedPatternWorkbook,
  sheetKey: RankedPatternImportSheetKey,
): readonly string[] {
  return parsedWorkbook[sheetKey]?.header ?? [];
}

export function validateRequiredSheets(
  parsedWorkbook: ParsedRankedPatternWorkbook,
  sheetKeys: readonly RankedPatternImportSheetKey[] = rankedPatternImportSheetKeys,
): readonly RankedPatternImportDiagnostic[] {
  return sheetKeys.flatMap((sheetKey) =>
    parsedWorkbook[sheetKey]
      ? []
      : [
          diagnostic({
            severity: 'error',
            code: 'MISSING_REQUIRED_SHEET',
            message: `Missing required sheet ${sheetKey}.`,
            sheetKey,
          }),
        ],
  );
}

export function validateSheetHeaders(
  parsedWorkbook: ParsedRankedPatternWorkbook,
): readonly RankedPatternImportDiagnostic[] {
  const diagnostics: RankedPatternImportDiagnostic[] = [];

  for (const manifestEntry of rankedPatternImportManifest) {
    const sheet = parsedWorkbook[manifestEntry.sheet_key];
    if (!sheet) {
      continue;
    }

    const headerSet = new Set(sheet.header);
    const duplicateHeaders = sheet.header.filter(
      (header, index) => sheet.header.indexOf(header) !== index,
    );

    if (duplicateHeaders.length > 0) {
      diagnostics.push(
        diagnostic({
          severity: 'error',
          code: 'DUPLICATE_HEADER',
          message: `${manifestEntry.sheet_key} contains duplicate header values.`,
          sheetKey: manifestEntry.sheet_key,
        }),
      );
    }

    for (const requiredColumn of manifestEntry.required_columns) {
      if (!headerSet.has(requiredColumn)) {
        diagnostics.push(
          diagnostic({
            severity: 'error',
            code: 'MISSING_REQUIRED_COLUMN',
            message: `${manifestEntry.sheet_key} is missing required column ${requiredColumn}.`,
            sheetKey: manifestEntry.sheet_key,
            fieldKey: requiredColumn,
          }),
        );
      }
    }
  }

  return diagnostics;
}

export function validateRuntimeDefinitionSheetPresence(
  parsedWorkbook: ParsedRankedPatternWorkbook,
): readonly RankedPatternImportDiagnostic[] {
  return validateRequiredSheets(parsedWorkbook, rankedPatternRuntimeDefinitionSheetKeys);
}

export function validateRuntimeResultContentSheetPresence(
  parsedWorkbook: ParsedRankedPatternWorkbook,
): readonly RankedPatternImportDiagnostic[] {
  return validateRequiredSheets(parsedWorkbook, rankedPatternRuntimeResultSheetKeys);
}

export function validateAdminSupportSheetPresence(
  parsedWorkbook: ParsedRankedPatternWorkbook,
): readonly RankedPatternImportDiagnostic[] {
  return validateRequiredSheets(parsedWorkbook, rankedPatternAdminImportSupportSheetKeys);
}

export function validateNoRuntimeUseOfAdminSupportSheets(): readonly RankedPatternImportDiagnostic[] {
  return rankedPatternAdminImportSupportSheetKeys.flatMap((sheetKey) => {
    const manifestEntry = rankedPatternImportManifestBySheetKey[sheetKey];
    return manifestEntry.runtime_allowed || manifestEntry.category !== 'admin_import_support'
      ? [
          diagnostic({
            severity: 'error',
            code: 'ADMIN_SUPPORT_MARKED_RUNTIME',
            message: `${sheetKey} must remain admin/import support only.`,
            sheetKey,
          }),
        ]
      : [];
  });
}

export function validateSupportedScoreShapeValues(
  rows: readonly RankedPatternImportRow[],
  sheetKey?: string,
): readonly RankedPatternImportDiagnostic[] {
  const diagnostics: RankedPatternImportDiagnostic[] = [];

  rows.forEach((row, rowIndex) => {
    for (const fieldKey of ['score_shape', 'expected_score_shape']) {
      const value = stringValue(row[fieldKey]);
      if (value.length > 0 && !isSupportedScoreShape(value)) {
        diagnostics.push(
          diagnostic({
            severity: 'error',
            code: 'UNSUPPORTED_SCORE_SHAPE',
            message: `${fieldKey} has unsupported value ${value}.`,
            sheetKey,
            rowIndex,
            fieldKey,
            lookupKey: stringValue(row.lookup_key) || undefined,
          }),
        );
      }
    }
  });

  return diagnostics;
}

export function validateSupportedRankPositions(
  rows: readonly RankedPatternImportRow[],
  sheetKey?: string,
): readonly RankedPatternImportDiagnostic[] {
  const diagnostics: RankedPatternImportDiagnostic[] = [];

  rows.forEach((row, rowIndex) => {
    const value = stringValue(row.rank_position);
    if (value.length > 0 && !isSupportedRankPosition(value)) {
      diagnostics.push(
        diagnostic({
          severity: 'error',
          code: 'UNSUPPORTED_RANK_POSITION',
          message: `rank_position has unsupported value ${value}.`,
          sheetKey,
          rowIndex,
          fieldKey: 'rank_position',
          lookupKey: stringValue(row.lookup_key) || undefined,
        }),
      );
    }
  });

  return diagnostics;
}

export function validatePatternKeyMatchesRankOrder(
  row: RankedPatternImportRow,
  sheetKey?: string,
  rowIndex?: number,
): readonly RankedPatternImportDiagnostic[] {
  const patternKey = stringValue(row.pattern_key);
  const rankedSignals = [
    stringValue(row.rank_1_signal_key),
    stringValue(row.rank_2_signal_key),
    stringValue(row.rank_3_signal_key),
    stringValue(row.rank_4_signal_key),
  ];

  if (patternKey.length === 0 || rankedSignals.some((signalKey) => signalKey.length === 0)) {
    return [];
  }

  const expectedPatternKey = buildPatternKeyFromRankedSignalKeys(
    rankedSignals[0],
    rankedSignals[1],
    rankedSignals[2],
    rankedSignals[3],
  );

  if (patternKey === expectedPatternKey) {
    return [];
  }

  return [
    diagnostic({
      severity: 'error',
      code: 'PATTERN_KEY_RANK_ORDER_MISMATCH',
      message: `pattern_key ${patternKey} does not match ranked signal order ${expectedPatternKey}.`,
      sheetKey,
      rowIndex,
      fieldKey: 'pattern_key',
      lookupKey: stringValue(row.lookup_key) || undefined,
    }),
  ];
}

export function validateNoUnsupportedAssessmentMode(
  metadataRows: readonly RankedPatternImportRow[],
): readonly RankedPatternImportDiagnostic[] {
  return metadataRows.flatMap((row, rowIndex) => {
    const mode = stringValue(row.assessment_mode) || stringValue(row.mode);
    return mode.length > 0 && mode !== rankedPatternAssessmentMode
      ? [
          diagnostic({
            severity: 'error',
            code: 'UNSUPPORTED_ASSESSMENT_MODE',
            message: `assessment mode must be ${rankedPatternAssessmentMode}.`,
            sheetKey: '00_Metadata',
            rowIndex,
            fieldKey: stringValue(row.assessment_mode) ? 'assessment_mode' : 'mode',
            lookupKey: stringValue(row.lookup_key) || undefined,
          }),
        ]
      : [];
  });
}

export function validateNoUnsupportedResultModel(
  metadataRows: readonly RankedPatternImportRow[],
): readonly RankedPatternImportDiagnostic[] {
  return metadataRows.flatMap((row, rowIndex) => {
    const resultModelKey = stringValue(row.result_model_key);
    const model = stringValue(row.model);
    const hasUnsupportedResultModel =
      resultModelKey.length > 0
        ? resultModelKey !== rankedPatternResultModelKey
        : model.length > 0 && model !== 'single_domain_ranked_pattern';

    return hasUnsupportedResultModel
      ? [
          diagnostic({
            severity: 'error',
            code: 'UNSUPPORTED_RESULT_MODEL',
            message: `result model must be ${rankedPatternResultModelKey}.`,
            sheetKey: '00_Metadata',
            rowIndex,
            fieldKey: resultModelKey.length > 0 ? 'result_model_key' : 'model',
            lookupKey: stringValue(row.lookup_key) || undefined,
          }),
        ]
      : [];
  });
}

export function validateRankedPatternPackageShape(
  parsedWorkbook: ParsedRankedPatternWorkbook,
): readonly RankedPatternImportDiagnostic[] {
  const diagnostics: RankedPatternImportDiagnostic[] = [
    ...validateRequiredSheets(parsedWorkbook),
    ...validateSheetHeaders(parsedWorkbook),
    ...validateNoRuntimeUseOfAdminSupportSheets(),
    ...validateNoUnsupportedAssessmentMode(getRowsForSheet(parsedWorkbook, '00_Metadata')),
    ...validateNoUnsupportedResultModel(getRowsForSheet(parsedWorkbook, '00_Metadata')),
  ];

  for (const sheetKey of rankedPatternImportSheetKeys) {
    const rows = getRowsForSheet(parsedWorkbook, sheetKey);
    diagnostics.push(...validateSupportedScoreShapeValues(rows, sheetKey));
    diagnostics.push(...validateSupportedRankPositions(rows, sheetKey));

    for (const [rowIndex, row] of rows.entries()) {
      diagnostics.push(...validatePatternKeyMatchesRankOrder(row, sheetKey, rowIndex));
    }
  }

  return diagnostics;
}

export function getSheetHeaderDiagnostics(
  parsedWorkbook: ParsedRankedPatternWorkbook,
  sheetKey: RankedPatternImportSheetKey,
): readonly RankedPatternImportDiagnostic[] {
  const header = getSheetHeader(parsedWorkbook, sheetKey);
  const requiredColumns = rankedPatternImportManifestBySheetKey[sheetKey].required_columns;
  const headerSet = new Set(header);

  return requiredColumns.flatMap((fieldKey) =>
    headerSet.has(fieldKey)
      ? []
      : [
          diagnostic({
            severity: 'error',
            code: 'MISSING_REQUIRED_COLUMN',
            message: `${sheetKey} is missing required column ${fieldKey}.`,
            sheetKey,
            fieldKey,
          }),
        ],
  );
}
