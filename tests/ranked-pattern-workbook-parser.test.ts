import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import XLSX from 'xlsx';

import {
  rankedPatternAdminImportSupportSheetKeys,
  rankedPatternImportManifest,
  rankedPatternImportManifestBySheetKey,
  rankedPatternImportSheetKeys,
  rankedPatternRuntimeDefinitionSheetKeys,
  rankedPatternRuntimeResultSheetKeys,
  type RankedPatternImportSheetKey,
} from '@/content/assessment-packages/import-contract/ranked-pattern-import-manifest';
import {
  auditParsedRankedPatternWorkbook,
  auditRankedPatternWorkbookFile,
} from '@/content/assessment-packages/import-contract/ranked-pattern-package-audit';
import { parseRankedPatternWorkbookFile } from '@/content/assessment-packages/import-contract/ranked-pattern-workbook-parser';
import {
  formatRankedPatternPackageAudit,
  runRankedPatternWorkbookAuditCli,
} from '@/scripts/assessment-packages/audit-ranked-pattern-workbook';

function tempWorkbookPath(fileName: string): string {
  return path.join(mkdtempSync(path.join(tmpdir(), 'ranked-pattern-workbook-')), fileName);
}

function valueForHeader(header: string): unknown {
  switch (header) {
    case 'mode':
      return 'single_domain';
    case 'model':
      return 'single_domain_ranked_pattern';
    case 'result_model_key':
      return 'ranked_pattern';
    case 'score_shape':
    case 'expected_score_shape':
      return 'concentrated';
    case 'rank_position':
      return 1;
    case 'pattern_key':
    case 'expected_pattern_key':
      return 'signal_a_signal_b_signal_c_signal_d';
    case 'rank_1_signal_key':
      return 'signal_a';
    case 'rank_2_signal_key':
      return 'signal_b';
    case 'rank_3_signal_key':
      return 'signal_c';
    case 'rank_4_signal_key':
      return 'signal_d';
    case 'status':
    case 'lifecycle_status':
      return 'active';
    case 'lookup_key':
      return 'lookup_key';
    default:
      return `${header}_value`;
  }
}

function rowForSheet(sheetKey: RankedPatternImportSheetKey): readonly unknown[] {
  const manifestEntry = rankedPatternImportManifestBySheetKey[sheetKey];
  return manifestEntry.required_columns.map(valueForHeader);
}

function writeWorkbook(
  filePath: string,
  sheets: Readonly<Record<string, readonly (readonly unknown[])[]>>,
): void {
  const workbook = XLSX.utils.book_new();

  for (const [sheetName, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName);
  }

  XLSX.writeFile(workbook, filePath, { bookType: 'xlsx' });
}

function writeCompleteWorkbook(filePath: string): void {
  writeWorkbook(
    filePath,
    Object.fromEntries(
      rankedPatternImportManifest.map((entry) => [
        entry.sheet_key,
        [entry.required_columns, rowForSheet(entry.sheet_key), []],
      ]),
    ),
  );
}

test('parser reads expected sheets, headers, values, and workbook row numbers', () => {
  const filePath = tempWorkbookPath('complete.xlsx');
  writeCompleteWorkbook(filePath);

  const parsedWorkbook = parseRankedPatternWorkbookFile(filePath, {
    parsedAt: '2026-05-07T00:00:00.000Z',
  });
  const metadataSheet = parsedWorkbook.sheets['00_Metadata'];

  assert.equal(parsedWorkbook.workbookName, 'complete.xlsx');
  assert.equal(parsedWorkbook.parsedAt, '2026-05-07T00:00:00.000Z');
  assert.deepEqual(parsedWorkbook.missingSheets, []);
  assert.deepEqual(parsedWorkbook.unexpectedSheets, []);
  assert.equal(Object.keys(parsedWorkbook.sheets).length, rankedPatternImportSheetKeys.length);
  assert.ok(metadataSheet);
  assert.deepEqual(metadataSheet.headers, rankedPatternImportManifestBySheetKey['00_Metadata'].required_columns);
  assert.equal(metadataSheet.rowCount, 1);
  assert.equal(metadataSheet.emptyRowCount, 0);
  assert.equal(metadataSheet.rows[0]?.rowNumber, 2);
  assert.equal(metadataSheet.rows[0]?.values.mode, 'single_domain');
  assert.equal(metadataSheet.rows[0]?.rawValues[4], 'single_domain_ranked_pattern');
});

test('parser reports missing expected sheets and unexpected sheets without validating business rules', () => {
  const filePath = tempWorkbookPath('partial.xlsx');
  writeWorkbook(filePath, {
    '00_Metadata': [
      rankedPatternImportManifestBySheetKey['00_Metadata'].required_columns,
      rowForSheet('00_Metadata'),
    ],
    Extra_Admin_Notes: [['note'], ['not part of the contract']],
  });

  const parsedWorkbook = parseRankedPatternWorkbookFile(filePath);

  assert.equal(parsedWorkbook.missingSheets.includes('01_Signals'), true);
  assert.equal(parsedWorkbook.missingSheets.length, rankedPatternImportSheetKeys.length - 1);
  assert.deepEqual(parsedWorkbook.unexpectedSheets, ['Extra_Admin_Notes']);
  assert.equal(parsedWorkbook.sheets['00_Metadata']?.rowCount, 1);
});

test('audit wrapper returns deterministic row counts grouped by sheet category', () => {
  const filePath = tempWorkbookPath('category-counts.xlsx');
  writeCompleteWorkbook(filePath);

  const audit = auditRankedPatternWorkbookFile(filePath, {
    parsedAt: '2026-05-07T00:00:00.000Z',
  });

  assert.equal(audit.rowCounts.runtimeDefinition, rankedPatternRuntimeDefinitionSheetKeys.length);
  assert.equal(audit.rowCounts.runtimeResultContent, rankedPatternRuntimeResultSheetKeys.length);
  assert.equal(audit.rowCounts.adminImportSupport, rankedPatternAdminImportSupportSheetKeys.length);
  assert.equal(audit.rowCounts.bySheet['06_Orientation'], 1);
});

test('audit wrapper includes validation diagnostics and resolved workbook row numbers', () => {
  const filePath = tempWorkbookPath('diagnostics.xlsx');
  writeWorkbook(filePath, {
    ...Object.fromEntries(
      rankedPatternImportManifest.map((entry) => [entry.sheet_key, [entry.required_columns]]),
    ),
    '00_Metadata': [
      rankedPatternImportManifestBySheetKey['00_Metadata'].required_columns,
      rowForSheet('00_Metadata').map((value, index) =>
        rankedPatternImportManifestBySheetKey['00_Metadata'].required_columns[index] === 'mode'
          ? 'unsupported_mode'
          : value,
      ),
    ],
    '06_Orientation': [
      rankedPatternImportManifestBySheetKey['06_Orientation'].required_columns,
      rowForSheet('06_Orientation').map((value, index) => {
        const header = rankedPatternImportManifestBySheetKey['06_Orientation'].required_columns[index];
        if (header === 'score_shape') {
          return 'unsupported_shape';
        }
        if (header === 'pattern_key') {
          return 'signal_a_signal_b_signal_d_signal_c';
        }
        return value;
      }),
    ],
  });

  const audit = auditRankedPatternWorkbookFile(filePath);
  const codes = new Set(audit.diagnostics.map((diagnostic) => diagnostic.code));
  const patternDiagnostic = audit.diagnostics.find(
    (diagnostic) => diagnostic.code === 'PATTERN_KEY_RANK_ORDER_MISMATCH',
  );

  assert.equal(codes.has('UNSUPPORTED_ASSESSMENT_MODE'), true);
  assert.equal(codes.has('UNSUPPORTED_SCORE_SHAPE'), true);
  assert.equal(codes.has('PATTERN_KEY_RANK_ORDER_MISMATCH'), true);
  assert.equal(patternDiagnostic?.rowNumber, 2);
  assert.equal(audit.pass, false);
});

test('audit formatter separates coverage, row counts, blocking diagnostics, and warnings', () => {
  const filePath = tempWorkbookPath('format.xlsx');
  writeCompleteWorkbook(filePath);
  const parsedWorkbook = parseRankedPatternWorkbookFile(filePath);
  const audit = auditParsedRankedPatternWorkbook(parsedWorkbook);

  const output = formatRankedPatternPackageAudit(audit);

  assert.match(output, /Ranked-pattern package audit/);
  assert.match(output, /Sheet coverage/);
  assert.match(output, /Row counts/);
  assert.match(output, /Validation summary/);
  assert.match(output, /Blocking diagnostics/);
  assert.match(output, /Warnings/);
});

test('CLI helper returns non-zero for a missing workbook file', async () => {
  const missingPath = tempWorkbookPath('missing.xlsx');
  const originalConsoleError = console.error;
  const errors: unknown[] = [];

  console.error = (...args: unknown[]) => {
    errors.push(args.join(' '));
  };

  try {
    assert.equal(existsSync(missingPath), false);
    assert.equal(await runRankedPatternWorkbookAuditCli([missingPath]), 1);
    assert.match(String(errors[0]), /Workbook file not found/);
  } finally {
    console.error = originalConsoleError;
  }
});
