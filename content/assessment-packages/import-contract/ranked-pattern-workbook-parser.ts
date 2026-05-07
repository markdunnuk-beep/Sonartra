import path from 'node:path';

import XLSX from 'xlsx';

import {
  rankedPatternImportManifestBySheetKey,
  rankedPatternImportSheetKeys,
  type RankedPatternImportSheetKey,
  type RankedPatternSheetCategory,
} from './ranked-pattern-import-manifest';
import type {
  ParsedRankedPatternSheet,
  ParsedRankedPatternWorkbook,
  RankedPatternImportRow,
} from './ranked-pattern-import-validation';

export type ParsedRankedPatternWorkbookRow = RankedPatternImportRow & {
  readonly rowNumber: number;
  readonly values: Readonly<Record<string, unknown>>;
  readonly rawValues: readonly unknown[];
};

export type ParsedRankedPatternWorkbookSheet = {
  readonly sheetKey: RankedPatternImportSheetKey;
  readonly sheetName: string;
  readonly category: RankedPatternSheetCategory;
  readonly headers: readonly string[];
  readonly rows: readonly ParsedRankedPatternWorkbookRow[];
  readonly rowCount: number;
  readonly emptyRowCount: number;
};

export type ParsedRankedPatternWorkbookFile = {
  readonly sourcePath: string;
  readonly workbookName: string;
  readonly sheets: Partial<Record<RankedPatternImportSheetKey, ParsedRankedPatternWorkbookSheet>>;
  readonly missingSheets: readonly RankedPatternImportSheetKey[];
  readonly unexpectedSheets: readonly string[];
  readonly parsedAt: string;
};

function normalizeCellValue(value: unknown): unknown {
  return value === undefined || value === null ? '' : value;
}

function normalizeHeaderValue(value: unknown): string {
  return String(normalizeCellValue(value)).trim();
}

function isEmptyRow(row: readonly unknown[]): boolean {
  return row.every((value) => String(normalizeCellValue(value)).trim().length === 0);
}

function rowToValues(
  headers: readonly string[],
  rawValues: readonly unknown[],
): Readonly<Record<string, unknown>> {
  return Object.freeze(
    Object.fromEntries(headers.map((header, index) => [header, normalizeCellValue(rawValues[index])])),
  );
}

function parseSheet(
  workbook: XLSX.WorkBook,
  sheetKey: RankedPatternImportSheetKey,
): ParsedRankedPatternWorkbookSheet | undefined {
  const sheet = workbook.Sheets[sheetKey];
  if (!sheet) {
    return undefined;
  }

  const manifestEntry = rankedPatternImportManifestBySheetKey[sheetKey];
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: true,
    defval: '',
    raw: true,
  });
  const headerRow = rawRows[0] ?? [];
  const headers = headerRow.map(normalizeHeaderValue);
  const dataRows = rawRows.slice(1);
  let emptyRowCount = 0;
  const parsedRows: ParsedRankedPatternWorkbookRow[] = [];

  dataRows.forEach((rawValues, index) => {
    const normalizedRawValues = headers.map((_, columnIndex) =>
      normalizeCellValue(rawValues[columnIndex]),
    );

    if (isEmptyRow(normalizedRawValues)) {
      emptyRowCount += 1;
      return;
    }

    const values = rowToValues(headers, normalizedRawValues);
    parsedRows.push(
      Object.freeze({
        ...values,
        rowNumber: index + 2,
        values,
        rawValues: Object.freeze([...normalizedRawValues]),
      }),
    );
  });

  return Object.freeze({
    sheetKey,
    sheetName: sheetKey,
    category: manifestEntry.category,
    headers: Object.freeze([...headers]),
    rows: Object.freeze(parsedRows),
    rowCount: parsedRows.length,
    emptyRowCount,
  });
}

export function toValidationWorkbook(
  parsedWorkbook: ParsedRankedPatternWorkbookFile,
): ParsedRankedPatternWorkbook {
  const validationWorkbook: ParsedRankedPatternWorkbook = {};

  for (const sheetKey of rankedPatternImportSheetKeys) {
    const sheet = parsedWorkbook.sheets[sheetKey];
    if (!sheet) {
      continue;
    }

    validationWorkbook[sheetKey] = {
      header: sheet.headers,
      rows: sheet.rows,
    } satisfies ParsedRankedPatternSheet;
  }

  return validationWorkbook;
}

export function parseRankedPatternWorkbookFile(
  sourcePath: string,
  options: { readonly parsedAt?: string } = {},
): ParsedRankedPatternWorkbookFile {
  const workbook = XLSX.readFile(sourcePath, { cellDates: false });
  const workbookSheetNames = new Set(workbook.SheetNames);
  const expectedSheetNames = new Set<string>(rankedPatternImportSheetKeys);
  const sheets: Partial<Record<RankedPatternImportSheetKey, ParsedRankedPatternWorkbookSheet>> = {};
  const missingSheets: RankedPatternImportSheetKey[] = [];

  for (const sheetKey of rankedPatternImportSheetKeys) {
    const parsedSheet = parseSheet(workbook, sheetKey);
    if (!parsedSheet) {
      missingSheets.push(sheetKey);
      continue;
    }

    sheets[sheetKey] = parsedSheet;
  }

  const unexpectedSheets = workbook.SheetNames.filter((sheetName) => !expectedSheetNames.has(sheetName));

  return Object.freeze({
    sourcePath,
    workbookName: path.basename(sourcePath),
    sheets: Object.freeze(sheets),
    missingSheets: Object.freeze(missingSheets),
    unexpectedSheets: Object.freeze(unexpectedSheets),
    parsedAt: options.parsedAt ?? new Date().toISOString(),
  });
}
