import type { AssessmentVersionHeroPatternLanguageInput } from '@/lib/server/assessment-version-hero';

const VALID_FIELDS = new Set([
  'headline',
  'subheadline',
  'summary',
  'narrative',
  'pressureOverlay',
  'environmentOverlay',
] as const);

type HeroPatternLanguageField = 'headline' | 'subheadline' | 'summary' | 'narrative' | 'pressureOverlay' | 'environmentOverlay';

export type ParsedHeroPatternLanguageRow = {
  lineNumber: number;
  rawLine: string;
  patternKey: string;
  field: string;
  content: string;
};

export type ValidatedHeroPatternLanguageRow = {
  lineNumber: number;
  rawLine: string;
  patternKey: string;
  field: HeroPatternLanguageField;
  content: string;
};

export function parseHeroPatternLanguageRows(input: string): {
  rows: readonly ParsedHeroPatternLanguageRow[];
  errors: readonly { message: string }[];
} {
  const rows: ParsedHeroPatternLanguageRow[] = [];
  const errors: { message: string }[] = [];

  input.split(/\r?\n/).forEach((rawLine, index) => {
    if (rawLine.trim().length === 0) {
      return;
    }

    const parts = rawLine.split('|').map((part) => part.trim());
    if (parts.length !== 3) {
      errors.push({ message: `Line ${index + 1}: expected 3 columns (pattern | field | content).` });
      return;
    }

    const [patternKey = '', field = '', content = ''] = parts;
    if (!patternKey || !field || !content) {
      errors.push({ message: `Line ${index + 1}: each column must be present.` });
      return;
    }

    rows.push({
      lineNumber: index + 1,
      rawLine,
      patternKey,
      field,
      content,
    });
  });

  return { rows, errors };
}

export function validateHeroPatternLanguageRows(params: {
  rows: readonly ParsedHeroPatternLanguageRow[];
}): {
  validRows: readonly ValidatedHeroPatternLanguageRow[];
  errors: readonly { message: string }[];
} {
  const validRows: ValidatedHeroPatternLanguageRow[] = [];
  const errors: { message: string }[] = [];
  const seen = new Set<string>();

  for (const row of params.rows) {
    if (!VALID_FIELDS.has(row.field as HeroPatternLanguageField)) {
      errors.push({ message: `Line ${row.lineNumber}: unsupported Hero language field "${row.field}".` });
      continue;
    }

    const duplicateKey = `${row.patternKey}:${row.field}`;
    if (seen.has(duplicateKey)) {
      errors.push({ message: `Line ${row.lineNumber}: duplicate Hero language row "${duplicateKey}".` });
      continue;
    }
    seen.add(duplicateKey);

    validRows.push({
      lineNumber: row.lineNumber,
      rawLine: row.rawLine,
      patternKey: row.patternKey,
      field: row.field as HeroPatternLanguageField,
      content: row.content,
    });
  }

  const rowsByPattern = new Map<string, Set<HeroPatternLanguageField>>();
  for (const row of validRows) {
    const fields = rowsByPattern.get(row.patternKey) ?? new Set<HeroPatternLanguageField>();
    fields.add(row.field);
    rowsByPattern.set(row.patternKey, fields);
  }

  for (const [patternKey, fields] of rowsByPattern.entries()) {
    if (!fields.has('headline')) {
      errors.push({ message: `Hero pattern "${patternKey}" must include a headline row.` });
    }
  }

  return { validRows, errors };
}

export function buildHeroPatternLanguageStoragePlan(
  rows: readonly ValidatedHeroPatternLanguageRow[],
): readonly AssessmentVersionHeroPatternLanguageInput[] {
  const grouped = new Map<string, Partial<Record<HeroPatternLanguageField, string>>>();

  for (const row of rows) {
    const entry = grouped.get(row.patternKey) ?? {};
    entry[row.field] = row.content;
    grouped.set(row.patternKey, entry);
  }

  return [...grouped.entries()]
    .map(([patternKey, fields]) => ({
      patternKey,
      headline: fields.headline ?? '',
      subheadline: fields.subheadline ?? null,
      summary: fields.summary ?? null,
      narrative: fields.narrative ?? null,
      pressureOverlay: fields.pressureOverlay ?? null,
      environmentOverlay: fields.environmentOverlay ?? null,
    }))
    .sort((left, right) => left.patternKey.localeCompare(right.patternKey));
}
