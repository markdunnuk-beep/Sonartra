export const BULK_OPTION_LABEL_ORDER = ['A', 'B', 'C', 'D'] as const;

const ALLOWED_OPTION_LABELS = new Set(BULK_OPTION_LABEL_ORDER);

export type BulkOptionParseErrorCode =
  | 'INVALID_COLUMN_COUNT'
  | 'EMPTY_QUESTION_NUMBER'
  | 'INVALID_QUESTION_NUMBER'
  | 'EMPTY_OPTION_LABEL'
  | 'INVALID_OPTION_LABEL'
  | 'EMPTY_OPTION_TEXT';

export type ParsedBulkOptionRow = {
  lineNumber: number;
  rawLine: string;
  questionNumberRaw: string;
  questionNumber: number;
  optionLabel: 'A' | 'B' | 'C' | 'D';
  optionText: string;
};

export type BulkOptionParseError = {
  lineNumber: number;
  rawLine: string;
  code: BulkOptionParseErrorCode;
  message: string;
};

export type BulkOptionParseResult = {
  success: boolean;
  records: ParsedBulkOptionRow[];
  errors: BulkOptionParseError[];
};

export type BulkOptionGroupValidationErrorCode =
  | 'DUPLICATE_OPTION_LABEL'
  | 'MISSING_OPTION_LABELS'
  | 'EXCESS_OPTION_ROWS'
  | 'INCOMPLETE_OPTION_SET';

export type BulkOptionGroupValidationWarningCode = 'DUPLICATE_OPTION_TEXT';

export type ValidatedBulkOptionPreviewRow = Pick<
  ParsedBulkOptionRow,
  'lineNumber' | 'optionLabel' | 'optionText'
>;

export type ValidatedBulkOptionQuestionGroup = {
  questionNumber: number;
  options: ValidatedBulkOptionPreviewRow[];
  optionLabels: ParsedBulkOptionRow['optionLabel'][];
  isComplete: boolean;
  optionCount: number;
};

export type BulkOptionGroupValidationError = {
  questionNumber: number;
  code: BulkOptionGroupValidationErrorCode;
  message: string;
  lineNumbers: number[];
};

export type BulkOptionGroupValidationWarning = {
  questionNumber: number;
  code: BulkOptionGroupValidationWarningCode;
  message: string;
  lineNumbers: number[];
};

export type BulkOptionGroupValidationResult = {
  success: boolean;
  questionGroups: ValidatedBulkOptionQuestionGroup[];
  errors: BulkOptionGroupValidationError[];
  warnings: BulkOptionGroupValidationWarning[];
};

export type BulkOptionImportPreviewResult = {
  success: boolean;
  records: ParsedBulkOptionRow[];
  parseErrors: BulkOptionParseError[];
  questionGroups: ValidatedBulkOptionQuestionGroup[];
  groupErrors: BulkOptionGroupValidationError[];
  warnings: BulkOptionGroupValidationWarning[];
};

type ParseLineSuccess = {
  record: ParsedBulkOptionRow;
};

type ParseLineFailure = {
  error: BulkOptionParseError;
};

type ParseLineResult = ParseLineSuccess | ParseLineFailure;

export function parseBulkOptionImport(input: string): BulkOptionParseResult {
  const records: ParsedBulkOptionRow[] = [];
  const errors: BulkOptionParseError[] = [];
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

export function parseLine(rawLine: string, lineNumber: number): ParseLineResult {
  const columns = rawLine.split('|');
  if (columns.length !== 3) {
    return {
      error: createParseError(
        lineNumber,
        rawLine,
        'INVALID_COLUMN_COUNT',
        'Each row must contain exactly 3 pipe-delimited columns: question_number | option_label | option_text.',
      ),
    };
  }

  const [questionNumberRaw, optionLabelRaw, optionTextRaw] = columns.map((column) => column.trim());

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

  const optionLabel = normalizeOptionLabel(optionLabelRaw);
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

  if (optionTextRaw.length === 0) {
    return {
      error: createParseError(
        lineNumber,
        rawLine,
        'EMPTY_OPTION_TEXT',
        'Option text is required.',
      ),
    };
  }

  return {
    record: {
      lineNumber,
      rawLine,
      questionNumberRaw,
      questionNumber,
      optionLabel,
      optionText: optionTextRaw,
    },
  };
}

export function normalizeOptionLabel(value: string): ParsedBulkOptionRow['optionLabel'] | null {
  const normalizedValue = value.trim().toUpperCase();
  if (!ALLOWED_OPTION_LABELS.has(normalizedValue)) {
    return null;
  }

  return normalizedValue as ParsedBulkOptionRow['optionLabel'];
}

export function parseQuestionNumber(value: string): number | null {
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

export function validateBulkOptionGroups(
  records: ParsedBulkOptionRow[],
): BulkOptionGroupValidationResult {
  const groupedRows = groupRowsByQuestionNumber(records);
  const questionNumbers = [...groupedRows.keys()].sort((left, right) => left - right);
  const questionGroups: ValidatedBulkOptionQuestionGroup[] = [];
  const errors: BulkOptionGroupValidationError[] = [];
  const warnings: BulkOptionGroupValidationWarning[] = [];

  for (const questionNumber of questionNumbers) {
    const rows = groupedRows.get(questionNumber) ?? [];
    const validation = validateQuestionGroup(questionNumber, rows);

    questionGroups.push(validation.questionGroup);
    errors.push(...validation.errors);
    warnings.push(...validation.warnings);
  }

  errors.sort(compareGroupedIssues);
  warnings.sort(compareGroupedIssues);

  return {
    success: errors.length === 0,
    questionGroups,
    errors,
    warnings,
  };
}

export function buildBulkOptionImportPreview(input: string): BulkOptionImportPreviewResult {
  const parsedResult = parseBulkOptionImport(input);
  const groupValidation = validateBulkOptionGroups(parsedResult.records);

  return {
    success: parsedResult.errors.length === 0 && groupValidation.errors.length === 0,
    records: parsedResult.records,
    parseErrors: parsedResult.errors,
    questionGroups: groupValidation.questionGroups,
    groupErrors: groupValidation.errors,
    warnings: groupValidation.warnings,
  };
}

function createParseError(
  lineNumber: number,
  rawLine: string,
  code: BulkOptionParseErrorCode,
  message: string,
): BulkOptionParseError {
  return {
    lineNumber,
    rawLine,
    code,
    message,
  };
}

export function groupRowsByQuestionNumber(
  records: ParsedBulkOptionRow[],
): Map<number, ParsedBulkOptionRow[]> {
  const groupedRows = new Map<number, ParsedBulkOptionRow[]>();

  for (const record of records) {
    const existingRows = groupedRows.get(record.questionNumber);
    if (existingRows) {
      existingRows.push(record);
      continue;
    }

    groupedRows.set(record.questionNumber, [record]);
  }

  return groupedRows;
}

type QuestionGroupValidation = {
  questionGroup: ValidatedBulkOptionQuestionGroup;
  errors: BulkOptionGroupValidationError[];
  warnings: BulkOptionGroupValidationWarning[];
};

export function validateQuestionGroup(
  questionNumber: number,
  rows: ParsedBulkOptionRow[],
): QuestionGroupValidation {
  const sortedRows = sortOptionsByLabelOrder(rows);
  const errors: BulkOptionGroupValidationError[] = [];
  const warnings: BulkOptionGroupValidationWarning[] = [];
  const duplicateLabels = findDuplicateLabels(rows);
  const missingLabels = findMissingLabels(rows);

  if (duplicateLabels.length > 0) {
    const duplicateLineNumbers = duplicateLabels.flatMap((label) =>
      rows.filter((row) => row.optionLabel === label).map((row) => row.lineNumber),
    );
    errors.push({
      questionNumber,
      code: 'DUPLICATE_OPTION_LABEL',
      message: `Question ${questionNumber} contains duplicate option labels: ${duplicateLabels.join(', ')}.`,
      lineNumbers: sortLineNumbers(duplicateLineNumbers),
    });
  }

  if (missingLabels.length > 0) {
    errors.push({
      questionNumber,
      code: 'MISSING_OPTION_LABELS',
      message: `Question ${questionNumber} is missing option labels: ${missingLabels.join(', ')}.`,
      lineNumbers: sortLineNumbers(rows.map((row) => row.lineNumber)),
    });
  }

  if (rows.length > BULK_OPTION_LABEL_ORDER.length) {
    errors.push({
      questionNumber,
      code: 'EXCESS_OPTION_ROWS',
      message: `Question ${questionNumber} has ${rows.length} option rows; exactly 4 are required.`,
      lineNumbers: sortLineNumbers(rows.map((row) => row.lineNumber)),
    });
  }

  if (rows.length !== BULK_OPTION_LABEL_ORDER.length || duplicateLabels.length > 0 || missingLabels.length > 0) {
    errors.push({
      questionNumber,
      code: 'INCOMPLETE_OPTION_SET',
      message: `Question ${questionNumber} must provide one complete set of A, B, C, and D options.`,
      lineNumbers: sortLineNumbers(rows.map((row) => row.lineNumber)),
    });
  }

  const duplicateTextWarning = findDuplicateOptionTextWarning(questionNumber, rows);
  if (duplicateTextWarning) {
    warnings.push(duplicateTextWarning);
  }

  return {
    questionGroup: {
      questionNumber,
      options: sortedRows.map((row) => ({
        lineNumber: row.lineNumber,
        optionLabel: row.optionLabel,
        optionText: row.optionText,
      })),
      optionLabels: sortedRows.map((row) => row.optionLabel),
      isComplete: errors.length === 0,
      optionCount: rows.length,
    },
    errors,
    warnings,
  };
}

export function findMissingLabels(
  rows: ParsedBulkOptionRow[],
): ParsedBulkOptionRow['optionLabel'][] {
  const presentLabels = new Set(rows.map((row) => row.optionLabel));

  return BULK_OPTION_LABEL_ORDER.filter((label) => !presentLabels.has(label));
}

export function findDuplicateLabels(
  rows: ParsedBulkOptionRow[],
): ParsedBulkOptionRow['optionLabel'][] {
  const labelCounts = new Map<ParsedBulkOptionRow['optionLabel'], number>();

  for (const row of rows) {
    labelCounts.set(row.optionLabel, (labelCounts.get(row.optionLabel) ?? 0) + 1);
  }

  return BULK_OPTION_LABEL_ORDER.filter((label) => (labelCounts.get(label) ?? 0) > 1);
}

export function sortOptionsByLabelOrder(rows: ParsedBulkOptionRow[]): ParsedBulkOptionRow[] {
  return [...rows].sort(
    (left, right) =>
      getLabelOrderIndex(left.optionLabel) - getLabelOrderIndex(right.optionLabel) ||
      left.lineNumber - right.lineNumber,
  );
}

function findDuplicateOptionTextWarning(
  questionNumber: number,
  rows: ParsedBulkOptionRow[],
): BulkOptionGroupValidationWarning | null {
  const textLineNumbers = new Map<string, number[]>();

  for (const row of rows) {
    const existingLineNumbers = textLineNumbers.get(row.optionText);
    if (existingLineNumbers) {
      existingLineNumbers.push(row.lineNumber);
      continue;
    }

    textLineNumbers.set(row.optionText, [row.lineNumber]);
  }

  const duplicateLineNumbers = [...textLineNumbers.values()]
    .filter((lineNumbers) => lineNumbers.length > 1)
    .flatMap((lineNumbers) => lineNumbers);

  if (duplicateLineNumbers.length === 0) {
    return null;
  }

  return {
    questionNumber,
    code: 'DUPLICATE_OPTION_TEXT',
    message: `Question ${questionNumber} contains duplicate option text.`,
    lineNumbers: sortLineNumbers(duplicateLineNumbers),
  };
}

function compareGroupedIssues(
  left: { questionNumber: number; code: string },
  right: { questionNumber: number; code: string },
): number {
  return left.questionNumber - right.questionNumber || left.code.localeCompare(right.code);
}

function getLabelOrderIndex(label: ParsedBulkOptionRow['optionLabel']): number {
  return BULK_OPTION_LABEL_ORDER.indexOf(label);
}

function sortLineNumbers(lineNumbers: number[]): number[] {
  return [...lineNumbers].sort((left, right) => left - right);
}
