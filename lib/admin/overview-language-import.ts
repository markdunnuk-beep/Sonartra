import type {
  AssessmentVersionLanguageOverviewInput,
  AssessmentVersionLanguageOverviewSection,
} from '@/lib/server/assessment-version-language-types';
import { canonicalizeSignalPairKey } from '@/lib/admin/pair-language-import';

export const OVERVIEW_LANGUAGE_SECTION_ORDER = [
  'headline',
  'summary',
  'strengths',
  'watchouts',
  'development',
] as const satisfies readonly AssessmentVersionLanguageOverviewSection[];

const ALLOWED_OVERVIEW_LANGUAGE_SECTIONS = new Set<AssessmentVersionLanguageOverviewSection>(
  OVERVIEW_LANGUAGE_SECTION_ORDER,
);

export type OverviewLanguageParseErrorCode =
  | 'INVALID_COLUMN_COUNT'
  | 'EMPTY_PATTERN_KEY'
  | 'EMPTY_SECTION'
  | 'INVALID_SECTION'
  | 'EMPTY_CONTENT';

export type ParsedOverviewLanguageRow = {
  lineNumber: number;
  rawLine: string;
  patternKey: string;
  section: AssessmentVersionLanguageOverviewSection;
  content: string;
};

export type ValidatedOverviewLanguageRow = ParsedOverviewLanguageRow & {
  canonicalPatternKey: string;
  signalKeys: readonly [string, string];
};

export type OverviewLanguageParseError = {
  lineNumber: number;
  rawLine: string;
  code: OverviewLanguageParseErrorCode;
  message: string;
};

export type OverviewLanguageValidationErrorCode =
  | 'INVALID_PATTERN_KEY'
  | 'UNKNOWN_SIGNAL_KEY'
  | 'SELF_PAIR_NOT_ALLOWED'
  | 'DUPLICATE_PATTERN_SECTION';

export type OverviewLanguageValidationError = {
  lineNumber: number;
  rawLine: string;
  patternKey: string;
  section: AssessmentVersionLanguageOverviewSection;
  code: OverviewLanguageValidationErrorCode;
  message: string;
};

export type OverviewLanguagePreviewGroup = {
  canonicalPatternKey: string;
  pairOrder: readonly [number, number];
  entries: readonly {
    lineNumber: number;
    section: AssessmentVersionLanguageOverviewSection;
    content: string;
  }[];
};

export type OverviewLanguageValidationResult = {
  success: boolean;
  errors: readonly OverviewLanguageValidationError[];
  validRows: readonly ValidatedOverviewLanguageRow[];
};

export function parseOverviewLanguageRows(input: string): {
  success: boolean;
  records: readonly ParsedOverviewLanguageRow[];
  errors: readonly OverviewLanguageParseError[];
} {
  const records: ParsedOverviewLanguageRow[] = [];
  const errors: OverviewLanguageParseError[] = [];
  const lines = input.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index] ?? '';
    if (rawLine.trim() === '') {
      continue;
    }

    const parsedRow = parseOverviewLanguageRow(rawLine, index + 1);
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

export function validateOverviewLanguageRows(params: {
  rows: readonly ParsedOverviewLanguageRow[];
  validSignalKeys: readonly string[];
}): OverviewLanguageValidationResult {
  const validSignalKeys = new Set(params.validSignalKeys);
  const duplicateTracker = new Map<string, number[]>();
  const errors: OverviewLanguageValidationError[] = [];
  const validRows: ValidatedOverviewLanguageRow[] = [];

  for (const row of params.rows) {
    const canonicalized = canonicalizeSignalPairKey(row.patternKey);
    if (!canonicalized.success) {
      errors.push({
        lineNumber: row.lineNumber,
        rawLine: row.rawLine,
        patternKey: row.patternKey,
        section: row.section,
        code: 'INVALID_PATTERN_KEY',
        message: 'Pattern key must contain exactly two signal keys separated by one underscore.',
      });
      continue;
    }

    const [leftSignalKey, rightSignalKey] = canonicalized.signalKeys;
    if (!validSignalKeys.has(leftSignalKey)) {
      errors.push({
        lineNumber: row.lineNumber,
        rawLine: row.rawLine,
        patternKey: row.patternKey,
        section: row.section,
        code: 'UNKNOWN_SIGNAL_KEY',
        message: `Signal key ${leftSignalKey} does not exist in the active assessment version.`,
      });
    }

    if (!validSignalKeys.has(rightSignalKey)) {
      errors.push({
        lineNumber: row.lineNumber,
        rawLine: row.rawLine,
        patternKey: row.patternKey,
        section: row.section,
        code: 'UNKNOWN_SIGNAL_KEY',
        message: `Signal key ${rightSignalKey} does not exist in the active assessment version.`,
      });
    }

    if (leftSignalKey === rightSignalKey) {
      errors.push({
        lineNumber: row.lineNumber,
        rawLine: row.rawLine,
        patternKey: row.patternKey,
        section: row.section,
        code: 'SELF_PAIR_NOT_ALLOWED',
        message: `Pattern key ${row.patternKey} is invalid because self-pairs are not allowed.`,
      });
    }

    const validatedRow: ValidatedOverviewLanguageRow = {
      ...row,
      canonicalPatternKey: canonicalized.canonicalSignalPair,
      signalKeys: canonicalized.signalKeys,
    };
    validRows.push(validatedRow);

    const duplicateKey = `${validatedRow.canonicalPatternKey}::${validatedRow.section}`;
    const existing = duplicateTracker.get(duplicateKey);
    if (existing) {
      existing.push(validatedRow.lineNumber);
    } else {
      duplicateTracker.set(duplicateKey, [validatedRow.lineNumber]);
    }
  }

  for (const row of validRows) {
    const lineNumbers = duplicateTracker.get(`${row.canonicalPatternKey}::${row.section}`) ?? [];
    if (lineNumbers.length <= 1) {
      continue;
    }

    errors.push({
      lineNumber: row.lineNumber,
      rawLine: row.rawLine,
      patternKey: row.patternKey,
      section: row.section,
      code: 'DUPLICATE_PATTERN_SECTION',
      message: `Canonical pattern ${row.canonicalPatternKey} contains duplicate ${row.section} rows in this batch (lines ${lineNumbers.join(', ')}).`,
    });
  }

  return {
    success: errors.length === 0,
    errors: sortValidationErrors(errors),
    validRows: errors.length === 0 ? [...validRows] : [],
  };
}

export function buildOverviewLanguagePreview(params: {
  rows: readonly ValidatedOverviewLanguageRow[];
  signalKeysInOrder: readonly string[];
}): readonly OverviewLanguagePreviewGroup[] {
  const signalOrder = new Map(params.signalKeysInOrder.map((signalKey, index) => [signalKey, index] as const));
  const sectionOrder = new Map(
    OVERVIEW_LANGUAGE_SECTION_ORDER.map((section, index) => [section, index] as const),
  );
  const grouped = new Map<string, OverviewLanguagePreviewGroup['entries'][number][]>();
  const pairOrder = new Map<string, readonly [number, number]>();

  for (const row of params.rows) {
    const existing = grouped.get(row.canonicalPatternKey);
    const previewRow = {
      lineNumber: row.lineNumber,
      section: row.section,
      content: row.content,
    };

    if (existing) {
      existing.push(previewRow);
    } else {
      grouped.set(row.canonicalPatternKey, [previewRow]);
      pairOrder.set(row.canonicalPatternKey, [
        signalOrder.get(row.signalKeys[0]) ?? Number.MAX_SAFE_INTEGER,
        signalOrder.get(row.signalKeys[1]) ?? Number.MAX_SAFE_INTEGER,
      ]);
    }
  }

  return [...grouped.entries()]
    .map(([canonicalPatternKey, entries]) => ({
      canonicalPatternKey,
      pairOrder: pairOrder.get(canonicalPatternKey) ?? [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
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
        left.canonicalPatternKey.localeCompare(right.canonicalPatternKey),
    );
}

export function toOverviewLanguageInputs(
  rows: readonly ValidatedOverviewLanguageRow[],
): readonly AssessmentVersionLanguageOverviewInput[] {
  return rows.map((row) => ({
    patternKey: row.canonicalPatternKey,
    section: row.section,
    content: row.content,
  }));
}

function parseOverviewLanguageRow(
  rawLine: string,
  lineNumber: number,
): { record: ParsedOverviewLanguageRow } | { error: OverviewLanguageParseError } {
  const columns = rawLine.split('|');
  if (columns.length !== 3) {
    return {
      error: createParseError(
        lineNumber,
        rawLine,
        'INVALID_COLUMN_COUNT',
        'Each row must contain exactly 3 pipe-delimited columns: pattern_key | section | content.',
      ),
    };
  }

  const [patternKeyRaw, sectionRaw, contentRaw] = columns;
  const patternKey = patternKeyRaw.trim();
  const normalizedSection = sectionRaw.trim();
  const content = contentRaw.trim();

  if (!patternKey) {
    return {
      error: createParseError(lineNumber, rawLine, 'EMPTY_PATTERN_KEY', 'Pattern key is required.'),
    };
  }

  if (!normalizedSection) {
    return {
      error: createParseError(lineNumber, rawLine, 'EMPTY_SECTION', 'Section is required.'),
    };
  }

  if (!isOverviewLanguageSection(normalizedSection)) {
    return {
      error: createParseError(
        lineNumber,
        rawLine,
        'INVALID_SECTION',
        'Section must be one of headline, summary, strengths, watchouts, or development.',
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
      patternKey,
      section: normalizedSection,
      content,
    },
  };
}

function createParseError(
  lineNumber: number,
  rawLine: string,
  code: OverviewLanguageParseErrorCode,
  message: string,
): OverviewLanguageParseError {
  return {
    lineNumber,
    rawLine,
    code,
    message,
  };
}

function isOverviewLanguageSection(value: string): value is AssessmentVersionLanguageOverviewSection {
  return ALLOWED_OVERVIEW_LANGUAGE_SECTIONS.has(value as AssessmentVersionLanguageOverviewSection);
}

function sortValidationErrors(
  errors: readonly OverviewLanguageValidationError[],
): readonly OverviewLanguageValidationError[] {
  return [...errors].sort(
    (left, right) => left.lineNumber - right.lineNumber || left.code.localeCompare(right.code),
  );
}
