import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import XLSX from 'xlsx';

export const decisionStyleWorkbookRelativePath =
  'content/assessment-packages/decision-style/sonartra_report_first_fully_authored_DECISION_STYLE_DRAFT.xlsx';

const packageRoot = path.join(process.cwd(), 'content', 'assessment-packages', 'decision-style');
const workbookPath = path.join(process.cwd(), decisionStyleWorkbookRelativePath);

const requiredSignals = ['evidence', 'judgement', 'standards', 'practicality'] as const;

const sectionLabels = [
  ['key-insight', 4, 'Key insight', 'Your decision pattern in one line'],
  ['value', 5, 'Decision value', 'The value your judgement pattern creates'],
  ['others', 6, "Others' experience", 'How others experience your judgement'],
  ['decisions', 7, 'Decision mechanics', 'How you move from uncertainty to commitment'],
  ['communication', 8, 'Explaining the decision', 'How you explain and socialise decisions'],
  ['pressure', 9, 'Judgement under pressure', 'How pressure changes your decision pattern'],
  ['strengths', 10, 'Decision strengths', 'What this pattern reliably gives you'],
  ['tightening', 11, 'Decision tightening', 'Where this pattern can narrow'],
  ['rank-3-expansion', 12, 'Wider perspective', 'How other perspectives improve the decision'],
  ['rank-4-expansion', 13, 'Decision range', 'Where to use, stretch, or adapt this pattern'],
  ['development-focus', 14, 'Development', 'How to mature your decision pattern'],
  ['closing', 15, 'Closing', 'Your decision style in mature form'],
] as const;

type Row = Record<string, string>;

function parsePsv(fileName: string): Row[] {
  const source = readFileSync(path.join(packageRoot, fileName), 'utf8').trim();
  const [headerLine, ...lines] = source.split(/\r?\n/);
  if (!headerLine) {
    throw new Error(`${fileName} is empty.`);
  }

  const headers = headerLine.split('|');
  return lines
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const values = line.split('|');
      return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    });
}

function rowsForSheet(headers: readonly string[], rows: readonly Row[]): string[][] {
  return [headers.map(String), ...rows.map((row) => headers.map((header) => row[header] ?? ''))];
}

function appendSheet(workbook: XLSX.WorkBook, name: string, headers: readonly string[], rows: readonly Row[]) {
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rowsForSheet(headers, rows)), name);
}

function reportBodyJson(pattern: Row): string {
  const sections = sectionLabels.map(([id, order, label, title]) => ({
    id,
    order,
    label,
    title,
    status: 'draft_placeholder',
    blocks: [],
  }));

  return JSON.stringify({
    contract: 'report_first_canonical_payload_v1',
    status: 'draft_placeholder',
    assessmentKey: 'decision-style',
    domainKey: pattern.domain_key,
    patternKey: pattern.pattern_key,
    rankSignals: [
      pattern.rank_1_signal_key,
      pattern.rank_2_signal_key,
      pattern.rank_3_signal_key,
      pattern.rank_4_signal_key,
    ],
    sections,
  });
}

function buildReportTemplates(patterns: readonly Row[], assessment: Row): Row[] {
  return patterns.map((pattern) => {
    const leadSignal = pattern.rank_1_signal_key;
    const leadLabel = leadSignal.charAt(0).toUpperCase() + leadSignal.slice(1);

    return {
      assessment_key: assessment.assessment_key,
      version: assessment.version,
      domain_key: pattern.domain_key,
      pattern_key: pattern.pattern_key,
      rank_1_signal_key: pattern.rank_1_signal_key,
      rank_2_signal_key: pattern.rank_2_signal_key,
      rank_3_signal_key: pattern.rank_3_signal_key,
      rank_4_signal_key: pattern.rank_4_signal_key,
      report_title: `Decision Style Draft Report Placeholder - ${leadLabel} led`,
      report_subtitle: `Draft placeholder for ${pattern.pattern_label}`,
      concise_takeaway: `Draft placeholder for the ${pattern.pattern_label} decision pattern.`,
      opening_summary:
        'Draft placeholder only. Full authored Decision Style report language is reserved for RFA-11.',
      report_body_json: reportBodyJson(pattern),
      closing_summary:
        'Draft placeholder only. This workbook is structurally valid but not production import-ready.',
      memorable_line: 'Draft placeholder pending Decision Style benchmark report brief.',
      report_contract: 'report_first_canonical_payload_v1',
      status: 'draft',
    };
  });
}

function buildImportSummary(assessment: Row, patterns: readonly Row[], reportTemplates: readonly Row[]): Row[] {
  return [
    {
      import_summary_key: 'decision_style_clean_workbook_draft',
      assessment_key: assessment.assessment_key,
      version: assessment.version,
      package_identifier: 'sonartra_report_first_fully_authored_DECISION_STYLE_DRAFT',
      source_name: 'Decision Style PSV package',
      generated_at: 'deterministic_local_generation',
      generated_by: 'scripts/authoring/generate-decision-style-clean-workbook.ts',
      expected_signal_count: String(requiredSignals.length),
      expected_pattern_count: String(patterns.length),
      expected_report_template_count: String(reportTemplates.length),
      status: 'draft',
    },
  ];
}

function buildLookups(): Row[] {
  return [
    ['report_contract', 'report_first_canonical_payload_v1', 'Report-first canonical payload v1', '1', '06_Report_Templates', 'report_contract'],
    ['status', 'draft', 'Draft', '1', 'all', 'status'],
    ['status', 'active', 'Active', '2', 'all', 'status'],
    ['status', 'inactive', 'Inactive', '3', 'all', 'status'],
    ['model_key', 'report_first_fully_authored_ranked_pattern_v1', 'Report-first fully authored ranked pattern v1', '1', '00_Assessment', 'model_key'],
    ...requiredSignals.map((signal, index) => [
      'signal_key',
      signal,
      signal.charAt(0).toUpperCase() + signal.slice(1),
      String(index + 1),
      '01_Signals',
      'signal_key',
    ]),
  ].map(([lookup_group, lookup_key, lookup_label, sort_order, applies_to_sheet, applies_to_field]) => ({
    lookup_group,
    lookup_key,
    lookup_label,
    sort_order,
    applies_to_sheet,
    applies_to_field,
    status: 'active',
  }));
}

export function buildDecisionStyleCleanWorkbook(): XLSX.WorkBook {
  const assessmentRows = parsePsv('00-assessment.psv');
  const signalRows = parsePsv('01-signals.psv');
  const questionRows = parsePsv('02-questions.psv');
  const optionRows = parsePsv('03-options.psv');
  const weightRows = parsePsv('04-option-weights.psv');
  const patternRows = parsePsv('05-ranked-patterns.psv');
  const qaRows = parsePsv('07-report-qa-cases.psv');

  const assessment = assessmentRows[0];
  if (!assessment) {
    throw new Error('00-assessment.psv must include one assessment row.');
  }

  const reportRows = buildReportTemplates(patternRows, assessment);
  const summaryRows = buildImportSummary(assessment, patternRows, reportRows);
  const lookupRows = buildLookups();

  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: 'Sonartra Decision Style clean report-first workbook draft',
    Subject: 'Generated draft workbook',
    Author: 'Sonartra',
    CreatedDate: new Date('2026-01-01T00:00:00.000Z'),
  };

  appendSheet(
    workbook,
    '00_Assessment',
    [
      'assessment_key',
      'assessment_title',
      'assessment_description',
      'version',
      'domain_key',
      'domain_title',
      'domain_definition',
      'domain_scope',
      'model_key',
      'report_contract',
      'status',
      'audience',
      'reader_promise',
      'authoring_notes',
    ],
    assessmentRows,
  );
  appendSheet(
    workbook,
    '01_Signals',
    [
      'domain_key',
      'signal_key',
      'signal_label',
      'signal_short_label',
      'signal_description',
      'signal_order',
      'is_scored',
      'status',
      'signal_reader_description',
      'signal_authoring_notes',
    ],
    signalRows,
  );
  appendSheet(
    workbook,
    '02_Questions',
    ['domain_key', 'question_key', 'question_order', 'prompt', 'status', 'helper_text', 'question_theme', 'authoring_notes'],
    questionRows,
  );
  appendSheet(
    workbook,
    '03_Options',
    [
      'domain_key',
      'question_key',
      'option_key',
      'option_order',
      'option_label',
      'option_text',
      'status',
      'option_intent',
      'authoring_notes',
    ],
    optionRows,
  );
  appendSheet(
    workbook,
    '04_Option_Weights',
    ['domain_key', 'question_key', 'option_key', 'signal_key', 'weight', 'status', 'weighting_notes'],
    weightRows,
  );
  appendSheet(
    workbook,
    '05_Ranked_Patterns',
    [
      'domain_key',
      'pattern_key',
      'pattern_label',
      'rank_1_signal_key',
      'rank_2_signal_key',
      'rank_3_signal_key',
      'rank_4_signal_key',
      'pattern_order',
      'status',
    ],
    patternRows.map((row, index) => ({ ...row, pattern_order: String(index + 1) })),
  );
  appendSheet(
    workbook,
    '06_Report_Templates',
    [
      'assessment_key',
      'version',
      'domain_key',
      'pattern_key',
      'rank_1_signal_key',
      'rank_2_signal_key',
      'rank_3_signal_key',
      'rank_4_signal_key',
      'report_title',
      'report_subtitle',
      'concise_takeaway',
      'opening_summary',
      'report_body_json',
      'closing_summary',
      'memorable_line',
      'report_contract',
      'status',
    ],
    reportRows,
  );
  appendSheet(
    workbook,
    '07_Report_QA_Cases',
    [
      'qa_case_key',
      'assessment_key',
      'version',
      'domain_key',
      'pattern_key',
      'rank_1_signal_key',
      'rank_2_signal_key',
      'rank_3_signal_key',
      'rank_4_signal_key',
      'expected_report_contract',
      'expected_report_title',
      'status',
      'normalized_rank_1',
      'normalized_rank_2',
      'normalized_rank_3',
      'normalized_rank_4',
      'qa_notes',
      'reviewer_notes',
    ],
    qaRows,
  );
  appendSheet(
    workbook,
    '08_Import_Summary',
    [
      'import_summary_key',
      'assessment_key',
      'version',
      'package_identifier',
      'source_name',
      'generated_at',
      'generated_by',
      'expected_signal_count',
      'expected_pattern_count',
      'expected_report_template_count',
      'status',
    ],
    summaryRows,
  );
  appendSheet(
    workbook,
    '09_Lookups',
    ['lookup_group', 'lookup_key', 'lookup_label', 'sort_order', 'applies_to_sheet', 'applies_to_field', 'status'],
    lookupRows,
  );

  return workbook;
}

export function writeDecisionStyleCleanWorkbook(): string {
  mkdirSync(path.dirname(workbookPath), { recursive: true });
  XLSX.writeFile(buildDecisionStyleCleanWorkbook(), workbookPath, { bookType: 'xlsx' });
  return decisionStyleWorkbookRelativePath;
}

async function main() {
  const outputPath = writeDecisionStyleCleanWorkbook();
  console.log(`Decision Style clean workbook draft written: ${outputPath}`);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';

if (import.meta.url === invokedPath) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
