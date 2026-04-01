import type {
  AssessmentVersionLanguagePairInput,
  AssessmentVersionLanguagePairSection,
} from '@/lib/server/assessment-version-language-types';

export const PAIR_LANGUAGE_SECTION_ORDER = [
  'summary',
  'strength',
  'watchout',
] as const satisfies readonly AssessmentVersionLanguagePairSection[];

const ALLOWED_PAIR_LANGUAGE_SECTIONS = new Set<AssessmentVersionLanguagePairSection>(
  PAIR_LANGUAGE_SECTION_ORDER,
);

export type PairLanguageParseErrorCode =
  | 'INVALID_COLUMN_COUNT'
  | 'EMPTY_SIGNAL_PAIR'
  | 'EMPTY_SECTION'
  | 'INVALID_SECTION'
  | 'EMPTY_CONTENT';

export type ParsedPairLanguageRow = {
  lineNumber: number;
  rawLine: string;
  signalPair: string;
  section: AssessmentVersionLanguagePairSection;
  content: string;
};

export type ValidatedPairLanguageRow = ParsedPairLanguageRow & {
  canonicalSignalPair: string;
  signalKeys: readonly [string, string];
};

export type PairLanguageParseError = {
  lineNumber: number;
  rawLine: string;
  code: PairLanguageParseErrorCode;
  message: string;
};

export type PairLanguageValidationErrorCode =
  | 'INVALID_PAIR_FORMAT'
  | 'UNKNOWN_SIGNAL_KEY'
  | 'SELF_PAIR_NOT_ALLOWED'
  | 'DUPLICATE_PAIR_SECTION';

export type PairLanguageValidationError = {
  lineNumber: number;
  rawLine: string;
  signalPair: string;
  section: AssessmentVersionLanguagePairSection;
  code: PairLanguageValidationErrorCode;
  message: string;
};

export type PairLanguagePreviewGroup = {
  canonicalSignalPair: string;
  pairOrder: readonly [number, number];
  entries: readonly {
    lineNumber: number;
    section: AssessmentVersionLanguagePairSection;
    content: string;
  }[];
};

export type PairLanguageValidationResult = {
  success: boolean;
  errors: readonly PairLanguageValidationError[];
  validRows: readonly ValidatedPairLanguageRow[];
};

export function parsePairLanguageRows(input: string): {
  success: boolean;
  records: readonly ParsedPairLanguageRow[];
  errors: readonly PairLanguageParseError[];
} {
  const records: ParsedPairLanguageRow[] = [];
  const errors: PairLanguageParseError[] = [];
  const lines = input.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index] ?? '';
    if (rawLine.trim() === '') {
      continue;
    }

    const parsedRow = parsePairLanguageRow(rawLine, index + 1);
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

export function canonicalizeSignalPairKey(
  value: string,
): { success: true; signalKeys: readonly [string, string]; canonicalSignalPair: string } | { success: false } {
  const normalizedValue = value.trim();
  const parts = normalizedValue.split('_');

  if (parts.length !== 2) {
    return { success: false };
  }

  const left = parts[0]?.trim() ?? '';
  const right = parts[1]?.trim() ?? '';
  if (!left || !right) {
    return { success: false };
  }

  const orderedSignalKeys = [left, right].sort((a, b) => a.localeCompare(b)) as [string, string];

  return {
    success: true,
    signalKeys: orderedSignalKeys,
    canonicalSignalPair: orderedSignalKeys.join('_'),
  };
}

export function validatePairLanguageRows(params: {
  rows: readonly ParsedPairLanguageRow[];
  validSignalKeys: readonly string[];
}): PairLanguageValidationResult {
  const validSignalKeys = new Set(params.validSignalKeys);
  const duplicateTracker = new Map<string, number[]>();
  const errors: PairLanguageValidationError[] = [];
  const validRows: ValidatedPairLanguageRow[] = [];

  for (const row of params.rows) {
    const canonicalized = canonicalizeSignalPairKey(row.signalPair);
    if (!canonicalized.success) {
      errors.push({
        lineNumber: row.lineNumber,
        rawLine: row.rawLine,
        signalPair: row.signalPair,
        section: row.section,
        code: 'INVALID_PAIR_FORMAT',
        message: 'Signal pair must contain exactly two signal keys separated by one underscore.',
      });
      continue;
    }

    const [leftSignalKey, rightSignalKey] = canonicalized.signalKeys;
    if (!validSignalKeys.has(leftSignalKey)) {
      errors.push({
        lineNumber: row.lineNumber,
        rawLine: row.rawLine,
        signalPair: row.signalPair,
        section: row.section,
        code: 'UNKNOWN_SIGNAL_KEY',
        message: `Signal key ${leftSignalKey} does not exist in the active assessment version.`,
      });
    }

    if (!validSignalKeys.has(rightSignalKey)) {
      errors.push({
        lineNumber: row.lineNumber,
        rawLine: row.rawLine,
        signalPair: row.signalPair,
        section: row.section,
        code: 'UNKNOWN_SIGNAL_KEY',
        message: `Signal key ${rightSignalKey} does not exist in the active assessment version.`,
      });
    }

    if (leftSignalKey === rightSignalKey) {
      errors.push({
        lineNumber: row.lineNumber,
        rawLine: row.rawLine,
        signalPair: row.signalPair,
        section: row.section,
        code: 'SELF_PAIR_NOT_ALLOWED',
        message: `Signal pair ${row.signalPair} is invalid because self-pairs are not allowed.`,
      });
    }

    const validatedRow: ValidatedPairLanguageRow = {
      ...row,
      canonicalSignalPair: canonicalized.canonicalSignalPair,
      signalKeys: canonicalized.signalKeys,
    };
    validRows.push(validatedRow);

    const duplicateKey = `${validatedRow.canonicalSignalPair}::${validatedRow.section}`;
    const existing = duplicateTracker.get(duplicateKey);
    if (existing) {
      existing.push(validatedRow.lineNumber);
    } else {
      duplicateTracker.set(duplicateKey, [validatedRow.lineNumber]);
    }
  }

  for (const row of validRows) {
    const lineNumbers = duplicateTracker.get(`${row.canonicalSignalPair}::${row.section}`) ?? [];
    if (lineNumbers.length <= 1) {
      continue;
    }

    errors.push({
      lineNumber: row.lineNumber,
      rawLine: row.rawLine,
      signalPair: row.signalPair,
      section: row.section,
      code: 'DUPLICATE_PAIR_SECTION',
      message: `Canonical pair ${row.canonicalSignalPair} contains duplicate ${row.section} rows in this batch (lines ${lineNumbers.join(', ')}).`,
    });
  }

  return {
    success: errors.length === 0,
    errors: sortValidationErrors(errors),
    validRows: errors.length === 0 ? [...validRows] : [],
  };
}

export function buildPairLanguagePreview(params: {
  rows: readonly ValidatedPairLanguageRow[];
  signalKeysInOrder: readonly string[];
}): readonly PairLanguagePreviewGroup[] {
  const signalOrder = new Map(params.signalKeysInOrder.map((signalKey, index) => [signalKey, index] as const));
  const sectionOrder = new Map(PAIR_LANGUAGE_SECTION_ORDER.map((section, index) => [section, index] as const));
  const grouped = new Map<string, PairLanguagePreviewGroup['entries'][number][]>();
  const pairOrder = new Map<string, readonly [number, number]>();

  for (const row of params.rows) {
    const existing = grouped.get(row.canonicalSignalPair);
    const previewRow = {
      lineNumber: row.lineNumber,
      section: row.section,
      content: row.content,
    };

    if (existing) {
      existing.push(previewRow);
    } else {
      grouped.set(row.canonicalSignalPair, [previewRow]);
      pairOrder.set(row.canonicalSignalPair, [
        signalOrder.get(row.signalKeys[0]) ?? Number.MAX_SAFE_INTEGER,
        signalOrder.get(row.signalKeys[1]) ?? Number.MAX_SAFE_INTEGER,
      ]);
    }
  }

  return [...grouped.entries()]
    .map(([canonicalSignalPair, entries]) => ({
      canonicalSignalPair,
      pairOrder: pairOrder.get(canonicalSignalPair) ?? [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
      entries: [...entries].sort(
        (left, right) =>
          (sectionOrder.get(left.section) ?? Number.MAX_SAFE_INTEGER) -
            (sectionOrder.get(right.section) ?? Number.MAX_SAFE_INTEGER) ||
          left.lineNumber - right.lineNumber,
      ),
    }))
    .sort(
      (left, right) =>
        left.pairOrder[0] - right.pairOrder[0] ||
        left.pairOrder[1] - right.pairOrder[1] ||
        left.canonicalSignalPair.localeCompare(right.canonicalSignalPair),
    );
}

export function toPairLanguageInputs(
  rows: readonly ValidatedPairLanguageRow[],
): readonly AssessmentVersionLanguagePairInput[] {
  return rows.map((row) => ({
    signalPair: row.canonicalSignalPair,
    section: row.section,
    content: row.content,
  }));
}

function parsePairLanguageRow(
  rawLine: string,
  lineNumber: number,
): { record: ParsedPairLanguageRow } | { error: PairLanguageParseError } {
  const columns = rawLine.split('|');
  if (columns.length !== 3) {
    return {
      error: createParseError(
        lineNumber,
        rawLine,
        'INVALID_COLUMN_COUNT',
        'Each row must contain exactly 3 pipe-delimited columns: signal_pair | section | content.',
      ),
    };
  }

  const [signalPairRaw, sectionRaw, contentRaw] = columns;
  const signalPair = signalPairRaw.trim();
  const normalizedSection = sectionRaw.trim();
  const content = contentRaw.trim();

  if (!signalPair) {
    return {
      error: createParseError(lineNumber, rawLine, 'EMPTY_SIGNAL_PAIR', 'Signal pair is required.'),
    };
  }

  if (!normalizedSection) {
    return {
      error: createParseError(lineNumber, rawLine, 'EMPTY_SECTION', 'Section is required.'),
    };
  }

  if (!isPairLanguageSection(normalizedSection)) {
    return {
      error: createParseError(
        lineNumber,
        rawLine,
        'INVALID_SECTION',
        'Section must be one of summary, strength, or watchout.',
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
      signalPair,
      section: normalizedSection,
      content,
    },
  };
}

function createParseError(
  lineNumber: number,
  rawLine: string,
  code: PairLanguageParseErrorCode,
  message: string,
): PairLanguageParseError {
  return {
    lineNumber,
    rawLine,
    code,
    message,
  };
}

function isPairLanguageSection(value: string): value is AssessmentVersionLanguagePairSection {
  return ALLOWED_PAIR_LANGUAGE_SECTIONS.has(value as AssessmentVersionLanguagePairSection);
}

function sortValidationErrors(
  errors: readonly PairLanguageValidationError[],
): readonly PairLanguageValidationError[] {
  return [...errors].sort(
    (left, right) => left.lineNumber - right.lineNumber || left.code.localeCompare(right.code),
  );
}
