import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';

import { auditRankedPatternWorkbookFile } from '@/content/assessment-packages/import-contract/ranked-pattern-package-audit';

export const REQUIRED_PACKAGE_SHEETS = Object.freeze([
  '00_Metadata',
  '01_Signals',
  '02_Questions',
  '03_Options',
  '04_Option_Weights',
  '05_Context',
  '06_Orientation',
  '07_Recognition',
  '08_Signal_Roles',
  '09_Pattern_Mechanics',
  '10_Pattern_Synthesis',
  '11_Strengths',
  '12_Narrowing',
  '13_Application',
  '14_Closing_Integration',
  '15_Report_Preview',
  '16_Import_Summary',
  '17_Validation_Reference',
  '18_Lookups',
] as const);

const GENERATED_SECTIONS = Object.freeze([
  { sheet: '06_Orientation', slug: '06-orientation' },
  { sheet: '07_Recognition', slug: '07-recognition' },
  { sheet: '08_Signal_Roles', slug: '08-signal-roles' },
  { sheet: '09_Pattern_Mechanics', slug: '09-pattern-mechanics' },
  { sheet: '10_Pattern_Synthesis', slug: '10-pattern-synthesis' },
  { sheet: '11_Strengths', slug: '11-strengths' },
  { sheet: '12_Narrowing', slug: '12-narrowing' },
  { sheet: '13_Application', slug: '13-application' },
  { sheet: '14_Closing_Integration', slug: '14-closing-integration' },
] as const);

const RUNTIME_SOURCE_PATTERNS = Object.freeze({
  '02_Questions': ['02-questions.psv', '02-questions.csv', '02-questions.json'],
  '03_Options': ['03-options.psv', '03-options.csv', '03-options.json'],
  '04_Option_Weights': ['04-option-weights.psv', '04-option-weights.csv', '04-option-weights.json'],
  '15_Report_Preview': ['15-report-preview.psv', '15-report-preview.csv', '15-report-preview.json'],
} as const);

type RequiredSheet = (typeof REQUIRED_PACKAGE_SHEETS)[number];
type GeneratedSheet = (typeof GENERATED_SECTIONS)[number]['sheet'];
type Severity = 'warning' | 'error';

const SUPPORTED_SCORE_SHAPES = Object.freeze(['concentrated', 'paired', 'graduated', 'balanced'] as const);
const SCORE_SHAPE_SPECIFIC_SECTIONS = Object.freeze([
  '06_Orientation',
  '07_Recognition',
  '09_Pattern_Mechanics',
  '10_Pattern_Synthesis',
  '14_Closing_Integration',
] as const satisfies readonly RequiredSheet[]);
const PATTERN_ONLY_SECTIONS = Object.freeze([
  '11_Strengths',
  '12_Narrowing',
  '13_Application',
] as const satisfies readonly RequiredSheet[]);
const RANK_FIELD_KEYS = Object.freeze([
  'rank_1_signal_key',
  'rank_2_signal_key',
  'rank_3_signal_key',
  'rank_4_signal_key',
] as const);
const PATTERN_LIST_LINKAGE_POLICIES = Object.freeze({
  '11_Strengths': {
    linkField: 'linked_signal_key',
    expectedRanksByPriority: Object.freeze({ 1: 1, 2: 2, 3: 3 }),
    mismatchCode: '11_STRENGTH_LINKED_SIGNAL_MISMATCH',
    duplicateCode: '11_STRENGTH_LINKED_SIGNAL_DUPLICATE',
    unknownCode: '11_STRENGTH_LINKED_SIGNAL_UNKNOWN',
  },
  '12_Narrowing': {
    linkField: 'missing_range_signal_key',
    expectedRanksByPriority: Object.freeze({ 1: 2, 2: 3, 3: 4 }),
    mismatchCode: '12_NARROWING_MISSING_RANGE_MISMATCH',
    duplicateCode: '12_NARROWING_MISSING_RANGE_DUPLICATE',
    unknownCode: '12_NARROWING_MISSING_RANGE_UNKNOWN',
  },
  '13_Application': {
    linkField: 'linked_signal_key',
    expectedRanksByPriority: Object.freeze({ 1: 1, 2: 2, 3: 4 }),
    mismatchCode: '13_APPLICATION_LINKED_SIGNAL_POLICY_MISMATCH',
    duplicateCode: '13_APPLICATION_LINKED_SIGNAL_DUPLICATE',
    unknownCode: '13_APPLICATION_LINKED_SIGNAL_UNKNOWN',
  },
} as const satisfies Record<
  (typeof PATTERN_ONLY_SECTIONS)[number],
  {
    readonly linkField: string;
    readonly expectedRanksByPriority: Readonly<Record<1 | 2 | 3, 1 | 2 | 3 | 4>>;
    readonly mismatchCode: string;
    readonly duplicateCode: string;
    readonly unknownCode: string;
  }
>);

export type AuthoringPackageCompilerArgs = {
  readonly assessmentKey: string;
  readonly domainKey: string;
  readonly authoringDir: string;
  readonly generatedDir: string;
  readonly templateWorkbook: string;
  readonly outputWorkbook: string;
  readonly dryRun: boolean;
  readonly write: boolean;
  readonly overwrite: boolean;
};

export type AuthoringCompilerDiagnostic = {
  readonly severity: Severity;
  readonly code: string;
  readonly message: string;
  readonly filePath?: string;
  readonly sheet?: string;
};

class AuthoringCompilerValidationError extends Error {
  constructor(readonly diagnostics: readonly AuthoringCompilerDiagnostic[]) {
    super(
      `Authoring package validation failed: ${diagnostics
        .slice(0, 8)
        .map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`)
        .join('; ')}${diagnostics.length > 8 ? `; and ${diagnostics.length - 8} more issue(s)` : ''}`,
    );
  }
}

export type AuthoringAssessmentConfig = {
  readonly assessmentKey?: string;
  readonly assessment_key?: string;
  readonly title?: string;
  readonly assessmentTitle?: string;
  readonly description?: string;
  readonly assessmentDescription?: string;
  readonly version?: string;
  readonly domainKey?: string;
  readonly domain_key?: string;
  readonly domainTitle?: string;
  readonly lifecycleStatus?: string;
  readonly status?: string;
  readonly patternListLinkagePolicy?: 'strict_rank_policy' | 'relationship_only';
  readonly context?: {
    readonly sectionKey?: string;
    readonly section_key?: string;
    readonly domainDefinition?: string;
    readonly domain_definition?: string;
    readonly domainScope?: string;
    readonly domain_scope?: string;
    readonly interpretationGuidance?: string;
    readonly interpretation_guidance?: string;
    readonly introNote?: string;
    readonly intro_note?: string;
    readonly status?: string;
    readonly lookupKey?: string;
    readonly lookup_key?: string;
  };
  readonly signals?: readonly {
    readonly key?: string;
    readonly label?: string;
    readonly title?: string;
    readonly shortDefinition?: string;
  }[];
};

export type PsvSourcePlan = {
  readonly sectionKey: GeneratedSheet;
  readonly filePath: string;
  readonly sourceKind: 'combined' | 'split';
  readonly headers: readonly string[];
  readonly rowCount: number;
  readonly duplicateKeys: readonly string[];
  readonly domainKeys: readonly string[];
};

export type SheetSourcePlan = {
  readonly sheet: RequiredSheet;
  readonly source: 'config' | 'generated_psv' | 'authoring_file' | 'template_workbook' | 'compile_metadata';
  readonly filePaths: readonly string[];
  readonly rowCount: number | null;
  readonly note: string;
};

export type AuthoringPackageDryRunPlan = {
  readonly mode: 'dry-run';
  readonly configPath: string;
  readonly configMetadata: {
    readonly assessmentKey: string | null;
    readonly title: string | null;
    readonly version: string | null;
    readonly domainKey: string | null;
    readonly signals: readonly { readonly key: string; readonly label: string | null }[];
  };
  readonly templateWorkbookPath: string;
  readonly templateSheets: readonly string[];
  readonly missingTemplateSheets: readonly RequiredSheet[];
  readonly generatedSources: readonly PsvSourcePlan[];
  readonly plannedSheets: readonly SheetSourcePlan[];
  readonly diagnostics: readonly AuthoringCompilerDiagnostic[];
  readonly outputWorkbook: string;
  readonly wroteWorkbook: false;
};

export type AuthoringPackageWriteResult = {
  readonly outputWorkbook: string;
  readonly rowCountsBySheet: Readonly<Record<RequiredSheet, number>>;
  readonly audit: ReturnType<typeof auditRankedPatternWorkbookFile>;
};

function normaliseReference(value: string): string {
  return value.trim().toLowerCase().replaceAll('_', '-');
}

function resolveProjectPath(filePath: string): string {
  return path.resolve(process.cwd(), filePath);
}

function reportPath(filePath: string): string {
  return filePath.replaceAll(path.sep, '/');
}

function readJsonConfig(configPath: string): AuthoringAssessmentConfig | null {
  if (!existsSync(configPath)) {
    return null;
  }

  return JSON.parse(readFileSync(configPath, 'utf8')) as AuthoringAssessmentConfig;
}

function configAssessmentKey(config: AuthoringAssessmentConfig | null): string | null {
  return config?.assessmentKey ?? config?.assessment_key ?? null;
}

function configDomainKey(config: AuthoringAssessmentConfig | null): string | null {
  return config?.domainKey ?? config?.domain_key ?? null;
}

function configTitle(config: AuthoringAssessmentConfig | null): string | null {
  return config?.title ?? config?.assessmentTitle ?? null;
}

function psvRows(filePath: string): Omit<PsvSourcePlan, 'sectionKey' | 'filePath' | 'sourceKind'> {
  const content = readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { headers: [], rowCount: 0, duplicateKeys: [], domainKeys: [] };
  }

  const headers = lines[0]!.split('|').map((header) => header.trim());
  const rows = lines.slice(1);
  const duplicateKeys = obviousDuplicateKeys(headers, rows);
  const domainKeyIndex = headers.findIndex((header) => header === 'domain_key');
  const domainKeys =
    domainKeyIndex >= 0
      ? [...new Set(rows.map((row) => row.split('|')[domainKeyIndex]?.trim() ?? '').filter(Boolean))].sort()
      : [];
  return { headers, rowCount: rows.length, duplicateKeys, domainKeys };
}

function obviousDuplicateKeys(headers: readonly string[], rows: readonly string[]): readonly string[] {
  const preferredKeys = ['lookup_key', 'row_key', 'pattern_key'];
  const keyIndex = preferredKeys
    .map((key) => headers.findIndex((header) => header.toLowerCase() === key))
    .find((index) => index !== undefined && index >= 0);

  if (keyIndex === undefined || keyIndex < 0) {
    return [];
  }

  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const row of rows) {
    const key = row.split('|')[keyIndex]?.trim();
    if (!key) {
      continue;
    }
    if (seen.has(key)) {
      duplicates.add(key);
    }
    seen.add(key);
  }

  return [...duplicates].sort();
}

function classifyGeneratedSource(fileName: string, sectionSlug: string, references: readonly string[]): 'combined' | 'split' | null {
  const lowerName = fileName.toLowerCase();
  for (const reference of references) {
    const combinedName = `${sectionSlug}-${reference}.psv`;
    const splitPrefix = `${sectionSlug}-${reference}-`;
    if (lowerName === combinedName) {
      return 'combined';
    }
    if (lowerName.startsWith(splitPrefix) && lowerName.endsWith('.psv')) {
      return 'split';
    }
  }

  return null;
}

function discoverGeneratedSources(args: AuthoringPackageCompilerArgs, config: AuthoringAssessmentConfig | null): readonly PsvSourcePlan[] {
  const generatedDir = resolveProjectPath(args.generatedDir);
  if (!existsSync(generatedDir)) {
    return [];
  }

  const references = [
    args.assessmentKey,
    args.domainKey,
    configAssessmentKey(config) ?? '',
    configDomainKey(config) ?? '',
  ]
    .filter(Boolean)
    .map(normaliseReference);
  const uniqueReferences = [...new Set(references)];
  const files = readdirSync(generatedDir)
    .filter((fileName) => fileName.toLowerCase().endsWith('.psv'))
    .sort((a, b) => a.localeCompare(b));
  const plans: PsvSourcePlan[] = [];

  for (const section of GENERATED_SECTIONS) {
    for (const fileName of files) {
      const sourceKind = classifyGeneratedSource(fileName, section.slug, uniqueReferences);
      if (!sourceKind) {
        continue;
      }

      const filePath = path.join(generatedDir, fileName);
      plans.push({
        sectionKey: section.sheet,
        filePath: reportPath(path.relative(process.cwd(), filePath)),
        sourceKind,
        ...psvRows(filePath),
      });
    }
  }

  return plans;
}

function workbookSheets(templateWorkbookPath: string): readonly string[] {
  if (!existsSync(templateWorkbookPath)) {
    return [];
  }

  return XLSX.readFile(templateWorkbookPath, { cellDates: false }).SheetNames;
}

function findAuthoringFile(authoringDir: string, fileNames: readonly string[]): string | null {
  for (const fileName of fileNames) {
    const filePath = path.join(authoringDir, fileName);
    if (existsSync(filePath) && statSync(filePath).isFile()) {
      return reportPath(path.relative(process.cwd(), filePath));
    }
  }

  return null;
}

function countDelimitedOrJsonRows(relativePath: string): number | null {
  const filePath = resolveProjectPath(relativePath);
  const extension = path.extname(filePath).toLowerCase();
  if (!existsSync(filePath)) {
    return null;
  }

  if (extension === '.json') {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
    return Array.isArray(parsed) ? parsed.length : null;
  }

  if (extension !== '.psv' && extension !== '.csv') {
    return null;
  }

  const content = readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return Math.max(0, lines.length - 1);
}

function sheetRows(workbook: XLSX.WorkBook, sheet: RequiredSheet): Record<string, unknown>[] {
  const worksheet = workbook.Sheets[sheet];
  if (!worksheet) {
    return [];
  }

  return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    raw: true,
  });
}

function sheetHeader(workbook: XLSX.WorkBook, sheet: RequiredSheet): readonly string[] {
  const worksheet = workbook.Sheets[sheet];
  if (!worksheet) {
    return [];
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    blankrows: false,
    defval: '',
    raw: true,
  });
  return (rows[0] ?? []).map((value) => String(value).trim());
}

function parseDelimitedRows(filePath: string): { readonly headers: readonly string[]; readonly rows: readonly Record<string, string>[] } {
  const content = readFileSync(resolveProjectPath(filePath), 'utf8').replace(/^\uFEFF/, '');
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
  const headers = (lines[0] ?? '').split('|').map((header) => header.trim());
  const rows = lines.slice(1).map((line) => {
    const cells = line.split('|');
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
  });

  return { headers, rows };
}

function sameHeaders(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((header, index) => header === right[index]);
}

function rowsToWorksheet(headers: readonly string[], rows: readonly Record<string, unknown>[]): XLSX.WorkSheet {
  return XLSX.utils.aoa_to_sheet([
    [...headers],
    ...rows.map((row) => headers.map((header) => row[header] ?? '')),
  ]);
}

function rowValue(row: Record<string, unknown>, key: string): string {
  return String(row[key] ?? '').trim();
}

function isActiveRow(row: Record<string, unknown>): boolean {
  const status = rowValue(row, 'status').toLowerCase();
  return status === '' || status === 'active';
}

function expectedPatternKey(row: Record<string, unknown>): string {
  return RANK_FIELD_KEYS.map((key) => rowValue(row, key)).join('_');
}

function permutations(values: readonly string[]): readonly string[] {
  if (values.length <= 1) {
    return values.length === 1 ? [values[0]!] : [];
  }

  return values.flatMap((value, index) =>
    permutations([...values.slice(0, index), ...values.slice(index + 1)]).map((rest) => `${value}_${rest}`),
  );
}

function rankedSignalsFromPatternKey(patternKey: string, signalKeys: readonly string[]): readonly string[] {
  function signalPermutations(values: readonly string[]): readonly string[][] {
    if (values.length <= 1) {
      return values.length === 1 ? [[values[0]!]] : [];
    }

    return values.flatMap((value, index) =>
      signalPermutations([...values.slice(0, index), ...values.slice(index + 1)]).map((rest) => [value, ...rest]),
    );
  }

  return signalPermutations(signalKeys).find((candidate) => candidate.join('_') === patternKey) ?? [];
}

function validatePatternListLinkage(input: {
  readonly rows: readonly Record<string, unknown>[];
  readonly sheet: (typeof PATTERN_ONLY_SECTIONS)[number];
  readonly expectedPatternKeys: ReadonlySet<string>;
  readonly signalKeys: readonly string[];
  readonly linkagePolicy: 'strict_rank_policy' | 'relationship_only';
  readonly diagnostics: AuthoringCompilerDiagnostic[];
}): void {
  const policy = PATTERN_LIST_LINKAGE_POLICIES[input.sheet];
  const rowsByPattern = new Map<string, Record<string, unknown>[]>();
  for (const row of input.rows) {
    const patternKey = rowValue(row, 'pattern_key');
    rowsByPattern.set(patternKey, [...(rowsByPattern.get(patternKey) ?? []), row]);
  }

  for (const patternKey of input.expectedPatternKeys) {
    const patternRows = rowsByPattern.get(patternKey) ?? [];
    if (patternRows.length !== 3) {
      input.diagnostics.push({
        severity: 'error',
        code: 'PATTERN_LIST_ROW_COUNT_INVALID',
        message: `${input.sheet} pattern_key ${patternKey} must have exactly 3 active rows; found ${patternRows.length}.`,
        sheet: input.sheet,
      });
    }

    const rowsByPriority = new Map<string, Record<string, unknown>[]>();
    for (const row of patternRows) {
      const priority = rowValue(row, 'priority');
      rowsByPriority.set(priority, [...(rowsByPriority.get(priority) ?? []), row]);
    }

    for (const priority of ['1', '2', '3'] as const) {
      const rowsForPriority = rowsByPriority.get(priority) ?? [];
      if (rowsForPriority.length !== 1) {
        input.diagnostics.push({
          severity: 'error',
          code: 'PATTERN_LIST_PRIORITY_COVERAGE_INVALID',
          message: `${input.sheet} pattern_key ${patternKey} must have priority ${priority} exactly once; found ${rowsForPriority.length}.`,
          sheet: input.sheet,
        });
      }
    }

    const patternSignals = rankedSignalsFromPatternKey(patternKey, input.signalKeys);
    const seenLinkedSignals = new Set<string>();
    for (const row of patternRows) {
      const priority = Number(rowValue(row, 'priority')) as 1 | 2 | 3;
      const linkedSignal = rowValue(row, policy.linkField);

      if (input.linkagePolicy === 'strict_rank_policy' && seenLinkedSignals.has(linkedSignal)) {
        input.diagnostics.push({
          severity: 'error',
          code: policy.duplicateCode,
          message: `${input.sheet} pattern_key ${patternKey} repeats ${policy.linkField} ${linkedSignal}.`,
          sheet: input.sheet,
        });
      }
      seenLinkedSignals.add(linkedSignal);

      if (!patternSignals.includes(linkedSignal)) {
        input.diagnostics.push({
          severity: 'error',
          code: policy.unknownCode,
          message: `${input.sheet} pattern_key ${patternKey} ${policy.linkField} ${linkedSignal} is not one of the ranked signals.`,
          sheet: input.sheet,
        });
        continue;
      }

      if (input.linkagePolicy === 'relationship_only') {
        continue;
      }

      const expectedRank = policy.expectedRanksByPriority[priority];
      if (!expectedRank) {
        continue;
      }
      const expectedSignal = patternSignals[expectedRank - 1];
      if (linkedSignal !== expectedSignal) {
        input.diagnostics.push({
          severity: 'error',
          code: policy.mismatchCode,
          message: `${input.sheet} pattern_key ${patternKey} priority ${priority} expected ${expectedSignal} but found ${linkedSignal}.`,
          sheet: input.sheet,
        });
      }
    }
  }
}

function emptyRowsBySheet(): Record<RequiredSheet, Record<string, unknown>[]> {
  return REQUIRED_PACKAGE_SHEETS.reduce(
    (accumulator, sheet) => ({
      ...accumulator,
      [sheet]: [],
    }),
    {} as Record<RequiredSheet, Record<string, unknown>[]>,
  );
}

function headersBySheetFromWorkbook(workbook: XLSX.WorkBook): Record<RequiredSheet, readonly string[]> {
  return REQUIRED_PACKAGE_SHEETS.reduce(
    (accumulator, sheet) => ({
      ...accumulator,
      [sheet]: sheetHeader(workbook, sheet),
    }),
    {} as Record<RequiredSheet, readonly string[]>,
  );
}

function replaceWorkbookSheet(
  workbook: XLSX.WorkBook,
  sheet: RequiredSheet,
  headers: readonly string[],
  rows: readonly Record<string, unknown>[],
): void {
  workbook.Sheets[sheet] = rowsToWorksheet(headers, rows);
  if (!workbook.SheetNames.includes(sheet)) {
    workbook.SheetNames.push(sheet);
  }
}

function rewriteDomainValues(row: Record<string, unknown>, domainKey: string): Record<string, unknown> {
  const next = { ...row };
  const existingDomainKey = typeof next.domain_key === 'string' ? next.domain_key : '';
  if ('domain_key' in next) {
    next.domain_key = domainKey;
  }
  if (typeof next.lookup_key === 'string') {
    if (existingDomainKey && next.lookup_key.startsWith(`${existingDomainKey}::`)) {
      next.lookup_key = `${domainKey}::${next.lookup_key.slice(`${existingDomainKey}::`.length)}`;
    } else if (existingDomainKey && next.lookup_key.startsWith(`${existingDomainKey}_`)) {
      next.lookup_key = `${domainKey}_${next.lookup_key.slice(`${existingDomainKey}_`.length)}`;
    }
  }
  return next;
}

function compileMetadataRow(
  templateWorkbook: XLSX.WorkBook,
  config: AuthoringAssessmentConfig | null,
  args: AuthoringPackageCompilerArgs,
): Record<string, unknown> {
  const base = sheetRows(templateWorkbook, '00_Metadata')[0] ?? {};
  const version = config?.version ?? String(base.version ?? '');
  const title = configTitle(config) ?? config?.domainTitle ?? String(base.assessment_title ?? '');

  return {
    ...base,
    assessment_key: args.assessmentKey,
    version,
    assessment_title: title,
    assessment_description: config?.description ?? config?.assessmentDescription ?? String(base.assessment_description ?? ''),
    domain_key: args.domainKey,
    domain_title: config?.domainTitle ?? String(base.domain_title ?? title),
    lifecycle_status: config?.lifecycleStatus ?? String(base.lifecycle_status ?? 'draft'),
    status: config?.status ?? String(base.status ?? 'active'),
    lookup_key: `${args.assessmentKey}::${version}`,
  };
}

function compileSignalRows(config: AuthoringAssessmentConfig | null, args: AuthoringPackageCompilerArgs): readonly Record<string, unknown>[] {
  return (config?.signals ?? []).map((signal, index) => ({
    domain_key: args.domainKey,
    signal_key: signal.key ?? '',
    signal_label: signal.label ?? signal.title ?? signal.key ?? '',
    signal_description: signal.shortDefinition ?? '',
    signal_order: index + 1,
    scored: 'true',
    status: 'active',
    lookup_key: `${args.domainKey}::${signal.key ?? ''}`,
  }));
}

function compileContextRows(
  templateWorkbook: XLSX.WorkBook,
  config: AuthoringAssessmentConfig | null,
  args: AuthoringPackageCompilerArgs,
): readonly Record<string, unknown>[] {
  const base = sheetRows(templateWorkbook, '05_Context')[0] ?? {};
  const context = config?.context;
  return [
    {
      ...base,
      domain_key: args.domainKey,
      section_key: context?.sectionKey ?? context?.section_key ?? base.section_key ?? 'context',
      domain_title: config?.domainTitle ?? base.domain_title ?? '',
      domain_definition: context?.domainDefinition ?? context?.domain_definition ?? base.domain_definition ?? '',
      domain_scope: context?.domainScope ?? context?.domain_scope ?? base.domain_scope ?? '',
      interpretation_guidance:
        context?.interpretationGuidance ?? context?.interpretation_guidance ?? base.interpretation_guidance ?? '',
      intro_note: context?.introNote ?? context?.intro_note ?? base.intro_note ?? '',
      status: context?.status ?? base.status ?? 'active',
      lookup_key: context?.lookupKey ?? context?.lookup_key ?? `${args.domainKey}::context`,
    },
  ];
}

function compileImportSummaryRows(
  templateWorkbook: XLSX.WorkBook,
  config: AuthoringAssessmentConfig | null,
  args: AuthoringPackageCompilerArgs,
  rowCounts: Readonly<Record<RequiredSheet, number>>,
): readonly Record<string, unknown>[] {
  const base = sheetRows(templateWorkbook, '16_Import_Summary')[0] ?? {};
  const version = config?.version ?? String(sheetRows(templateWorkbook, '00_Metadata')[0]?.version ?? '');
  const runtimeDefinitionRowCount =
    rowCounts['00_Metadata'] +
    rowCounts['01_Signals'] +
    rowCounts['02_Questions'] +
    rowCounts['03_Options'] +
    rowCounts['04_Option_Weights'];
  const runtimeResultContentRowCount =
    rowCounts['05_Context'] +
    rowCounts['06_Orientation'] +
    rowCounts['07_Recognition'] +
    rowCounts['08_Signal_Roles'] +
    rowCounts['09_Pattern_Mechanics'] +
    rowCounts['10_Pattern_Synthesis'] +
    rowCounts['11_Strengths'] +
    rowCounts['12_Narrowing'] +
    rowCounts['13_Application'] +
    rowCounts['14_Closing_Integration'];

  return [
    {
      ...base,
      import_summary_key: `${args.domainKey}_compiled_summary`,
      assessment_key: args.assessmentKey,
      version,
      package_identifier: `${args.assessmentKey}-compiled-package`,
      source_name: path.basename(args.outputWorkbook),
      runtime_definition_row_count: runtimeDefinitionRowCount,
      runtime_result_content_row_count: runtimeResultContentRowCount,
      preview_row_count: rowCounts['15_Report_Preview'],
      validation_notes: 'Compiled from authoring sources by scripts/authoring/compile-assessment-package.ts.',
      status: 'active',
      lookup_key: `${args.domainKey}::import_summary`,
    },
  ];
}

function planSheetSources(
  args: AuthoringPackageCompilerArgs,
  generatedSources: readonly PsvSourcePlan[],
): readonly SheetSourcePlan[] {
  const authoringDir = resolveProjectPath(args.authoringDir);

  return REQUIRED_PACKAGE_SHEETS.map((sheet) => {
    if (sheet === '00_Metadata') {
      return {
        sheet,
        source: 'config',
        filePaths: [reportPath(path.join(args.authoringDir, '00-assessment-authoring-config.json'))],
        rowCount: 1,
        note: 'Assessment metadata planned from authoring config.',
      };
    }

    if (sheet === '01_Signals') {
      return {
        sheet,
        source: 'config',
        filePaths: [reportPath(path.join(args.authoringDir, '00-assessment-authoring-config.json'))],
        rowCount: null,
        note: 'Signal rows planned from authoring config signals.',
      };
    }

    if (sheet === '05_Context') {
      const contextPath = findAuthoringFile(authoringDir, ['05-context.psv', '05-context.csv', '05-context.json', '01-context-seed.md']);
      return {
        sheet,
        source: contextPath ? 'authoring_file' : 'template_workbook',
        filePaths: contextPath ? [contextPath] : [args.templateWorkbook],
        rowCount: contextPath ? countDelimitedOrJsonRows(contextPath) : null,
        note: contextPath
          ? 'Context planned from authoring context source.'
          : 'Context source not found; planner will use template/base workbook for now.',
      };
    }

    if (sheet === '16_Import_Summary') {
      return {
        sheet,
        source: 'compile_metadata',
        filePaths: [reportPath(path.join(args.authoringDir, '00-assessment-authoring-config.json'))],
        rowCount: 1,
        note: 'Compile summary planned from config and compiler metadata.',
      };
    }

    if (sheet === '17_Validation_Reference' || sheet === '18_Lookups') {
      return {
        sheet,
        source: 'template_workbook',
        filePaths: [args.templateWorkbook],
        rowCount: null,
        note: 'Reference sheet planned from template workbook.',
      };
    }

    if (sheet in RUNTIME_SOURCE_PATTERNS) {
      const runtimePath = findAuthoringFile(
        authoringDir,
        RUNTIME_SOURCE_PATTERNS[sheet as keyof typeof RUNTIME_SOURCE_PATTERNS],
      );
      return {
        sheet,
        source: runtimePath ? 'authoring_file' : 'template_workbook',
        filePaths: runtimePath ? [runtimePath] : [args.templateWorkbook],
        rowCount: runtimePath ? countDelimitedOrJsonRows(runtimePath) : null,
        note: runtimePath
          ? 'Runtime sheet planned from explicit authoring source.'
          : 'Explicit authoring source not found; planner will use template/base workbook for now.',
      };
    }

    const discoveredSectionSources = generatedSources.filter((source) => source.sectionKey === sheet);
    const combinedSources = discoveredSectionSources.filter((source) => source.sourceKind === 'combined');
    const sectionSources = combinedSources.length > 0 ? combinedSources : discoveredSectionSources;
    return {
      sheet,
      source: 'generated_psv',
      filePaths: sectionSources.map((source) => source.filePath),
      rowCount: sectionSources.reduce((total, source) => total + source.rowCount, 0),
      note:
        sectionSources.length > 0
          ? `Generated result-language planned from ${sectionSources.length} PSV source(s).`
          : 'No generated result-language PSV source found for this section.',
    };
  });
}

function diagnosticsForPlan(
  config: AuthoringAssessmentConfig | null,
  args: AuthoringPackageCompilerArgs,
  templateSheets: readonly string[],
  generatedSources: readonly PsvSourcePlan[],
): readonly AuthoringCompilerDiagnostic[] {
  const diagnostics: AuthoringCompilerDiagnostic[] = [];
  const configPath = reportPath(path.join(args.authoringDir, '00-assessment-authoring-config.json'));

  if (!config) {
    diagnostics.push({
      severity: 'error',
      code: 'AUTHORING_CONFIG_MISSING',
      message: 'Assessment authoring config was not found.',
      filePath: configPath,
    });
  }

  const configKey = configAssessmentKey(config);
  if (configKey && configKey !== args.assessmentKey) {
    diagnostics.push({
      severity: 'warning',
      code: 'ASSESSMENT_KEY_MISMATCH',
      message: `Config assessment key ${configKey} does not match CLI assessment key ${args.assessmentKey}.`,
      filePath: configPath,
    });
  }

  const configDomain = configDomainKey(config);
  if (configDomain && configDomain !== args.domainKey) {
    diagnostics.push({
      severity: 'warning',
      code: 'DOMAIN_KEY_MISMATCH',
      message: `Config domain key ${configDomain} does not match CLI domain key ${args.domainKey}.`,
      filePath: configPath,
    });
  }

  if (templateSheets.length === 0) {
    diagnostics.push({
      severity: 'error',
      code: 'TEMPLATE_WORKBOOK_MISSING',
      message: 'Template workbook was not found or could not be read.',
      filePath: args.templateWorkbook,
    });
  }

  const templateSheetSet = new Set(templateSheets);
  for (const sheet of REQUIRED_PACKAGE_SHEETS) {
    if (!templateSheetSet.has(sheet)) {
      diagnostics.push({
        severity: 'error',
        code: 'TEMPLATE_SHEET_MISSING',
        message: `Template workbook is missing required sheet ${sheet}.`,
        filePath: args.templateWorkbook,
        sheet,
      });
    }
  }

  for (const section of GENERATED_SECTIONS) {
    const sectionSources = generatedSources.filter((source) => source.sectionKey === section.sheet);
    if (sectionSources.length === 0) {
      diagnostics.push({
        severity: 'warning',
        code: 'GENERATED_SECTION_MISSING',
        message: `No generated PSV source was found for ${section.sheet}.`,
        filePath: args.generatedDir,
        sheet: section.sheet,
      });
    }

    for (const source of sectionSources) {
      if (source.headers.length === 0) {
        diagnostics.push({
          severity: 'warning',
          code: 'GENERATED_PSV_EMPTY',
          message: `${source.filePath} is empty.`,
          filePath: source.filePath,
          sheet: source.sectionKey,
        });
      }

      if (source.duplicateKeys.length > 0) {
        diagnostics.push({
          severity: 'warning',
          code: 'GENERATED_PSV_DUPLICATE_KEYS',
          message: `${source.filePath} has duplicate key values: ${source.duplicateKeys.slice(0, 6).join(', ')}.`,
          filePath: source.filePath,
          sheet: source.sectionKey,
        });
      }

      const unexpectedDomainKeys = source.domainKeys.filter((domainKey) => domainKey !== args.domainKey);
      if (unexpectedDomainKeys.length > 0) {
        diagnostics.push({
          severity: 'warning',
          code: 'GENERATED_DOMAIN_KEY_MISMATCH',
          message: `${source.filePath} has domain_key values that do not match ${args.domainKey}: ${unexpectedDomainKeys.join(', ')}.`,
          filePath: source.filePath,
          sheet: source.sectionKey,
        });
      }
    }
  }

  return diagnostics;
}

export function planAuthoringPackageCompile(args: AuthoringPackageCompilerArgs): AuthoringPackageDryRunPlan {
  const configPath = reportPath(path.join(args.authoringDir, '00-assessment-authoring-config.json'));
  const config = readJsonConfig(resolveProjectPath(configPath));
  const templateWorkbookPath = args.templateWorkbook;
  const templateSheets = workbookSheets(resolveProjectPath(templateWorkbookPath));
  const generatedSources = discoverGeneratedSources(args, config);
  const plannedSheets = planSheetSources(args, generatedSources);
  const missingTemplateSheets = REQUIRED_PACKAGE_SHEETS.filter((sheet) => !templateSheets.includes(sheet));
  const diagnostics = diagnosticsForPlan(config, args, templateSheets, generatedSources);

  return {
    mode: 'dry-run',
    configPath,
    configMetadata: {
      assessmentKey: configAssessmentKey(config),
      title: configTitle(config),
      version: config?.version ?? null,
      domainKey: configDomainKey(config),
      signals: (config?.signals ?? []).map((signal) => ({
        key: signal.key ?? '',
        label: signal.label ?? signal.title ?? null,
      })),
    },
    templateWorkbookPath,
    templateSheets,
    missingTemplateSheets,
    generatedSources,
    plannedSheets,
    diagnostics,
    outputWorkbook: args.outputWorkbook,
    wroteWorkbook: false,
  };
}

function validateWritePlan(
  plan: AuthoringPackageDryRunPlan,
  config: AuthoringAssessmentConfig | null,
  args: AuthoringPackageCompilerArgs,
  templateWorkbook: XLSX.WorkBook,
): void {
  const errorDiagnostics = plan.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  if (errorDiagnostics.length > 0) {
    throw new Error(`Authoring package plan has blocking errors: ${errorDiagnostics.map((diagnostic) => diagnostic.code).join(', ')}`);
  }

  const configDomain = configDomainKey(config);
  if (configDomain !== args.domainKey) {
    throw new Error(
      `domain_key mismatch: authoring config uses ${configDomain ?? 'missing'}, but CLI requested ${args.domainKey}. Update the config explicitly; the compiler will not normalise domain keys.`,
    );
  }

  const templateSheetSet = new Set(templateWorkbook.SheetNames);
  for (const sheet of REQUIRED_PACKAGE_SHEETS) {
    if (!templateSheetSet.has(sheet)) {
      throw new Error(`Template workbook is missing required sheet ${sheet}.`);
    }
  }

  for (const section of GENERATED_SECTIONS) {
    const sheetPlan = plan.plannedSheets.find((sheet) => sheet.sheet === section.sheet);
    if (!sheetPlan || sheetPlan.filePaths.length === 0) {
      throw new Error(`Generated result-language source is missing for ${section.sheet}.`);
    }
  }
}

function compileRowsForSheet(
  sheetPlan: SheetSourcePlan,
  templateWorkbook: XLSX.WorkBook,
  config: AuthoringAssessmentConfig | null,
  args: AuthoringPackageCompilerArgs,
  rowCounts: Readonly<Record<RequiredSheet, number>>,
): readonly Record<string, unknown>[] {
  switch (sheetPlan.sheet) {
    case '00_Metadata':
      return [compileMetadataRow(templateWorkbook, config, args)];
    case '01_Signals':
      return compileSignalRows(config, args);
    case '05_Context':
      return compileContextRows(templateWorkbook, config, args);
    case '16_Import_Summary':
      return compileImportSummaryRows(templateWorkbook, config, args, rowCounts);
    case '17_Validation_Reference':
    case '18_Lookups':
      return sheetRows(templateWorkbook, sheetPlan.sheet);
    default:
      break;
  }

  if (sheetPlan.source === 'template_workbook') {
    return sheetRows(templateWorkbook, sheetPlan.sheet).map((row) => rewriteDomainValues(row, args.domainKey));
  }

  if (sheetPlan.source === 'authoring_file') {
    const sourcePath = sheetPlan.filePaths[0];
    if (!sourcePath || !['.psv', '.csv', '.json'].includes(path.extname(sourcePath).toLowerCase())) {
      return sheetRows(templateWorkbook, sheetPlan.sheet).map((row) => rewriteDomainValues(row, args.domainKey));
    }
    if (path.extname(sourcePath).toLowerCase() === '.json') {
      const parsed = JSON.parse(readFileSync(resolveProjectPath(sourcePath), 'utf8')) as unknown;
      if (!Array.isArray(parsed)) {
        throw new Error(`${sourcePath} must contain an array of rows.`);
      }
      return parsed as Record<string, unknown>[];
    }
    return parseDelimitedRows(sourcePath).rows;
  }

  if (sheetPlan.source === 'generated_psv') {
    const templateHeaders = sheetHeader(templateWorkbook, sheetPlan.sheet);
    return sheetPlan.filePaths.flatMap((filePath) => {
      const parsed = parseDelimitedRows(filePath);
      if (!sameHeaders(parsed.headers, templateHeaders)) {
        throw new Error(`Header mismatch for ${sheetPlan.sheet}: ${filePath} does not match the template workbook header.`);
      }
      const unexpectedDomainKeys = [...new Set(parsed.rows.map((row) => row.domain_key).filter(Boolean))]
        .filter((domainKey) => domainKey !== args.domainKey);
      if (unexpectedDomainKeys.length > 0) {
        throw new Error(
          `domain_key mismatch in ${filePath}: expected ${args.domainKey}; found ${unexpectedDomainKeys.join(', ')}.`,
        );
      }
      return parsed.rows;
    });
  }

  throw new Error(`Unsupported sheet source ${sheetPlan.source} for ${sheetPlan.sheet}.`);
}

function validateCompiledWorkbookRows(
  rowsBySheet: Readonly<Record<RequiredSheet, readonly Record<string, unknown>[]>>,
  headersBySheet: Readonly<Record<RequiredSheet, readonly string[]>>,
  templateHeadersBySheet: Readonly<Record<RequiredSheet, readonly string[]>>,
  config: AuthoringAssessmentConfig | null,
  args: AuthoringPackageCompilerArgs,
): void {
  const diagnostics: AuthoringCompilerDiagnostic[] = [];
  const activeRowsBySheet = Object.fromEntries(
    REQUIRED_PACKAGE_SHEETS.map((sheet) => [sheet, rowsBySheet[sheet].filter(isActiveRow)]),
  ) as Record<RequiredSheet, Record<string, unknown>[]>;

  for (const sheet of REQUIRED_PACKAGE_SHEETS) {
    if (!rowsBySheet[sheet]) {
      diagnostics.push({
        severity: 'error',
        code: 'OUTPUT_SHEET_MISSING',
        message: `Generated workbook is missing required sheet ${sheet}.`,
        sheet,
      });
      continue;
    }

    if (!sameHeaders(headersBySheet[sheet], templateHeadersBySheet[sheet])) {
      diagnostics.push({
        severity: 'error',
        code: 'OUTPUT_HEADER_MISMATCH',
        message: `${sheet} headers do not match the template/import contract exactly.`,
        sheet,
      });
    }

    const seenLookupKeys = new Set<string>();
    for (const [rowIndex, row] of rowsBySheet[sheet].entries()) {
      const rowNumber = rowIndex + 2;
      const lookupKey = rowValue(row, 'lookup_key');
      if (lookupKey) {
        const duplicateKey = `${sheet}::${lookupKey}`;
        if (seenLookupKeys.has(duplicateKey)) {
          diagnostics.push({
            severity: 'error',
            code: 'DUPLICATE_LOOKUP_KEY',
            message: `${sheet} has duplicate lookup_key ${lookupKey} at row ${rowNumber}.`,
            sheet,
          });
        }
        seenLookupKeys.add(duplicateKey);
      }

      for (const header of headersBySheet[sheet]) {
        if (rowValue(row, header) === '') {
          diagnostics.push({
            severity: 'error',
            code: 'BLANK_REQUIRED_FIELD',
            message: `${sheet} row ${rowNumber} has a blank required field: ${header}.`,
            sheet,
          });
        }
      }
    }
  }

  const metadataRows = activeRowsBySheet['00_Metadata'];
  if (metadataRows.length !== 1) {
    diagnostics.push({
      severity: 'error',
      code: 'METADATA_ROW_COUNT_INVALID',
      message: `00_Metadata must contain exactly one active row; found ${metadataRows.length}.`,
      sheet: '00_Metadata',
    });
  }

  const signals = activeRowsBySheet['01_Signals'].filter((row) => rowValue(row, 'scored').toLowerCase() === 'true');
  const signalKeys = signals.map((row) => rowValue(row, 'signal_key')).filter(Boolean);
  const signalKeySet = new Set(signalKeys);
  if (signals.length !== 4 || signalKeySet.size !== 4) {
    diagnostics.push({
      severity: 'error',
      code: 'SCORED_SIGNAL_COUNT_INVALID',
      message: `01_Signals must contain exactly four distinct active scored signals; found ${signals.length}.`,
      sheet: '01_Signals',
    });
  }

  const expectedPatternKeys = new Set(permutations(signalKeys));
  if (expectedPatternKeys.size !== 24) {
    diagnostics.push({
      severity: 'error',
      code: 'PATTERN_SET_INVALID',
      message: `Expected 24 ranked patterns from the four scored signals; found ${expectedPatternKeys.size}.`,
      sheet: '01_Signals',
    });
  }

  const questionKeys = new Set(activeRowsBySheet['02_Questions'].map((row) => rowValue(row, 'question_key')));
  const options = activeRowsBySheet['03_Options'];
  const optionKeysByQuestion = new Map<string, Set<string>>();
  for (const option of options) {
    const questionKey = rowValue(option, 'question_key');
    const optionKey = rowValue(option, 'option_key');
    if (!questionKeys.has(questionKey)) {
      diagnostics.push({
        severity: 'error',
        code: 'OPTION_QUESTION_NOT_FOUND',
        message: `03_Options references missing question_key ${questionKey}.`,
        sheet: '03_Options',
      });
    }
    const optionKeys = optionKeysByQuestion.get(questionKey) ?? new Set<string>();
    optionKeys.add(optionKey);
    optionKeysByQuestion.set(questionKey, optionKeys);
  }

  const weightedOptions = new Set<string>();
  for (const weight of activeRowsBySheet['04_Option_Weights']) {
    const questionKey = rowValue(weight, 'question_key');
    const optionKey = rowValue(weight, 'option_key');
    const signalKey = rowValue(weight, 'signal_key');
    if (!questionKeys.has(questionKey)) {
      diagnostics.push({
        severity: 'error',
        code: 'WEIGHT_QUESTION_NOT_FOUND',
        message: `04_Option_Weights references missing question_key ${questionKey}.`,
        sheet: '04_Option_Weights',
      });
    }
    if (!optionKeysByQuestion.get(questionKey)?.has(optionKey)) {
      diagnostics.push({
        severity: 'error',
        code: 'WEIGHT_OPTION_NOT_FOUND',
        message: `04_Option_Weights references missing option ${questionKey}/${optionKey}.`,
        sheet: '04_Option_Weights',
      });
    }
    if (!signalKeySet.has(signalKey)) {
      diagnostics.push({
        severity: 'error',
        code: 'WEIGHT_SIGNAL_NOT_FOUND',
        message: `04_Option_Weights references missing signal_key ${signalKey}.`,
        sheet: '04_Option_Weights',
      });
    }
    weightedOptions.add(`${questionKey}::${optionKey}`);
  }

  for (const option of options.filter((row) => rowValue(row, 'is_scored').toLowerCase() === 'true')) {
    const optionKey = `${rowValue(option, 'question_key')}::${rowValue(option, 'option_key')}`;
    if (!weightedOptions.has(optionKey)) {
      diagnostics.push({
        severity: 'error',
        code: 'SCORED_OPTION_WEIGHT_MISSING',
        message: `Scored option ${optionKey} has no option_signal_weights row.`,
        sheet: '04_Option_Weights',
      });
    }
  }

  for (const sheet of SCORE_SHAPE_SPECIFIC_SECTIONS) {
    const coverage = new Set<string>();
    for (const row of activeRowsBySheet[sheet]) {
      const scoreShape = rowValue(row, 'score_shape');
      const patternKey = rowValue(row, 'pattern_key');
      if (!SUPPORTED_SCORE_SHAPES.includes(scoreShape as (typeof SUPPORTED_SCORE_SHAPES)[number])) {
        diagnostics.push({
          severity: 'error',
          code: 'UNSUPPORTED_SCORE_SHAPE',
          message: `${sheet} has unsupported score_shape ${scoreShape}.`,
          sheet,
        });
      }
      if (!expectedPatternKeys.has(patternKey)) {
        diagnostics.push({
          severity: 'error',
          code: 'UNKNOWN_PATTERN_KEY',
          message: `${sheet} has pattern_key ${patternKey}, which is not one of the 24 signal permutations.`,
          sheet,
        });
      }
      if (RANK_FIELD_KEYS.every((key) => key in row) && patternKey !== expectedPatternKey(row)) {
        diagnostics.push({
          severity: 'error',
          code: 'PATTERN_RANK_MISMATCH',
          message: `${sheet} pattern_key ${patternKey} does not match rank_1 through rank_4 (${expectedPatternKey(row)}).`,
          sheet,
        });
      }
      coverage.add(`${patternKey}::${scoreShape}`);
    }

    for (const patternKey of expectedPatternKeys) {
      for (const scoreShape of SUPPORTED_SCORE_SHAPES) {
        if (!coverage.has(`${patternKey}::${scoreShape}`)) {
          diagnostics.push({
            severity: 'error',
            code: 'SCORE_SHAPE_COVERAGE_MISSING',
            message: `${sheet} is missing coverage for pattern_key ${patternKey} and score_shape ${scoreShape}.`,
            sheet,
          });
        }
      }
    }
  }

  const signalRoleCoverage = new Set(
    activeRowsBySheet['08_Signal_Roles'].map((row) => `${rowValue(row, 'signal_key')}::${rowValue(row, 'rank_position')}`),
  );
  for (const signalKey of signalKeys) {
    for (const rankPosition of ['1', '2', '3', '4']) {
      if (!signalRoleCoverage.has(`${signalKey}::${rankPosition}`)) {
        diagnostics.push({
          severity: 'error',
          code: 'SIGNAL_ROLE_COVERAGE_MISSING',
          message: `08_Signal_Roles is missing signal_key ${signalKey} at rank_position ${rankPosition}.`,
          sheet: '08_Signal_Roles',
        });
      }
    }
  }

  for (const sheet of PATTERN_ONLY_SECTIONS) {
    const coverage = new Set(activeRowsBySheet[sheet].map((row) => rowValue(row, 'pattern_key')));
    for (const patternKey of expectedPatternKeys) {
      if (!coverage.has(patternKey)) {
        diagnostics.push({
          severity: 'error',
          code: 'PATTERN_COVERAGE_MISSING',
          message: `${sheet} is missing coverage for pattern_key ${patternKey}.`,
          sheet,
        });
      }
    }
    validatePatternListLinkage({
      rows: activeRowsBySheet[sheet],
      sheet,
      expectedPatternKeys,
      signalKeys,
      linkagePolicy: config?.patternListLinkagePolicy ?? 'strict_rank_policy',
      diagnostics,
    });
  }

  const importSummary = activeRowsBySheet['16_Import_Summary'][0];
  if (importSummary) {
    const runtimeDefinitionRowCount =
      rowsBySheet['00_Metadata'].length +
      rowsBySheet['01_Signals'].length +
      rowsBySheet['02_Questions'].length +
      rowsBySheet['03_Options'].length +
      rowsBySheet['04_Option_Weights'].length;
    const runtimeResultContentRowCount =
      rowsBySheet['05_Context'].length +
      rowsBySheet['06_Orientation'].length +
      rowsBySheet['07_Recognition'].length +
      rowsBySheet['08_Signal_Roles'].length +
      rowsBySheet['09_Pattern_Mechanics'].length +
      rowsBySheet['10_Pattern_Synthesis'].length +
      rowsBySheet['11_Strengths'].length +
      rowsBySheet['12_Narrowing'].length +
      rowsBySheet['13_Application'].length +
      rowsBySheet['14_Closing_Integration'].length;
    const expectedCounts = {
      runtime_definition_row_count: runtimeDefinitionRowCount,
      runtime_result_content_row_count: runtimeResultContentRowCount,
      preview_row_count: rowsBySheet['15_Report_Preview'].length,
    };

    for (const [field, expected] of Object.entries(expectedCounts)) {
      const actual = Number(rowValue(importSummary, field));
      if (actual !== expected) {
        diagnostics.push({
          severity: 'error',
          code: 'IMPORT_SUMMARY_ROW_COUNT_MISMATCH',
          message: `16_Import_Summary ${field} must be ${expected}; found ${rowValue(importSummary, field)}.`,
          sheet: '16_Import_Summary',
        });
      }
    }
  }

  if (diagnostics.length > 0) {
    throw new AuthoringCompilerValidationError(diagnostics);
  }
}

export function compileAuthoringPackageWorkbook(args: AuthoringPackageCompilerArgs): AuthoringPackageWriteResult {
  const templatePath = resolveProjectPath(args.templateWorkbook);
  const outputPath = resolveProjectPath(args.outputWorkbook);
  if (path.resolve(templatePath) === path.resolve(outputPath)) {
    throw new Error('Output workbook must not be the same file as the template workbook.');
  }
  if (existsSync(outputPath) && !args.overwrite) {
    throw new Error(`Output workbook already exists: ${args.outputWorkbook}. Re-run with --overwrite to replace it.`);
  }

  const configPath = reportPath(path.join(args.authoringDir, '00-assessment-authoring-config.json'));
  const config = readJsonConfig(resolveProjectPath(configPath));
  const plan = planAuthoringPackageCompile(args);
  const templateWorkbook = XLSX.readFile(templatePath, { cellDates: false });
  validateWritePlan(plan, config, args, templateWorkbook);

  const workbook = XLSX.readFile(templatePath, { cellDates: false });
  const rowCounts = Object.fromEntries(REQUIRED_PACKAGE_SHEETS.map((sheet) => [sheet, 0])) as Record<RequiredSheet, number>;
  const rowsBySheet = emptyRowsBySheet();
  const headersBySheet = headersBySheetFromWorkbook(templateWorkbook);
  const deferredImportSummary = plan.plannedSheets.find((sheet) => sheet.sheet === '16_Import_Summary');

  for (const sheetPlan of plan.plannedSheets) {
    if (sheetPlan.sheet === '16_Import_Summary') {
      continue;
    }

    const headers = sheetHeader(templateWorkbook, sheetPlan.sheet);
    const rows = compileRowsForSheet(sheetPlan, templateWorkbook, config, args, rowCounts);
    rowsBySheet[sheetPlan.sheet] = [...rows];
    replaceWorkbookSheet(workbook, sheetPlan.sheet, headers, rows);
    rowCounts[sheetPlan.sheet] = rows.length;
  }

  if (!deferredImportSummary) {
    throw new Error('Import summary sheet was not planned.');
  }
  const importSummaryHeaders = sheetHeader(templateWorkbook, deferredImportSummary.sheet);
  const importSummaryRows = compileRowsForSheet(deferredImportSummary, templateWorkbook, config, args, rowCounts);
  rowsBySheet[deferredImportSummary.sheet] = [...importSummaryRows];
  replaceWorkbookSheet(workbook, deferredImportSummary.sheet, importSummaryHeaders, importSummaryRows);
  rowCounts[deferredImportSummary.sheet] = importSummaryRows.length;

  workbook.SheetNames = REQUIRED_PACKAGE_SHEETS.filter((sheet) => workbook.SheetNames.includes(sheet));
  validateCompiledWorkbookRows(rowsBySheet, headersBySheet, headersBySheet, config, args);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  XLSX.writeFile(workbook, outputPath, { bookType: 'xlsx' });
  const audit = auditRankedPatternWorkbookFile(outputPath);

  return {
    outputWorkbook: args.outputWorkbook,
    rowCountsBySheet: rowCounts,
    audit,
  };
}

function parseArgs(argv: readonly string[]): AuthoringPackageCompilerArgs {
  const values = new Map<string, string>();
  let dryRun = false;
  let write = false;
  let overwrite = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]!;
    if (token === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (token === '--write') {
      write = true;
      continue;
    }
    if (token === '--overwrite') {
      overwrite = true;
      continue;
    }
    if (token.startsWith('--')) {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`Missing value for ${token}`);
      }
      values.set(token.slice(2), value);
      index += 1;
    }
  }

  const required = ['assessment-key', 'domain-key', 'authoring-dir', 'generated-dir', 'template-workbook'];
  const missing = required.filter((key) => !values.get(key));
  if (missing.length > 0) {
    throw new Error(`Missing required option(s): ${missing.map((key) => `--${key}`).join(', ')}`);
  }

  const assessmentKey = values.get('assessment-key')!;
  const defaultWorkbookName = `sonartra_reader_first_import_schema_${assessmentKey.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_COMPILED.xlsx`;

  return {
    assessmentKey,
    domainKey: values.get('domain-key')!,
    authoringDir: values.get('authoring-dir')!,
    generatedDir: values.get('generated-dir')!,
    templateWorkbook: values.get('template-workbook')!,
    outputWorkbook: values.get('output-workbook') ?? path.join('content', 'assessment-packages', assessmentKey, defaultWorkbookName),
    dryRun,
    write,
    overwrite,
  };
}

function printPlan(plan: AuthoringPackageDryRunPlan): void {
  const warningCount = plan.diagnostics.filter((diagnostic) => diagnostic.severity === 'warning').length;
  const errorCount = plan.diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length;

  console.log('Authoring package compile dry-run');
  console.log(`- Assessment key: ${plan.configMetadata.assessmentKey ?? 'not found'}`);
  console.log(`- Title: ${plan.configMetadata.title ?? 'not found'}`);
  console.log(`- Version: ${plan.configMetadata.version ?? 'not supplied'}`);
  console.log(`- Domain key: ${plan.configMetadata.domainKey ?? 'not found'}`);
  console.log(
    `- Signals: ${
      plan.configMetadata.signals.length > 0
        ? plan.configMetadata.signals.map((signal) => `${signal.key}${signal.label ? ` (${signal.label})` : ''}`).join(', ')
        : 'not found'
    }`,
  );
  console.log(`- Template workbook: ${plan.templateWorkbookPath}`);
  console.log(`- Required sheets present: ${REQUIRED_PACKAGE_SHEETS.length - plan.missingTemplateSheets.length}/${REQUIRED_PACKAGE_SHEETS.length}`);
  console.log(`- Intended output workbook: ${plan.outputWorkbook}`);
  console.log('- No files written.');
  console.log('');
  console.log('Generated PSV sources');
  for (const source of plan.generatedSources) {
    console.log(
      `- ${source.sectionKey}: ${source.filePath} (${source.sourceKind}, ${source.rowCount} rows, ${source.headers.length} headers)`,
    );
  }
  if (plan.generatedSources.length === 0) {
    console.log('- none');
  }
  console.log('');
  console.log('Planned sheet sources');
  for (const sheet of plan.plannedSheets) {
    console.log(
      `- ${sheet.sheet}: ${sheet.source}; rows=${sheet.rowCount ?? 'unknown'}; files=${
        sheet.filePaths.length > 0 ? sheet.filePaths.join(', ') : 'none'
      }; ${sheet.note}`,
    );
  }
  console.log('');
  console.log(`Diagnostics: ${errorCount} error(s), ${warningCount} warning(s)`);
  for (const diagnostic of plan.diagnostics) {
    console.log(
      `- ${diagnostic.severity.toUpperCase()} ${diagnostic.code}: ${diagnostic.message}${
        diagnostic.filePath ? ` (${diagnostic.filePath})` : ''
      }`,
    );
  }
}

export function runAuthoringPackageCompilerCli(argv: readonly string[]): number {
  try {
    const args = parseArgs(argv);
    if (args.write) {
      const result = compileAuthoringPackageWorkbook(args);
      console.log('Authoring package workbook written');
      console.log(`- Output workbook: ${result.outputWorkbook}`);
      console.log(`- Audit verdict: ${result.audit.pass ? 'PASS' : 'FAIL'}`);
      console.log(`- Blocking diagnostics: ${result.audit.diagnosticCounts.error}`);
      console.log(`- Warnings: ${result.audit.diagnosticCounts.warning}`);
      console.log('Row counts by sheet');
      for (const sheet of REQUIRED_PACKAGE_SHEETS) {
        console.log(`- ${sheet}: ${result.rowCountsBySheet[sheet]}`);
      }
      return result.audit.pass ? 0 : 1;
    }

    if (!args.dryRun) {
      console.error('This first compiler slice only supports --dry-run. No files were written.');
      return 1;
    }

    const plan = planAuthoringPackageCompile(args);
    printPlan(plan);
    return plan.diagnostics.some((diagnostic) => diagnostic.severity === 'error') ? 1 : 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown authoring package compiler error.';
    console.error(message);
    return 1;
  }
}

if (require.main === module) {
  process.exitCode = runAuthoringPackageCompilerCli(process.argv.slice(2));
}
