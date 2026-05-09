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

export type AuthoringAssessmentConfig = {
  readonly assessmentKey?: string;
  readonly assessment_key?: string;
  readonly title?: string;
  readonly assessmentTitle?: string;
  readonly version?: string;
  readonly domainKey?: string;
  readonly domain_key?: string;
  readonly domainTitle?: string;
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
  if ('domain_key' in next) {
    next.domain_key = domainKey;
  }
  if (typeof next.lookup_key === 'string') {
    next.lookup_key = next.lookup_key.replace(/^.*?::/, `${domainKey}::`);
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
    domain_key: args.domainKey,
    domain_title: config?.domainTitle ?? String(base.domain_title ?? title),
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
  return [
    {
      ...base,
      domain_key: args.domainKey,
      domain_title: config?.domainTitle ?? base.domain_title ?? '',
      status: base.status || 'active',
      lookup_key: `${args.domainKey}::context`,
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
  const deferredImportSummary = plan.plannedSheets.find((sheet) => sheet.sheet === '16_Import_Summary');

  for (const sheetPlan of plan.plannedSheets) {
    if (sheetPlan.sheet === '16_Import_Summary') {
      continue;
    }

    const headers = sheetHeader(templateWorkbook, sheetPlan.sheet);
    const rows = compileRowsForSheet(sheetPlan, templateWorkbook, config, args, rowCounts);
    replaceWorkbookSheet(workbook, sheetPlan.sheet, headers, rows);
    rowCounts[sheetPlan.sheet] = rows.length;
  }

  if (!deferredImportSummary) {
    throw new Error('Import summary sheet was not planned.');
  }
  const importSummaryHeaders = sheetHeader(templateWorkbook, deferredImportSummary.sheet);
  const importSummaryRows = compileRowsForSheet(deferredImportSummary, templateWorkbook, config, args, rowCounts);
  replaceWorkbookSheet(workbook, deferredImportSummary.sheet, importSummaryHeaders, importSummaryRows);
  rowCounts[deferredImportSummary.sheet] = importSummaryRows.length;

  workbook.SheetNames = REQUIRED_PACKAGE_SHEETS.filter((sheet) => workbook.SheetNames.includes(sheet));
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
