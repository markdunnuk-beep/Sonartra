import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  flowStateAuthoringConstants,
  readerFirstAllowedApplicationAreas,
  readerFirstAllowedRankRoles,
  readerFirstAllowedScoreShapes,
  readerFirstAllowedSignalKeys,
  readerFirstLookupKeyRecommendation,
  readerFirstRequiredHeaders,
  readerFirstSectionKeys,
  readerFirstSectionPolicies,
  type ReaderFirstSectionKey,
} from '@/content/authoring/reader-first-schema-manifest';

type ReaderFirstRow = Record<string, string>;
type ParsedSection = {
  readonly sectionKey: ReaderFirstSectionKey;
  readonly header: readonly string[];
  readonly rows: readonly ReaderFirstRow[];
};
type ParsedImport = Partial<Record<ReaderFirstSectionKey, ParsedSection>>;
type ValidationMode =
  | { readonly type: 'full' }
  | { readonly type: 'section'; readonly sectionKey: ReaderFirstSectionKey };

export type ReaderFirstValidationResult = {
  readonly pass: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly rowCounts: Partial<Record<ReaderFirstSectionKey, number>>;
  readonly patternCoverage: Partial<Record<ReaderFirstSectionKey, number>>;
  readonly scoreShapeCoverage: Partial<Record<ReaderFirstSectionKey, number>>;
};

const allowedStatuses = new Set(['draft', 'review', 'approved', 'ready']);
const allowedPriorityValues = new Set(['1', '2', '3']);
const allowedGuidanceTypes = new Set(readerFirstAllowedApplicationAreas);
const allowedSignals = new Set(readerFirstAllowedSignalKeys);
const allowedScoreShapes = new Set(readerFirstAllowedScoreShapes);
const allowedRankRoles = new Set(readerFirstAllowedRankRoles);
const sectionKeySet = new Set<string>(readerFirstSectionKeys);
const lookupDelimiter = readerFirstLookupKeyRecommendation.delimiter;

function isReaderFirstSectionKey(value: string): value is ReaderFirstSectionKey {
  return sectionKeySet.has(value);
}

function parseArgs(argv: readonly string[]): { input?: string; section?: ReaderFirstSectionKey } {
  const parsed: { input?: string; section?: ReaderFirstSectionKey } = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];

    if (arg === '--input') {
      parsed.input = value;
      index += 1;
      continue;
    }

    if (arg === '--section') {
      if (!isReaderFirstSectionKey(value)) {
        throw new Error(`Unsupported --section value: ${value ?? ''}`);
      }
      parsed.section = value;
      index += 1;
    }
  }

  return parsed;
}

function splitPsvLine(line: string): readonly string[] {
  return line.split('|');
}

function hasDuplicateValues(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

function rowFromColumns(header: readonly string[], columns: readonly string[]): ReaderFirstRow {
  return Object.fromEntries(header.map((field, index) => [field, columns[index] ?? '']));
}

export function parseReaderFirstImport(
  input: string,
  mode: ValidationMode,
): { parsed: ParsedImport; errors: string[] } {
  const errors: string[] = [];
  const normalized = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const lines = normalized.length > 0 ? normalized.split('\n') : [];
  const parsed: ParsedImport = {};

  if (mode.type === 'section') {
    const header = splitPsvLine(lines[0] ?? '');
    const rows = lines.slice(1).map((line) => rowFromColumns(header, splitPsvLine(line)));

    parsed[mode.sectionKey] = {
      sectionKey: mode.sectionKey,
      header,
      rows,
    };

    return { parsed, errors };
  }

  let index = 0;
  while (index < lines.length) {
    const sectionKey = lines[index]?.trim();

    if (!isReaderFirstSectionKey(sectionKey)) {
      errors.push(`Expected section key at line ${index + 1}, found "${sectionKey ?? ''}".`);
      break;
    }

    const headerLine = lines[index + 1];
    if (!headerLine) {
      errors.push(`${sectionKey} is missing a header row.`);
      break;
    }

    const header = splitPsvLine(headerLine);
    const rowLines: string[] = [];
    index += 2;

    while (index < lines.length && !isReaderFirstSectionKey(lines[index].trim())) {
      if (lines[index].trim().length > 0) {
        rowLines.push(lines[index]);
      }
      index += 1;
    }

    parsed[sectionKey] = {
      sectionKey,
      header,
      rows: rowLines.map((line) => rowFromColumns(header, splitPsvLine(line))),
    };
  }

  return { parsed, errors };
}

function getRankedSignals(row: ReaderFirstRow): readonly string[] {
  return [
    row.rank_1_signal_key,
    row.rank_2_signal_key,
    row.rank_3_signal_key,
    row.rank_4_signal_key,
  ].filter((value): value is string => Boolean(value));
}

function validatePatternKey(
  sectionKey: ReaderFirstSectionKey,
  row: ReaderFirstRow,
  errors: string[],
) {
  if (!row.pattern_key) {
    return;
  }

  const patternSignals = row.pattern_key.split('_');
  const validSignalKeys = readerFirstAllowedSignalKeys;
  const resolvedSignals: string[] = [];
  let cursor = 0;

  while (cursor < patternSignals.length) {
    const single = patternSignals[cursor];
    const pair = `${patternSignals[cursor]}_${patternSignals[cursor + 1] ?? ''}`;

    if (validSignalKeys.includes(pair as (typeof validSignalKeys)[number])) {
      resolvedSignals.push(pair);
      cursor += 2;
      continue;
    }

    resolvedSignals.push(single);
    cursor += 1;
  }

  if (
    resolvedSignals.length !== flowStateAuthoringConstants.signals.length ||
    new Set(resolvedSignals).size !== flowStateAuthoringConstants.signals.length ||
    resolvedSignals.some((signal) => !allowedSignals.has(signal as never))
  ) {
    errors.push(`${sectionKey}: pattern_key "${row.pattern_key}" must contain all four valid signals exactly once.`);
    return;
  }

  const rankedSignals = getRankedSignals(row);
  if (rankedSignals.length === 4 && rankedSignals.join('_') !== row.pattern_key) {
    errors.push(`${sectionKey}: rank_1_signal_key to rank_4_signal_key do not match pattern_key "${row.pattern_key}".`);
  }
}

function expectedLookupKey(sectionKey: ReaderFirstSectionKey, row: ReaderFirstRow): string | null {
  if (sectionKey === '05_Context') {
    return `${flowStateAuthoringConstants.domainKey}${lookupDelimiter}intro`;
  }

  if (sectionKey === '08_Signal_Roles') {
    return `${flowStateAuthoringConstants.domainKey}${lookupDelimiter}${row.signal_key}${lookupDelimiter}${row.rank_position}`;
  }

  if (sectionKey === '11_Strengths') {
    return `${flowStateAuthoringConstants.domainKey}${lookupDelimiter}${row.pattern_key}${lookupDelimiter}${row.strength_key}`;
  }

  if (sectionKey === '12_Narrowing') {
    return `${flowStateAuthoringConstants.domainKey}${lookupDelimiter}${row.pattern_key}${lookupDelimiter}${row.narrowing_key}`;
  }

  if (sectionKey === '13_Application') {
    return `${flowStateAuthoringConstants.domainKey}${lookupDelimiter}${row.pattern_key}${lookupDelimiter}${row.application_area}`;
  }

  if (readerFirstSectionPolicies[sectionKey].coverage === 'score_shape_specific') {
    return `${flowStateAuthoringConstants.domainKey}${lookupDelimiter}${row.pattern_key}${lookupDelimiter}${row.score_shape}`;
  }

  if (readerFirstSectionPolicies[sectionKey].coverage === 'pattern_only') {
    return `${flowStateAuthoringConstants.domainKey}${lookupDelimiter}${row.pattern_key}`;
  }

  return null;
}

function validateSectionRows(section: ParsedSection, result: MutableValidationResult) {
  const expectedHeaders = readerFirstRequiredHeaders[section.sectionKey];
  const expectedHeaderText = expectedHeaders.join('|');
  const actualHeaderText = section.header.join('|');

  if (hasDuplicateValues(section.header)) {
    result.errors.push(`${section.sectionKey}: header contains duplicate field names.`);
  }

  if (actualHeaderText !== expectedHeaderText) {
    result.errors.push(`${section.sectionKey}: header does not exactly match manifest.`);
  }

  const expectedRows = readerFirstSectionPolicies[section.sectionKey].expectedRows;
  if (section.rows.length !== expectedRows) {
    result.errors.push(`${section.sectionKey}: expected ${expectedRows} rows but found ${section.rows.length}.`);
  }

  result.rowCounts[section.sectionKey] = section.rows.length;

  const lookupKeys = new Set<string>();
  const rowKeys = new Set<string>();
  const strengthKeysByPattern = new Map<string, Set<string>>();
  const narrowingKeysByPattern = new Map<string, Set<string>>();
  const applicationAreasByPattern = new Map<string, Set<string>>();
  const signalRankKeys = new Set<string>();

  for (const [rowIndex, row] of section.rows.entries()) {
    const rowLabel = `${section.sectionKey} row ${rowIndex + 1}`;

    for (const field of expectedHeaders) {
      if ((row[field] ?? '').trim().length === 0) {
        result.errors.push(`${rowLabel}: ${field} is blank.`);
      }
    }

    if (row.domain_key && row.domain_key !== flowStateAuthoringConstants.domainKey) {
      result.errors.push(`${rowLabel}: domain_key must be ${flowStateAuthoringConstants.domainKey}.`);
    }

    if (row.lookup_key) {
      if (row.lookup_key.includes('|')) {
        result.errors.push(`${rowLabel}: lookup_key contains a pipe.`);
      }

      if (!row.lookup_key.includes(lookupDelimiter)) {
        result.errors.push(`${rowLabel}: lookup_key should use ${lookupDelimiter} as delimiter.`);
      }

      const expected = expectedLookupKey(section.sectionKey, row);
      if (expected && row.lookup_key !== expected) {
        result.errors.push(`${rowLabel}: lookup_key should be ${expected}.`);
      }

      if (lookupKeys.has(row.lookup_key)) {
        result.errors.push(`${rowLabel}: duplicate lookup_key ${row.lookup_key}.`);
      }
      lookupKeys.add(row.lookup_key);
    }

    if (row.pattern_key) {
      validatePatternKey(section.sectionKey, row, result.errors);
    }

    for (const signalField of [
      'rank_1_signal_key',
      'rank_2_signal_key',
      'rank_3_signal_key',
      'rank_4_signal_key',
      'signal_key',
      'linked_signal_key',
      'missing_range_signal_key',
    ]) {
      const value = row[signalField];
      if (value && !allowedSignals.has(value as never)) {
        result.errors.push(`${rowLabel}: ${signalField} has invalid signal key ${value}.`);
      }
    }

    if (row.score_shape && !allowedScoreShapes.has(row.score_shape as never)) {
      result.errors.push(`${rowLabel}: score_shape has invalid value ${row.score_shape}.`);
    }

    if (row.rank_role && !allowedRankRoles.has(row.rank_role as never)) {
      result.errors.push(`${rowLabel}: rank_role has invalid value ${row.rank_role}.`);
    }

    if (row.application_area && !allowedGuidanceTypes.has(row.application_area as never)) {
      result.errors.push(`${rowLabel}: application_area has invalid value ${row.application_area}.`);
    }

    if (row.guidance_type && !allowedGuidanceTypes.has(row.guidance_type as never)) {
      result.errors.push(`${rowLabel}: guidance_type has invalid value ${row.guidance_type}.`);
    }

    if (row.status && !allowedStatuses.has(row.status)) {
      result.errors.push(`${rowLabel}: status has invalid value ${row.status}.`);
    }

    if (row.priority && !allowedPriorityValues.has(row.priority)) {
      result.errors.push(`${rowLabel}: priority must be 1, 2, or 3.`);
    }

    const rowKey =
      row.pattern_key && row.score_shape
        ? `${row.pattern_key}|${row.score_shape}`
        : row.pattern_key || row.lookup_key;
    if (rowKey && ['06_Orientation', '07_Recognition', '09_Pattern_Mechanics', '10_Pattern_Synthesis', '14_Closing_Integration'].includes(section.sectionKey)) {
      if (rowKeys.has(rowKey)) {
        result.errors.push(`${rowLabel}: duplicate section/pattern_key/score_shape combination ${rowKey}.`);
      }
      rowKeys.add(rowKey);
    }

    if (section.sectionKey === '08_Signal_Roles') {
      const signalRankKey = `${row.signal_key}|${row.rank_position}`;
      if (signalRankKeys.has(signalRankKey)) {
        result.errors.push(`${rowLabel}: duplicate signal_key + rank_position ${signalRankKey}.`);
      }
      signalRankKeys.add(signalRankKey);
    }

    if (section.sectionKey === '11_Strengths') {
      const keys = strengthKeysByPattern.get(row.pattern_key) ?? new Set<string>();
      if (keys.has(row.strength_key)) {
        result.errors.push(`${rowLabel}: duplicate strength_key ${row.strength_key} within ${row.pattern_key}.`);
      }
      keys.add(row.strength_key);
      strengthKeysByPattern.set(row.pattern_key, keys);
    }

    if (section.sectionKey === '12_Narrowing') {
      const keys = narrowingKeysByPattern.get(row.pattern_key) ?? new Set<string>();
      if (keys.has(row.narrowing_key)) {
        result.errors.push(`${rowLabel}: duplicate narrowing_key ${row.narrowing_key} within ${row.pattern_key}.`);
      }
      keys.add(row.narrowing_key);
      narrowingKeysByPattern.set(row.pattern_key, keys);
    }

    if (section.sectionKey === '13_Application') {
      const keys = applicationAreasByPattern.get(row.pattern_key) ?? new Set<string>();
      if (keys.has(row.application_area)) {
        result.errors.push(`${rowLabel}: duplicate application_area ${row.application_area} within ${row.pattern_key}.`);
      }
      keys.add(row.application_area);
      applicationAreasByPattern.set(row.pattern_key, keys);
    }
  }
}

function validateLineColumnCounts(section: ParsedSection, source: string, result: MutableValidationResult) {
  const lines = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  const headerText = section.header.join('|');
  const headerIndex = lines.findIndex((line) => line === headerText);

  if (headerIndex < 0) {
    return;
  }

  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (isReaderFirstSectionKey(line.trim())) {
      break;
    }

    if (line.trim().length === 0) {
      continue;
    }

    const columnCount = line.split('|').length;
    if (columnCount !== section.header.length) {
      result.errors.push(`${section.sectionKey} line ${index + 1}: expected ${section.header.length} columns but found ${columnCount}.`);
    }
  }
}

function validateCoverage(section: ParsedSection, result: MutableValidationResult) {
  const rows = section.rows;
  const patternKeys = new Set(rows.map((row) => row.pattern_key).filter(Boolean));
  const scoreShapePairs = new Set(
    rows
      .filter((row) => row.pattern_key && row.score_shape)
      .map((row) => `${row.pattern_key}|${row.score_shape}`),
  );

  if (patternKeys.size > 0) {
    result.patternCoverage[section.sectionKey] = patternKeys.size;
  }

  if (scoreShapePairs.size > 0) {
    result.scoreShapeCoverage[section.sectionKey] = scoreShapePairs.size;
  }

  const policy = readerFirstSectionPolicies[section.sectionKey].coverage;

  if (
    ['score_shape_specific', 'pattern_strengths', 'pattern_narrowing', 'pattern_application'].includes(policy) &&
    patternKeys.size !== flowStateAuthoringConstants.requiredPatternCount
  ) {
    result.errors.push(`${section.sectionKey}: expected 24 unique pattern keys but found ${patternKeys.size}.`);
  }

  if (policy === 'score_shape_specific') {
    if (scoreShapePairs.size !== 96) {
      result.errors.push(`${section.sectionKey}: expected 96 pattern_key + score_shape combinations but found ${scoreShapePairs.size}.`);
    }

    for (const patternKey of patternKeys) {
      const shapes = new Set(
        rows
          .filter((row) => row.pattern_key === patternKey)
          .map((row) => row.score_shape),
      );

      for (const scoreShape of readerFirstAllowedScoreShapes) {
        if (!shapes.has(scoreShape)) {
          result.errors.push(`${section.sectionKey}: ${patternKey} is missing score_shape ${scoreShape}.`);
        }
      }
    }
  }
}

type MutableValidationResult = {
  errors: string[];
  warnings: string[];
  rowCounts: Partial<Record<ReaderFirstSectionKey, number>>;
  patternCoverage: Partial<Record<ReaderFirstSectionKey, number>>;
  scoreShapeCoverage: Partial<Record<ReaderFirstSectionKey, number>>;
};

export function validateReaderFirstImportText(
  source: string,
  mode: ValidationMode = { type: 'full' },
): ReaderFirstValidationResult {
  const parsedResult = parseReaderFirstImport(source, mode);
  const result: MutableValidationResult = {
    errors: [...parsedResult.errors],
    warnings: [],
    rowCounts: {},
    patternCoverage: {},
    scoreShapeCoverage: {},
  };

  if (mode.type === 'full') {
    for (const sectionKey of readerFirstSectionKeys) {
      if (!parsedResult.parsed[sectionKey]) {
        result.errors.push(`Missing required section ${sectionKey}.`);
      }
    }
  }

  const sections =
    mode.type === 'section'
      ? [parsedResult.parsed[mode.sectionKey]].filter((section): section is ParsedSection => Boolean(section))
      : readerFirstSectionKeys
          .map((sectionKey) => parsedResult.parsed[sectionKey])
          .filter((section): section is ParsedSection => Boolean(section));

  for (const section of sections) {
    validateSectionRows(section, result);
    validateLineColumnCounts(section, source, result);
    validateCoverage(section, result);
  }

  return {
    ...result,
    pass: result.errors.length === 0,
  };
}

export async function validateReaderFirstImportFile(
  inputPath: string,
  mode: ValidationMode = { type: 'full' },
): Promise<ReaderFirstValidationResult> {
  const source = await readFile(inputPath, 'utf8');
  return validateReaderFirstImportText(source, mode);
}

function printResult(result: ReaderFirstValidationResult) {
  console.log('Section | Rows | Patterns | Score-shape pairs');
  console.log('--- | ---: | ---: | ---:');

  for (const sectionKey of readerFirstSectionKeys) {
    const rows = result.rowCounts[sectionKey] ?? 0;
    const patterns = result.patternCoverage[sectionKey] ?? 0;
    const scoreShapes = result.scoreShapeCoverage[sectionKey] ?? 0;
    if (rows > 0 || patterns > 0 || scoreShapes > 0) {
      console.log(`${sectionKey} | ${rows} | ${patterns} | ${scoreShapes}`);
    }
  }

  console.log(`Verdict: ${result.pass ? 'PASS' : 'FAIL'}`);

  console.log('Errors:');
  if (result.errors.length === 0) {
    console.log('- none');
  } else {
    for (const error of result.errors) {
      console.log(`- ${error}`);
    }
  }

  console.log('Warnings:');
  if (result.warnings.length === 0) {
    console.log('- none');
  } else {
    for (const warning of result.warnings) {
      console.log(`- ${warning}`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.input) {
    throw new Error('Missing required --input path.');
  }

  const mode: ValidationMode = args.section
    ? { type: 'section', sectionKey: args.section }
    : { type: 'full' };
  const result = await validateReaderFirstImportFile(args.input, mode);
  printResult(result);

  if (!result.pass) {
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';

if (import.meta.url === invokedPath) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
