import { canonicalizeSignalPairKey } from '@/lib/admin/pair-language-import';
import type { AssessmentVersionLanguageHeroHeaderInput } from '@/lib/server/assessment-version-language-types';

export type HeroHeaderScope = 'pair';

export type HeroHeaderParseError = {
  lineNumber: number;
  rawLine: string;
  code: 'INVALID_COLUMN_COUNT' | 'EMPTY_SCOPE' | 'EMPTY_KEY' | 'EMPTY_HEADLINE';
  message: string;
};

export type ParsedHeroHeaderRow = {
  lineNumber: number;
  rawLine: string;
  scope: string;
  key: string;
  headline: string;
};

export type HeroHeaderValidationError = {
  lineNumber: number;
  rawLine: string;
  scope: string;
  key: string;
  code: 'INVALID_SCOPE' | 'INVALID_KEY' | 'UNKNOWN_SIGNAL_KEY' | 'SELF_PAIR_NOT_ALLOWED' | 'DUPLICATE_ENTRY';
  message: string;
};

export type ValidatedHeroHeaderRow = {
  lineNumber: number;
  rawLine: string;
  scope: 'pair';
  key: string;
  headline: string;
  canonicalPairKey: string;
  signalKeys: readonly [string, string];
};

export function parseHeroHeaderLanguageRows(input: string): {
  success: boolean;
  records: readonly ParsedHeroHeaderRow[];
  errors: readonly HeroHeaderParseError[];
} {
  const records: ParsedHeroHeaderRow[] = [];
  const errors: HeroHeaderParseError[] = [];

  for (const [index, rawLine] of input.split(/\r?\n/).entries()) {
    if (rawLine.trim() === '') {
      continue;
    }

    const columns = rawLine.split('|');
    if (columns.length !== 3) {
      errors.push({
        lineNumber: index + 1,
        rawLine,
        code: 'INVALID_COLUMN_COUNT',
        message: 'Each row must contain exactly 3 pipe-delimited columns: scope | key | headline.',
      });
      continue;
    }

    const [scopeRaw, keyRaw, headlineRaw] = columns;
    const scope = scopeRaw.trim();
    const key = keyRaw.trim();
    const headline = headlineRaw.trim();

    if (!scope) {
      errors.push({ lineNumber: index + 1, rawLine, code: 'EMPTY_SCOPE', message: 'Scope is required.' });
      continue;
    }

    if (!key) {
      errors.push({ lineNumber: index + 1, rawLine, code: 'EMPTY_KEY', message: 'Key is required.' });
      continue;
    }

    if (!headline) {
      errors.push({ lineNumber: index + 1, rawLine, code: 'EMPTY_HEADLINE', message: 'Headline is required.' });
      continue;
    }

    records.push({
      lineNumber: index + 1,
      rawLine,
      scope,
      key,
      headline,
    });
  }

  return {
    success: errors.length === 0,
    records,
    errors,
  };
}

export function validateHeroHeaderLanguageRows(params: {
  rows: readonly ParsedHeroHeaderRow[];
  validSignalKeys: readonly string[];
}): {
  success: boolean;
  errors: readonly HeroHeaderValidationError[];
  validRows: readonly ValidatedHeroHeaderRow[];
} {
  const validLookupTokens = new Set(params.validSignalKeys.map(getSignalLookupToken));
  const errors: HeroHeaderValidationError[] = [];
  const validRows: ValidatedHeroHeaderRow[] = [];
  const duplicateTracker = new Map<string, number[]>();

  for (const row of params.rows) {
    if (row.scope.trim().toLowerCase() !== 'pair') {
      errors.push({
        lineNumber: row.lineNumber,
        rawLine: row.rawLine,
        scope: row.scope,
        key: row.key,
        code: 'INVALID_SCOPE',
        message: 'Scope must be pair.',
      });
      continue;
    }

    const canonicalized = canonicalizeSignalPairKey(row.key);
    if (!canonicalized.success) {
      errors.push({
        lineNumber: row.lineNumber,
        rawLine: row.rawLine,
        scope: row.scope,
        key: row.key,
        code: 'INVALID_KEY',
        message: 'Key must be a canonical pair key containing exactly two signal tokens.',
      });
      continue;
    }

    const [leftSignalKey, rightSignalKey] = canonicalized.signalKeys;
    if (!validLookupTokens.has(leftSignalKey)) {
      errors.push({
        lineNumber: row.lineNumber,
        rawLine: row.rawLine,
        scope: row.scope,
        key: row.key,
        code: 'UNKNOWN_SIGNAL_KEY',
        message: `Signal token ${leftSignalKey} does not resolve to a signal in the active assessment version.`,
      });
    }

    if (!validLookupTokens.has(rightSignalKey)) {
      errors.push({
        lineNumber: row.lineNumber,
        rawLine: row.rawLine,
        scope: row.scope,
        key: row.key,
        code: 'UNKNOWN_SIGNAL_KEY',
        message: `Signal token ${rightSignalKey} does not resolve to a signal in the active assessment version.`,
      });
    }

    if (leftSignalKey === rightSignalKey) {
      errors.push({
        lineNumber: row.lineNumber,
        rawLine: row.rawLine,
        scope: row.scope,
        key: row.key,
        code: 'SELF_PAIR_NOT_ALLOWED',
        message: `Pair ${row.key} is invalid because self-pairs are not allowed.`,
      });
    }

    const validatedRow: ValidatedHeroHeaderRow = {
      lineNumber: row.lineNumber,
      rawLine: row.rawLine,
      scope: 'pair',
      key: row.key,
      headline: row.headline,
      canonicalPairKey: canonicalized.canonicalSignalPair,
      signalKeys: canonicalized.signalKeys,
    };
    validRows.push(validatedRow);
    const lines = duplicateTracker.get(validatedRow.canonicalPairKey) ?? [];
    lines.push(validatedRow.lineNumber);
    duplicateTracker.set(validatedRow.canonicalPairKey, lines);
  }

  for (const row of validRows) {
    const lines = duplicateTracker.get(row.canonicalPairKey) ?? [];
    if (lines.length <= 1) {
      continue;
    }

    errors.push({
      lineNumber: row.lineNumber,
      rawLine: row.rawLine,
      scope: row.scope,
      key: row.canonicalPairKey,
      code: 'DUPLICATE_ENTRY',
      message: `Duplicate hero header entry detected for pair ${row.canonicalPairKey} (lines ${lines.join(', ')}).`,
    });
  }

  return {
    success: errors.length === 0,
    errors: [...errors].sort((left, right) => left.lineNumber - right.lineNumber || left.code.localeCompare(right.code)),
    validRows: errors.length === 0 ? [...validRows] : [],
  };
}

export function buildHeroHeaderLanguageStoragePlan(
  rows: readonly ValidatedHeroHeaderRow[],
): readonly AssessmentVersionLanguageHeroHeaderInput[] {
  return Object.freeze(
    rows.map((row) => ({
      pairKey: row.canonicalPairKey,
      headline: row.headline,
    })),
  );
}

function getSignalLookupToken(signalKey: string): string {
  const segments = signalKey.split('_').filter((segment) => segment.length > 0);
  return segments[segments.length - 1] ?? signalKey;
}
