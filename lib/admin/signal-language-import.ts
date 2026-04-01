import type {
  AssessmentVersionLanguageSignalInput,
  AssessmentVersionLanguageSignalSection,
} from '@/lib/server/assessment-version-language-types';

export const SIGNAL_LANGUAGE_SECTION_ORDER = [
  'summary',
  'strength',
  'watchout',
  'development',
] as const satisfies readonly AssessmentVersionLanguageSignalSection[];

const ALLOWED_SIGNAL_LANGUAGE_SECTIONS = new Set<AssessmentVersionLanguageSignalSection>(
  SIGNAL_LANGUAGE_SECTION_ORDER,
);

export type SignalLanguageParseErrorCode =
  | 'INVALID_COLUMN_COUNT'
  | 'EMPTY_SIGNAL_KEY'
  | 'EMPTY_SECTION'
  | 'INVALID_SECTION'
  | 'EMPTY_CONTENT';

export type ParsedSignalLanguageRow = {
  lineNumber: number;
  rawLine: string;
  signalKey: string;
  section: AssessmentVersionLanguageSignalSection;
  content: string;
};

export type SignalLanguageParseError = {
  lineNumber: number;
  rawLine: string;
  code: SignalLanguageParseErrorCode;
  message: string;
};

export type SignalLanguageValidationErrorCode = 'INVALID_SIGNAL_KEY' | 'DUPLICATE_SIGNAL_SECTION';

export type SignalLanguageValidationError = {
  lineNumber: number;
  rawLine: string;
  signalKey: string;
  section: AssessmentVersionLanguageSignalSection;
  code: SignalLanguageValidationErrorCode;
  message: string;
};

export type SignalLanguagePreviewGroup = {
  signalKey: string;
  signalOrder: number;
  entries: readonly {
    lineNumber: number;
    section: AssessmentVersionLanguageSignalSection;
    content: string;
  }[];
};

export type SignalLanguageValidationResult = {
  success: boolean;
  errors: readonly SignalLanguageValidationError[];
  validRows: readonly ParsedSignalLanguageRow[];
};

export function parseDelimitedLanguageRows(input: string): {
  success: boolean;
  records: readonly ParsedSignalLanguageRow[];
  errors: readonly SignalLanguageParseError[];
} {
  const records: ParsedSignalLanguageRow[] = [];
  const errors: SignalLanguageParseError[] = [];
  const lines = input.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index] ?? '';
    if (rawLine.trim() === '') {
      continue;
    }

    const parsedRow = parseDelimitedLanguageRow(rawLine, index + 1);
    if ('record' in parsedRow) {
      records.push(parsedRow.record);
      continue;
    }

    errors.push(parsedRow.error);
  }

  return {
    success: errors.length === 0,
    records,
    errors,
  };
}

export function validateSignalLanguageRows(params: {
  rows: readonly ParsedSignalLanguageRow[];
  validSignalKeys: readonly string[];
}): SignalLanguageValidationResult {
  const validSignalKeys = new Set(params.validSignalKeys);
  const duplicateTracker = new Map<string, number[]>();
  const errors: SignalLanguageValidationError[] = [];

  for (const row of params.rows) {
    if (!validSignalKeys.has(row.signalKey)) {
      errors.push({
        lineNumber: row.lineNumber,
        rawLine: row.rawLine,
        signalKey: row.signalKey,
        section: row.section,
        code: 'INVALID_SIGNAL_KEY',
        message: `Signal key ${row.signalKey} does not exist in the active assessment version.`,
      });
    }

    const duplicateKey = `${row.signalKey}::${row.section}`;
    const existing = duplicateTracker.get(duplicateKey);
    if (existing) {
      existing.push(row.lineNumber);
    } else {
      duplicateTracker.set(duplicateKey, [row.lineNumber]);
    }
  }

  for (const row of params.rows) {
    const lineNumbers = duplicateTracker.get(`${row.signalKey}::${row.section}`) ?? [];
    if (lineNumbers.length <= 1) {
      continue;
    }

    errors.push({
      lineNumber: row.lineNumber,
      rawLine: row.rawLine,
      signalKey: row.signalKey,
      section: row.section,
      code: 'DUPLICATE_SIGNAL_SECTION',
      message: `Signal key ${row.signalKey} contains duplicate ${row.section} rows in this batch (lines ${lineNumbers.join(', ')}).`,
    });
  }

  return {
    success: errors.length === 0,
    errors: sortValidationErrors(errors),
    validRows: errors.length === 0 ? [...params.rows] : [],
  };
}

export function buildSignalLanguagePreview(params: {
  rows: readonly ParsedSignalLanguageRow[];
  signalKeysInOrder: readonly string[];
}): readonly SignalLanguagePreviewGroup[] {
  const signalOrder = new Map(params.signalKeysInOrder.map((signalKey, index) => [signalKey, index] as const));
  const sectionOrder = new Map(
    SIGNAL_LANGUAGE_SECTION_ORDER.map((section, index) => [section, index] as const),
  );
  const grouped = new Map<string, SignalLanguagePreviewGroup['entries'][number][]>();

  for (const row of params.rows) {
    const existing = grouped.get(row.signalKey);
    const previewRow = {
      lineNumber: row.lineNumber,
      section: row.section,
      content: row.content,
    };

    if (existing) {
      existing.push(previewRow);
      continue;
    }

    grouped.set(row.signalKey, [previewRow]);
  }

  return [...grouped.entries()]
    .map(([signalKey, entries]) => ({
      signalKey,
      signalOrder: signalOrder.get(signalKey) ?? Number.MAX_SAFE_INTEGER,
      entries: [...entries].sort(
        (left, right) =>
          (sectionOrder.get(left.section) ?? Number.MAX_SAFE_INTEGER) -
            (sectionOrder.get(right.section) ?? Number.MAX_SAFE_INTEGER) ||
          left.lineNumber - right.lineNumber,
      ),
    }))
    .sort(
      (left, right) =>
        left.signalOrder - right.signalOrder || left.signalKey.localeCompare(right.signalKey),
    );
}

export function toSignalLanguageInputs(
  rows: readonly ParsedSignalLanguageRow[],
): readonly AssessmentVersionLanguageSignalInput[] {
  return rows.map((row) => ({
    signalKey: row.signalKey,
    section: row.section,
    content: row.content,
  }));
}

function parseDelimitedLanguageRow(
  rawLine: string,
  lineNumber: number,
): { record: ParsedSignalLanguageRow } | { error: SignalLanguageParseError } {
  const columns = rawLine.split('|');
  if (columns.length !== 3) {
    return {
      error: createParseError(
        lineNumber,
        rawLine,
        'INVALID_COLUMN_COUNT',
        'Each row must contain exactly 3 pipe-delimited columns: signal_key | section | content.',
      ),
    };
  }

  const [signalKeyRaw, sectionRaw, contentRaw] = columns;
  const signalKey = signalKeyRaw.trim();
  const normalizedSection = sectionRaw.trim();
  const content = contentRaw.trim();

  if (!signalKey) {
    return {
      error: createParseError(lineNumber, rawLine, 'EMPTY_SIGNAL_KEY', 'Signal key is required.'),
    };
  }

  if (!normalizedSection) {
    return {
      error: createParseError(lineNumber, rawLine, 'EMPTY_SECTION', 'Section is required.'),
    };
  }

  if (!isSignalLanguageSection(normalizedSection)) {
    return {
      error: createParseError(
        lineNumber,
        rawLine,
        'INVALID_SECTION',
        'Section must be one of summary, strength, watchout, or development.',
      ),
    };
  }

  if (!content) {
    return {
      error: createParseError(lineNumber, rawLine, 'EMPTY_CONTENT', 'Content is required.'),
    };
  }

  return {
    record: {
      lineNumber,
      rawLine,
      signalKey,
      section: normalizedSection,
      content,
    },
  };
}

function createParseError(
  lineNumber: number,
  rawLine: string,
  code: SignalLanguageParseErrorCode,
  message: string,
): SignalLanguageParseError {
  return {
    lineNumber,
    rawLine,
    code,
    message,
  };
}

function isSignalLanguageSection(value: string): value is AssessmentVersionLanguageSignalSection {
  return ALLOWED_SIGNAL_LANGUAGE_SECTIONS.has(value as AssessmentVersionLanguageSignalSection);
}

function sortValidationErrors(
  errors: readonly SignalLanguageValidationError[],
): readonly SignalLanguageValidationError[] {
  return [...errors].sort(
    (left, right) => left.lineNumber - right.lineNumber || left.code.localeCompare(right.code),
  );
}
