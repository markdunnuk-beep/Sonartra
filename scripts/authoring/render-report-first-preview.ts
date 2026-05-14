import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export type ReportFirstPreviewFormat = 'html' | 'md';

export type ReportFirstSection = {
  readonly id: string;
  readonly heading: string;
  readonly content: string;
};

export type ReportFirstPreviewModel = {
  readonly reportTitle: string;
  readonly heroTitle: string;
  readonly openingSummary: string;
  readonly editorialIntroduction: ReportFirstSection;
  readonly patternAtAGlance: ReportFirstSection;
  readonly evidence: ReportFirstSection;
  readonly keyInsight: ReportFirstSection;
  readonly chapters: readonly ReportFirstSection[];
  readonly closingSynthesis: ReportFirstSection;
  readonly finalLine: ReportFirstSection;
  readonly pdfCta: ReportFirstSection;
  readonly editorialQaNotesDetected: boolean;
  readonly editorialQaNotesLength: number;
};

type RenderReportFirstPreviewOptions = {
  readonly inputPath: string;
  readonly outPath: string;
  readonly format: ReportFirstPreviewFormat;
};

type MutableRenderReportFirstPreviewOptions = {
  inputPath?: string;
  outPath?: string;
  format?: ReportFirstPreviewFormat;
};

const sectionHeadings = [
  'Editorial introduction',
  'Pattern at a glance',
  'Evidence behind your result',
  'Key insight',
  'Chapter 1 — How your leadership creates value',
  'Chapter 2 — How others experience your leadership',
  'Chapter 3 — Decision behaviour',
  'Chapter 4 — Communication behaviour',
  'Chapter 5 — What happens under pressure',
  'Chapter 6 — The strength of this pattern',
  'Chapter 7 — Where the pattern can tighten',
  'Chapter 8 — How People expands your leadership',
  'Chapter 8 — How Results expands your leadership',
  'Chapter 8 — How Process expands your leadership',
  'Chapter 9 — How Vision expands your leadership',
  'Chapter 9 — How Results expands your leadership',
  'Chapter 10 — Development focus',
  'Closing synthesis',
  'Final line',
  'PDF export CTA',
] as const;

const requiredHeadingAliases = {
  editorialIntroduction: ['Editorial introduction'],
  patternAtAGlance: ['Pattern at a glance'],
  evidence: ['Evidence behind your result'],
  keyInsight: ['Key insight'],
  closingSynthesis: ['Closing synthesis'],
  finalLine: ['Final line'],
  pdfCta: ['PDF export CTA'],
} as const;

const chapterRailLabels: Record<string, string> = {
  'Chapter 1 — How your leadership creates value': 'Value',
  'Chapter 2 — How others experience your leadership': 'Others',
  'Chapter 3 — Decision behaviour': 'Decisions',
  'Chapter 4 — Communication behaviour': 'Communication',
  'Chapter 5 — What happens under pressure': 'Pressure',
  'Chapter 6 — The strength of this pattern': 'Strengths',
  'Chapter 7 — Where the pattern can tighten': 'Tightening',
  'Chapter 8 — How People expands your leadership': 'Range',
  'Chapter 8 — How Results expands your leadership': 'Range',
  'Chapter 8 — How Process expands your leadership': 'Range',
  'Chapter 9 — How Vision expands your leadership': 'Range',
  'Chapter 9 — How Results expands your leadership': 'Range',
  'Chapter 10 — Development focus': 'Development',
};

const forbiddenReaderTerms = [
  'Editorial QA Notes',
  'report_status',
  'quality_score_target',
  'pattern_key',
  'schema',
  'PSV',
  'field map',
  'field-map',
  'runtime',
  'payload',
  'canonical_result_payload',
  'implementation language',
  'authoring-only',
] as const;

const headingSet = new Set<string>(sectionHeadings);

function normalizeLineEndings(source: string): string {
  return source.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function stripEditorialQaNotes(source: string): { readerSource: string; qaNotes: string } {
  const normalized = normalizeLineEndings(source);
  const marker = /^# Editorial QA Notes\s*$/m;
  const match = marker.exec(normalized);

  if (!match) {
    return { readerSource: normalized.trim(), qaNotes: '' };
  }

  return {
    readerSource: normalized.slice(0, match.index).trim(),
    qaNotes: normalized.slice(match.index).trim(),
  };
}

function nonEmptyLines(source: string): readonly string[] {
  return source
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function sectionId(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/—/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseSections(readerSource: string): Map<string, ReportFirstSection> {
  const sections = new Map<string, ReportFirstSection>();
  const lines = readerSource.split('\n');
  let currentHeading = '';
  let currentLines: string[] = [];

  function flushCurrent() {
    if (!currentHeading) {
      return;
    }

    sections.set(currentHeading, {
      id: sectionId(currentHeading),
      heading: currentHeading,
      content: currentLines.join('\n').trim(),
    });
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (headingSet.has(trimmed)) {
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

function getRequiredSection(
  sections: ReadonlyMap<string, ReportFirstSection>,
  aliases: readonly string[],
  errorMessage: string,
): ReportFirstSection {
  const section = aliases.map((heading) => sections.get(heading)).find((candidate) => candidate !== undefined);
  if (!section || section.content.length === 0) {
    throw new Error(errorMessage);
  }
  return section;
}

function validateReaderFacingText(model: ReportFirstPreviewModel): void {
  const readerText = [
    model.reportTitle,
    model.heroTitle,
    model.openingSummary,
    model.editorialIntroduction.content,
    model.patternAtAGlance.content,
    model.evidence.content,
    model.keyInsight.content,
    ...model.chapters.map((chapter) => chapter.content),
    model.closingSynthesis.content,
    model.finalLine.content,
    model.pdfCta.content,
  ].join('\n');

  for (const term of forbiddenReaderTerms) {
    if (readerText.toLowerCase().includes(term.toLowerCase())) {
      throw new Error(`Reader-facing preview contains forbidden authoring/runtime term: ${term}`);
    }
  }
}

export function parseReportFirstMarkdown(source: string): ReportFirstPreviewModel {
  const { readerSource, qaNotes } = stripEditorialQaNotes(source);
  const lines = nonEmptyLines(readerSource);
  const reportTitle = lines[0] ?? '';
  const heroTitle = lines[1] ?? '';

  if (!reportTitle) {
    throw new Error('Missing report title.');
  }

  if (!heroTitle || headingSet.has(heroTitle) || !/^You\s/.test(heroTitle)) {
    throw new Error('Missing required hero title.');
  }

  const editorialIntroIndex = readerSource.indexOf('\nEditorial introduction');
  if (editorialIntroIndex === -1) {
    throw new Error('Missing Editorial introduction section.');
  }

  const openingSummary = readerSource
    .slice(readerSource.indexOf(heroTitle) + heroTitle.length, editorialIntroIndex)
    .trim();

  if (!openingSummary) {
    throw new Error('Missing opening result statement.');
  }

  const sections = parseSections(readerSource);
  const chapters = [...sections.values()].filter((section) => section.heading.startsWith('Chapter '));

  if (chapters.length === 0) {
    throw new Error('No chapters found.');
  }

  const model: ReportFirstPreviewModel = {
    reportTitle,
    heroTitle,
    openingSummary,
    editorialIntroduction: getRequiredSection(
      sections,
      requiredHeadingAliases.editorialIntroduction,
      'Missing Editorial introduction section.',
    ),
    patternAtAGlance: getRequiredSection(
      sections,
      requiredHeadingAliases.patternAtAGlance,
      'Missing Pattern at a glance section.',
    ),
    evidence: getRequiredSection(sections, requiredHeadingAliases.evidence, 'Missing required evidence section.'),
    keyInsight: getRequiredSection(sections, requiredHeadingAliases.keyInsight, 'Missing required key insight section.'),
    chapters,
    closingSynthesis: getRequiredSection(
      sections,
      requiredHeadingAliases.closingSynthesis,
      'Missing closing synthesis section.',
    ),
    finalLine: getRequiredSection(sections, requiredHeadingAliases.finalLine, 'Missing final line section.'),
    pdfCta: getRequiredSection(sections, requiredHeadingAliases.pdfCta, 'Missing PDF CTA section.'),
    editorialQaNotesDetected: qaNotes.length > 0,
    editorialQaNotesLength: qaNotes.length,
  };

  validateReaderFacingText(model);
  return model;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInlineMarkdown(value: string): string {
  return escapeHtml(value).replace(/`([^`]+)`/g, '<code>$1</code>');
}

function renderMarkdownBlock(source: string): string {
  const lines = source.split('\n');
  const html: string[] = [];
  let paragraph: string[] = [];
  let table: string[] = [];

  function flushParagraph() {
    if (paragraph.length === 0) {
      return;
    }
    html.push(`<p>${renderInlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  }

  function flushTable() {
    if (table.length === 0) {
      return;
    }
    const rows = table
      .filter((line) => !/^\|\s*-/.test(line))
      .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));
    const [header, ...body] = rows;
    if (header) {
      html.push('<table>');
      html.push(`<thead><tr>${header.map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`).join('')}</tr></thead>`);
      html.push('<tbody>');
      for (const row of body) {
        html.push(`<tr>${row.map((cell) => `<td>${renderInlineMarkdown(cell)}</td>`).join('')}</tr>`);
      }
      html.push('</tbody></table>');
    }
    table = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.length === 0) {
      flushParagraph();
      flushTable();
      continue;
    }

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushParagraph();
      table.push(trimmed);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph();
      flushTable();
      html.push(`<h3>${renderInlineMarkdown(trimmed)}</h3>`);
      continue;
    }

    if (/^[A-Z][A-Za-z\s]+$/.test(trimmed) && trimmed.length <= 36 && !trimmed.includes(' ')) {
      flushParagraph();
      flushTable();
      html.push(`<p class="signal-line">${renderInlineMarkdown(trimmed)}</p>`);
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  flushTable();

  return html.join('\n');
}

function renderReadingRail(model: ReportFirstPreviewModel): string {
  const railItems = [
    ['Overview', 'overview'],
    ['Pattern', model.patternAtAGlance.id],
    ['Evidence', model.evidence.id],
    ['Insight', model.keyInsight.id],
    ...model.chapters.map((chapter) => [chapterRailLabels[chapter.heading] ?? chapter.heading.replace(/^Chapter \d+ — /, ''), chapter.id]),
    ['Closing', model.closingSynthesis.id],
  ] as const;

  return railItems
    .map(([label, id]) => `<a href="#${escapeHtml(id)}">${escapeHtml(label)}</a>`)
    .join('\n');
}

function renderSection(section: ReportFirstSection, className = 'report-section'): string {
  return [
    `<section id="${escapeHtml(section.id)}" class="${className}">`,
    `<h2>${escapeHtml(section.heading)}</h2>`,
    renderMarkdownBlock(section.content),
    '</section>',
  ].join('\n');
}

export function renderReportFirstHtml(model: ReportFirstPreviewModel, sourcePath: string): string {
  const readerHtml = [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${escapeHtml(model.reportTitle)} Preview</title>`,
    '<style>',
    `:root {
  color-scheme: dark;
  --bg: #0f1115;
  --panel: #171a21;
  --panel-soft: #20242d;
  --text: #f3f0e8;
  --muted: #bdb7aa;
  --line: rgba(243, 240, 232, 0.16);
  --accent: #d8b56d;
  --accent-soft: rgba(216, 181, 109, 0.16);
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: radial-gradient(circle at top left, rgba(216, 181, 109, 0.09), transparent 30rem), var(--bg);
  color: var(--text);
  font-family: ui-serif, Georgia, Cambria, "Times New Roman", serif;
  line-height: 1.65;
}
a { color: inherit; }
.shell { display: grid; grid-template-columns: minmax(13rem, 18rem) minmax(0, 52rem); gap: 3rem; max-width: 78rem; margin: 0 auto; padding: 4rem 1.5rem; }
.rail { position: sticky; top: 1.5rem; align-self: start; border-left: 1px solid var(--line); padding: 0.5rem 0 0.5rem 1rem; font-family: ui-sans-serif, system-ui, sans-serif; }
.rail strong { display: block; color: var(--accent); font-size: 0.76rem; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 0.85rem; }
.rail a { display: block; color: var(--muted); font-size: 0.92rem; text-decoration: none; padding: 0.2rem 0; }
.rail a:hover { color: var(--text); }
.hero { padding: 3rem 0 2.5rem; border-bottom: 1px solid var(--line); }
.eyebrow { color: var(--accent); font-family: ui-sans-serif, system-ui, sans-serif; font-size: 0.78rem; letter-spacing: 0.16em; text-transform: uppercase; margin: 0 0 1.25rem; }
h1 { font-size: clamp(2.7rem, 6vw, 5rem); line-height: 0.98; margin: 0 0 1.5rem; letter-spacing: 0; }
.subtitle { color: var(--muted); font-size: 1.2rem; max-width: 42rem; }
.panel { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 1.3rem; margin: 2rem 0; }
.insight { background: var(--accent-soft); border-left: 3px solid var(--accent); padding: 1.5rem; margin: 2rem 0; font-size: 1.18rem; }
.report-section { padding: 2.15rem 0; border-bottom: 1px solid var(--line); }
.report-section h2 { font-size: 1.75rem; line-height: 1.2; margin: 0 0 1rem; }
.report-section h3 { color: var(--accent); font-family: ui-sans-serif, system-ui, sans-serif; font-size: 0.95rem; letter-spacing: 0.05em; margin: 1.35rem 0 0.4rem; }
p { margin: 0 0 1rem; }
table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 0.94rem; }
th, td { border-bottom: 1px solid var(--line); padding: 0.75rem; text-align: left; vertical-align: top; }
th { color: var(--accent); font-weight: 600; }
.signal-line { font-family: ui-sans-serif, system-ui, sans-serif; color: var(--muted); margin: 0.25rem 0; }
.cta { background: var(--panel-soft); border: 1px solid var(--line); border-radius: 8px; padding: 1.5rem; margin: 2rem 0; }
.appendix { margin-top: 3rem; padding: 1.25rem; border: 1px dashed var(--line); color: var(--muted); font-family: ui-sans-serif, system-ui, sans-serif; font-size: 0.88rem; }
@media (max-width: 860px) { .shell { display: block; padding: 2rem 1rem; } .rail { position: static; margin-bottom: 2rem; } h1 { font-size: 2.7rem; } }`,
    '</style>',
    '</head>',
    '<body>',
    '<div class="shell">',
    '<nav class="rail" aria-label="Report sections">',
    '<strong>Reading rail</strong>',
    renderReadingRail(model),
    '</nav>',
    '<main>',
    '<header id="overview" class="hero">',
    `<p class="eyebrow">${escapeHtml(model.reportTitle)}</p>`,
    `<h1>${escapeHtml(model.heroTitle)}</h1>`,
    `<div class="subtitle">${renderMarkdownBlock(model.openingSummary)}</div>`,
    '</header>',
    renderSection(model.evidence, 'report-section panel'),
    `<section id="${escapeHtml(model.keyInsight.id)}" class="insight"><h2>${escapeHtml(model.keyInsight.heading)}</h2>${renderMarkdownBlock(model.keyInsight.content)}</section>`,
    renderSection(model.editorialIntroduction),
    renderSection(model.patternAtAGlance),
    ...model.chapters.map((chapter) => renderSection(chapter)),
    renderSection(model.closingSynthesis),
    renderSection(model.finalLine),
    renderSection(model.pdfCta, 'cta'),
    '<aside class="appendix" aria-label="Authoring preview appendix">',
    '<strong>Authoring-only static preview appendix</strong>',
    `<p>Source: ${escapeHtml(sourcePath)}</p>`,
    `<p>Editorial QA Notes stripped from reader output: ${model.editorialQaNotesDetected ? 'yes' : 'not present'}</p>`,
    `<p>Detected sections: ${escapeHtml(
      [
        model.editorialIntroduction.heading,
        model.patternAtAGlance.heading,
        model.evidence.heading,
        model.keyInsight.heading,
        ...model.chapters.map((chapter) => chapter.heading),
        model.closingSynthesis.heading,
        model.finalLine.heading,
        model.pdfCta.heading,
      ].join(', '),
    )}</p>`,
    '<p>Static preview status: non-production authoring prototype.</p>',
    '</aside>',
    '</main>',
    '</div>',
    '</body>',
    '</html>',
  ].join('\n');

  if (readerHtml.includes('# Editorial QA Notes')) {
    throw new Error('Reader-facing HTML would include Editorial QA Notes.');
  }

  return readerHtml;
}

export function renderReportFirstMarkdownPreview(model: ReportFirstPreviewModel, sourcePath: string): string {
  return [
    `# ${model.reportTitle}`,
    '',
    model.heroTitle,
    '',
    model.openingSummary,
    '',
    `## ${model.evidence.heading}`,
    '',
    model.evidence.content,
    '',
    `## ${model.keyInsight.heading}`,
    '',
    model.keyInsight.content,
    '',
    `## ${model.editorialIntroduction.heading}`,
    '',
    model.editorialIntroduction.content,
    '',
    `## ${model.patternAtAGlance.heading}`,
    '',
    model.patternAtAGlance.content,
    '',
    ...model.chapters.flatMap((chapter) => [`## ${chapter.heading}`, '', chapter.content, '']),
    `## ${model.closingSynthesis.heading}`,
    '',
    model.closingSynthesis.content,
    '',
    `## ${model.finalLine.heading}`,
    '',
    model.finalLine.content,
    '',
    `## ${model.pdfCta.heading}`,
    '',
    model.pdfCta.content,
    '',
    '---',
    '',
    'Authoring-only static preview appendix',
    '',
    `- Source: ${sourcePath}`,
    `- Editorial QA Notes stripped from reader output: ${model.editorialQaNotesDetected ? 'yes' : 'not present'}`,
    '- Static preview status: non-production authoring prototype',
    '',
  ].join('\n');
}

export async function renderReportFirstPreview(options: RenderReportFirstPreviewOptions): Promise<string> {
  const source = await readFile(options.inputPath, 'utf8');
  const model = parseReportFirstMarkdown(source);
  const rendered =
    options.format === 'md'
      ? renderReportFirstMarkdownPreview(model, options.inputPath)
      : renderReportFirstHtml(model, options.inputPath);

  await mkdir(path.dirname(options.outPath), { recursive: true });
  await writeFile(options.outPath, rendered, 'utf8');
  return rendered;
}

function parseArgs(argv: readonly string[]): RenderReportFirstPreviewOptions {
  const options: MutableRenderReportFirstPreviewOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];

    if (arg === '--input') {
      options.inputPath = value;
      index += 1;
      continue;
    }

    if (arg === '--out') {
      options.outPath = value;
      index += 1;
      continue;
    }

    if (arg === '--format') {
      if (value !== 'html' && value !== 'md') {
        throw new Error('--format must be html or md.');
      }
      options.format = value;
      index += 1;
      continue;
    }

    throw new Error(`Unsupported argument: ${arg}`);
  }

  if (!options.inputPath || !options.outPath) {
    throw new Error('Missing required --input or --out argument.');
  }

  return {
    inputPath: options.inputPath,
    outPath: options.outPath,
    format: options.format ?? 'html',
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await renderReportFirstPreview(options);
  console.log(`Report-first preview rendered: ${options.outPath}`);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';

if (import.meta.url === invokedPath) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
