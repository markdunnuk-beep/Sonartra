import type {
  AssessmentVersionApplicationActionPromptsInput,
  AssessmentVersionApplicationContributionInput,
  AssessmentVersionApplicationDevelopmentInput,
  AssessmentVersionApplicationRiskInput,
  AssessmentVersionApplicationThesisInput,
} from '@/lib/server/assessment-version-application-language-types';

type ApplicationImportError = {
  lineNumber: number;
  message: string;
};

type ParseResult<TRow> = {
  success: boolean;
  rows: readonly TRow[];
  errors: readonly ApplicationImportError[];
};

function invalidSourceTypeError(lineNumber: number, value: string, allowed: readonly string[]): ApplicationImportError {
  return {
    lineNumber,
    message: `Line ${lineNumber}: source_type "${value}" is invalid. Expected ${allowed.join(' or ')}.`,
  };
}

function splitLines(input: string): readonly string[] {
  return input
    .split(/\r?\n/)
    .filter((line, index, lines) => line.trim().length > 0 || index < lines.length - 1)
    .filter((line) => line.trim().length > 0);
}

function normalizeCell(value: string): string {
  return value.trim();
}

function parseDataset<TRow>(params: {
  input: string;
  headers: readonly string[];
  mapRow: (lineNumber: number, record: Record<string, string>) => TRow;
}): ParseResult<TRow> {
  const lines = splitLines(params.input);
  if (lines.length === 0) {
    return {
      success: false,
      rows: [],
      errors: [{ lineNumber: 1, message: 'Header row is required.' }],
    };
  }

  const [headerLine, ...rowLines] = lines;
  const parsedHeaders = headerLine.split('|').map(normalizeCell);
  const expectedHeader = [...params.headers];

  if (
    parsedHeaders.length !== expectedHeader.length ||
    parsedHeaders.some((header, index) => header !== expectedHeader[index])
  ) {
    return {
      success: false,
      rows: [],
      errors: [{
        lineNumber: 1,
        message: `Header row must be exactly: ${expectedHeader.join('|')}.`,
      }],
    };
  }

  const rows: TRow[] = [];
  const errors: ApplicationImportError[] = [];

  for (const [rowIndex, rowLine] of rowLines.entries()) {
    const lineNumber = rowIndex + 2;
    const columns = rowLine.split('|');

    if (columns.length !== expectedHeader.length) {
      errors.push({
        lineNumber,
        message: `Line ${lineNumber} must contain exactly ${expectedHeader.length} pipe-delimited columns.`,
      });
      continue;
    }

    const record = Object.fromEntries(
      expectedHeader.map((header, index) => [header, normalizeCell(columns[index] ?? '')]),
    );

    try {
      rows.push(params.mapRow(lineNumber, record));
    } catch (error) {
      errors.push({
        lineNumber,
        message: error instanceof Error ? `Line ${lineNumber}: ${error.message}` : `Line ${lineNumber}: invalid row.`,
      });
    }
  }

  return {
    success: errors.length === 0,
    rows: errors.length === 0 ? rows : [],
    errors,
  };
}

function requireValue(record: Record<string, string>, key: string): string {
  const value = record[key]?.trim() ?? '';
  if (value.length === 0) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function parsePriority(record: Record<string, string>): number {
  const raw = requireValue(record, 'priority');
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value)) {
    throw new Error('priority must be an integer.');
  }

  return value;
}

export function parseApplicationThesisImport(input: string): ParseResult<AssessmentVersionApplicationThesisInput> {
  const result = parseDataset({
    input,
    headers: ['hero_pattern_key', 'headline', 'summary'],
    mapRow: (_lineNumber, record) => ({
      heroPatternKey: requireValue(record, 'hero_pattern_key'),
      headline: requireValue(record, 'headline'),
      summary: requireValue(record, 'summary'),
    }),
  });

  if (!result.success) {
    return result;
  }

  const duplicates = new Set<string>();
  const errors: ApplicationImportError[] = [];

  for (const [index, row] of result.rows.entries()) {
    if (duplicates.has(row.heroPatternKey)) {
      errors.push({
        lineNumber: index + 2,
        message: `Line ${index + 2}: duplicate hero_pattern_key ${row.heroPatternKey}.`,
      });
    }

    duplicates.add(row.heroPatternKey);
  }

  return {
    success: errors.length === 0,
    rows: errors.length === 0 ? result.rows : [],
    errors,
  };
}

export function parseApplicationContributionImport(
  input: string,
): ParseResult<AssessmentVersionApplicationContributionInput> {
  const result = parseDataset({
    input,
    headers: ['source_type', 'source_key', 'priority', 'label', 'narrative', 'best_when', 'watch_for'],
    mapRow: (_lineNumber, record) => ({
      sourceType: requireValue(record, 'source_type') as 'pair' | 'signal',
      sourceKey: requireValue(record, 'source_key'),
      priority: parsePriority(record),
      label: requireValue(record, 'label'),
      narrative: requireValue(record, 'narrative'),
      bestWhen: requireValue(record, 'best_when'),
      watchFor: record.watch_for?.trim() ? record.watch_for.trim() : null,
    }),
  });

  return validateSourceRows(result, ['pair', 'signal'], (row) => `${row.sourceType}|${row.sourceKey}|${row.priority}`);
}

export function parseApplicationRiskImport(input: string): ParseResult<AssessmentVersionApplicationRiskInput> {
  const result = parseDataset({
    input,
    headers: ['source_type', 'source_key', 'priority', 'label', 'narrative', 'impact', 'early_warning'],
    mapRow: (_lineNumber, record) => ({
      sourceType: requireValue(record, 'source_type') as 'pair' | 'signal',
      sourceKey: requireValue(record, 'source_key'),
      priority: parsePriority(record),
      label: requireValue(record, 'label'),
      narrative: requireValue(record, 'narrative'),
      impact: requireValue(record, 'impact'),
      earlyWarning: record.early_warning?.trim() ? record.early_warning.trim() : null,
    }),
  });

  return validateSourceRows(result, ['pair', 'signal'], (row) => `${row.sourceType}|${row.sourceKey}|${row.priority}`);
}

export function parseApplicationDevelopmentImport(
  input: string,
): ParseResult<AssessmentVersionApplicationDevelopmentInput> {
  const result = parseDataset({
    input,
    headers: ['source_type', 'source_key', 'priority', 'label', 'narrative', 'practice', 'success_marker'],
    mapRow: (_lineNumber, record) => ({
      sourceType: requireValue(record, 'source_type') as 'pair' | 'signal',
      sourceKey: requireValue(record, 'source_key'),
      priority: parsePriority(record),
      label: requireValue(record, 'label'),
      narrative: requireValue(record, 'narrative'),
      practice: requireValue(record, 'practice'),
      successMarker: record.success_marker?.trim() ? record.success_marker.trim() : null,
    }),
  });

  return validateSourceRows(result, ['pair', 'signal'], (row) => `${row.sourceType}|${row.sourceKey}|${row.priority}`);
}

export function parseApplicationActionPromptsImport(
  input: string,
): ParseResult<AssessmentVersionApplicationActionPromptsInput> {
  const result = parseDataset({
    input,
    headers: ['source_type', 'source_key', 'keep_doing', 'watch_for', 'practice_next', 'ask_others'],
    mapRow: (_lineNumber, record) => ({
      sourceType: requireValue(record, 'source_type') as 'hero_pattern',
      sourceKey: requireValue(record, 'source_key'),
      keepDoing: requireValue(record, 'keep_doing'),
      watchFor: requireValue(record, 'watch_for'),
      practiceNext: requireValue(record, 'practice_next'),
      askOthers: requireValue(record, 'ask_others'),
    }),
  });

  return validateSourceRows(result, ['hero_pattern'], (row) => `${row.sourceType}|${row.sourceKey}`);
}

function validateSourceRows<TRow extends { sourceType: string; sourceKey: string }>(
  result: ParseResult<TRow>,
  allowedSourceTypes: readonly string[],
  duplicateKeyBuilder: (row: TRow) => string,
): ParseResult<TRow> {
  if (!result.success) {
    return result;
  }

  const seenKeys = new Set<string>();
  const errors: ApplicationImportError[] = [];

  for (const [index, row] of result.rows.entries()) {
    if (!allowedSourceTypes.includes(row.sourceType)) {
      errors.push(invalidSourceTypeError(index + 2, row.sourceType, allowedSourceTypes));
      continue;
    }

    const duplicateKey = duplicateKeyBuilder(row);
    if (seenKeys.has(duplicateKey)) {
      errors.push({
        lineNumber: index + 2,
        message: `Line ${index + 2}: duplicate row ${duplicateKey}.`,
      });
      continue;
    }

    seenKeys.add(duplicateKey);
  }

  return {
    success: errors.length === 0,
    rows: errors.length === 0 ? result.rows : [],
    errors,
  };
}
