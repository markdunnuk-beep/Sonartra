import {
  rankedPatternAdminImportSupportSheetKeys,
  rankedPatternImportSheetKeys,
  rankedPatternRuntimeDefinitionSheetKeys,
  rankedPatternRuntimeResultSheetKeys,
  type RankedPatternImportSheetKey,
} from './ranked-pattern-import-manifest';
import {
  parseRankedPatternWorkbookFile,
  toValidationWorkbook,
  type ParsedRankedPatternWorkbookFile,
} from './ranked-pattern-workbook-parser';
import {
  validateRankedPatternPackageShape,
  type RankedPatternImportDiagnostic,
} from './ranked-pattern-import-validation';

export type RankedPatternPackageAuditRowCounts = {
  readonly bySheet: Readonly<Record<RankedPatternImportSheetKey, number>>;
  readonly runtimeDefinition: number;
  readonly runtimeResultContent: number;
  readonly adminImportSupport: number;
};

export type RankedPatternPackageAuditDiagnosticCounts = {
  readonly error: number;
  readonly warning: number;
};

export type RankedPatternPackageAuditResult = {
  readonly parsedWorkbook: ParsedRankedPatternWorkbookFile;
  readonly detectedSheets: readonly string[];
  readonly missingSheets: readonly RankedPatternImportSheetKey[];
  readonly unexpectedSheets: readonly string[];
  readonly rowCounts: RankedPatternPackageAuditRowCounts;
  readonly diagnosticCounts: RankedPatternPackageAuditDiagnosticCounts;
  readonly diagnostics: readonly RankedPatternImportDiagnostic[];
  readonly pass: boolean;
};

function sumRows(
  parsedWorkbook: ParsedRankedPatternWorkbookFile,
  sheetKeys: readonly RankedPatternImportSheetKey[],
): number {
  return sheetKeys.reduce((total, sheetKey) => total + (parsedWorkbook.sheets[sheetKey]?.rowCount ?? 0), 0);
}

function buildRowCounts(
  parsedWorkbook: ParsedRankedPatternWorkbookFile,
): RankedPatternPackageAuditRowCounts {
  const bySheet: Record<RankedPatternImportSheetKey, number> = {
    '00_Metadata': 0,
    '01_Signals': 0,
    '02_Questions': 0,
    '03_Options': 0,
    '04_Option_Weights': 0,
    '05_Context': 0,
    '06_Orientation': 0,
    '07_Recognition': 0,
    '08_Signal_Roles': 0,
    '09_Pattern_Mechanics': 0,
    '10_Pattern_Synthesis': 0,
    '11_Strengths': 0,
    '12_Narrowing': 0,
    '13_Application': 0,
    '14_Closing_Integration': 0,
    '15_Report_Preview': 0,
    '16_Import_Summary': 0,
    '17_Validation_Reference': 0,
    '18_Lookups': 0,
  };

  for (const sheetKey of rankedPatternImportSheetKeys) {
    bySheet[sheetKey] = parsedWorkbook.sheets[sheetKey]?.rowCount ?? 0;
  }

  return Object.freeze({
    bySheet: Object.freeze(bySheet),
    runtimeDefinition: sumRows(parsedWorkbook, rankedPatternRuntimeDefinitionSheetKeys),
    runtimeResultContent: sumRows(parsedWorkbook, rankedPatternRuntimeResultSheetKeys),
    adminImportSupport: sumRows(parsedWorkbook, rankedPatternAdminImportSupportSheetKeys),
  });
}

function countDiagnostics(
  diagnostics: readonly RankedPatternImportDiagnostic[],
): RankedPatternPackageAuditDiagnosticCounts {
  return Object.freeze({
    error: diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length,
    warning: diagnostics.filter((diagnostic) => diagnostic.severity === 'warning').length,
  });
}

function attachWorkbookRowNumbers(
  parsedWorkbook: ParsedRankedPatternWorkbookFile,
  diagnostics: readonly RankedPatternImportDiagnostic[],
): readonly RankedPatternImportDiagnostic[] {
  return diagnostics.map((diagnostic) => {
    if (
      diagnostic.rowNumber !== undefined ||
      diagnostic.rowIndex === undefined ||
      diagnostic.sheetKey === undefined
    ) {
      return diagnostic;
    }

    const sheet = parsedWorkbook.sheets[diagnostic.sheetKey as RankedPatternImportSheetKey];
    const rowNumber = sheet?.rows[diagnostic.rowIndex]?.rowNumber;

    return rowNumber === undefined ? diagnostic : Object.freeze({ ...diagnostic, rowNumber });
  });
}

export function auditParsedRankedPatternWorkbook(
  parsedWorkbook: ParsedRankedPatternWorkbookFile,
): RankedPatternPackageAuditResult {
  const validationWorkbook = toValidationWorkbook(parsedWorkbook);
  const diagnostics = attachWorkbookRowNumbers(
    parsedWorkbook,
    validateRankedPatternPackageShape(validationWorkbook),
  );
  const diagnosticCounts = countDiagnostics(diagnostics);

  return Object.freeze({
    parsedWorkbook,
    detectedSheets: Object.freeze(Object.keys(parsedWorkbook.sheets).sort()),
    missingSheets: parsedWorkbook.missingSheets,
    unexpectedSheets: parsedWorkbook.unexpectedSheets,
    rowCounts: buildRowCounts(parsedWorkbook),
    diagnosticCounts,
    diagnostics: Object.freeze([...diagnostics]),
    pass: diagnosticCounts.error === 0,
  });
}

export function auditRankedPatternWorkbookFile(
  sourcePath: string,
  options: { readonly parsedAt?: string } = {},
): RankedPatternPackageAuditResult {
  return auditParsedRankedPatternWorkbook(parseRankedPatternWorkbookFile(sourcePath, options));
}
