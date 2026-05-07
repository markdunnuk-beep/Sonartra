import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { getDbPool } from '@/lib/server/db';
import { normaliseRankedPatternWorkbook } from '@/content/assessment-packages/import-contract/ranked-pattern-import-normalise';
import {
  persistRankedPatternResultLanguage,
  planRankedPatternResultLanguagePersistence,
  type RankedPatternResultLanguagePersistencePlan,
  type RankedPatternResultLanguagePersistenceResult,
} from '@/content/assessment-packages/import-contract/ranked-pattern-import-persistence';
import { validateRankedPatternPackageShape } from '@/content/assessment-packages/import-contract/ranked-pattern-import-validation';
import type { RankedPatternImportDiagnostic } from '@/content/assessment-packages/import-contract/ranked-pattern-import-validation';
import {
  parseRankedPatternWorkbookFile,
  toValidationWorkbook,
} from '@/content/assessment-packages/import-contract/ranked-pattern-workbook-parser';

type CliMode = 'dry-run' | 'apply';

function usage(): string {
  return [
    'Usage: npx tsx scripts/assessment-packages/import-ranked-pattern-result-language.ts <path-to-xlsx> --assessment-version-id <id> [--dry-run|--apply]',
    'Default mode is --dry-run.',
  ].join('\n');
}

function parseCliArgs(argv: readonly string[]): {
  readonly filePath: string | null;
  readonly assessmentVersionId: string | null;
  readonly mode: CliMode;
} {
  const filePath = argv.find((arg) => !arg.startsWith('--')) ?? null;
  const assessmentVersionIdFlagIndex = argv.indexOf('--assessment-version-id');
  const assessmentVersionId =
    assessmentVersionIdFlagIndex >= 0 ? (argv[assessmentVersionIdFlagIndex + 1] ?? null) : null;
  return {
    filePath,
    assessmentVersionId,
    mode: argv.includes('--apply') ? 'apply' : 'dry-run',
  };
}

function diagnosticLocation(diagnostic: RankedPatternImportDiagnostic): string {
  return [
    diagnostic.sheetKey,
    diagnostic.rowNumber === undefined ? undefined : `row ${diagnostic.rowNumber}`,
    diagnostic.fieldKey,
  ]
    .filter(Boolean)
    .join(' / ');
}

function formatDiagnostic(diagnostic: RankedPatternImportDiagnostic): string {
  const location = diagnosticLocation(diagnostic);
  return `- [${diagnostic.code}] ${location.length > 0 ? `${location}: ` : ''}${diagnostic.message}`;
}

function formatPlanSummary(params: {
  readonly mode: CliMode;
  readonly sourcePath: string;
  readonly plan: RankedPatternResultLanguagePersistencePlan;
  readonly shapeDiagnostics: readonly RankedPatternImportDiagnostic[];
  readonly result?: RankedPatternResultLanguagePersistenceResult;
}): string {
  const blockingDiagnostics = [...params.shapeDiagnostics, ...params.plan.diagnostics].filter(
    (diagnostic) => diagnostic.severity === 'error',
  );
  const warnings = [...params.shapeDiagnostics, ...params.plan.diagnostics].filter(
    (diagnostic) => diagnostic.severity === 'warning',
  );
  const counts = params.plan.operationCountsByTable;

  return [
    'Ranked-pattern result-language import',
    '',
    'Source',
    `- File: ${params.sourcePath}`,
    `- Mode: ${params.mode}`,
    '',
    'Target',
    `- Assessment version id: ${params.plan.assessmentVersionId}`,
    `- Domain key: ${params.plan.domainKey ?? 'unknown'}`,
    '',
    'Planned result-language operations',
    `- assessment_ranked_patterns: ${counts.assessment_ranked_patterns}`,
    `- assessment_score_shape_rules: ${counts.assessment_score_shape_rules}`,
    `- assessment_result_section_definitions: ${counts.assessment_result_section_definitions}`,
    `- assessment_result_language_rows: ${counts.assessment_result_language_rows}`,
    `- assessment_report_preview_cases: ${counts.assessment_report_preview_cases}`,
    '',
    'Apply result',
    `- Dry run: ${params.result?.dryRun ?? params.mode === 'dry-run'}`,
    '',
    'Blocking diagnostics',
    ...(blockingDiagnostics.length === 0 ? ['- none'] : blockingDiagnostics.map(formatDiagnostic)),
    '',
    'Warnings',
    ...(warnings.length === 0 ? ['- none'] : warnings.map(formatDiagnostic)),
    '',
    `Verdict: ${blockingDiagnostics.length === 0 ? 'PASS' : 'FAIL'}`,
  ].join('\n');
}

export async function runRankedPatternResultLanguageImportCli(
  argv: readonly string[],
): Promise<number> {
  const { filePath, assessmentVersionId, mode } = parseCliArgs(argv);
  if (!filePath || !assessmentVersionId) {
    console.error(usage());
    return 1;
  }

  const sourcePath = path.resolve(filePath);
  if (!existsSync(sourcePath)) {
    console.error(`Workbook file not found: ${sourcePath}`);
    return 1;
  }

  const parsedWorkbook = parseRankedPatternWorkbookFile(sourcePath);
  const shapeDiagnostics = validateRankedPatternPackageShape(toValidationWorkbook(parsedWorkbook));
  const normalisedPackage = normaliseRankedPatternWorkbook(parsedWorkbook);
  const plan = planRankedPatternResultLanguagePersistence({
    normalisedPackage,
    assessmentVersionId,
    dryRun: true,
  });
  const hasBlockingDiagnostics = [...shapeDiagnostics, ...plan.diagnostics].some(
    (diagnostic) => diagnostic.severity === 'error',
  );

  if (mode === 'dry-run' || hasBlockingDiagnostics) {
    console.log(formatPlanSummary({ mode, sourcePath, plan, shapeDiagnostics }));
    return hasBlockingDiagnostics ? 1 : 0;
  }

  const result = await persistRankedPatternResultLanguage({
    normalisedPackage,
    assessmentVersionId,
    dryRun: false,
    db: getDbPool(),
  });

  console.log(formatPlanSummary({ mode, sourcePath, plan, shapeDiagnostics, result }));
  return result.diagnostics.some((diagnostic) => diagnostic.severity === 'error') ? 1 : 0;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';

if (import.meta.url === invokedPath) {
  runRankedPatternResultLanguageImportCli(process.argv.slice(2))
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
