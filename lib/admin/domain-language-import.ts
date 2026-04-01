import type {
  AssessmentVersionLanguageDomainInput,
  AssessmentVersionLanguageDomainSection,
} from '@/lib/server/assessment-version-language-types';

export const DOMAIN_LANGUAGE_SECTION_ORDER = [
  'summary',
  'focus',
  'pressure',
  'environment',
] as const satisfies readonly AssessmentVersionLanguageDomainSection[];

const ALLOWED_DOMAIN_LANGUAGE_SECTIONS = new Set<AssessmentVersionLanguageDomainSection>(
  DOMAIN_LANGUAGE_SECTION_ORDER,
);

export type DomainLanguageParseErrorCode =
  | 'INVALID_COLUMN_COUNT'
  | 'EMPTY_DOMAIN_KEY'
  | 'EMPTY_SECTION'
  | 'INVALID_SECTION'
  | 'EMPTY_CONTENT';

export type ParsedDomainLanguageRow = {
  lineNumber: number;
  rawLine: string;
  domainKey: string;
  section: AssessmentVersionLanguageDomainSection;
  content: string;
};

export type DomainLanguageParseError = {
  lineNumber: number;
  rawLine: string;
  code: DomainLanguageParseErrorCode;
  message: string;
};

export type DomainLanguageValidationErrorCode =
  | 'INVALID_DOMAIN_KEY'
  | 'DUPLICATE_DOMAIN_SECTION';

export type DomainLanguageValidationError = {
  lineNumber: number;
  rawLine: string;
  domainKey: string;
  section: AssessmentVersionLanguageDomainSection;
  code: DomainLanguageValidationErrorCode;
  message: string;
};

export type DomainLanguagePreviewGroup = {
  domainKey: string;
  domainOrder: number;
  entries: readonly {
    lineNumber: number;
    section: AssessmentVersionLanguageDomainSection;
    content: string;
  }[];
};

export type DomainLanguageValidationResult = {
  success: boolean;
  errors: readonly DomainLanguageValidationError[];
  validRows: readonly ParsedDomainLanguageRow[];
};

export function parseDomainLanguageRows(input: string): {
  success: boolean;
  records: readonly ParsedDomainLanguageRow[];
  errors: readonly DomainLanguageParseError[];
} {
  const records: ParsedDomainLanguageRow[] = [];
  const errors: DomainLanguageParseError[] = [];
  const lines = input.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index] ?? '';
    if (rawLine.trim() === '') {
      continue;
    }

    const parsedRow = parseDomainLanguageRow(rawLine, index + 1);
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

export function validateDomainLanguageRows(params: {
  rows: readonly ParsedDomainLanguageRow[];
  validDomainKeys: readonly string[];
}): DomainLanguageValidationResult {
  const validDomainKeys = new Set(params.validDomainKeys);
  const duplicateTracker = new Map<string, number[]>();
  const errors: DomainLanguageValidationError[] = [];

  for (const row of params.rows) {
    if (!validDomainKeys.has(row.domainKey)) {
      errors.push({
        lineNumber: row.lineNumber,
        rawLine: row.rawLine,
        domainKey: row.domainKey,
        section: row.section,
        code: 'INVALID_DOMAIN_KEY',
        message: `Domain key ${row.domainKey} does not exist in the active assessment version.`,
      });
    }

    const duplicateKey = `${row.domainKey}::${row.section}`;
    const existing = duplicateTracker.get(duplicateKey);
    if (existing) {
      existing.push(row.lineNumber);
    } else {
      duplicateTracker.set(duplicateKey, [row.lineNumber]);
    }
  }

  for (const row of params.rows) {
    const lineNumbers = duplicateTracker.get(`${row.domainKey}::${row.section}`) ?? [];
    if (lineNumbers.length <= 1) {
      continue;
    }

    errors.push({
      lineNumber: row.lineNumber,
      rawLine: row.rawLine,
      domainKey: row.domainKey,
      section: row.section,
      code: 'DUPLICATE_DOMAIN_SECTION',
      message: `Domain key ${row.domainKey} contains duplicate ${row.section} rows in this batch (lines ${lineNumbers.join(', ')}).`,
    });
  }

  return {
    success: errors.length === 0,
    errors: sortValidationErrors(errors),
    validRows: errors.length === 0 ? [...params.rows] : [],
  };
}

export function buildDomainLanguagePreview(params: {
  rows: readonly ParsedDomainLanguageRow[];
  domainKeysInOrder: readonly string[];
}): readonly DomainLanguagePreviewGroup[] {
  const domainOrder = new Map(params.domainKeysInOrder.map((domainKey, index) => [domainKey, index] as const));
  const sectionOrder = new Map(
    DOMAIN_LANGUAGE_SECTION_ORDER.map((section, index) => [section, index] as const),
  );
  const grouped = new Map<string, DomainLanguagePreviewGroup['entries'][number][]>();

  for (const row of params.rows) {
    const existing = grouped.get(row.domainKey);
    const previewRow = {
      lineNumber: row.lineNumber,
      section: row.section,
      content: row.content,
    };

    if (existing) {
      existing.push(previewRow);
      continue;
    }

    grouped.set(row.domainKey, [previewRow]);
  }

  return [...grouped.entries()]
    .map(([domainKey, entries]) => ({
      domainKey,
      domainOrder: domainOrder.get(domainKey) ?? Number.MAX_SAFE_INTEGER,
      entries: [...entries].sort(
        (left, right) =>
          (sectionOrder.get(left.section) ?? Number.MAX_SAFE_INTEGER) -
            (sectionOrder.get(right.section) ?? Number.MAX_SAFE_INTEGER) ||
          left.lineNumber - right.lineNumber,
      ),
    }))
    .sort(
      (left, right) =>
        left.domainOrder - right.domainOrder || left.domainKey.localeCompare(right.domainKey),
    );
}

export function toDomainLanguageInputs(
  rows: readonly ParsedDomainLanguageRow[],
): readonly AssessmentVersionLanguageDomainInput[] {
  return rows.map((row) => ({
    domainKey: row.domainKey,
    section: row.section,
    content: row.content,
  }));
}

function parseDomainLanguageRow(
  rawLine: string,
  lineNumber: number,
): { record: ParsedDomainLanguageRow } | { error: DomainLanguageParseError } {
  const columns = rawLine.split('|');
  if (columns.length !== 3) {
    return {
      error: createParseError(
        lineNumber,
        rawLine,
        'INVALID_COLUMN_COUNT',
        'Each row must contain exactly 3 pipe-delimited columns: domain_key | section | content.',
      ),
    };
  }

  const [domainKeyRaw, sectionRaw, contentRaw] = columns;
  const domainKey = domainKeyRaw.trim();
  const normalizedSection = sectionRaw.trim();
  const content = contentRaw.trim();

  if (!domainKey) {
    return {
      error: createParseError(lineNumber, rawLine, 'EMPTY_DOMAIN_KEY', 'Domain key is required.'),
    };
  }

  if (!normalizedSection) {
    return {
      error: createParseError(lineNumber, rawLine, 'EMPTY_SECTION', 'Section is required.'),
    };
  }

  if (!isDomainLanguageSection(normalizedSection)) {
    return {
      error: createParseError(
        lineNumber,
        rawLine,
        'INVALID_SECTION',
        'Section must be one of summary, focus, pressure, or environment.',
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
      domainKey,
      section: normalizedSection,
      content,
    },
  };
}

function createParseError(
  lineNumber: number,
  rawLine: string,
  code: DomainLanguageParseErrorCode,
  message: string,
): DomainLanguageParseError {
  return {
    lineNumber,
    rawLine,
    code,
    message,
  };
}

function isDomainLanguageSection(value: string): value is AssessmentVersionLanguageDomainSection {
  return ALLOWED_DOMAIN_LANGUAGE_SECTIONS.has(value as AssessmentVersionLanguageDomainSection);
}

function sortValidationErrors(
  errors: readonly DomainLanguageValidationError[],
): readonly DomainLanguageValidationError[] {
  return [...errors].sort(
    (left, right) => left.lineNumber - right.lineNumber || left.code.localeCompare(right.code),
  );
}
