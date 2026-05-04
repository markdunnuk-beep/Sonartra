import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  flowStateAuthoringConstants,
  readerFirstAllowedScoreShapes,
  readerFirstAllowedSignalKeys,
  readerFirstSectionKeys,
  readerFirstSectionPolicies,
  type ReaderFirstSectionKey,
} from '@/content/authoring/reader-first-schema-manifest';
import {
  parseReaderFirstImport,
  validateReaderFirstImportText,
} from '@/scripts/authoring/validate-reader-first-import';

type ReaderFirstRow = Record<string, string>;
type DraftFixtureArgs = {
  readonly input: string;
  readonly output: string;
  readonly pattern: string;
  readonly shape: string;
  readonly skipValidation: boolean;
  readonly dryRun: boolean;
};

type DraftFixtureSelection = Record<ReaderFirstSectionKey, readonly ReaderFirstRow[]>;

export type DraftFixtureExportSummary = {
  readonly pass: boolean;
  readonly patternKey: string;
  readonly scoreShape: string;
  readonly rowCounts: Record<ReaderFirstSectionKey, number>;
  readonly errors: readonly string[];
  readonly output?: string;
};

const repoRoot = process.cwd();
const sectionRowCounts = {
  '05_Context': 1,
  '06_Orientation': 1,
  '07_Recognition': 1,
  '08_Signal_Roles': 4,
  '09_Pattern_Mechanics': 1,
  '10_Pattern_Synthesis': 1,
  '11_Strengths': 3,
  '12_Narrowing': 3,
  '13_Application': 3,
  '14_Closing_Integration': 1,
} as const satisfies Record<ReaderFirstSectionKey, number>;

function parseArgs(argv: readonly string[]): DraftFixtureArgs {
  const parsed: {
    input?: string;
    output?: string;
    pattern?: string;
    shape?: string;
    skipValidation: boolean;
    dryRun: boolean;
  } = {
    dryRun: false,
    skipValidation: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];

    if (arg === '--input') {
      parsed.input = value;
      index += 1;
      continue;
    }

    if (arg === '--output') {
      parsed.output = value;
      index += 1;
      continue;
    }

    if (arg === '--pattern') {
      parsed.pattern = value;
      index += 1;
      continue;
    }

    if (arg === '--shape') {
      parsed.shape = value;
      index += 1;
      continue;
    }

    if (arg === '--skip-validation') {
      parsed.skipValidation = true;
      continue;
    }

    if (arg === '--dry-run') {
      parsed.dryRun = true;
    }
  }

  const missing = ['input', 'output', 'pattern', 'shape'].filter(
    (key) => !parsed[key as keyof DraftFixtureArgs],
  );

  if (missing.length > 0) {
    throw new Error(`Missing required argument(s): ${missing.map((key) => `--${key}`).join(', ')}`);
  }

  return parsed as DraftFixtureArgs;
}

function assertOutputPathInsideRepo(outputPath: string) {
  const resolved = path.resolve(repoRoot, outputPath);
  const relative = path.relative(repoRoot, resolved);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Output path must stay inside the repository: ${outputPath}`);
  }
}

function parsePatternSignals(patternKey: string): string[] {
  const pieces = patternKey.split('_');
  const signals: string[] = [];
  let cursor = 0;

  while (cursor < pieces.length) {
    const single = pieces[cursor];
    const pair = `${pieces[cursor]}_${pieces[cursor + 1] ?? ''}`;

    if (readerFirstAllowedSignalKeys.includes(pair as never)) {
      signals.push(pair);
      cursor += 2;
      continue;
    }

    signals.push(single);
    cursor += 1;
  }

  return signals;
}

function validatePatternAndShape(patternKey: string, scoreShape: string, errors: string[]) {
  const signals = parsePatternSignals(patternKey);

  if (
    signals.length !== flowStateAuthoringConstants.signals.length ||
    new Set(signals).size !== flowStateAuthoringConstants.signals.length ||
    signals.some((signal) => !readerFirstAllowedSignalKeys.includes(signal as never))
  ) {
    errors.push(`Selected pattern_key is invalid: ${patternKey}`);
  }

  if (!readerFirstAllowedScoreShapes.includes(scoreShape as never)) {
    errors.push(`Selected score_shape is invalid: ${scoreShape}`);
  }
}

function getRows(
  parsed: ReturnType<typeof parseReaderFirstImport>['parsed'],
  sectionKey: ReaderFirstSectionKey,
): readonly ReaderFirstRow[] {
  return parsed[sectionKey]?.rows ?? [];
}

function selectOne(
  rows: readonly ReaderFirstRow[],
  sectionKey: ReaderFirstSectionKey,
  predicate: (row: ReaderFirstRow) => boolean,
  errors: string[],
): ReaderFirstRow[] {
  const selected = rows.filter(predicate);

  if (selected.length === 0) {
    errors.push(`${sectionKey}: selected row is missing.`);
  }

  if (selected.length > 1) {
    errors.push(`${sectionKey}: selected row is duplicated (${selected.length} rows).`);
  }

  return selected;
}

function selectPolicyRows(
  parsed: ReturnType<typeof parseReaderFirstImport>['parsed'],
  sectionKey: ReaderFirstSectionKey,
  patternKey: string,
  scoreShape: string,
  errors: string[],
): ReaderFirstRow[] {
  const rows = getRows(parsed, sectionKey);
  const policy = readerFirstSectionPolicies[sectionKey].coverage;

  if (policy === 'score_shape_specific') {
    return selectOne(
      rows,
      sectionKey,
      (row) => row.pattern_key === patternKey && row.score_shape === scoreShape,
      errors,
    );
  }

  return selectOne(rows, sectionKey, (row) => row.pattern_key === patternKey, errors);
}

function ensureRankOrder(row: ReaderFirstRow, sectionKey: ReaderFirstSectionKey, patternKey: string, errors: string[]) {
  const rankedSignals = [
    row.rank_1_signal_key,
    row.rank_2_signal_key,
    row.rank_3_signal_key,
    row.rank_4_signal_key,
  ];

  if (rankedSignals.every(Boolean) && rankedSignals.join('_') !== patternKey) {
    errors.push(`${sectionKey}: selected row rank fields do not match ${patternKey}.`);
  }
}

function selectDraftFixtureRows(
  parsed: ReturnType<typeof parseReaderFirstImport>['parsed'],
  patternKey: string,
  scoreShape: string,
): { selection: DraftFixtureSelection; errors: string[] } {
  const errors: string[] = [];
  validatePatternAndShape(patternKey, scoreShape, errors);

  const signals = parsePatternSignals(patternKey);
  const selection: DraftFixtureSelection = {
    '05_Context': selectOne(
      getRows(parsed, '05_Context'),
      '05_Context',
      (row) => row.domain_key === flowStateAuthoringConstants.domainKey,
      errors,
    ),
    '06_Orientation': selectPolicyRows(parsed, '06_Orientation', patternKey, scoreShape, errors),
    '07_Recognition': selectPolicyRows(parsed, '07_Recognition', patternKey, scoreShape, errors),
    '08_Signal_Roles': signals.flatMap((signal, index) =>
      selectOne(
        getRows(parsed, '08_Signal_Roles'),
        '08_Signal_Roles',
        (row) => row.signal_key === signal && row.rank_position === String(index + 1),
        errors,
      ),
    ),
    '09_Pattern_Mechanics': selectPolicyRows(parsed, '09_Pattern_Mechanics', patternKey, scoreShape, errors),
    '10_Pattern_Synthesis': selectPolicyRows(parsed, '10_Pattern_Synthesis', patternKey, scoreShape, errors),
    '11_Strengths': getRows(parsed, '11_Strengths')
      .filter((row) => row.pattern_key === patternKey)
      .sort((left, right) => Number(left.priority) - Number(right.priority)),
    '12_Narrowing': getRows(parsed, '12_Narrowing')
      .filter((row) => row.pattern_key === patternKey)
      .sort((left, right) => Number(left.priority) - Number(right.priority)),
    '13_Application': getRows(parsed, '13_Application')
      .filter((row) => row.pattern_key === patternKey)
      .sort((left, right) => Number(left.priority) - Number(right.priority)),
    '14_Closing_Integration': selectPolicyRows(parsed, '14_Closing_Integration', patternKey, scoreShape, errors),
  };

  for (const sectionKey of readerFirstSectionKeys) {
    const expectedCount = sectionRowCounts[sectionKey];
    const actualCount = selection[sectionKey].length;

    if (actualCount !== expectedCount) {
      errors.push(`${sectionKey}: expected ${expectedCount} selected rows but found ${actualCount}.`);
    }
  }

  for (const sectionKey of ['06_Orientation', '07_Recognition', '09_Pattern_Mechanics', '10_Pattern_Synthesis', '14_Closing_Integration'] as const) {
    const [row] = selection[sectionKey];
    if (row) {
      ensureRankOrder(row, sectionKey, patternKey, errors);
    }
  }

  return { selection, errors };
}

function stripImportOnlyFields(row: ReaderFirstRow): ReaderFirstRow {
  const { lookup_key: _lookupKey, ...fixtureRow } = row;
  return fixtureRow;
}

function toFixtureObject(selection: DraftFixtureSelection): Record<ReaderFirstSectionKey, readonly ReaderFirstRow[]> {
  return {
    '05_Context': selection['05_Context'].map(stripImportOnlyFields),
    '06_Orientation': selection['06_Orientation'].map(stripImportOnlyFields),
    '07_Recognition': selection['07_Recognition'].map(stripImportOnlyFields),
    '08_Signal_Roles': selection['08_Signal_Roles'].map(stripImportOnlyFields),
    '09_Pattern_Mechanics': selection['09_Pattern_Mechanics'].map(stripImportOnlyFields),
    '10_Pattern_Synthesis': selection['10_Pattern_Synthesis'].map(stripImportOnlyFields),
    '11_Strengths': selection['11_Strengths'].map(stripImportOnlyFields),
    '12_Narrowing': selection['12_Narrowing'].map(stripImportOnlyFields),
    '13_Application': selection['13_Application'].map(stripImportOnlyFields),
    '14_Closing_Integration': selection['14_Closing_Integration'].map(stripImportOnlyFields),
  };
}

function serializeTsValue(value: unknown): string {
  return JSON.stringify(value, null, 2)
    .replace(/^/gm, '  ')
    .trimStart();
}

export function createDraftResultFixtureSource(
  selection: DraftFixtureSelection,
  patternKey: string,
): string {
  const fixtureObject = toFixtureObject(selection);
  const signalRankOrder = parsePatternSignals(patternKey);

  return `export const rankedPatternSectionOrder = ${serializeTsValue(readerFirstSectionKeys)} as const;

export type RankedPatternSectionKey = (typeof rankedPatternSectionOrder)[number];

export const rankedPatternExample = ${serializeTsValue(fixtureObject)} as const;

const requiredRowCounts = ${serializeTsValue(sectionRowCounts)} as const satisfies Record<RankedPatternSectionKey, number>;

const expectedPatternKey = ${JSON.stringify(patternKey)};
const expectedSignalRankOrder = ${serializeTsValue(signalRankOrder)} as const;

type RankedPatternExample = typeof rankedPatternExample;
type PatternSpecificRow = { pattern_key: string };
type RankedPatternRow = PatternSpecificRow & {
  rank_1_signal_key: string;
  rank_2_signal_key: string;
  rank_3_signal_key: string;
  rank_4_signal_key: string;
};

function fail(message: string): never {
  throw new Error(\`Invalid ranked pattern fixture: \${message}\`);
}

function getPatternRows(example: RankedPatternExample): PatternSpecificRow[] {
  const patternRows: PatternSpecificRow[] = [];

  for (const sectionKey of rankedPatternSectionOrder) {
    for (const row of example[sectionKey]) {
      if ('pattern_key' in row) {
        patternRows.push(row);
      }
    }
  }

  return patternRows;
}

function getRankedRows(example: RankedPatternExample): RankedPatternRow[] {
  return getPatternRows(example).filter(
    (row): row is RankedPatternRow =>
      'rank_1_signal_key' in row &&
      'rank_2_signal_key' in row &&
      'rank_3_signal_key' in row &&
      'rank_4_signal_key' in row,
  );
}

export function validateRankedPatternExample(example: RankedPatternExample = rankedPatternExample): void {
  for (const sectionKey of rankedPatternSectionOrder) {
    if (!(sectionKey in example)) {
      fail(\`missing section \${sectionKey}\`);
    }

    const expectedCount = requiredRowCounts[sectionKey];
    const actualCount = example[sectionKey].length;

    if (actualCount !== expectedCount) {
      fail(\`\${sectionKey} row count must be \${expectedCount}, received \${actualCount}\`);
    }
  }

  for (const row of getPatternRows(example)) {
    if (row.pattern_key !== expectedPatternKey) {
      fail(\`pattern_key must be \${expectedPatternKey}, received \${row.pattern_key}\`);
    }
  }

  for (const row of getRankedRows(example)) {
    const actualSignalRankOrder = [
      row.rank_1_signal_key,
      row.rank_2_signal_key,
      row.rank_3_signal_key,
      row.rank_4_signal_key,
    ];

    if (actualSignalRankOrder.join('|') !== expectedSignalRankOrder.join('|')) {
      fail(\`signal rank order must be \${expectedSignalRankOrder.join(', ')}\`);
    }
  }
}
`;
}

export async function exportDraftResultFixture(args: DraftFixtureArgs): Promise<DraftFixtureExportSummary> {
  assertOutputPathInsideRepo(args.output);

  const source = await readFile(args.input, 'utf8');
  const errors: string[] = [];

  if (!args.skipValidation) {
    const validation = validateReaderFirstImportText(source);
    if (!validation.pass) {
      errors.push(...validation.errors.map((error) => `Input validation failed: ${error}`));
    }
  }

  const parsedResult = parseReaderFirstImport(source, { type: 'full' });
  errors.push(...parsedResult.errors);

  const { selection, errors: selectionErrors } = selectDraftFixtureRows(
    parsedResult.parsed,
    args.pattern,
    args.shape,
  );
  errors.push(...selectionErrors);

  const rowCounts = Object.fromEntries(
    readerFirstSectionKeys.map((sectionKey) => [sectionKey, selection[sectionKey].length]),
  ) as Record<ReaderFirstSectionKey, number>;

  if (errors.length > 0) {
    return {
      pass: false,
      patternKey: args.pattern,
      scoreShape: args.shape,
      rowCounts,
      errors,
    };
  }

  const output = createDraftResultFixtureSource(selection, args.pattern);

  if (!args.dryRun) {
    const outputPath = path.resolve(repoRoot, args.output);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, output, 'utf8');
  }

  return {
    pass: true,
    patternKey: args.pattern,
    scoreShape: args.shape,
    rowCounts,
    errors: [],
    output,
  };
}

function printSummary(summary: DraftFixtureExportSummary, dryRun: boolean) {
  console.log(`pattern_key: ${summary.patternKey}`);
  console.log(`score_shape: ${summary.scoreShape}`);
  console.log('Section | Selected rows');
  console.log('--- | ---:');

  for (const sectionKey of readerFirstSectionKeys) {
    console.log(`${sectionKey} | ${summary.rowCounts[sectionKey]}`);
  }

  console.log(`mode: ${dryRun ? 'dry-run' : 'write'}`);
  console.log(`validation: ${summary.pass ? 'PASS' : 'FAIL'}`);

  if (summary.errors.length > 0) {
    console.log('Errors:');
    for (const error of summary.errors) {
      console.log(`- ${error}`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const summary = await exportDraftResultFixture(args);

  printSummary(summary, args.dryRun);

  if (!summary.pass) {
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
