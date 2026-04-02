import { getNonEmptyImportLines, sortImportErrors, splitPipeColumns } from '@/lib/admin/pipe-delimited-import';
import { DOMAIN_KEY_PATTERN, slugifyDomainKey } from '@/lib/utils/domain-key';

export const DEFAULT_DOMAIN_BULK_IMPORT_MAX_ROWS = 200;

export type DomainBulkImportExistingDomain = {
  domainId: string;
  domainKey: string;
  label: string;
};

export type DomainBulkImportParseErrorCode =
  | 'INVALID_COLUMN_COUNT'
  | 'EMPTY_LABEL'
  | 'EMPTY_KEY'
  | 'INVALID_KEY';

export type DomainBulkImportPreviewRecord = {
  lineNumber: number;
  rawLine: string;
  label: string;
  key: string;
  description: string | null;
};

export type DomainBulkImportParseError = {
  lineNumber: number;
  rawLine: string;
  code: DomainBulkImportParseErrorCode;
  message: string;
};

export type DomainBulkImportValidationErrorCode =
  | 'ROW_LIMIT_EXCEEDED'
  | 'DUPLICATE_DOMAIN_LABEL'
  | 'DUPLICATE_DOMAIN_KEY'
  | 'EXISTING_DOMAIN_KEY_CONFLICT';

export type DomainBulkImportValidationError = {
  lineNumber: number | null;
  rawLine: string | null;
  code: DomainBulkImportValidationErrorCode;
  message: string;
  label: string | null;
  key: string | null;
};

export type DomainBulkImportResult = {
  success: boolean;
  previewRecords: readonly DomainBulkImportPreviewRecord[];
  parseErrors: readonly DomainBulkImportParseError[];
  validationErrors: readonly DomainBulkImportValidationError[];
};

type ParseRowResult =
  | { record: DomainBulkImportPreviewRecord }
  | { error: DomainBulkImportParseError };

export function parseDomainBulkImport(params: {
  input: string;
  existingDomains: readonly DomainBulkImportExistingDomain[];
  maxRows?: number;
}): DomainBulkImportResult {
  const maxRows = params.maxRows ?? DEFAULT_DOMAIN_BULK_IMPORT_MAX_ROWS;
  const previewRecords: DomainBulkImportPreviewRecord[] = [];
  const parseErrors: DomainBulkImportParseError[] = [];
  const validationErrors: DomainBulkImportValidationError[] = [];
  const nonEmptyLines = getNonEmptyImportLines(params.input);

  for (const line of nonEmptyLines) {
    const parsedRow = parseDomainBulkImportRow(line.rawLine, line.lineNumber);
    if ('record' in parsedRow) {
      previewRecords.push(parsedRow.record);
      continue;
    }

    parseErrors.push(parsedRow.error);
  }

  if (nonEmptyLines.length > maxRows) {
    validationErrors.push({
      lineNumber: null,
      rawLine: null,
      code: 'ROW_LIMIT_EXCEEDED',
      message: `Domain import contains ${nonEmptyLines.length} non-empty rows; the maximum allowed is ${maxRows}.`,
      label: null,
      key: null,
    });
  }

  const duplicateLabels = new Map<string, number[]>();
  const duplicateKeys = new Map<string, number[]>();

  for (const record of previewRecords) {
    const labelKey = normalizeLabelKey(record.label);
    const existingLabelLines = duplicateLabels.get(labelKey);
    if (existingLabelLines) {
      existingLabelLines.push(record.lineNumber);
    } else {
      duplicateLabels.set(labelKey, [record.lineNumber]);
    }

    const existingKeyLines = duplicateKeys.get(record.key);
    if (existingKeyLines) {
      existingKeyLines.push(record.lineNumber);
    } else {
      duplicateKeys.set(record.key, [record.lineNumber]);
    }
  }

  const existingDomainKeys = new Set(params.existingDomains.map((domain) => domain.domainKey));

  for (const record of previewRecords) {
    const labelLineNumbers = duplicateLabels.get(normalizeLabelKey(record.label)) ?? [];
    if (labelLineNumbers.length > 1) {
      validationErrors.push({
        lineNumber: record.lineNumber,
        rawLine: record.rawLine,
        code: 'DUPLICATE_DOMAIN_LABEL',
        message: `Domain label ${record.label} is duplicated in this batch (lines ${labelLineNumbers.join(', ')}).`,
        label: record.label,
        key: record.key,
      });
    }

    const keyLineNumbers = duplicateKeys.get(record.key) ?? [];
    if (keyLineNumbers.length > 1) {
      validationErrors.push({
        lineNumber: record.lineNumber,
        rawLine: record.rawLine,
        code: 'DUPLICATE_DOMAIN_KEY',
        message: `Domain key ${record.key} is duplicated in this batch (lines ${keyLineNumbers.join(', ')}).`,
        label: record.label,
        key: record.key,
      });
    }

    if (existingDomainKeys.has(record.key)) {
      validationErrors.push({
        lineNumber: record.lineNumber,
        rawLine: record.rawLine,
        code: 'EXISTING_DOMAIN_KEY_CONFLICT',
        message: `Domain key ${record.key} already exists in the current assessment version.`,
        label: record.label,
        key: record.key,
      });
    }
  }

  return {
    success: parseErrors.length === 0 && validationErrors.length === 0,
    previewRecords,
    parseErrors: sortImportErrors(parseErrors),
    validationErrors: sortImportErrors(validationErrors),
  };
}

function parseDomainBulkImportRow(
  rawLine: string,
  lineNumber: number,
): ParseRowResult {
  const columns = splitPipeColumns(rawLine);

  if (columns.length < 1 || columns.length > 3) {
    return {
      error: createParseError(
        lineNumber,
        rawLine,
        'INVALID_COLUMN_COUNT',
        'Each row must contain 1, 2, or 3 pipe-delimited columns: label | [description] or label | key | description.',
      ),
    };
  }

  const label = columns[0] ?? '';
  if (!label) {
    return {
      error: createParseError(lineNumber, rawLine, 'EMPTY_LABEL', 'Domain label is required.'),
    };
  }

  if (columns.length === 1) {
    const generatedKey = slugifyDomainKey(label);
    if (!generatedKey) {
      return {
        error: createParseError(
          lineNumber,
          rawLine,
          'INVALID_KEY',
          'A valid domain key could not be generated from the label.',
        ),
      };
    }

    return {
      record: {
        lineNumber,
        rawLine,
        label,
        key: generatedKey,
        description: null,
      },
    };
  }

  if (columns.length === 2) {
    const generatedKey = slugifyDomainKey(label);
    if (!generatedKey) {
      return {
        error: createParseError(
          lineNumber,
          rawLine,
          'INVALID_KEY',
          'A valid domain key could not be generated from the label.',
        ),
      };
    }

    return {
      record: {
        lineNumber,
        rawLine,
        label,
        key: generatedKey,
        description: columns[1] || null,
      },
    };
  }

  const explicitKey = columns[1] ?? '';
  if (!explicitKey) {
    return {
      error: createParseError(lineNumber, rawLine, 'EMPTY_KEY', 'Domain key is required when the key column is present.'),
    };
  }

  const normalizedKey = slugifyDomainKey(explicitKey);
  if (!normalizedKey || !DOMAIN_KEY_PATTERN.test(normalizedKey)) {
    return {
      error: createParseError(
        lineNumber,
        rawLine,
        'INVALID_KEY',
        'Domain key must use lowercase letters, numbers, and single hyphens only.',
      ),
    };
  }

  return {
    record: {
      lineNumber,
      rawLine,
      label,
      key: normalizedKey,
      description: columns[2] || null,
    },
  };
}

function createParseError(
  lineNumber: number,
  rawLine: string,
  code: DomainBulkImportParseErrorCode,
  message: string,
): DomainBulkImportParseError {
  return {
    lineNumber,
    rawLine,
    code,
    message,
  };
}

function normalizeLabelKey(value: string): string {
  return value.trim().toLocaleLowerCase();
}
