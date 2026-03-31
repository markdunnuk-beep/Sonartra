export const BULK_WEIGHT_OPTION_LABEL_ORDER = ['A', 'B', 'C', 'D'] as const;

const ALLOWED_OPTION_LABELS = new Set(BULK_WEIGHT_OPTION_LABEL_ORDER);
const SIGNAL_KEY_PATTERN = /^[a-z0-9_-]+$/;

export type BulkWeightLabel = (typeof BULK_WEIGHT_OPTION_LABEL_ORDER)[number];

export type BulkWeightParseErrorCode =
  | 'INVALID_COLUMN_COUNT'
  | 'EMPTY_QUESTION_NUMBER'
  | 'INVALID_QUESTION_NUMBER'
  | 'EMPTY_OPTION_LABEL'
  | 'INVALID_OPTION_LABEL'
  | 'EMPTY_SIGNAL_KEY'
  | 'INVALID_SIGNAL_KEY'
  | 'EMPTY_WEIGHT'
  | 'INVALID_WEIGHT';

export type ParsedBulkWeightRow = {
  lineNumber: number;
  rawLine: string;
  questionNumberRaw: string;
  questionNumber: number;
  optionLabel: BulkWeightLabel;
  signalKeyRaw: string;
  signalKey: string;
  weightRaw: string;
  weight: number;
};

export type BulkWeightParseError = {
  lineNumber: number;
  rawLine: string;
  code: BulkWeightParseErrorCode;
  message: string;
};

export type BulkWeightParseResult = {
  success: boolean;
  records: ParsedBulkWeightRow[];
  errors: BulkWeightParseError[];
};

export type BulkWeightGroupValidationErrorCode =
  | 'DUPLICATE_SIGNAL_KEY'
  | 'EMPTY_WEIGHT_GROUP';

export type BulkWeightGroupValidationWarningCode =
  | 'ZERO_ONLY_WEIGHT_GROUP'
  | 'NEGATIVE_ONLY_WEIGHT_GROUP';

export type ValidatedBulkWeightPreviewRow = Pick<
  ParsedBulkWeightRow,
  'lineNumber' | 'signalKey' | 'weight'
>;

export type ValidatedBulkWeightGroup = {
  questionNumber: number;
  optionLabel: BulkWeightLabel;
  groupKey: string;
  weights: ValidatedBulkWeightPreviewRow[];
  weightCount: number;
  isEmpty: boolean;
  allZero: boolean;
  allNegative: boolean;
};

export type BulkWeightGroupValidationError = {
  questionNumber: number;
  optionLabel: BulkWeightLabel;
  code: BulkWeightGroupValidationErrorCode;
  message: string;
  lineNumbers: number[];
};

export type BulkWeightGroupValidationWarning = {
  questionNumber: number;
  optionLabel: BulkWeightLabel;
  code: BulkWeightGroupValidationWarningCode;
  message: string;
  lineNumbers: number[];
};

export type BulkWeightGroupValidationResult = {
  success: boolean;
  weightGroups: ValidatedBulkWeightGroup[];
  errors: BulkWeightGroupValidationError[];
  warnings: BulkWeightGroupValidationWarning[];
};

export type BulkWeightImportPreviewResult = {
  success: boolean;
  records: ParsedBulkWeightRow[];
  parseErrors: BulkWeightParseError[];
  weightGroups: ValidatedBulkWeightGroup[];
  groupErrors: BulkWeightGroupValidationError[];
  warnings: BulkWeightGroupValidationWarning[];
};

type ParseLineSuccess = {
  record: ParsedBulkWeightRow;
};

type ParseLineFailure = {
  error: BulkWeightParseError;
};

type ParseLineResult = ParseLineSuccess | ParseLineFailure;

export function parseBulkWeightImport(input: string): BulkWeightParseResult {
  const records: ParsedBulkWeightRow[] = [];
  const errors: BulkWeightParseError[] = [];
  const lines = input.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index] ?? '';
    if (rawLine.trim() === '') {
      continue;
    }

    const parsedLine = parseLine(rawLine, index + 1);
    if ('record' in parsedLine) {
      records.push(parsedLine.record);
      continue;
    }

    errors.push(parsedLine.error);
  }

  return {
    success: errors.length === 0,
    records,
    errors,
  };
}

export function validateBulkWeightGroups(
  records: ParsedBulkWeightRow[],
): BulkWeightGroupValidationResult {
  const groupedRows = groupBulkWeightRows(records);
  const groupKeys = [...groupedRows.keys()].sort(compareWeightGroupKeys);
  const weightGroups: ValidatedBulkWeightGroup[] = [];
  const errors: BulkWeightGroupValidationError[] = [];
  const warnings: BulkWeightGroupValidationWarning[] = [];

  for (const groupKey of groupKeys) {
    const rows = groupedRows.get(groupKey) ?? [];
    const validation = validateBulkWeightGroup(rows);

    weightGroups.push(validation.weightGroup);
    errors.push(...validation.errors);
    warnings.push(...validation.warnings);
  }

  errors.sort(compareGroupedIssues);
  warnings.sort(compareGroupedIssues);

  return {
    success: errors.length === 0,
    weightGroups,
    errors,
    warnings,
  };
}

export function buildBulkWeightImportPreview(input: string): BulkWeightImportPreviewResult {
  const parsedResult = parseBulkWeightImport(input);
  const groupValidation = validateBulkWeightGroups(parsedResult.records);

  return {
    success: parsedResult.errors.length === 0 && groupValidation.errors.length === 0,
    records: parsedResult.records,
    parseErrors: parsedResult.errors,
    weightGroups: groupValidation.weightGroups,
    groupErrors: groupValidation.errors,
    warnings: groupValidation.warnings,
  };
}

function parseLine(rawLine: string, lineNumber: number): ParseLineResult {
  const columns = rawLine.split('|');
  if (columns.length !== 4) {
    return {
      error: createParseError(
        lineNumber,
        rawLine,
        'INVALID_COLUMN_COUNT',
        'Each row must contain exactly 4 pipe-delimited columns: question_number | option_label | signal_key | weight.',
      ),
    };
  }

  const [questionNumberRaw, optionLabelRaw, signalKeyRaw, weightRaw] = columns.map((column) =>
    column.trim(),
  );

  if (questionNumberRaw.length === 0) {
    return {
      error: createParseError(
        lineNumber,
        rawLine,
        'EMPTY_QUESTION_NUMBER',
        'Question number is required.',
      ),
    };
  }

  const questionNumber = parseQuestionNumber(questionNumberRaw);
  if (questionNumber === null) {
    return {
      error: createParseError(
        lineNumber,
        rawLine,
        'INVALID_QUESTION_NUMBER',
        'Question number must be a positive integer.',
      ),
    };
  }

  const optionLabel = normalizeBulkWeightOptionLabel(optionLabelRaw);
  if (optionLabelRaw.length === 0) {
    return {
      error: createParseError(
        lineNumber,
        rawLine,
        'EMPTY_OPTION_LABEL',
        'Option label is required.',
      ),
    };
  }

  if (optionLabel === null) {
    return {
      error: createParseError(
        lineNumber,
        rawLine,
        'INVALID_OPTION_LABEL',
        'Option label must be one of A, B, C, or D.',
      ),
    };
  }

  if (signalKeyRaw.length === 0) {
    return {
      error: createParseError(
        lineNumber,
        rawLine,
        'EMPTY_SIGNAL_KEY',
        'Signal key is required.',
      ),
    };
  }

  const signalKey = normalizeBulkWeightSignalKey(signalKeyRaw);
  if (signalKey === null) {
    return {
      error: createParseError(
        lineNumber,
        rawLine,
        'INVALID_SIGNAL_KEY',
        'Signal key must use lowercase letters, numbers, underscores, or hyphens.',
      ),
    };
  }

  if (weightRaw.length === 0) {
    return {
      error: createParseError(lineNumber, rawLine, 'EMPTY_WEIGHT', 'Weight is required.'),
    };
  }

  const weight = parseBulkWeightValue(weightRaw);
  if (weight === null) {
    return {
      error: createParseError(lineNumber, rawLine, 'INVALID_WEIGHT', 'Weight must be a valid number.'),
    };
  }

  return {
    record: {
      lineNumber,
      rawLine,
      questionNumberRaw,
      questionNumber,
      optionLabel,
      signalKeyRaw,
      signalKey,
      weightRaw,
      weight,
    },
  };
}

export function normalizeBulkWeightOptionLabel(value: string): BulkWeightLabel | null {
  const normalizedValue = value.trim().toUpperCase();
  if (!isBulkWeightLabel(normalizedValue)) {
    return null;
  }

  return normalizedValue;
}

export function normalizeBulkWeightSignalKey(value: string): string | null {
  const normalizedValue = value.trim().toLowerCase();
  if (normalizedValue.length === 0) {
    return null;
  }

  if (!SIGNAL_KEY_PATTERN.test(normalizedValue)) {
    return null;
  }

  return normalizedValue;
}

export function parseBulkWeightValue(value: string): number | null {
  const normalizedValue = value.trim();
  if (normalizedValue.length === 0) {
    return null;
  }

  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(normalizedValue)) {
    return null;
  }

  const parsedValue = Number(normalizedValue);
  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return parsedValue;
}

export function groupBulkWeightRows(
  records: ParsedBulkWeightRow[],
): Map<string, ParsedBulkWeightRow[]> {
  const groupedRows = new Map<string, ParsedBulkWeightRow[]>();

  for (const record of records) {
    const groupKey = buildBulkWeightGroupKey(record.questionNumber, record.optionLabel);
    const existingRows = groupedRows.get(groupKey);
    if (existingRows) {
      existingRows.push(record);
      continue;
    }

    groupedRows.set(groupKey, [record]);
  }

  return groupedRows;
}

export function buildBulkWeightGroupKey(questionNumber: number, optionLabel: BulkWeightLabel): string {
  return `${questionNumber}|${optionLabel}`;
}

type WeightGroupValidation = {
  weightGroup: ValidatedBulkWeightGroup;
  errors: BulkWeightGroupValidationError[];
  warnings: BulkWeightGroupValidationWarning[];
};

export function validateBulkWeightGroup(rows: ParsedBulkWeightRow[]): WeightGroupValidation {
  const firstRow = rows[0];
  const questionNumber = firstRow?.questionNumber ?? 0;
  const optionLabel = firstRow?.optionLabel ?? 'A';
  const sortedRows = sortWeightRowsWithinGroup(rows);
  const lineNumbers = sortLineNumbers(rows.map((row) => row.lineNumber));
  const duplicateSignalKeys = findDuplicateSignalKeys(rows);
  const isEmpty = rows.length === 0;
  const allZero = rows.length > 0 && rows.every((row) => Object.is(row.weight, 0));
  const allNegative = rows.length > 0 && rows.every((row) => row.weight < 0);
  const errors: BulkWeightGroupValidationError[] = [];
  const warnings: BulkWeightGroupValidationWarning[] = [];

  if (isEmpty) {
    errors.push({
      questionNumber,
      optionLabel,
      code: 'EMPTY_WEIGHT_GROUP',
      message: `Question ${questionNumber} option ${optionLabel} does not contain any weight rows.`,
      lineNumbers: [],
    });
  }

  if (duplicateSignalKeys.length > 0) {
    const duplicateLineNumbers = duplicateSignalKeys.flatMap((signalKey) =>
      rows.filter((row) => row.signalKey === signalKey).map((row) => row.lineNumber),
    );
    errors.push({
      questionNumber,
      optionLabel,
      code: 'DUPLICATE_SIGNAL_KEY',
      message: `Question ${questionNumber} option ${optionLabel} contains duplicate signal keys: ${duplicateSignalKeys.join(', ')}.`,
      lineNumbers: sortLineNumbers(duplicateLineNumbers),
    });
  }

  if (allZero) {
    warnings.push({
      questionNumber,
      optionLabel,
      code: 'ZERO_ONLY_WEIGHT_GROUP',
      message: `Question ${questionNumber} option ${optionLabel} contains only zero weights.`,
      lineNumbers,
    });
  }

  if (allNegative) {
    warnings.push({
      questionNumber,
      optionLabel,
      code: 'NEGATIVE_ONLY_WEIGHT_GROUP',
      message: `Question ${questionNumber} option ${optionLabel} contains only negative weights.`,
      lineNumbers,
    });
  }

  return {
    weightGroup: {
      questionNumber,
      optionLabel,
      groupKey: buildBulkWeightGroupKey(questionNumber, optionLabel),
      weights: sortedRows.map((row) => ({
        lineNumber: row.lineNumber,
        signalKey: row.signalKey,
        weight: row.weight,
      })),
      weightCount: rows.length,
      isEmpty,
      allZero,
      allNegative,
    },
    errors,
    warnings,
  };
}

export function findDuplicateSignalKeys(rows: ParsedBulkWeightRow[]): string[] {
  const signalKeyCounts = new Map<string, number>();

  for (const row of rows) {
    signalKeyCounts.set(row.signalKey, (signalKeyCounts.get(row.signalKey) ?? 0) + 1);
  }

  return [...signalKeyCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([signalKey]) => signalKey)
    .sort((left, right) => left.localeCompare(right));
}

export function sortBulkWeightGroups(
  groups: ValidatedBulkWeightGroup[],
): ValidatedBulkWeightGroup[] {
  return [...groups].sort(
    (left, right) =>
      left.questionNumber - right.questionNumber ||
      getLabelOrderIndex(left.optionLabel) - getLabelOrderIndex(right.optionLabel),
  );
}

export function sortWeightRowsWithinGroup(rows: ParsedBulkWeightRow[]): ParsedBulkWeightRow[] {
  return [...rows].sort(
    (left, right) =>
      left.signalKey.localeCompare(right.signalKey) || left.lineNumber - right.lineNumber,
  );
}

function parseQuestionNumber(value: string): number | null {
  const normalizedValue = value.trim();
  if (!/^\d+$/.test(normalizedValue)) {
    return null;
  }

  const parsedValue = Number.parseInt(normalizedValue, 10);
  if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

function createParseError(
  lineNumber: number,
  rawLine: string,
  code: BulkWeightParseErrorCode,
  message: string,
): BulkWeightParseError {
  return {
    lineNumber,
    rawLine,
    code,
    message,
  };
}

function isBulkWeightLabel(value: string): value is BulkWeightLabel {
  return ALLOWED_OPTION_LABELS.has(value as BulkWeightLabel);
}

function compareGroupedIssues(
  left: { questionNumber: number; optionLabel: BulkWeightLabel; code: string },
  right: { questionNumber: number; optionLabel: BulkWeightLabel; code: string },
): number {
  return (
    left.questionNumber - right.questionNumber ||
    getLabelOrderIndex(left.optionLabel) - getLabelOrderIndex(right.optionLabel) ||
    left.code.localeCompare(right.code)
  );
}

function compareWeightGroupKeys(left: string, right: string): number {
  const leftParts = parseWeightGroupKey(left);
  const rightParts = parseWeightGroupKey(right);

  return (
    leftParts.questionNumber - rightParts.questionNumber ||
    getLabelOrderIndex(leftParts.optionLabel) - getLabelOrderIndex(rightParts.optionLabel)
  );
}

function parseWeightGroupKey(value: string): { questionNumber: number; optionLabel: BulkWeightLabel } {
  const [questionNumberValue, optionLabelValue] = value.split('|');
  return {
    questionNumber: Number.parseInt(questionNumberValue ?? '0', 10),
    optionLabel: normalizeBulkWeightOptionLabel(optionLabelValue ?? 'A') ?? 'A',
  };
}

function getLabelOrderIndex(label: BulkWeightLabel): number {
  return BULK_WEIGHT_OPTION_LABEL_ORDER.indexOf(label);
}

function sortLineNumbers(lineNumbers: number[]): number[] {
  return [...lineNumbers].sort((left, right) => left - right);
}
