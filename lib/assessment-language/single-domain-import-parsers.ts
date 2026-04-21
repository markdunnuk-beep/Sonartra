import type {
  SingleDomainNarrativeDatasetKey,
  SingleDomainNarrativeImportRowMap,
} from '@/lib/assessment-language/single-domain-narrative-types';
import { validateSingleDomainImportHeaders } from '@/lib/assessment-language/single-domain-narrative-schema';
import { getSingleDomainImportHeaderColumns } from '@/lib/assessment-language/single-domain-import-headers';

export type SingleDomainImportParseIssue = {
  lineNumber: number;
  message: string;
};

export type SingleDomainImportParseResult<TKey extends SingleDomainNarrativeDatasetKey> = {
  success: boolean;
  rows: readonly SingleDomainNarrativeImportRowMap[TKey][];
  parseErrors: readonly SingleDomainImportParseIssue[];
  headers: readonly string[];
};

function splitInputLines(rawInput: string): readonly string[] {
  return rawInput.replace(/\s+$/, '').split(/\r?\n/);
}

function normalizeCell(value: string): string {
  return value.trim();
}

export function parseSingleDomainImportInput<TKey extends SingleDomainNarrativeDatasetKey>(
  datasetKey: TKey,
  rawInput: string,
): SingleDomainImportParseResult<TKey> {
  const lines = splitInputLines(rawInput);

  if (lines.length === 0 || lines.every((line) => line.trim().length === 0)) {
    return {
      success: false,
      rows: [],
      parseErrors: [{ lineNumber: 1, message: 'Header row is required.' }],
      headers: [],
    };
  }

  const headers = lines[0]?.split('|').map(normalizeCell) ?? [];
  const headerValidation = validateSingleDomainImportHeaders(datasetKey, headers);
  if (!headerValidation.success) {
    return {
      success: false,
      rows: [],
      parseErrors: [{
        lineNumber: 1,
        message: headerValidation.message ?? `Invalid headers for ${datasetKey}.`,
      }],
      headers,
    };
  }

  const expectedHeaders = getSingleDomainImportHeaderColumns(datasetKey);
  const rows: SingleDomainNarrativeImportRowMap[TKey][] = [];
  const parseErrors: SingleDomainImportParseIssue[] = [];

  for (const [index, rowLine] of lines.slice(1).entries()) {
    const lineNumber = index + 2;

    if (rowLine.trim().length === 0) {
      parseErrors.push({
        lineNumber,
        message: `Line ${lineNumber}: blank rows are not allowed.`,
      });
      continue;
    }

    const columns = rowLine.split('|');
    if (columns.length !== expectedHeaders.length) {
      parseErrors.push({
        lineNumber,
        message: `Line ${lineNumber}: expected exactly ${expectedHeaders.length} pipe-delimited columns.`,
      });
      continue;
    }

    const row = Object.fromEntries(
      expectedHeaders.map((header, columnIndex) => [
        header,
        normalizeCell(columns[columnIndex] ?? ''),
      ]),
    ) as unknown as SingleDomainNarrativeImportRowMap[TKey];

    rows.push(row);
  }

  return {
    success: parseErrors.length === 0,
    rows: parseErrors.length === 0 ? rows : [],
    parseErrors,
    headers,
  };
}
