import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { getDbPool } from '@/lib/server/db';
import { parseRankedPatternWorkbookFile } from '@/content/assessment-packages/import-contract/ranked-pattern-workbook-parser';
import { toValidationWorkbook } from '@/content/assessment-packages/import-contract/ranked-pattern-workbook-parser';
import { validateRankedPatternPackageShape } from '@/content/assessment-packages/import-contract/ranked-pattern-import-validation';
import { normaliseRankedPatternWorkbook } from '@/content/assessment-packages/import-contract/ranked-pattern-import-normalise';
import {
  persistRankedPatternRuntimeDefinition,
  planRankedPatternRuntimeDefinitionPersistence,
  type RankedPatternRuntimeDefinitionPersistencePlan,
  type RankedPatternRuntimeDefinitionPersistenceResult,
} from '@/content/assessment-packages/import-contract/ranked-pattern-import-persistence';
import type { RankedPatternImportDiagnostic } from '@/content/assessment-packages/import-contract/ranked-pattern-import-validation';

type CliMode = 'dry-run' | 'apply';

function usage(): string {
  return [
    'Usage: npx tsx scripts/assessment-packages/import-ranked-pattern-runtime-definition.ts <path-to-xlsx> [--dry-run|--apply]',
    'Default mode is --dry-run.',
  ].join('\n');
}

function parseCliArgs(argv: readonly string[]): { readonly filePath: string | null; readonly mode: CliMode } {
  const filePath = argv.find((arg) => !arg.startsWith('--')) ?? null;
  const mode = argv.includes('--apply') ? 'apply' : 'dry-run';
  return { filePath, mode };
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
  const prefix = location.length > 0 ? `${location}: ` : '';
  return `- [${diagnostic.code}] ${prefix}${diagnostic.message}`;
}

function formatPlanSummary(params: {
  readonly mode: CliMode;
  readonly sourcePath: string;
  readonly plan: RankedPatternRuntimeDefinitionPersistencePlan;
  readonly shapeDiagnostics: readonly RankedPatternImportDiagnostic[];
  readonly result?: RankedPatternRuntimeDefinitionPersistenceResult;
}): string {
  const blockingDiagnostics = [...params.shapeDiagnostics, ...params.plan.diagnostics].filter(
    (diagnostic) => diagnostic.severity === 'error',
  );
  const counts = params.plan.operationCountsByTable;

  return [
    'Ranked-pattern runtime definition import',
    '',
    'Source',
    `- File: ${params.sourcePath}`,
    `- Mode: ${params.mode}`,
    '',
    'Target identity',
    `- Assessment key: ${params.plan.assessmentKey ?? 'unknown'}`,
    `- Version: ${params.plan.version ?? 'unknown'}`,
    `- Domain key: ${params.plan.domainKey ?? 'unknown'}`,
    '',
    'Planned runtime definition operations',
    `- assessments: ${counts.assessments}`,
    `- assessment_versions: ${counts.assessment_versions}`,
    `- domains: ${counts.domains}`,
    `- signals: ${counts.signals}`,
    `- questions: ${counts.questions}`,
    `- options: ${counts.options}`,
    `- option_signal_weights: ${counts.option_signal_weights}`,
    '',
    'Apply result',
    `- Dry run: ${params.result?.dryRun ?? params.mode === 'dry-run'}`,
    `- Assessment id: ${params.result?.assessmentId ?? 'not written'}`,
    `- Assessment version id: ${params.result?.assessmentVersionId ?? 'not written'}`,
    '',
    'Blocking diagnostics',
    ...(blockingDiagnostics.length === 0 ? ['- none'] : blockingDiagnostics.map(formatDiagnostic)),
    '',
    `Verdict: ${blockingDiagnostics.length === 0 ? 'PASS' : 'FAIL'}`,
  ].join('\n');
}

export async function runRankedPatternRuntimeDefinitionImportCli(
  argv: readonly string[],
): Promise<number> {
  const { filePath, mode } = parseCliArgs(argv);
  if (!filePath) {
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
  const plan = planRankedPatternRuntimeDefinitionPersistence(normalisedPackage);
  const hasBlockingDiagnostics = [...shapeDiagnostics, ...plan.diagnostics].some(
    (diagnostic) => diagnostic.severity === 'error',
  );

  if (mode === 'dry-run' || hasBlockingDiagnostics) {
    console.log(formatPlanSummary({ mode, sourcePath, plan, shapeDiagnostics }));
    return hasBlockingDiagnostics ? 1 : 0;
  }

  const result = await persistRankedPatternRuntimeDefinition({
    normalisedPackage,
    dryRun: false,
    sourceName: path.basename(sourcePath),
    db: getDbPool(),
  });

  console.log(formatPlanSummary({ mode, sourcePath, plan, shapeDiagnostics, result }));
  return result.diagnostics.some((diagnostic) => diagnostic.severity === 'error') ? 1 : 0;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';

if (import.meta.url === invokedPath) {
  runRankedPatternRuntimeDefinitionImportCli(process.argv.slice(2))
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
