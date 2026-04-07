import { canonicalizeSignalPairKey } from '@/lib/admin/pair-language-import';
import type {
  AssessmentVersionLanguageDomainInput,
  AssessmentVersionLanguageDomainSection,
  AssessmentVersionLanguageOverviewInput,
  AssessmentVersionLanguagePairInput,
  AssessmentVersionLanguageSignalInput,
  AssessmentVersionLanguageSignalSection,
} from '@/lib/server/assessment-version-language-types';

export type ReportLanguageSection = 'hero' | 'domain' | 'signal' | 'pair';
type RecognizedReportLanguageSection = ReportLanguageSection | 'actions';
export type ImportableReportLanguageSection = ReportLanguageSection;

export type ReportLanguageParseErrorCode =
  | 'INVALID_COLUMN_COUNT'
  | 'EMPTY_SECTION'
  | 'EMPTY_TARGET'
  | 'EMPTY_FIELD'
  | 'EMPTY_CONTENT';

export type ParsedReportLanguageRow = {
  lineNumber: number;
  rawLine: string;
  section: string;
  target: string;
  field: string;
  content: string;
};

export type ReportLanguageParseError = {
  lineNumber: number;
  rawLine: string;
  code: ReportLanguageParseErrorCode;
  message: string;
};

type ValidHeroField = 'headline' | 'narrative';
type ValidDomainField = 'chapterOpening';
type ValidSignalField = AssessmentVersionLanguageSignalSection;
type ValidPairField = 'summary';

export type ReportLanguageValidationErrorCode =
  | 'INVALID_SECTION'
  | 'INVALID_TARGET'
  | 'INVALID_FIELD'
  | 'DERIVED_FIELD_NOT_AUTHORABLE'
  | 'UNSUPPORTED_LEGACY_FIELD'
  | 'UNKNOWN_SIGNAL_KEY'
  | 'UNKNOWN_DOMAIN_KEY'
  | 'SELF_PAIR_NOT_ALLOWED'
  | 'DUPLICATE_ENTRY';

export type ReportLanguageValidationError = {
  lineNumber: number;
  rawLine: string;
  section: string;
  target: string;
  field: string;
  code: ReportLanguageValidationErrorCode;
  message: string;
};

export type ValidatedReportLanguageRow =
  | {
      lineNumber: number;
      rawLine: string;
      section: 'hero';
      target: string;
      field: ValidHeroField;
      content: string;
      canonicalPatternKey: string;
      signalKeys: readonly [string, string];
    }
  | {
      lineNumber: number;
      rawLine: string;
      section: 'domain';
      target: string;
      field: ValidDomainField;
      content: string;
    }
  | {
      lineNumber: number;
      rawLine: string;
      section: 'signal';
      target: string;
      field: ValidSignalField;
      content: string;
    }
  | {
      lineNumber: number;
      rawLine: string;
      section: 'pair';
      target: string;
      field: ValidPairField;
      content: string;
      canonicalSignalPair: string;
      signalKeys: readonly [string, string];
    };

export type ReportLanguageValidationResult = {
  success: boolean;
  errors: readonly ReportLanguageValidationError[];
  validRows: readonly ValidatedReportLanguageRow[];
};

export type ReportAlignedLanguageStoragePlan = {
  hero: readonly {
    patternKey: string;
    field: ValidHeroField;
    content: string;
  }[];
  domainChapters: readonly {
    domainKey: string;
    field: ValidDomainField;
    content: string;
  }[];
  signals: readonly {
    signalKey: string;
    field: ValidSignalField;
    content: string;
  }[];
  pairs: readonly {
    signalPair: string;
    field: ValidPairField;
    content: string;
  }[];
  storage: {
    overview: readonly AssessmentVersionLanguageOverviewInput[];
    domains: readonly AssessmentVersionLanguageDomainInput[];
    signals: readonly AssessmentVersionLanguageSignalInput[];
    pairs: readonly AssessmentVersionLanguagePairInput[];
  };
};

export const HERO_OVERVIEW_STORAGE_NOTE =
  'Hero authoring continues to write to legacy overview storage so the persisted runtime contract stays unchanged.' as const;
export const REPORT_ALIGNED_AUTHORING_NOTE =
  'This is the supported authoring path for report language. Derived report sections remain engine-resolved.' as const;

const SIGNAL_FIELDS = new Set<ValidSignalField>([
  'chapterSummary',
  'strength',
  'watchout',
  'development',
]);

const DOMAIN_FIELDS = new Set<ValidDomainField>([
  'chapterOpening',
]);

const HERO_FIELDS = new Set<ValidHeroField>(['headline', 'narrative']);

const REPORT_SECTION_METADATA: Record<
  ImportableReportLanguageSection,
  {
    label: string;
    emptyInputNoun: string;
    rowSectionName: string;
  }
> = {
  hero: {
    label: 'Hero',
    emptyInputNoun: 'hero',
    rowSectionName: 'hero',
  },
  domain: {
    label: 'Domain Chapters',
    emptyInputNoun: 'domain chapter',
    rowSectionName: 'domain',
  },
  signal: {
    label: 'Signals',
    emptyInputNoun: 'signal',
    rowSectionName: 'signal',
  },
  pair: {
    label: 'Pairs',
    emptyInputNoun: 'pair summary',
    rowSectionName: 'pair',
  },
};

export function normalizeReportLanguageSection(
  value: string,
): RecognizedReportLanguageSection | null {
  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case 'hero':
      return 'hero';
    case 'domain':
    case 'domains':
    case 'domainchapter':
    case 'domainchapters':
      return 'domain';
    case 'signal':
    case 'signals':
      return 'signal';
    case 'pair':
    case 'pairs':
      return 'pair';
    case 'action':
    case 'actions':
      return 'actions';
    default:
      return null;
  }
}

function toDomainSection(field: ValidDomainField): AssessmentVersionLanguageDomainSection {
  return field;
}

function toSignalSection(field: ValidSignalField): AssessmentVersionLanguageSignalSection {
  return field;
}

function toHeroOverviewStorageSection(field: ValidHeroField): 'headline' | 'summary' {
  return field === 'narrative' ? 'summary' : 'headline';
}

export function getReportSectionLabel(section: ImportableReportLanguageSection): string {
  return REPORT_SECTION_METADATA[section].label;
}

export function getReportSectionEmptyInputNoun(section: ImportableReportLanguageSection): string {
  return REPORT_SECTION_METADATA[section].emptyInputNoun;
}

export function getReportSectionRowName(section: ImportableReportLanguageSection): string {
  return REPORT_SECTION_METADATA[section].rowSectionName;
}

function createValidationError(
  row: ParsedReportLanguageRow,
  code: ReportLanguageValidationErrorCode,
  message: string,
): ReportLanguageValidationError {
  return {
    lineNumber: row.lineNumber,
    rawLine: row.rawLine,
    section: row.section,
    target: row.target,
    field: row.field,
    code,
    message,
  };
}

export function parseReportLanguageRows(input: string): {
  success: boolean;
  records: readonly ParsedReportLanguageRow[];
  errors: readonly ReportLanguageParseError[];
} {
  const records: ParsedReportLanguageRow[] = [];
  const errors: ReportLanguageParseError[] = [];
  const lines = input.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index] ?? '';
    if (rawLine.trim() === '') {
      continue;
    }

    const parsed = parseReportLanguageRow(rawLine, index + 1);
    if ('record' in parsed) {
      records.push(parsed.record);
    } else {
      errors.push(parsed.error);
    }
  }

  return {
    success: errors.length === 0,
    records,
    errors,
  };
}

export function validateReportLanguageRows(params: {
  rows: readonly ParsedReportLanguageRow[];
  validSignalKeys: readonly string[];
  validDomainKeys: readonly string[];
}): ReportLanguageValidationResult {
  const validSignalKeys = new Set(params.validSignalKeys);
  const validDomainKeys = new Set(params.validDomainKeys);
  const validSignalLookupTokens = new Set(
    params.validSignalKeys.map((signalKey) => getSignalLookupToken(signalKey)),
  );
  const duplicateTracker = new Map<string, number[]>();
  const errors: ReportLanguageValidationError[] = [];
  const validRows: ValidatedReportLanguageRow[] = [];

  for (const row of params.rows) {
    const section = normalizeReportLanguageSection(row.section);
    if (!section) {
      errors.push(
        createValidationError(
          row,
          'INVALID_SECTION',
          'Section must be one of hero, domain, signal, or pair.',
        ),
      );
      continue;
    }

    if (section === 'actions') {
      errors.push(
        createValidationError(
          row,
          'DERIVED_FIELD_NOT_AUTHORABLE',
          'Actions are derived in the engine and are not part of the supported report-language authoring surface.',
        ),
      );
      continue;
    }

    if (section === 'hero') {
      if (row.field === 'primaryPattern' || row.field.startsWith('primaryPattern.')) {
        errors.push(
          createValidationError(
            row,
            'DERIVED_FIELD_NOT_AUTHORABLE',
            'hero.primaryPattern is derived from ranking and cannot be authored.',
          ),
        );
        continue;
      }

      if (row.field === 'domainHighlights.summary' || row.field.startsWith('domainHighlights')) {
        errors.push(
          createValidationError(
            row,
            'DERIVED_FIELD_NOT_AUTHORABLE',
            'hero.domainHighlights.* is derived in the engine and cannot be authored.',
          ),
        );
        continue;
      }

      if (row.field === 'summary') {
        errors.push(
          createValidationError(
            row,
            'INVALID_FIELD',
            'Hero field must be headline or narrative in the report-aligned model.',
          ),
        );
        continue;
      }

      if (
        row.field === 'strengths' ||
        row.field === 'watchouts' ||
        row.field === 'development'
      ) {
        errors.push(
          createValidationError(
            row,
            'UNSUPPORTED_LEGACY_FIELD',
            'Legacy hero strengths/watchouts/development rows are not supported. Author Hero headline/narrative here and keep actions engine-derived.',
          ),
        );
        continue;
      }

      if (!HERO_FIELDS.has(row.field as ValidHeroField)) {
        errors.push(
          createValidationError(
            row,
            'INVALID_FIELD',
            'Hero field must be headline or narrative.',
          ),
        );
        continue;
      }

      const canonicalized = canonicalizeSignalPairKey(row.target);
      if (!canonicalized.success) {
        errors.push(
          createValidationError(
            row,
            'INVALID_TARGET',
            'Hero rows must target a canonical pattern key containing exactly two signal keys.',
          ),
        );
        continue;
      }

      const [leftSignalKey, rightSignalKey] = canonicalized.signalKeys;
      if (!validSignalLookupTokens.has(leftSignalKey)) {
        errors.push(
          createValidationError(
            row,
            'UNKNOWN_SIGNAL_KEY',
            `Signal token ${leftSignalKey} does not resolve to a signal in the active assessment version.`,
          ),
        );
      }

      if (!validSignalLookupTokens.has(rightSignalKey)) {
        errors.push(
          createValidationError(
            row,
            'UNKNOWN_SIGNAL_KEY',
            `Signal token ${rightSignalKey} does not resolve to a signal in the active assessment version.`,
          ),
        );
      }

      if (leftSignalKey === rightSignalKey) {
        errors.push(
          createValidationError(
            row,
            'SELF_PAIR_NOT_ALLOWED',
            `Hero pattern ${row.target} is invalid because self-pairs are not allowed.`,
          ),
        );
      }

      const validatedRow: ValidatedReportLanguageRow = {
        lineNumber: row.lineNumber,
        rawLine: row.rawLine,
        section: 'hero',
        target: row.target,
        field: row.field as ValidHeroField,
        content: row.content,
        canonicalPatternKey: canonicalized.canonicalSignalPair,
        signalKeys: canonicalized.signalKeys,
      };
      validRows.push(validatedRow);
      trackDuplicate(duplicateTracker, validatedRow);
      continue;
    }

    if (section === 'domain') {
      if (!validDomainKeys.has(row.target)) {
        errors.push(
          createValidationError(
            row,
            'UNKNOWN_DOMAIN_KEY',
            `Domain key ${row.target} does not exist in the active assessment version.`,
          ),
        );
        continue;
      }

      if (row.field === 'summary') {
        errors.push(
          createValidationError(
            row,
            'UNSUPPORTED_LEGACY_FIELD',
            'Domain field summary is legacy-only. Use chapterOpening for domain chapter language.',
          ),
        );
        continue;
      }

      if (
        row.field === 'focus'
        || row.field === 'pressure'
        || row.field === 'environment'
      ) {
        errors.push(
          createValidationError(
            row,
            'UNSUPPORTED_LEGACY_FIELD',
            `Domain field ${row.field} is no longer supported. Domain chapter language supports chapterOpening only.`,
          ),
        );
        continue;
      }

      if (!DOMAIN_FIELDS.has(row.field as ValidDomainField)) {
        errors.push(
          createValidationError(
            row,
            'INVALID_FIELD',
            'Domain field must be chapterOpening.',
          ),
        );
        continue;
      }

      const validatedRow: ValidatedReportLanguageRow = {
        lineNumber: row.lineNumber,
        rawLine: row.rawLine,
        section: 'domain',
        target: row.target,
        field: row.field as ValidDomainField,
        content: row.content,
      };
      validRows.push(validatedRow);
      trackDuplicate(duplicateTracker, validatedRow);
      continue;
    }

    if (section === 'signal') {
      if (!validSignalKeys.has(row.target)) {
        errors.push(
          createValidationError(
            row,
            'UNKNOWN_SIGNAL_KEY',
            `Signal key ${row.target} does not exist in the active assessment version.`,
          ),
        );
        continue;
      }

      const normalizedSignalField =
        row.field === 'summary'
          ? 'chapterSummary'
          : row.field;

      if (!SIGNAL_FIELDS.has(normalizedSignalField as ValidSignalField)) {
        errors.push(
          createValidationError(
            row,
            'INVALID_FIELD',
            'Signal field must be chapterSummary, strength, watchout, or development.',
          ),
        );
        continue;
      }

      const validatedRow: ValidatedReportLanguageRow = {
        lineNumber: row.lineNumber,
        rawLine: row.rawLine,
        section: 'signal',
        target: row.target,
        field: normalizedSignalField as ValidSignalField,
        content: row.content,
      };
      validRows.push(validatedRow);
      trackDuplicate(duplicateTracker, validatedRow);
      continue;
    }

    if (row.field === 'strength' || row.field === 'watchout') {
      errors.push(
        createValidationError(
          row,
          'UNSUPPORTED_LEGACY_FIELD',
          'Pair strength/watchout rows are legacy-only and not supported. Only pair summary is authorable in the report-language path.',
        ),
      );
      continue;
    }

    if (row.field !== 'summary') {
      errors.push(
        createValidationError(
          row,
          'INVALID_FIELD',
          'Pair field must be summary.',
        ),
      );
      continue;
    }

    const canonicalized = canonicalizeSignalPairKey(row.target);
    if (!canonicalized.success) {
      errors.push(
        createValidationError(
          row,
          'INVALID_TARGET',
          'Pair rows must target a signal pair containing exactly two signal keys.',
        ),
      );
      continue;
    }

    const [leftSignalKey, rightSignalKey] = canonicalized.signalKeys;
    if (!validSignalLookupTokens.has(leftSignalKey)) {
      errors.push(
        createValidationError(
          row,
          'UNKNOWN_SIGNAL_KEY',
          `Signal token ${leftSignalKey} does not resolve to a signal in the active assessment version.`,
        ),
      );
    }

    if (!validSignalLookupTokens.has(rightSignalKey)) {
      errors.push(
        createValidationError(
          row,
          'UNKNOWN_SIGNAL_KEY',
          `Signal token ${rightSignalKey} does not resolve to a signal in the active assessment version.`,
        ),
      );
    }

    if (leftSignalKey === rightSignalKey) {
      errors.push(
        createValidationError(
          row,
          'SELF_PAIR_NOT_ALLOWED',
          `Pair ${row.target} is invalid because self-pairs are not allowed.`,
        ),
      );
    }

    const validatedRow: ValidatedReportLanguageRow = {
      lineNumber: row.lineNumber,
      rawLine: row.rawLine,
      section: 'pair',
      target: row.target,
      field: 'summary',
      content: row.content,
      canonicalSignalPair: canonicalized.canonicalSignalPair,
      signalKeys: canonicalized.signalKeys,
    };
    validRows.push(validatedRow);
    trackDuplicate(duplicateTracker, validatedRow);
  }

  for (const row of validRows) {
    const duplicateKey = getDuplicateKey(row);
    const lineNumbers = duplicateTracker.get(duplicateKey) ?? [];
    if (lineNumbers.length <= 1) {
      continue;
    }

    errors.push(
      createValidationError(
        {
          lineNumber: row.lineNumber,
          rawLine: row.rawLine,
          section: row.section,
          target: row.section === 'hero'
            ? row.canonicalPatternKey
            : row.section === 'pair'
              ? row.canonicalSignalPair
              : row.target,
          field: row.field,
          content: row.content,
        },
        'DUPLICATE_ENTRY',
        `Duplicate report-language entry detected for ${row.section} target and field (lines ${lineNumbers.join(', ')}).`,
      ),
    );
  }

  return {
    success: errors.length === 0,
    errors: sortValidationErrors(errors),
    validRows: errors.length === 0 ? [...validRows] : [],
  };
}

export function buildReportAlignedLanguageStoragePlan(
  rows: readonly ValidatedReportLanguageRow[],
): ReportAlignedLanguageStoragePlan {
  const hero = rows
    .filter((row): row is Extract<ValidatedReportLanguageRow, { section: 'hero' }> => row.section === 'hero')
    .map((row) => ({
      patternKey: row.canonicalPatternKey,
      field: row.field,
      content: row.content,
    }));

  const domainChapters = rows
    .filter((row): row is Extract<ValidatedReportLanguageRow, { section: 'domain' }> => row.section === 'domain')
    .map((row) => ({
      domainKey: row.target,
      field: row.field,
      content: row.content,
    }));

  const signals = rows
    .filter((row): row is Extract<ValidatedReportLanguageRow, { section: 'signal' }> => row.section === 'signal')
    .map((row) => ({
      signalKey: row.target,
      field: row.field,
      content: row.content,
    }));

  const pairs = rows
    .filter((row): row is Extract<ValidatedReportLanguageRow, { section: 'pair' }> => row.section === 'pair')
    .map((row) => ({
      signalPair: row.canonicalSignalPair,
      field: row.field,
      content: row.content,
    }));

  return {
    hero,
    domainChapters,
    signals,
    pairs,
    storage: {
      // Hero authoring remains overview-backed until storage is formally renamed.
      overview: hero.map((row) => ({
        patternKey: row.patternKey,
        section: toHeroOverviewStorageSection(row.field),
        content: row.content,
      })),
      domains: domainChapters.map((row) => ({
        domainKey: row.domainKey,
        section: toDomainSection(row.field),
        content: row.content,
      })),
      signals: signals.map((row) => ({
        signalKey: row.signalKey,
        section: toSignalSection(row.field),
        content: row.content,
      })),
      pairs: pairs.map((row) => ({
        signalPair: row.signalPair,
        section: 'summary',
        content: row.content,
      })),
    },
  };
}

function parseReportLanguageRow(
  rawLine: string,
  lineNumber: number,
): { record: ParsedReportLanguageRow } | { error: ReportLanguageParseError } {
  const columns = rawLine.split('|');
  if (columns.length !== 4) {
    return {
      error: {
        lineNumber,
        rawLine,
        code: 'INVALID_COLUMN_COUNT',
        message:
          'Each row must contain exactly 4 pipe-delimited columns: section | target | field | content.',
      },
    };
  }

  const [sectionRaw, targetRaw, fieldRaw, contentRaw] = columns;
  const section = sectionRaw.trim();
  const target = targetRaw.trim();
  const field = fieldRaw.trim();
  const content = contentRaw.trim();

  if (!section) {
    return {
      error: {
        lineNumber,
        rawLine,
        code: 'EMPTY_SECTION',
        message: 'Section is required.',
      },
    };
  }

  if (!target) {
    return {
      error: {
        lineNumber,
        rawLine,
        code: 'EMPTY_TARGET',
        message: 'Target is required.',
      },
    };
  }

  if (!field) {
    return {
      error: {
        lineNumber,
        rawLine,
        code: 'EMPTY_FIELD',
        message: 'Field is required.',
      },
    };
  }

  if (!content) {
    return {
      error: {
        lineNumber,
        rawLine,
        code: 'EMPTY_CONTENT',
        message: 'Content is required.',
      },
    };
  }

  return {
    record: {
      lineNumber,
      rawLine,
      section,
      target,
      field,
      content,
    },
  };
}

function trackDuplicate(
  duplicateTracker: Map<string, number[]>,
  row: ValidatedReportLanguageRow,
): void {
  const duplicateKey = getDuplicateKey(row);
  const existing = duplicateTracker.get(duplicateKey);

  if (existing) {
    existing.push(row.lineNumber);
  } else {
    duplicateTracker.set(duplicateKey, [row.lineNumber]);
  }
}

function getDuplicateKey(row: ValidatedReportLanguageRow): string {
  switch (row.section) {
    case 'hero':
      return `hero::${row.canonicalPatternKey}::${row.field}`;
    case 'domain':
    case 'signal':
      return `${row.section}::${row.target}::${row.field}`;
    case 'pair':
      return `pair::${row.canonicalSignalPair}::${row.field}`;
  }
}

function sortValidationErrors(
  errors: readonly ReportLanguageValidationError[],
): readonly ReportLanguageValidationError[] {
  return [...errors].sort(
    (left, right) => left.lineNumber - right.lineNumber || left.code.localeCompare(right.code),
  );
}

function getSignalLookupToken(signalKey: string): string {
  const segments = signalKey.split('_').filter((segment) => segment.length > 0);
  return segments[segments.length - 1] ?? signalKey;
}
