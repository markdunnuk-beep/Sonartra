import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

type ParsedRows = Record<string, string>[];

export type RenderPremiumResultPreviewOptions = {
  readonly generatedDir: string;
  readonly patternKey: string;
  readonly scoreShape: string;
  readonly outPath?: string;
};

type MutableRenderPremiumResultPreviewOptions = {
  generatedDir?: string;
  patternKey?: string;
  scoreShape?: string;
  outPath?: string;
};

export type RenderPremiumResultPreviewResult = {
  readonly markdown: string;
  readonly sectionRowCounts: Record<string, number>;
  readonly filesUsed: readonly string[];
};

const sectionFiles = {
  orientation: '06-orientation-leadership-approach.preview.psv',
  recognition: '07-recognition-leadership-approach.preview.psv',
  mechanics: '09-pattern-mechanics-leadership-approach.preview.psv',
  synthesis: '10-pattern-synthesis-leadership-approach.preview.psv',
  strengths: '11-strengths-leadership-approach.preview.psv',
  narrowing: '12-narrowing-leadership-approach.preview.psv',
  application: '13-application-leadership-approach.preview.psv',
  closing: '14-closing-integration-leadership-approach.preview.psv',
} as const;

const authoringOnlyFields = new Set([
  'source_anchor',
  'source_excerpt',
  'transformation_rule',
  'drift_check',
  'quality_notes',
]);

const prohibitedReaderTerms = [
  'source_anchor',
  'source_excerpt',
  'transformation_rule',
  'drift_check',
  'quality_notes',
  'status',
  'psv',
  'workbook',
  'schema',
  'runtime',
  'payload',
  'canonical_result_payload',
];

const rankLabels: Record<string, string> = {
  process: 'Process',
  results: 'Results',
  people: 'People',
  vision: 'Vision',
};

const normalizedScoreExample: Record<string, number> = {
  process: 42,
  results: 33,
  people: 17,
  vision: 8,
};

function splitPsvLine(line: string): readonly string[] {
  return line.split('|');
}

function normalizeSource(source: string): readonly string[] {
  const normalized = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  return normalized.length > 0 ? normalized.split('\n') : [];
}

function parsePsv(source: string, filePath: string): ParsedRows {
  const lines = normalizeSource(source);
  if (lines.length < 1) {
    throw new Error(`${filePath}: missing PSV header.`);
  }

  const header = splitPsvLine(lines[0] ?? '');
  for (const field of header) {
    if (authoringOnlyFields.has(field)) {
      throw new Error(`${filePath}: generated PSV includes authoring-only field ${field}.`);
    }
  }

  return lines.slice(1).filter((line) => line.trim().length > 0).map((line, index) => {
    const columns = splitPsvLine(line);
    if (columns.length !== header.length) {
      throw new Error(`${filePath}:${index + 2}: malformed PSV row; expected ${header.length} columns but found ${columns.length}.`);
    }
    return Object.fromEntries(header.map((field, fieldIndex) => [field, columns[fieldIndex] ?? '']));
  });
}

async function loadSectionRows(generatedDir: string) {
  const existingFiles = new Set(await readdir(generatedDir));
  const loaded: Record<keyof typeof sectionFiles, ParsedRows> = {
    orientation: [],
    recognition: [],
    mechanics: [],
    synthesis: [],
    strengths: [],
    narrowing: [],
    application: [],
    closing: [],
  };
  const filesUsed: string[] = [];

  for (const [section, fileName] of Object.entries(sectionFiles) as Array<[keyof typeof sectionFiles, string]>) {
    if (!existingFiles.has(fileName)) {
      throw new Error(`Missing generated preview file: ${fileName}.`);
    }

    const filePath = path.join(generatedDir, fileName);
    loaded[section] = parsePsv(await readFile(filePath, 'utf8'), filePath);
    filesUsed.push(filePath);
  }

  return { loaded, filesUsed };
}

function requireSingleScoreShapeRow(
  rows: ParsedRows,
  sectionName: string,
  patternKey: string,
  scoreShape: string,
): Record<string, string> {
  const matches = rows.filter((row) => row.pattern_key === patternKey && row.score_shape === scoreShape);
  if (matches.length !== 1) {
    throw new Error(`${sectionName}: expected one row for ${patternKey} + ${scoreShape}, found ${matches.length}.`);
  }
  return matches[0] as Record<string, string>;
}

function requireListRows(rows: ParsedRows, sectionName: string, patternKey: string): ParsedRows {
  const matches = rows
    .filter((row) => row.pattern_key === patternKey)
    .sort((left, right) => Number(left.priority) - Number(right.priority));
  if (matches.length === 0) {
    throw new Error(`${sectionName}: expected at least one list row for ${patternKey}.`);
  }
  return matches;
}

function rankOrder(row: Record<string, string>): string {
  return [
    row.rank_1_signal_key,
    row.rank_2_signal_key,
    row.rank_3_signal_key,
    row.rank_4_signal_key,
  ].map((signal) => rankLabels[signal] ?? signal).join(' > ');
}

function scoreSummary(row: Record<string, string>): string {
  return [
    row.rank_1_signal_key,
    row.rank_2_signal_key,
    row.rank_3_signal_key,
    row.rank_4_signal_key,
  ].map((signal) => `${rankLabels[signal] ?? signal} ${normalizedScoreExample[signal] ?? 0}%`).join(', ');
}

function bulletList(rows: ParsedRows, titleField: string, textField: string): string[] {
  return rows.flatMap((row) => [
    `- **${row[titleField]}**`,
    `  ${row[textField]}`,
  ]);
}

function readerContent(markdown: string): string {
  const start = markdown.indexOf('## Your Leadership Result');
  const end = markdown.indexOf('## Admin/debug appendix');
  return start >= 0 && end >= 0 ? markdown.slice(start, end) : markdown;
}

function assertReaderSafe(markdown: string, patternKey: string) {
  const reader = readerContent(markdown).toLowerCase();
  for (const term of prohibitedReaderTerms) {
    if (reader.includes(term.toLowerCase())) {
      throw new Error(`Reader-facing preview leaked prohibited term: ${term}.`);
    }
  }

  if (reader.includes(patternKey.toLowerCase())) {
    throw new Error('Reader-facing preview leaked raw pattern_key.');
  }
}

function renderMarkdown(args: {
  readonly patternKey: string;
  readonly scoreShape: string;
  readonly filesUsed: readonly string[];
  readonly sectionRowCounts: Record<string, number>;
  readonly orientation: Record<string, string>;
  readonly recognition: Record<string, string>;
  readonly mechanics: Record<string, string>;
  readonly synthesis: Record<string, string>;
  readonly strengths: ParsedRows;
  readonly narrowing: ParsedRows;
  readonly application: ParsedRows;
  readonly closing: Record<string, string>;
}) {
  const rank = rankOrder(args.orientation);
  const scores = scoreSummary(args.orientation);

  return [
    '# Leadership Approach Authoring Preview',
    '',
    '```yaml',
    'assessment: Leadership Approach',
    `pattern_key: ${args.patternKey}`,
    `score_shape: ${args.scoreShape}`,
    `rank_order: ${rank}`,
    `normalized_scores: ${scores}`,
    'preview_status: authoring preview only',
    '```',
    '',
    '## Your Leadership Result',
    '',
    `# ${args.orientation.orientation_title}`,
    '',
    args.orientation.orientation_summary,
    '',
    '## Pattern At A Glance',
    '',
    args.orientation.score_shape_summary,
    '',
    `- **First route:** ${args.orientation.rank_1_phrase}`,
    `- **Close support:** ${args.orientation.rank_2_phrase}`,
    `- **Range to bring in:** ${args.orientation.rank_3_phrase}`,
    `- **Further extension:** ${args.orientation.rank_4_phrase}`,
    '',
    '## Recognition',
    '',
    `### ${args.recognition.headline}`,
    '',
    args.recognition.recognition_statement,
    '',
    args.recognition.recognition_expansion,
    '',
    '## Pattern Mechanics',
    '',
    `### ${args.mechanics.mechanics_title}`,
    '',
    args.mechanics.core_mechanism,
    '',
    args.mechanics.why_it_shows_up,
    '',
    args.mechanics.what_it_protects,
    '',
    '## Pattern Synthesis',
    '',
    `### ${args.synthesis.synthesis_title}`,
    '',
    `**Gift:** ${args.synthesis.gift}`,
    '',
    `**Trap:** ${args.synthesis.trap}`,
    '',
    `**Takeaway:** ${args.synthesis.takeaway}`,
    '',
    args.synthesis.synthesis_text,
    '',
    '## Strengths',
    '',
    ...bulletList(args.strengths, 'strength_title', 'strength_text'),
    '',
    '## Narrowing',
    '',
    ...bulletList(args.narrowing, 'narrowing_title', 'narrowing_text'),
    '',
    '## Application',
    '',
    ...bulletList(args.application, 'application_title', 'application_text'),
    '',
    '## Closing Integration',
    '',
    args.closing.closing_summary,
    '',
    `**Core gift:** ${args.closing.core_gift}`,
    '',
    `**Core trap:** ${args.closing.core_trap}`,
    '',
    `**Development edge:** ${args.closing.development_edge}`,
    '',
    `_${args.closing.memorable_line}_`,
    '',
    '## Admin/debug appendix',
    '',
    '### Lookup evidence',
    '',
    '- Generated preview files used:',
    ...args.filesUsed.map((file) => `  - ${file}`),
    `- pattern_key: ${args.patternKey}`,
    `- score_shape: ${args.scoreShape}`,
    `- rank_signal_keys: ${args.orientation.rank_1_signal_key}, ${args.orientation.rank_2_signal_key}, ${args.orientation.rank_3_signal_key}, ${args.orientation.rank_4_signal_key}`,
    '- row_counts_loaded_per_section:',
    ...Object.entries(args.sectionRowCounts).map(([section, count]) => `  - ${section}: ${count}`),
    '- accepted_warnings:',
    '  - 11/12/13 item identity is currently preview-only through generated preview rows.',
    '',
  ].join('\n');
}

export async function renderPremiumResultPreview(
  options: RenderPremiumResultPreviewOptions,
): Promise<RenderPremiumResultPreviewResult> {
  const { loaded, filesUsed } = await loadSectionRows(options.generatedDir);
  const orientation = requireSingleScoreShapeRow(loaded.orientation, '06_Orientation', options.patternKey, options.scoreShape);
  const recognition = requireSingleScoreShapeRow(loaded.recognition, '07_Recognition', options.patternKey, options.scoreShape);
  const mechanics = requireSingleScoreShapeRow(loaded.mechanics, '09_Pattern_Mechanics', options.patternKey, options.scoreShape);
  const synthesis = requireSingleScoreShapeRow(loaded.synthesis, '10_Pattern_Synthesis', options.patternKey, options.scoreShape);
  const closing = requireSingleScoreShapeRow(loaded.closing, '14_Closing_Integration', options.patternKey, options.scoreShape);
  const strengths = requireListRows(loaded.strengths, '11_Strengths', options.patternKey);
  const narrowing = requireListRows(loaded.narrowing, '12_Narrowing', options.patternKey);
  const application = requireListRows(loaded.application, '13_Application', options.patternKey);
  const sectionRowCounts = {
    '06_Orientation': loaded.orientation.length,
    '07_Recognition': loaded.recognition.length,
    '09_Pattern_Mechanics': loaded.mechanics.length,
    '10_Pattern_Synthesis': loaded.synthesis.length,
    '11_Strengths': loaded.strengths.length,
    '12_Narrowing': loaded.narrowing.length,
    '13_Application': loaded.application.length,
    '14_Closing_Integration': loaded.closing.length,
  };
  const markdown = renderMarkdown({
    patternKey: options.patternKey,
    scoreShape: options.scoreShape,
    filesUsed,
    sectionRowCounts,
    orientation,
    recognition,
    mechanics,
    synthesis,
    strengths,
    narrowing,
    application,
    closing,
  });

  assertReaderSafe(markdown, options.patternKey);

  if (options.outPath) {
    await mkdir(path.dirname(options.outPath), { recursive: true });
    await writeFile(options.outPath, markdown, 'utf8');
  }

  return { markdown, sectionRowCounts, filesUsed };
}

function parseArgs(argv: readonly string[]): RenderPremiumResultPreviewOptions {
  const options: MutableRenderPremiumResultPreviewOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];

    if (arg === '--generated-dir') {
      options.generatedDir = value;
      index += 1;
      continue;
    }
    if (arg === '--pattern-key') {
      options.patternKey = value;
      index += 1;
      continue;
    }
    if (arg === '--score-shape') {
      options.scoreShape = value;
      index += 1;
      continue;
    }
    if (arg === '--out') {
      options.outPath = value;
      index += 1;
      continue;
    }
    throw new Error(`Unsupported argument: ${arg}`);
  }

  if (!options.generatedDir || !options.patternKey || !options.scoreShape) {
    throw new Error('Missing required --generated-dir, --pattern-key, or --score-shape argument.');
  }

  return options as RenderPremiumResultPreviewOptions;
}

async function main() {
  const result = await renderPremiumResultPreview(parseArgs(process.argv.slice(2)));
  console.log(`Premium result preview rendered (${Object.keys(result.sectionRowCounts).length} sections).`);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';

if (import.meta.url === invokedPath) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
