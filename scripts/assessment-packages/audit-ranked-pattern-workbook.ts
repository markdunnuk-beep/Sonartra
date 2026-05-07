import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  rankedPatternAdminImportSupportSheetKeys,
  rankedPatternRuntimeDefinitionSheetKeys,
  rankedPatternRuntimeResultSheetKeys,
  type RankedPatternImportSheetKey,
} from '@/content/assessment-packages/import-contract/ranked-pattern-import-manifest';
import {
  auditRankedPatternWorkbookFile,
  type RankedPatternPackageAuditResult,
} from '@/content/assessment-packages/import-contract/ranked-pattern-package-audit';
import type { RankedPatternImportDiagnostic } from '@/content/assessment-packages/import-contract/ranked-pattern-import-validation';

function usage(): string {
  return 'Usage: npx tsx scripts/assessment-packages/audit-ranked-pattern-workbook.ts <path-to-xlsx>';
}

function formatSheetList(label: string, sheets: readonly string[]): string {
  return `${label}: ${sheets.length === 0 ? 'none' : sheets.join(', ')}`;
}

function formatDiagnostic(diagnostic: RankedPatternImportDiagnostic): string {
  const location = [
    diagnostic.sheetKey,
    diagnostic.rowNumber === undefined ? undefined : `row ${diagnostic.rowNumber}`,
    diagnostic.fieldKey,
  ]
    .filter(Boolean)
    .join(' / ');
  const prefix = location.length > 0 ? `${location}: ` : '';
  return `- [${diagnostic.code}] ${prefix}${diagnostic.message}`;
}

function formatRowCountsForSheets(
  result: RankedPatternPackageAuditResult,
  sheetKeys: readonly RankedPatternImportSheetKey[],
): readonly string[] {
  return sheetKeys.map((sheetKey) => `- ${sheetKey}: ${result.rowCounts.bySheet[sheetKey]}`);
}

export function formatRankedPatternPackageAudit(result: RankedPatternPackageAuditResult): string {
  const blockingDiagnostics = result.diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  );
  const warningDiagnostics = result.diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'warning',
  );

  return [
    'Ranked-pattern package audit',
    '',
    'Source',
    `- File: ${result.parsedWorkbook.sourcePath}`,
    `- Workbook: ${result.parsedWorkbook.workbookName}`,
    '',
    'Sheet coverage',
    `- Detected expected sheets: ${result.detectedSheets.length}`,
    `- ${formatSheetList('Missing sheets', result.missingSheets)}`,
    `- ${formatSheetList('Unexpected sheets', result.unexpectedSheets)}`,
    '',
    'Row counts',
    `- Runtime definition total: ${result.rowCounts.runtimeDefinition}`,
    ...formatRowCountsForSheets(result, rankedPatternRuntimeDefinitionSheetKeys),
    `- Runtime result content total: ${result.rowCounts.runtimeResultContent}`,
    ...formatRowCountsForSheets(result, rankedPatternRuntimeResultSheetKeys),
    `- Admin/import support total: ${result.rowCounts.adminImportSupport}`,
    ...formatRowCountsForSheets(result, rankedPatternAdminImportSupportSheetKeys),
    '',
    'Validation summary',
    `- Blocking diagnostics: ${result.diagnosticCounts.error}`,
    `- Warnings: ${result.diagnosticCounts.warning}`,
    `- Verdict: ${result.pass ? 'PASS' : 'FAIL'}`,
    '',
    'Blocking diagnostics',
    ...(blockingDiagnostics.length === 0 ? ['- none'] : blockingDiagnostics.map(formatDiagnostic)),
    '',
    'Warnings',
    ...(warningDiagnostics.length === 0 ? ['- none'] : warningDiagnostics.map(formatDiagnostic)),
  ].join('\n');
}

export async function runRankedPatternWorkbookAuditCli(argv: readonly string[]): Promise<number> {
  const inputPath = argv[0];

  if (!inputPath) {
    console.error(usage());
    return 1;
  }

  const sourcePath = path.resolve(inputPath);
  if (!existsSync(sourcePath)) {
    console.error(`Workbook file not found: ${sourcePath}`);
    return 1;
  }

  const result = auditRankedPatternWorkbookFile(sourcePath);
  console.log(formatRankedPatternPackageAudit(result));
  return result.pass ? 0 : 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';

if (import.meta.url === invokedPath) {
  runRankedPatternWorkbookAuditCli(process.argv.slice(2))
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
