import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const REPORT_FIRST_CONTRACT = 'report_first_canonical_payload_v1';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

type TableColumn = {
  readonly key: string;
  readonly label: string;
  readonly align?: 'left' | 'right' | 'center';
};

type TableCell = {
  readonly text: string;
};

export type ReportFirstTemplateBlock =
  | { readonly type: 'paragraph'; readonly text: string }
  | { readonly type: 'pull_quote'; readonly text: string }
  | { readonly type: 'table'; readonly columns: readonly TableColumn[]; readonly rows: readonly (readonly TableCell[])[] }
  | { readonly type: 'ordered_list'; readonly items: readonly string[] }
  | { readonly type: 'unordered_list'; readonly items: readonly string[] }
  | { readonly type: 'prompt_group'; readonly title?: string; readonly prompts: readonly string[] }
  | { readonly type: 'callout'; readonly title?: string; readonly text: string; readonly tone?: 'neutral' | 'evidence' }
  | { readonly type: 'signal_stack'; readonly signals: readonly ReportFirstTemplateSignal[] }
  | { readonly type: 'strength_card'; readonly title: string; readonly text: string; readonly linkedSignals?: readonly string[] }
  | {
      readonly type: 'tightening_card';
      readonly title: string;
      readonly text: string;
      readonly rangeToAdd: string;
      readonly whyItMatters: string;
    }
  | {
      readonly type: 'development_action';
      readonly title: string;
      readonly text: string;
      readonly useCases: readonly string[];
      readonly whyItMatters: string;
    };

type ReportFirstPromptGroupBlock = Extract<ReportFirstTemplateBlock, { readonly type: 'prompt_group' }>;

export type ReportFirstTemplateSignal = {
  readonly rank: number;
  readonly signalKey: string;
  readonly signalLabel: string;
  readonly roleLabel?: string;
  readonly roleSummary?: string;
};

export type ReportFirstTemplateChapter = {
  readonly chapterKey: string;
  readonly chapterNumber: number;
  readonly title: string;
  readonly railLabel: string;
  readonly blocks: readonly ReportFirstTemplateBlock[];
  readonly readerFacing: true;
};

export type ReportFirstTemplateJson = {
  readonly metadata: {
    readonly payloadVersion: 1;
    readonly contractName: typeof REPORT_FIRST_CONTRACT;
    readonly mode: 'single_domain_ranked_pattern';
    readonly reportModel: 'report_first_canonical';
    readonly templateVersion: 1;
  };
  readonly reportKey: string;
  readonly patternKey: string;
  readonly domainKey: string;
  readonly report: {
    readonly reportKey: string;
    readonly patternKey: string;
    readonly reportTitle: string;
    readonly hero: {
      readonly title: string;
      readonly resultStatement: string;
    };
    readonly opening: readonly ReportFirstTemplateBlock[];
    readonly patternSummary: {
      readonly title: string;
      readonly blocks: readonly ReportFirstTemplateBlock[];
    };
    readonly keyInsight: ReportFirstTemplateBlock;
    readonly chapters: readonly ReportFirstTemplateChapter[];
    readonly closing: {
      readonly synthesis: readonly ReportFirstTemplateBlock[];
      readonly finalLine: string;
    };
    readonly pdf: {
      readonly title: string;
      readonly body: string;
    };
    readonly readerNavigation: readonly {
      readonly id: string;
      readonly label: string;
      readonly targetChapterKey?: string;
    }[];
  };
  readonly evidenceTemplate: {
    readonly title: string;
    readonly blocks: readonly ReportFirstTemplateBlock[];
  };
  readonly diagnostics: {
    readonly generatedFrom: 'compiled_report_first_template';
    readonly adminNotesExcluded: boolean;
    readonly editorialQaNotesDetected: boolean;
    readonly warningList: readonly string[];
  };
};

export type CompiledReportFirstTemplate = {
  readonly report_key: string;
  readonly pattern_key: string;
  readonly domain_key: string;
  readonly report_contract: typeof REPORT_FIRST_CONTRACT;
  readonly content_hash: string;
  readonly report_template_json: ReportFirstTemplateJson;
};

type Section = {
  readonly heading: string;
  readonly content: string;
};

type CompileOptions = {
  readonly inputPath: string;
  readonly domainKey?: string;
};

type CliOptions = CompileOptions & {
  readonly outPath?: string;
};

const fixedHeadings = new Set([
  'Editorial introduction',
  'Pattern at a glance',
  'Evidence behind your result',
  'Key insight',
  'Closing synthesis',
  'Final line',
  'PDF export CTA',
]);

const requiredChapterKeysByNumber = new Map<number, string>([
  [1, 'value_creation'],
  [2, 'others_experience'],
  [3, 'decision_behaviour'],
  [4, 'communication_behaviour'],
  [5, 'pressure_behaviour'],
  [6, 'strengths'],
  [7, 'tightening'],
  [8, 'rank_3_expansion'],
  [9, 'rank_4_expansion'],
  [10, 'development_focus'],
]);

const railLabelsByChapterKey: Record<string, string> = {
  value_creation: 'Value',
  others_experience: 'Others',
  decision_behaviour: 'Decisions',
  communication_behaviour: 'Communication',
  pressure_behaviour: 'Pressure',
  strengths: 'Strengths',
  tightening: 'Tightening',
  rank_3_expansion: 'Range',
  rank_4_expansion: 'Range',
  development_focus: 'Development',
};

function normalizeLineEndings(source: string): string {
  return source.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function stripEditorialQaNotes(source: string): { readerSource: string; qaNotes: string } {
  const normalized = normalizeLineEndings(source);
  const match = /^# Editorial QA Notes\s*$/m.exec(normalized);

  if (!match) {
    return { readerSource: normalized.trim(), qaNotes: '' };
  }

  return {
    readerSource: normalized.slice(0, match.index).trim(),
    qaNotes: normalized.slice(match.index).trim(),
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/\u2014/g, ' ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function signalKeyFromLabel(label: string): string {
  return slugify(label.split(/\s+\u2014\s+/)[0] ?? label);
}

function assertPatternKey(patternKey: string): void {
  if (!/^[a-z0-9]+_[a-z0-9]+_[a-z0-9]+_[a-z0-9]+$/.test(patternKey)) {
    throw new Error(
      `Invalid report-first pattern_key "${patternKey}". Expected four lowercase ranked signal keys separated by underscores.`,
    );
  }
}

function reportKeyFromPath(inputPath: string): string {
  const key = path.basename(inputPath, path.extname(inputPath));
  assertPatternKey(key);
  return key;
}

function isHeading(line: string): boolean {
  const trimmed = line.trim();
  return fixedHeadings.has(trimmed) || /^Chapter \d+ \u2014 .+/.test(trimmed);
}

function parseSections(readerSource: string): Map<string, Section> {
  const sections = new Map<string, Section>();
  let currentHeading = '';
  let currentLines: string[] = [];

  function flushCurrent() {
    if (!currentHeading) {
      return;
    }
    sections.set(currentHeading, {
      heading: currentHeading,
      content: currentLines.join('\n').trim(),
    });
  }

  for (const line of readerSource.split('\n')) {
    const trimmed = line.trim();
    if (isHeading(trimmed)) {
      flushCurrent();
      currentHeading = trimmed;
      currentLines = [];
      continue;
    }

    if (currentHeading) {
      currentLines.push(line);
    }
  }

  flushCurrent();
  return sections;
}

function getRequiredSection(sections: ReadonlyMap<string, Section>, heading: string): Section {
  const section = sections.get(heading);
  if (!section || section.content.trim().length === 0) {
    throw new Error(`Missing required report-first section: ${heading}`);
  }
  return section;
}

function lines(source: string): string[] {
  return source.split('\n');
}

function isBlank(line: string | undefined): boolean {
  return line === undefined || line.trim().length === 0;
}

function isTabularLine(line: string): boolean {
  return line.includes('\t') && line.split('\t').filter((cell) => cell.trim()).length >= 2;
}

function isMarkdownTableLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.split('|').length >= 4;
}

function parseTableRows(tableLines: readonly string[]): string[][] {
  if (tableLines.every(isMarkdownTableLine)) {
    return tableLines
      .filter((line) => !/^\|\s*:?-{3,}/.test(line.trim()))
      .map((line) => line.trim().split('|').slice(1, -1).map((cell) => cell.trim()));
  }

  return tableLines.map((line) => line.split('\t').map((cell) => cell.trim()));
}

function tableFromLines(tableLines: readonly string[]): ReportFirstTemplateBlock {
  const rows = parseTableRows(tableLines).filter((row) => row.some((cell) => cell.length > 0));
  const [header, ...body] = rows;
  if (!header || body.length === 0) {
    throw new Error('Table-like report-first content must include a header and at least one row.');
  }

  return {
    type: 'table',
    columns: header.map((label) => ({ key: slugify(label), label })),
    rows: body.map((row) => row.map((text) => ({ text }))),
  };
}

function collectParagraph(sourceLines: readonly string[], startIndex: number): { text: string; nextIndex: number } {
  const paragraph: string[] = [];
  let index = startIndex;

  while (index < sourceLines.length) {
    const line = sourceLines[index] ?? '';
    const trimmed = line.trim();
    if (
      trimmed.length === 0 ||
      isTabularLine(trimmed) ||
      isMarkdownTableLine(trimmed) ||
      /^\d+\.\s+/.test(trimmed) ||
      /^-\s+/.test(trimmed)
    ) {
      break;
    }
    paragraph.push(trimmed);
    index += 1;
  }

  return { text: paragraph.join(' '), nextIndex: index };
}

function collectUntilNextNumbered(sourceLines: readonly string[], startIndex: number): { itemLines: string[]; nextIndex: number } {
  const itemLines: string[] = [];
  let index = startIndex;

  while (index < sourceLines.length) {
    const trimmed = sourceLines[index]?.trim() ?? '';
    if (index > startIndex && /^\d+\.\s+/.test(trimmed)) {
      break;
    }
    itemLines.push(sourceLines[index] ?? '');
    index += 1;
  }

  return { itemLines, nextIndex: index };
}

function textAfterPrefix(sourceLines: readonly string[], prefix: string): string | undefined {
  const match = sourceLines.find((line) => line.trim().toLowerCase().startsWith(prefix.toLowerCase()));
  return match?.trim().slice(prefix.length).trim();
}

function bodyWithoutPrefixedLines(sourceLines: readonly string[], prefixes: readonly string[]): string {
  return sourceLines
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !prefixes.some((prefix) => line.toLowerCase().startsWith(prefix.toLowerCase())))
    .join(' ');
}

function numberedBlock(
  title: string,
  bodyLines: readonly string[],
  context: 'strengths' | 'tightening' | 'development' | 'default',
): ReportFirstTemplateBlock {
  if (context === 'strengths') {
    return {
      type: 'strength_card',
      title,
      text: bodyLines.map((line) => line.trim()).filter(Boolean).join(' '),
    };
  }

  if (context === 'tightening') {
    const rangeToAdd = textAfterPrefix(bodyLines, 'Range to add:') ?? '';
    return {
      type: 'tightening_card',
      title,
      text: bodyWithoutPrefixedLines(bodyLines, ['Range to add:']),
      rangeToAdd,
      whyItMatters: rangeToAdd,
    };
  }

  if (context === 'development') {
    const useCases = (textAfterPrefix(bodyLines, 'Use this in:') ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    return {
      type: 'development_action',
      title,
      text: bodyWithoutPrefixedLines(bodyLines, ['Use this in:']),
      useCases,
      whyItMatters: useCases.length > 0 ? `Use this in: ${useCases.join(', ')}.` : '',
    };
  }

  return {
    type: 'paragraph',
    text: [title, bodyLines.map((line) => line.trim()).filter(Boolean).join(' ')].filter(Boolean).join(' '),
  };
}

function collectPromptGroup(
  sourceLines: readonly string[],
  startIndex: number,
  title: string,
): { block: ReportFirstPromptGroupBlock; nextIndex: number } {
  const prompts: string[] = [];
  let index = startIndex + 1;

  while (index < sourceLines.length) {
    const trimmed = sourceLines[index]?.trim() ?? '';
    if (trimmed.length === 0) {
      index += 1;
      continue;
    }
    if (!trimmed.endsWith('?')) {
      break;
    }
    prompts.push(trimmed);
    index += 1;
  }

  return {
    block: {
      type: 'prompt_group',
      title: title.replace(/:$/, ''),
      prompts,
    },
    nextIndex: index,
  };
}

function parseContentBlocks(content: string, context: 'strengths' | 'tightening' | 'development' | 'default' = 'default'): ReportFirstTemplateBlock[] {
  const sourceLines = lines(content);
  const blocks: ReportFirstTemplateBlock[] = [];
  let index = 0;

  while (index < sourceLines.length) {
    const trimmed = sourceLines[index]?.trim() ?? '';

    if (trimmed.length === 0) {
      index += 1;
      continue;
    }

    if (isTabularLine(trimmed) || isMarkdownTableLine(trimmed)) {
      const tableLines: string[] = [];
      while (index < sourceLines.length) {
        const candidate = sourceLines[index]?.trim() ?? '';
        if (!isTabularLine(candidate) && !isMarkdownTableLine(candidate)) {
          break;
        }
        tableLines.push(candidate);
        index += 1;
      }
      blocks.push(tableFromLines(tableLines));
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const [, , title = ''] = /^(\d+)\.\s+(.+)$/.exec(trimmed) ?? [];
      const collected = collectUntilNextNumbered(sourceLines, index + 1);
      blocks.push(numberedBlock(title, collected.itemLines, context));
      index = collected.nextIndex;
      continue;
    }

    if (/^-\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < sourceLines.length) {
        const candidate = sourceLines[index]?.trim() ?? '';
        if (!candidate.startsWith('- ')) {
          break;
        }
        items.push(candidate.slice(2).trim());
        index += 1;
      }
      blocks.push({ type: 'unordered_list', items });
      continue;
    }

    if (trimmed.endsWith(':')) {
      const promptGroup = collectPromptGroup(sourceLines, index, trimmed);
      if (promptGroup.block.prompts.length > 0) {
        blocks.push(promptGroup.block);
        index = promptGroup.nextIndex;
        continue;
      }
    }

    const paragraph = collectParagraph(sourceLines, index);
    if (paragraph.text.length > 0) {
      blocks.push({ type: 'paragraph', text: paragraph.text });
    }
    index = paragraph.nextIndex > index ? paragraph.nextIndex : index + 1;
  }

  return blocks;
}

function parsePatternAtAGlance(content: string): ReportFirstTemplateBlock[] {
  const blocks = parseContentBlocks(content);
  const table = blocks.find((block): block is Extract<ReportFirstTemplateBlock, { type: 'table' }> => block.type === 'table');
  if (!table) {
    return blocks;
  }

  const signals = table.rows.map((row) => {
    const rank = Number(row[0]?.text ?? 0);
    const roleText = row[1]?.text ?? '';
    return {
      rank,
      signalKey: signalKeyFromLabel(roleText),
      signalLabel: roleText.split(/\s+\u2014\s+/)[0] ?? roleText,
      roleLabel: roleText.split(/\s+\u2014\s+/)[1] ?? undefined,
      roleSummary: row[2]?.text,
    };
  });

  return [{ type: 'signal_stack', signals }, ...blocks];
}

function parseEvidenceBlocks(content: string): ReportFirstTemplateBlock[] {
  const sourceLines = lines(content);
  const blocks: ReportFirstTemplateBlock[] = [];
  let index = 0;

  while (index < sourceLines.length) {
    const trimmed = sourceLines[index]?.trim() ?? '';
    if (trimmed.length === 0) {
      index += 1;
      continue;
    }

    if (trimmed === 'Ranked evidence:') {
      const signals: ReportFirstTemplateSignal[] = [];
      index += 1;
      while (index < sourceLines.length) {
        const candidate = sourceLines[index]?.trim() ?? '';
        if (candidate.length === 0) {
          index += 1;
          continue;
        }
        if (candidate === 'Score evidence:') {
          break;
        }
        signals.push({
          rank: signals.length + 1,
          signalKey: signalKeyFromLabel(candidate),
          signalLabel: candidate,
        });
        index += 1;
      }
      blocks.push({ type: 'signal_stack', signals });
      continue;
    }

    if (trimmed === 'Score evidence:') {
      index += 1;
      const tableLines: string[] = [];
      while (index < sourceLines.length) {
        const candidate = sourceLines[index]?.trim() ?? '';
        if (candidate.length === 0) {
          if (tableLines.length > 0) {
            break;
          }
          index += 1;
          continue;
        }
        if (!isTabularLine(candidate) && !isMarkdownTableLine(candidate)) {
          break;
        }
        tableLines.push(candidate);
        index += 1;
      }
      blocks.push(tableFromLines(tableLines));
      continue;
    }

    if (/^[A-Za-z]+:/.test(trimmed)) {
      blocks.push({
        type: 'callout',
        tone: 'evidence',
        text: trimmed,
      });
      index += 1;
      continue;
    }

    const paragraph = collectParagraph(sourceLines, index);
    if (paragraph.text.length > 0) {
      blocks.push({ type: 'paragraph', text: paragraph.text });
    }
    index = paragraph.nextIndex > index ? paragraph.nextIndex : index + 1;
  }

  return blocks;
}

function chapterFromSection(section: Section): ReportFirstTemplateChapter {
  const match = /^Chapter (\d+) \u2014 (.+)$/.exec(section.heading);
  if (!match) {
    throw new Error(`Invalid chapter heading: ${section.heading}`);
  }

  const chapterNumber = Number(match[1]);
  const title = match[2] ?? '';
  const chapterKey = requiredChapterKeysByNumber.get(chapterNumber);
  if (!chapterKey) {
    throw new Error(`Unexpected report-first chapter number: ${chapterNumber}`);
  }

  const context =
    chapterKey === 'strengths'
      ? 'strengths'
      : chapterKey === 'tightening'
        ? 'tightening'
        : chapterKey === 'development_focus'
          ? 'development'
          : 'default';

  return {
    chapterKey,
    chapterNumber,
    title,
    railLabel: railLabelsByChapterKey[chapterKey] ?? title,
    blocks: parseContentBlocks(section.content, context),
    readerFacing: true,
  };
}

function validateRequiredChapters(chapters: readonly ReportFirstTemplateChapter[]): void {
  const keys = new Set(chapters.map((chapter) => chapter.chapterKey));
  for (const key of requiredChapterKeysByNumber.values()) {
    if (!keys.has(key)) {
      throw new Error(`Missing required Leadership Approach report chapter: ${key}`);
    }
  }
}

function stableStringify(value: JsonValue): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`;
}

function contentHash(value: JsonValue): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function extractOpening(readerSource: string, heroTitle: string): string {
  const introMarker = '\nEditorial introduction';
  const introIndex = readerSource.indexOf(introMarker);
  if (introIndex === -1) {
    throw new Error('Missing required report-first section: Editorial introduction');
  }

  const heroIndex = readerSource.indexOf(heroTitle);
  return readerSource.slice(heroIndex + heroTitle.length, introIndex).trim();
}

export function compileReportFirstTemplateFromMarkdown(
  source: string,
  options: CompileOptions,
): CompiledReportFirstTemplate {
  const reportKey = reportKeyFromPath(options.inputPath);
  const { readerSource, qaNotes } = stripEditorialQaNotes(source);
  const nonEmptyLines = readerSource.split('\n').map((line) => line.trim()).filter(Boolean);
  const reportTitle = nonEmptyLines[0] ?? '';
  const heroTitle = nonEmptyLines[1] ?? '';

  if (!reportTitle) {
    throw new Error('Missing report title.');
  }
  if (!heroTitle || isHeading(heroTitle)) {
    throw new Error('Missing required hero result statement.');
  }

  const opening = extractOpening(readerSource, heroTitle);
  if (!opening) {
    throw new Error('Missing opening report statement before Editorial introduction.');
  }

  const sections = parseSections(readerSource);
  const chapters = [...sections.values()]
    .filter((section) => section.heading.startsWith('Chapter '))
    .map(chapterFromSection)
    .sort((left, right) => left.chapterNumber - right.chapterNumber);

  validateRequiredChapters(chapters);

  const pdfLines = getRequiredSection(sections, 'PDF export CTA').content.split('\n').map((line) => line.trim()).filter(Boolean);
  const finalLineBlocks = parseContentBlocks(getRequiredSection(sections, 'Final line').content);
  const finalLine = finalLineBlocks.find((block): block is Extract<ReportFirstTemplateBlock, { type: 'paragraph' }> => block.type === 'paragraph')?.text;
  if (!finalLine) {
    throw new Error('Missing final line text.');
  }

  const reportTemplateJson: ReportFirstTemplateJson = {
    metadata: {
      payloadVersion: 1,
      contractName: REPORT_FIRST_CONTRACT,
      mode: 'single_domain_ranked_pattern',
      reportModel: 'report_first_canonical',
      templateVersion: 1,
    },
    reportKey,
    patternKey: reportKey,
    domainKey: options.domainKey ?? 'leadership-approach',
    report: {
      reportKey,
      patternKey: reportKey,
      reportTitle,
      hero: {
        title: heroTitle,
        resultStatement: opening,
      },
      opening: parseContentBlocks(getRequiredSection(sections, 'Editorial introduction').content),
      patternSummary: {
        title: 'Pattern at a glance',
        blocks: parsePatternAtAGlance(getRequiredSection(sections, 'Pattern at a glance').content),
      },
      keyInsight: {
        type: 'pull_quote',
        text: getRequiredSection(sections, 'Key insight').content.split('\n').map((line) => line.trim()).filter(Boolean).join(' '),
      },
      chapters,
      closing: {
        synthesis: parseContentBlocks(getRequiredSection(sections, 'Closing synthesis').content),
        finalLine,
      },
      pdf: {
        title: pdfLines[0] ?? '',
        body: pdfLines.slice(1).join(' '),
      },
      readerNavigation: [
        { id: 'overview', label: 'Overview' },
        { id: 'pattern', label: 'Pattern' },
        { id: 'evidence', label: 'Evidence' },
        { id: 'key-insight', label: 'Insight' },
        ...chapters.map((chapter) => ({
          id: chapter.chapterKey,
          label: chapter.railLabel,
          targetChapterKey: chapter.chapterKey,
        })),
        { id: 'closing', label: 'Closing' },
      ],
    },
    evidenceTemplate: {
      title: 'Evidence behind your result',
      blocks: parseEvidenceBlocks(getRequiredSection(sections, 'Evidence behind your result').content),
    },
    diagnostics: {
      generatedFrom: 'compiled_report_first_template',
      adminNotesExcluded: true,
      editorialQaNotesDetected: qaNotes.length > 0,
      warningList: [],
    },
  };

  return {
    report_key: reportKey,
    pattern_key: reportKey,
    domain_key: options.domainKey ?? 'leadership-approach',
    report_contract: REPORT_FIRST_CONTRACT,
    content_hash: contentHash(reportTemplateJson as unknown as JsonValue),
    report_template_json: reportTemplateJson,
  };
}

export async function compileReportFirstTemplateFile(options: CompileOptions): Promise<CompiledReportFirstTemplate> {
  const source = await readFile(options.inputPath, 'utf8');
  return compileReportFirstTemplateFromMarkdown(source, options);
}

function parseArgs(argv: readonly string[]): CliOptions {
  let inputPath = '';
  let outPath: string | undefined;
  let domainKey: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];

    if (arg === '--input') {
      inputPath = value ?? '';
      index += 1;
      continue;
    }
    if (arg === '--out') {
      outPath = value;
      index += 1;
      continue;
    }
    if (arg === '--domain-key') {
      domainKey = value;
      index += 1;
      continue;
    }

    throw new Error(`Unsupported argument: ${arg}`);
  }

  if (!inputPath) {
    throw new Error('Missing required --input argument.');
  }

  return { inputPath, outPath, domainKey };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const compiled = await compileReportFirstTemplateFile(options);
  const output = `${JSON.stringify(compiled, null, 2)}\n`;

  if (options.outPath) {
    await mkdir(path.dirname(options.outPath), { recursive: true });
    await writeFile(options.outPath, output, 'utf8');
    console.log(`Report-first template compiled: ${options.outPath}`);
    return;
  }

  process.stdout.write(output);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';

if (import.meta.url === invokedPath) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
