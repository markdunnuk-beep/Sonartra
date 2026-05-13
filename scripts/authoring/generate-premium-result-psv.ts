import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  readerFirstLookupKeyRecommendation,
  readerFirstRequiredHeaders,
  type ReaderFirstSectionKey,
} from '@/content/authoring/reader-first-schema-manifest';
import {
  premiumFieldMapRequiredColumns,
  validatePremiumFieldMapText,
} from '@/scripts/authoring/validate-premium-field-map';

type PremiumFieldMapRow = Record<(typeof premiumFieldMapRequiredColumns)[number], string>;
type OutputRow = Record<string, string>;

export type GeneratePremiumResultPsvOptions = {
  readonly inputs: readonly string[];
  readonly outDir: string;
  readonly includeReview?: boolean;
  readonly domainKey?: string;
};

export type GeneratedPremiumResultPsvFile = {
  readonly sectionKey: PremiumResultSectionKey;
  readonly filePath: string;
  readonly rowCount: number;
  readonly content: string;
};

export type GeneratedPremiumResultPsvResult = {
  readonly files: readonly GeneratedPremiumResultPsvFile[];
  readonly rowsRead: number;
  readonly rowsEmitted: number;
};

const premiumResultSections = [
  '06_Orientation',
  '07_Recognition',
  '09_Pattern_Mechanics',
  '10_Pattern_Synthesis',
  '11_Strengths',
  '12_Narrowing',
  '13_Application',
  '14_Closing_Integration',
] as const;

type PremiumResultSectionKey = (typeof premiumResultSections)[number];

const sectionOrder = new Map<PremiumResultSectionKey, number>(
  premiumResultSections.map((sectionKey, index) => [sectionKey, index]),
);

const outputFileNames: Record<PremiumResultSectionKey, string> = {
  '06_Orientation': '06-orientation-leadership-approach.preview.psv',
  '07_Recognition': '07-recognition-leadership-approach.preview.psv',
  '09_Pattern_Mechanics': '09-pattern-mechanics-leadership-approach.preview.psv',
  '10_Pattern_Synthesis': '10-pattern-synthesis-leadership-approach.preview.psv',
  '11_Strengths': '11-strengths-leadership-approach.preview.psv',
  '12_Narrowing': '12-narrowing-leadership-approach.preview.psv',
  '13_Application': '13-application-leadership-approach.preview.psv',
  '14_Closing_Integration': '14-closing-integration-leadership-approach.preview.psv',
};

const fieldOrderBySection: Record<PremiumResultSectionKey, readonly string[]> = {
  '06_Orientation': [
    'orientation_title',
    'rank_1_phrase',
    'rank_2_phrase',
    'rank_3_phrase',
    'rank_4_phrase',
    'orientation_summary',
    'score_shape_summary',
  ],
  '07_Recognition': ['headline', 'recognition_statement', 'recognition_expansion'],
  '09_Pattern_Mechanics': [
    'mechanics_title',
    'core_mechanism',
    'why_it_shows_up',
    'what_it_protects',
  ],
  '10_Pattern_Synthesis': ['synthesis_title', 'gift', 'trap', 'takeaway', 'synthesis_text'],
  '11_Strengths': ['strength_title', 'strength_text', 'linked_signal_key'],
  '12_Narrowing': ['narrowing_title', 'narrowing_text', 'missing_range_signal_key'],
  '13_Application': ['application_title', 'application_text', 'linked_signal_key'],
  '14_Closing_Integration': [
    'closing_summary',
    'core_gift',
    'core_trap',
    'development_edge',
    'memorable_line',
  ],
};

const scoreShapeSections = new Set<PremiumResultSectionKey>([
  '06_Orientation',
  '07_Recognition',
  '09_Pattern_Mechanics',
  '10_Pattern_Synthesis',
  '14_Closing_Integration',
]);

const listSections = new Set<PremiumResultSectionKey>([
  '11_Strengths',
  '12_Narrowing',
  '13_Application',
]);

const emitStatuses = new Set(['approved', 'active']);
const lookupDelimiter = readerFirstLookupKeyRecommendation.delimiter;
const defaultDomainKey = 'leadership_approach';

function isPremiumResultSectionKey(value: string): value is PremiumResultSectionKey {
  return premiumResultSections.includes(value as PremiumResultSectionKey);
}

function splitPsvLine(line: string): readonly string[] {
  return line.split('|');
}

function normalizeSource(source: string): readonly string[] {
  const normalized = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  return normalized.length > 0 ? normalized.split('\n') : [];
}

function rowFromColumns(header: readonly string[], columns: readonly string[]): PremiumFieldMapRow {
  return Object.fromEntries(
    premiumFieldMapRequiredColumns.map((field) => [field, columns[header.indexOf(field)]?.trim() ?? '']),
  ) as PremiumFieldMapRow;
}

function parseFieldMapRows(source: string, inputPath: string): PremiumFieldMapRow[] {
  const validation = validatePremiumFieldMapText(source, inputPath);
  if (!validation.pass) {
    const errors = validation.findings
      .filter((finding) => finding.severity === 'error')
      .map((finding) => `${finding.filePath}:${finding.rowNumber} ${finding.code} ${finding.message}`);
    throw new Error(`Field map validation failed before generation:\n${errors.join('\n')}`);
  }

  const lines = normalizeSource(source);
  const header = splitPsvLine(lines[0] ?? '');
  return lines
    .slice(1)
    .filter((line) => line.trim().length > 0)
    .map((line) => rowFromColumns(header, splitPsvLine(line)));
}

async function readFieldMapRows(inputs: readonly string[]): Promise<PremiumFieldMapRow[]> {
  const rows: PremiumFieldMapRow[] = [];

  for (const input of inputs) {
    const source = await readFile(input, 'utf8');
    rows.push(...parseFieldMapRows(source, input));
  }

  return rows;
}

function shouldEmit(row: PremiumFieldMapRow, includeReview: boolean): boolean {
  return emitStatuses.has(row.status) || (includeReview && row.status === 'review');
}

function groupStatus(rows: readonly PremiumFieldMapRow[]): string {
  return rows.some((row) => row.status === 'active') ? 'active' : 'review';
}

function psvValue(value: string): string {
  return value.replace(/\r\n/g, ' ').replace(/\r/g, ' ').replace(/\n/g, ' ').trim();
}

function serializeRows(sectionKey: PremiumResultSectionKey, rows: readonly OutputRow[]): string {
  const header = readerFirstRequiredHeaders[sectionKey as ReaderFirstSectionKey];
  return [
    header.join('|'),
    ...rows.map((row) => header.map((field) => psvValue(row[field] ?? '')).join('|')),
  ].join('\n');
}

function assertNoPipeValues(rows: readonly OutputRow[], sectionKey: PremiumResultSectionKey) {
  for (const [rowIndex, row] of rows.entries()) {
    for (const [field, value] of Object.entries(row)) {
      if (value.includes('|')) {
        throw new Error(`${sectionKey} row ${rowIndex + 1}: ${field} contains a pipe character.`);
      }
    }
  }
}

function requireRowField(row: OutputRow, field: string, sectionKey: PremiumResultSectionKey, groupKey: string) {
  if (!row[field]) {
    throw new Error(`${sectionKey} ${groupKey}: required generated field ${field} is missing.`);
  }
}

function lookupKey(domainKey: string, patternKey: string, suffix: string): string {
  return `${domainKey}${lookupDelimiter}${patternKey}${lookupDelimiter}${suffix}`;
}

function setMappedField(
  outputRow: OutputRow,
  sourceRow: PremiumFieldMapRow,
  seenFields: Set<string>,
  groupKey: string,
) {
  if (seenFields.has(sourceRow.field_key)) {
    throw new Error(`${sourceRow.section_key} ${groupKey}: duplicate mapped field ${sourceRow.field_key}.`);
  }
  seenFields.add(sourceRow.field_key);
  outputRow[sourceRow.field_key] = sourceRow.final_text;
}

function sortRows(rows: readonly OutputRow[]): OutputRow[] {
  return [...rows].sort((left, right) =>
    [
      left.pattern_key.localeCompare(right.pattern_key),
      (left.score_shape ?? '').localeCompare(right.score_shape ?? ''),
      (left.priority ?? '').localeCompare(right.priority ?? ''),
      (left.strength_key ?? left.narrowing_key ?? left.application_key ?? '').localeCompare(
        right.strength_key ?? right.narrowing_key ?? right.application_key ?? '',
      ),
    ].find((value) => value !== 0) ?? 0,
  );
}

function buildScoreShapeRows(
  sectionKey: PremiumResultSectionKey,
  rows: readonly PremiumFieldMapRow[],
  domainKey: string,
): OutputRow[] {
  const groups = new Map<string, PremiumFieldMapRow[]>();

  for (const row of rows) {
    const groupKey = [row.section_key, row.pattern_key, row.score_shape].join('|');
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), row]);
  }

  return sortRows(
    [...groups.entries()].map(([groupKey, groupRows]) => {
      const first = groupRows[0];
      if (!first) {
        throw new Error(`${sectionKey} ${groupKey}: empty group.`);
      }

      const outputRow: OutputRow = {
        domain_key: domainKey,
        pattern_key: first.pattern_key,
        score_shape: first.score_shape,
        rank_1_signal_key: first.rank_1_signal_key,
        rank_2_signal_key: first.rank_2_signal_key,
        rank_3_signal_key: first.rank_3_signal_key,
        rank_4_signal_key: first.rank_4_signal_key,
        status: groupStatus(groupRows),
        lookup_key: lookupKey(domainKey, first.pattern_key, first.score_shape),
      };
      const seenFields = new Set<string>();

      for (const fieldMapRow of groupRows) {
        setMappedField(outputRow, fieldMapRow, seenFields, groupKey);
      }

      for (const field of fieldOrderBySection[sectionKey]) {
        requireRowField(outputRow, field, sectionKey, groupKey);
      }

      return outputRow;
    }),
  );
}

function listItemMarker(sectionKey: PremiumResultSectionKey, row: PremiumFieldMapRow): string {
  const expectedPrefix = {
    '11_Strengths': 'strength',
    '12_Narrowing': 'narrowing',
    '13_Application': 'application',
  }[sectionKey];
  const match = row.quality_notes.match(new RegExp(`^(${expectedPrefix}_[1-3])$`));

  if (!match?.[1]) {
    throw new Error(
      `${sectionKey} ${row.pattern_key}: quality_notes must be ${expectedPrefix}_1, ${expectedPrefix}_2, or ${expectedPrefix}_3 for list preview generation.`,
    );
  }

  return match[1];
}

function buildListRows(
  sectionKey: PremiumResultSectionKey,
  rows: readonly PremiumFieldMapRow[],
  domainKey: string,
): OutputRow[] {
  const groups = new Map<string, PremiumFieldMapRow[]>();

  for (const row of rows) {
    const marker = listItemMarker(sectionKey, row);
    const groupKey = [row.section_key, row.pattern_key, marker].join('|');
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), row]);
  }

  return sortRows(
    [...groups.entries()].map(([groupKey, groupRows]) => {
      const first = groupRows[0];
      if (!first) {
        throw new Error(`${sectionKey} ${groupKey}: empty group.`);
      }

      const marker = listItemMarker(sectionKey, first);
      const priority = marker.replace(/^[a-z]+_/, '');
      const outputRow: OutputRow = {
        domain_key: domainKey,
        pattern_key: first.pattern_key,
        priority,
        status: groupStatus(groupRows),
        lookup_key: lookupKey(domainKey, first.pattern_key, marker),
      };

      if (sectionKey === '11_Strengths') {
        outputRow.strength_key = marker;
      }
      if (sectionKey === '12_Narrowing') {
        outputRow.narrowing_key = marker;
      }
      if (sectionKey === '13_Application') {
        outputRow.application_key = marker;
      }

      const seenFields = new Set<string>();
      for (const fieldMapRow of groupRows) {
        setMappedField(outputRow, fieldMapRow, seenFields, groupKey);
      }

      for (const field of fieldOrderBySection[sectionKey]) {
        requireRowField(outputRow, field, sectionKey, groupKey);
      }

      return outputRow;
    }),
  );
}

export function generatePremiumResultPsvFromRows(
  fieldMapRows: readonly PremiumFieldMapRow[],
  options: Pick<GeneratePremiumResultPsvOptions, 'includeReview' | 'outDir' | 'domainKey'>,
): GeneratedPremiumResultPsvResult {
  const includeReview = options.includeReview ?? false;
  const domainKey = options.domainKey ?? defaultDomainKey;
  const rowsToEmit = fieldMapRows.filter((row) => shouldEmit(row, includeReview));
  const files: GeneratedPremiumResultPsvFile[] = [];

  for (const sectionKey of premiumResultSections) {
    const sectionRows = rowsToEmit.filter((row) => row.section_key === sectionKey);
    const outputRows = scoreShapeSections.has(sectionKey)
      ? buildScoreShapeRows(sectionKey, sectionRows, domainKey)
      : listSections.has(sectionKey)
        ? buildListRows(sectionKey, sectionRows, domainKey)
        : [];
    assertNoPipeValues(outputRows, sectionKey);

    const content = `${serializeRows(sectionKey, outputRows)}\n`;
    files.push({
      sectionKey,
      filePath: path.join(options.outDir, outputFileNames[sectionKey]),
      rowCount: outputRows.length,
      content,
    });
  }

  return {
    files,
    rowsRead: fieldMapRows.length,
    rowsEmitted: files.reduce((total, file) => total + file.rowCount, 0),
  };
}

export async function generatePremiumResultPsv(
  options: GeneratePremiumResultPsvOptions,
): Promise<GeneratedPremiumResultPsvResult> {
  if (options.inputs.length === 0) {
    throw new Error('At least one --input file is required.');
  }

  const fieldMapRows = await readFieldMapRows(options.inputs);
  const result = generatePremiumResultPsvFromRows(fieldMapRows, options);

  await mkdir(options.outDir, { recursive: true });
  await Promise.all(result.files.map((file) => writeFile(file.filePath, file.content, 'utf8')));

  return result;
}

function parseArgs(argv: readonly string[]): GeneratePremiumResultPsvOptions {
  const inputs: string[] = [];
  let outDir = '';
  let includeReview = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];

    if (arg === '--input') {
      if (!value) {
        throw new Error('Missing value after --input.');
      }
      inputs.push(value);
      index += 1;
      continue;
    }

    if (arg === '--out') {
      if (!value) {
        throw new Error('Missing value after --out.');
      }
      outDir = value;
      index += 1;
      continue;
    }

    if (arg === '--include-review') {
      includeReview = true;
      continue;
    }

    throw new Error(`Unsupported argument: ${arg}`);
  }

  if (!outDir) {
    throw new Error('Missing required --out directory.');
  }

  return { inputs, outDir, includeReview };
}

function printResult(result: GeneratedPremiumResultPsvResult) {
  console.log(
    `Premium result PSV generation: ${result.rowsEmitted} row(s) emitted from ${result.rowsRead} field-map row(s).`,
  );
  for (const file of result.files) {
    console.log(`- ${file.sectionKey}: ${file.rowCount} row(s) -> ${file.filePath}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await generatePremiumResultPsv(options);
  printResult(result);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';

if (import.meta.url === invokedPath) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
