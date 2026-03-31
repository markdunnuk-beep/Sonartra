const ALLOWED_OPTION_LABELS = new Set(['A', 'B', 'C', 'D']);

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
