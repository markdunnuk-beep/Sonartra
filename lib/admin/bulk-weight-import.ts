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
