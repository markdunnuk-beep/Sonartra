import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

import {
  rankedPatternImportSheetKeys,
  rankedPatternSupportedScoreShapes,
} from '@/content/assessment-packages/import-contract/ranked-pattern-import-manifest';
import { auditRankedPatternWorkbookFile } from '@/content/assessment-packages/import-contract/ranked-pattern-package-audit';
import { normaliseRankedPatternWorkbook } from '@/content/assessment-packages/import-contract/ranked-pattern-import-normalise';
import {
  planRankedPatternResultLanguagePersistence,
  planRankedPatternRuntimeDefinitionPersistence,
} from '@/content/assessment-packages/import-contract/ranked-pattern-import-persistence';
import { parseRankedPatternWorkbookFile } from '@/content/assessment-packages/import-contract/ranked-pattern-workbook-parser';

const workbookPath =
  'content/assessment-packages/leadership-approach/sonartra_reader_first_import_schema_LEADERSHIP_APPROACH_TEST.xlsx';

test('Leadership Approach ranked-pattern test workbook exists and has the required sheets', () => {
  assert.equal(existsSync(workbookPath), true);

  const parsed = parseRankedPatternWorkbookFile(workbookPath);

  assert.deepEqual(parsed.missingSheets, []);
  assert.deepEqual(parsed.unexpectedSheets, []);
  assert.deepEqual(Object.keys(parsed.sheets).sort(), [...rankedPatternImportSheetKeys].sort());
});

test('Leadership Approach package metadata and scored signals match the test package contract', () => {
  const normalised = normaliseRankedPatternWorkbook(parseRankedPatternWorkbookFile(workbookPath));
  const metadata = normalised.metadata[0];

  assert.equal(metadata?.assessmentKey, 'leadership-approach');
  assert.equal(metadata?.version, '1.00-test');
  assert.equal(metadata?.domainKey, 'leadership_approach');
  assert.equal(metadata?.mode, 'single_domain');
  assert.equal(metadata?.resultModelKey, null);
  assert.deepEqual(
    normalised.signals.map((signal) => signal.signalKey).sort(),
    ['people', 'process', 'results', 'vision'],
  );
  assert.equal(normalised.signals.every((signal) => signal.scored), true);
});

test('Leadership Approach package audit passes without blocking findings or warnings', () => {
  const audit = auditRankedPatternWorkbookFile(workbookPath);

  assert.equal(audit.pass, true);
  assert.equal(audit.diagnosticCounts.error, 0);
  assert.equal(audit.diagnosticCounts.warning, 0);
  assert.equal(audit.normalisationDiagnosticCounts.error, 0);
  assert.equal(audit.normalisationDiagnosticCounts.warning, 0);
});

test('Leadership Approach runtime content and previews normalise to the expected import targets', () => {
  const normalised = normaliseRankedPatternWorkbook(parseRankedPatternWorkbookFile(workbookPath));

  assert.equal(normalised.context.length, 1);
  assert.equal(normalised.orientation.length, 96);
  assert.equal(normalised.recognition.length, 96);
  assert.equal(normalised.signalRoles.length, 16);
  assert.equal(normalised.patternMechanics.length, 96);
  assert.equal(normalised.patternSynthesis.length, 96);
  assert.equal(normalised.strengths.length, 72);
  assert.equal(normalised.narrowing.length, 72);
  assert.equal(normalised.application.length, 72);
  assert.equal(normalised.closingIntegration.length, 96);
  assert.equal(normalised.reportPreviewCases.length, 4);
  assert.deepEqual(
    [...new Set(normalised.reportPreviewCases.map((row) => row.expectedScoreShape))].sort(),
    [...rankedPatternSupportedScoreShapes].sort(),
  );
});

test('Leadership Approach dry-run plans expected runtime and result-language operations', () => {
  const normalised = normaliseRankedPatternWorkbook(parseRankedPatternWorkbookFile(workbookPath));
  const runtimePlan = planRankedPatternRuntimeDefinitionPersistence(normalised);
  const resultLanguagePlan = planRankedPatternResultLanguagePersistence({
    normalisedPackage: normalised,
    assessmentVersionId: 'leadership-approach-test-version',
    dryRun: true,
  });

  assert.deepEqual(runtimePlan.operationCountsByTable, {
    assessments: 1,
    assessment_versions: 1,
    domains: 1,
    signals: 4,
    questions: 16,
    options: 64,
    option_signal_weights: 64,
  });
  assert.equal(resultLanguagePlan.operationCountsByTable.assessment_ranked_patterns, 24);
  assert.equal(resultLanguagePlan.operationCountsByTable.assessment_result_section_definitions, 10);
  assert.equal(resultLanguagePlan.operationCountsByTable.assessment_result_language_rows, 713);
  assert.equal(resultLanguagePlan.operationCountsByTable.assessment_report_preview_cases, 4);
  assert.equal(
    resultLanguagePlan.diagnostics.every(
      (diagnostic) => diagnostic.code === 'SCORE_SHAPE_RULES_NOT_SUPPLIED',
    ),
    true,
  );
  assert.equal(runtimePlan.diagnostics.some((diagnostic) => diagnostic.severity === 'error'), false);
  assert.equal(resultLanguagePlan.diagnostics.some((diagnostic) => diagnostic.severity === 'error'), false);
});

test('Leadership Approach package does not depend on Flow State-specific keys', () => {
  const parsed = parseRankedPatternWorkbookFile(workbookPath);
  const serialisedRows = Object.values(parsed.sheets)
    .flatMap((sheet) => sheet?.rows ?? [])
    .map((row) => Object.values(row.values).join(' '))
    .join(' ');

  assert.doesNotMatch(serialisedRows, /flow-state/i);
  assert.doesNotMatch(serialisedRows, /deep_focus|creative_movement|physical_rhythm|social_exchange/i);
});
