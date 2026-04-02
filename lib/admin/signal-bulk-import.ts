import { getNonEmptyImportLines, sortImportErrors, splitPipeColumns } from '@/lib/admin/pipe-delimited-import';
import { DOMAIN_KEY_PATTERN, slugifyDomainKey } from '@/lib/utils/domain-key';
import { SIGNAL_KEY_PATTERN, slugifySignalKey } from '@/lib/utils/signal-key';

export const DEFAULT_SIGNAL_BULK_IMPORT_MAX_ROWS = 200;

export type SignalBulkImportExistingDomain = {
  domainId: string;
  domainKey: string;
  label: string;
};

export type SignalBulkImportExistingSignal = {
  signalId: string;
  domainId: string;
  signalKey: string;
  label: string;
};

export type SignalBulkImportParseErrorCode =
  | 'INVALID_COLUMN_COUNT'
  | 'EMPTY_DOMAIN'
  | 'EMPTY_LABEL'
  | 'EMPTY_KEY'
  | 'INVALID_KEY';

export type SignalBulkImportPreviewRecord = {
  lineNumber: number;
  rawLine: string;
  domainReference: string;
  matchedBy: 'domain_key' | 'domain_label';
  domainId: string;
  domainKey: string;
  domainLabel: string;
  label: string;
  key: string;
  description: string | null;
};

export type SignalBulkImportParseError = {
  lineNumber: number;
  rawLine: string;
  code: SignalBulkImportParseErrorCode;
  message: string;
};

export type SignalBulkImportValidationErrorCode =
  | 'ROW_LIMIT_EXCEEDED'
  | 'UNKNOWN_DOMAIN'
  | 'AMBIGUOUS_DOMAIN'
  | 'DUPLICATE_SIGNAL_KEY'
  | 'DUPLICATE_SIGNAL_LABEL_IN_DOMAIN'
  | 'EXISTING_SIGNAL_KEY_CONFLICT'
  | 'EXISTING_SIGNAL_LABEL_IN_DOMAIN_CONFLICT';

export type SignalBulkImportValidationError = {
  lineNumber: number | null;
  rawLine: string | null;
  code: SignalBulkImportValidationErrorCode;
  message: string;
  domainReference: string | null;
  domainKey: string | null;
  label: string | null;
  key: string | null;
};

export type SignalBulkImportResult = {
  success: boolean;
  previewRecords: readonly SignalBulkImportPreviewRecord[];
  parseErrors: readonly SignalBulkImportParseError[];
  validationErrors: readonly SignalBulkImportValidationError[];
};

type ParsedSignalRow = {
  lineNumber: number;
  rawLine: string;
  domainReference: string;
  label: string;
  key: string;
  description: string | null;
};

type ParseRowResult =
  | { record: ParsedSignalRow }
  | { error: SignalBulkImportParseError };

export function parseSignalBulkImport(params: {
  input: string;
  existingDomains: readonly SignalBulkImportExistingDomain[];
  existingSignals: readonly SignalBulkImportExistingSignal[];
  maxRows?: number;
  allowDuplicateLabelsWithinDomain?: boolean;
}): SignalBulkImportResult {
  const maxRows = params.maxRows ?? DEFAULT_SIGNAL_BULK_IMPORT_MAX_ROWS;
  const allowDuplicateLabelsWithinDomain = params.allowDuplicateLabelsWithinDomain ?? false;
  const parseErrors: SignalBulkImportParseError[] = [];
  const validationErrors: SignalBulkImportValidationError[] = [];
  const parsedRows: ParsedSignalRow[] = [];
  const previewRecords: SignalBulkImportPreviewRecord[] = [];
  const nonEmptyLines = getNonEmptyImportLines(params.input);

  for (const line of nonEmptyLines) {
    const parsedRow = parseSignalBulkImportRow(line.rawLine, line.lineNumber);
    if ('record' in parsedRow) {
      parsedRows.push(parsedRow.record);
      continue;
    }

    parseErrors.push(parsedRow.error);
  }

  if (nonEmptyLines.length > maxRows) {
    validationErrors.push({
      lineNumber: null,
      rawLine: null,
      code: 'ROW_LIMIT_EXCEEDED',
      message: `Signal import contains ${nonEmptyLines.length} non-empty rows; the maximum allowed is ${maxRows}.`,
      domainReference: null,
      domainKey: null,
      label: null,
      key: null,
    });
  }

  const resolvedRows: SignalBulkImportPreviewRecord[] = [];
  for (const row of parsedRows) {
    const resolvedDomain = resolveSignalImportDomain(row.domainReference, params.existingDomains);
    if (resolvedDomain.status === 'unknown') {
      validationErrors.push({
        lineNumber: row.lineNumber,
        rawLine: row.rawLine,
        code: 'UNKNOWN_DOMAIN',
        message: `Domain ${row.domainReference} does not exist in the current assessment version.`,
        domainReference: row.domainReference,
        domainKey: null,
        label: row.label,
        key: row.key,
      });
      continue;
    }

    if (resolvedDomain.status === 'ambiguous') {
      validationErrors.push({
        lineNumber: row.lineNumber,
        rawLine: row.rawLine,
        code: 'AMBIGUOUS_DOMAIN',
        message: `Domain ${row.domainReference} matches multiple domains in the current assessment version.`,
        domainReference: row.domainReference,
        domainKey: null,
        label: row.label,
        key: row.key,
      });
      continue;
    }

    resolvedRows.push({
      lineNumber: row.lineNumber,
      rawLine: row.rawLine,
      domainReference: row.domainReference,
      matchedBy: resolvedDomain.matchedBy,
      domainId: resolvedDomain.domain.domainId,
      domainKey: resolvedDomain.domain.domainKey,
      domainLabel: resolvedDomain.domain.label,
      label: row.label,
      key: row.key,
      description: row.description,
    });
  }

  previewRecords.push(...resolvedRows);

  const duplicateKeys = new Map<string, number[]>();
  const duplicateDomainLabels = new Map<string, number[]>();

  for (const record of resolvedRows) {
    const existingKeyLines = duplicateKeys.get(record.key);
    if (existingKeyLines) {
      existingKeyLines.push(record.lineNumber);
    } else {
      duplicateKeys.set(record.key, [record.lineNumber]);
    }

    const domainLabelKey = `${record.domainId}::${normalizeLabelKey(record.label)}`;
    const existingLabelLines = duplicateDomainLabels.get(domainLabelKey);
    if (existingLabelLines) {
      existingLabelLines.push(record.lineNumber);
    } else {
      duplicateDomainLabels.set(domainLabelKey, [record.lineNumber]);
    }
  }

  const existingSignalKeys = new Set(params.existingSignals.map((signal) => signal.signalKey));
  const existingDomainLabels = new Set(
    params.existingSignals.map((signal) => `${signal.domainId}::${normalizeLabelKey(signal.label)}`),
  );

  for (const record of resolvedRows) {
    const keyLineNumbers = duplicateKeys.get(record.key) ?? [];
    if (keyLineNumbers.length > 1) {
      validationErrors.push({
        lineNumber: record.lineNumber,
        rawLine: record.rawLine,
        code: 'DUPLICATE_SIGNAL_KEY',
        message: `Signal key ${record.key} is duplicated in this batch (lines ${keyLineNumbers.join(', ')}).`,
        domainReference: record.domainReference,
        domainKey: record.domainKey,
        label: record.label,
        key: record.key,
      });
    }

    const duplicateLabelKey = `${record.domainId}::${normalizeLabelKey(record.label)}`;
    const labelLineNumbers = duplicateDomainLabels.get(duplicateLabelKey) ?? [];
    if (!allowDuplicateLabelsWithinDomain && labelLineNumbers.length > 1) {
      validationErrors.push({
        lineNumber: record.lineNumber,
        rawLine: record.rawLine,
        code: 'DUPLICATE_SIGNAL_LABEL_IN_DOMAIN',
        message: `Signal label ${record.label} is duplicated within domain ${record.domainKey} in this batch (lines ${labelLineNumbers.join(', ')}).`,
        domainReference: record.domainReference,
        domainKey: record.domainKey,
        label: record.label,
        key: record.key,
      });
    }

    if (existingSignalKeys.has(record.key)) {
      validationErrors.push({
        lineNumber: record.lineNumber,
        rawLine: record.rawLine,
        code: 'EXISTING_SIGNAL_KEY_CONFLICT',
        message: `Signal key ${record.key} already exists in the current assessment version.`,
        domainReference: record.domainReference,
        domainKey: record.domainKey,
        label: record.label,
        key: record.key,
      });
    }

    if (!allowDuplicateLabelsWithinDomain && existingDomainLabels.has(duplicateLabelKey)) {
      validationErrors.push({
        lineNumber: record.lineNumber,
        rawLine: record.rawLine,
        code: 'EXISTING_SIGNAL_LABEL_IN_DOMAIN_CONFLICT',
        message: `Signal label ${record.label} already exists within domain ${record.domainKey} in the current assessment version.`,
        domainReference: record.domainReference,
        domainKey: record.domainKey,
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

function parseSignalBulkImportRow(
  rawLine: string,
  lineNumber: number,
): ParseRowResult {
  const columns = splitPipeColumns(rawLine);

  if (columns.length < 2 || columns.length > 4) {
    return {
      error: createParseError(
        lineNumber,
        rawLine,
        'INVALID_COLUMN_COUNT',
        'Each row must contain 2, 3, or 4 pipe-delimited columns: domain | label | [description] or domain | label | key | description.',
      ),
    };
  }

  const domainReference = columns[0] ?? '';
  if (!domainReference) {
    return {
      error: createParseError(lineNumber, rawLine, 'EMPTY_DOMAIN', 'Domain is required.'),
    };
  }

  const label = columns[1] ?? '';
  if (!label) {
    return {
      error: createParseError(lineNumber, rawLine, 'EMPTY_LABEL', 'Signal label is required.'),
    };
  }

  if (columns.length === 2) {
    const generatedKey = slugifySignalKey(label);
    if (!generatedKey || !SIGNAL_KEY_PATTERN.test(generatedKey)) {
      return {
        error: createParseError(
          lineNumber,
          rawLine,
          'INVALID_KEY',
          'A valid signal key could not be generated from the label.',
        ),
      };
    }

    return {
      record: {
        lineNumber,
        rawLine,
        domainReference,
        label,
        key: generatedKey,
        description: null,
      },
    };
  }

  if (columns.length === 3) {
    const generatedKey = slugifySignalKey(label);
    if (!generatedKey || !SIGNAL_KEY_PATTERN.test(generatedKey)) {
      return {
        error: createParseError(
          lineNumber,
          rawLine,
          'INVALID_KEY',
          'A valid signal key could not be generated from the label.',
        ),
      };
    }

    return {
      record: {
        lineNumber,
        rawLine,
        domainReference,
        label,
        key: generatedKey,
        description: columns[2] || null,
      },
    };
  }

  const explicitKey = columns[2] ?? '';
  if (!explicitKey) {
    return {
      error: createParseError(lineNumber, rawLine, 'EMPTY_KEY', 'Signal key is required when the key column is present.'),
    };
  }

  const normalizedKey = slugifySignalKey(explicitKey);
  if (!normalizedKey || !SIGNAL_KEY_PATTERN.test(normalizedKey)) {
    return {
      error: createParseError(
        lineNumber,
        rawLine,
        'INVALID_KEY',
        'Signal key must use lowercase letters, numbers, and single hyphens only.',
      ),
    };
  }

  return {
    record: {
      lineNumber,
      rawLine,
      domainReference,
      label,
      key: normalizedKey,
      description: columns[3] || null,
    },
  };
}

function resolveSignalImportDomain(
  domainReference: string,
  domains: readonly SignalBulkImportExistingDomain[],
):
  | { status: 'resolved'; domain: SignalBulkImportExistingDomain; matchedBy: 'domain_key' | 'domain_label' }
  | { status: 'unknown' }
  | { status: 'ambiguous' } {
  const normalizedKeyCandidate = slugifyDomainKey(domainReference);
  if (normalizedKeyCandidate && DOMAIN_KEY_PATTERN.test(normalizedKeyCandidate)) {
    const exactKeyMatches = domains.filter((domain) => domain.domainKey === normalizedKeyCandidate);
    if (exactKeyMatches.length === 1) {
      return {
        status: 'resolved',
        domain: exactKeyMatches[0]!,
        matchedBy: 'domain_key',
      };
    }

    if (exactKeyMatches.length > 1) {
      return { status: 'ambiguous' };
    }
  }

  const exactLabelMatches = domains.filter((domain) => domain.label === domainReference.trim());
  if (exactLabelMatches.length === 1) {
    return {
      status: 'resolved',
      domain: exactLabelMatches[0]!,
      matchedBy: 'domain_label',
    };
  }

  if (exactLabelMatches.length > 1) {
    return { status: 'ambiguous' };
  }

  return { status: 'unknown' };
}

function createParseError(
  lineNumber: number,
  rawLine: string,
  code: SignalBulkImportParseErrorCode,
  message: string,
): SignalBulkImportParseError {
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
