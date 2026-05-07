import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPatternKeyFromRankedSignalKeys,
  expectedRankedPatternCount,
  getAdminImportSupportSectionKeys,
  getRuntimeResultSectionKeys,
  hasAllFourSupportedScoreShapes,
  hasExactlyFourDistinctSignalKeys,
  rankedPatternAdminImportSupportSheetKeys,
  rankedPatternImportManifest,
  rankedPatternRuntimeDefinitionSheetKeys,
  rankedPatternRuntimeResultSheetKeys,
  rankedPatternSupportedRankPositions,
  rankedPatternSupportedScoreShapes,
} from '@/content/assessment-packages/import-contract/ranked-pattern-import-manifest';
import {
  type ParsedRankedPatternWorkbook,
  validateNoUnsupportedAssessmentMode,
  validateNoUnsupportedResultModel,
  validatePatternKeyMatchesRankOrder,
  validateRankedPatternPackageShape,
  validateSupportedRankPositions,
  validateSupportedScoreShapeValues,
} from '@/content/assessment-packages/import-contract/ranked-pattern-import-validation';

test('ranked-pattern import manifest covers sheets 00 through 18 only', () => {
  assert.deepEqual(
    rankedPatternImportManifest.map((entry) => entry.sheet_key),
    [
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
    ],
  );
});

test('ranked-pattern import manifest categories match runtime boundaries', () => {
  const categoriesBySheet = Object.fromEntries(
    rankedPatternImportManifest.map((entry) => [entry.sheet_key, entry.category]),
  );
  const runtimeAllowedBySheet = Object.fromEntries(
    rankedPatternImportManifest.map((entry) => [entry.sheet_key, entry.runtime_allowed]),
  );

  for (const sheetKey of rankedPatternRuntimeDefinitionSheetKeys) {
    assert.equal(categoriesBySheet[sheetKey], 'runtime_definition');
    assert.equal(runtimeAllowedBySheet[sheetKey], true);
  }

  for (const sheetKey of rankedPatternRuntimeResultSheetKeys) {
    assert.equal(categoriesBySheet[sheetKey], 'runtime_result_content');
    assert.equal(runtimeAllowedBySheet[sheetKey], true);
  }

  for (const sheetKey of rankedPatternAdminImportSupportSheetKeys) {
    assert.equal(categoriesBySheet[sheetKey], 'admin_import_support');
    assert.equal(runtimeAllowedBySheet[sheetKey], false);
  }
});

test('runtime definition sheets map to existing runtime tables', () => {
  const targetsBySheet = Object.fromEntries(
    rankedPatternImportManifest.map((entry) => [entry.sheet_key, entry.database_target]),
  );

  assert.deepEqual(targetsBySheet['00_Metadata'], ['assessments', 'assessment_versions']);
  assert.deepEqual(targetsBySheet['01_Signals'], ['signals']);
  assert.deepEqual(targetsBySheet['02_Questions'], ['questions']);
  assert.deepEqual(targetsBySheet['03_Options'], ['options']);
  assert.deepEqual(targetsBySheet['04_Option_Weights'], ['option_signal_weights']);
});

test('runtime result and admin support sheet key helpers expose the correct sections', () => {
  assert.deepEqual(getRuntimeResultSectionKeys(), rankedPatternRuntimeResultSheetKeys);
  assert.deepEqual(getAdminImportSupportSectionKeys(), rankedPatternAdminImportSupportSheetKeys);

  const adminRuntimeSheets = rankedPatternImportManifest.filter(
    (entry) => entry.category === 'admin_import_support' && entry.runtime_allowed,
  );
  assert.deepEqual(adminRuntimeSheets, []);
});

test('ranked-pattern constants are assessment agnostic and fixed to the active contract', () => {
  assert.deepEqual(rankedPatternSupportedScoreShapes, [
    'concentrated',
    'paired',
    'graduated',
    'balanced',
  ]);
  assert.deepEqual(rankedPatternSupportedRankPositions, [1, 2, 3, 4]);
});

test('ranked-pattern helpers build keys and structural counts without scoring', () => {
  assert.equal(
    buildPatternKeyFromRankedSignalKeys('signal_a', 'signal_b', 'signal_c', 'signal_d'),
    'signal_a_signal_b_signal_c_signal_d',
  );
  assert.equal(hasExactlyFourDistinctSignalKeys(['signal_a', 'signal_b', 'signal_c', 'signal_d']), true);
  assert.equal(hasExactlyFourDistinctSignalKeys(['signal_a', 'signal_b', 'signal_c', 'signal_c']), false);
  assert.equal(expectedRankedPatternCount(4), 24);
  assert.notEqual(expectedRankedPatternCount(3), 24);
  assert.notEqual(expectedRankedPatternCount(5), 24);
  assert.equal(
    hasAllFourSupportedScoreShapes(['concentrated', 'paired', 'graduated', 'balanced']),
    true,
  );
  assert.equal(hasAllFourSupportedScoreShapes(['concentrated', 'paired']), false);
});

test('validation flags unsupported score shapes and rank positions', () => {
  const scoreShapeDiagnostics = validateSupportedScoreShapeValues(
    [{ score_shape: 'unsupported_shape', lookup_key: 'domain::pattern::shape' }],
    '06_Orientation',
  );
  const rankDiagnostics = validateSupportedRankPositions(
    [{ rank_position: '5', lookup_key: 'domain::signal::5' }],
    '08_Signal_Roles',
  );

  assert.equal(scoreShapeDiagnostics.length, 1);
  assert.equal(scoreShapeDiagnostics[0]?.code, 'UNSUPPORTED_SCORE_SHAPE');
  assert.equal(rankDiagnostics.length, 1);
  assert.equal(rankDiagnostics[0]?.code, 'UNSUPPORTED_RANK_POSITION');
});

test('validation flags unsupported metadata mode and result model keys', () => {
  const modeDiagnostics = validateNoUnsupportedAssessmentMode([
    { assessment_mode: 'unsupported_mode', lookup_key: 'assessment::1' },
  ]);
  const resultModelDiagnostics = validateNoUnsupportedResultModel([
    { result_model_key: 'unsupported_model', lookup_key: 'assessment::1' },
  ]);

  assert.equal(modeDiagnostics.length, 1);
  assert.equal(modeDiagnostics[0]?.code, 'UNSUPPORTED_ASSESSMENT_MODE');
  assert.equal(resultModelDiagnostics.length, 1);
  assert.equal(resultModelDiagnostics[0]?.code, 'UNSUPPORTED_RESULT_MODEL');
});

test('validation flags pattern key mismatch against ranked signal order', () => {
  const diagnostics = validatePatternKeyMatchesRankOrder(
    {
      pattern_key: 'signal_a_signal_b_signal_d_signal_c',
      rank_1_signal_key: 'signal_a',
      rank_2_signal_key: 'signal_b',
      rank_3_signal_key: 'signal_c',
      rank_4_signal_key: 'signal_d',
      lookup_key: 'domain::pattern::concentrated',
    },
    '06_Orientation',
    0,
  );

  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0]?.code, 'PATTERN_KEY_RANK_ORDER_MISMATCH');
});

test('package shape validation combines required sheet, header, mode, score-shape, and pattern checks', () => {
  const parsedWorkbook: ParsedRankedPatternWorkbook = {
    '00_Metadata': {
      header: ['assessment_key', 'mode', 'result_model_key'],
      rows: [{ assessment_key: 'example', mode: 'unsupported_mode', result_model_key: 'unsupported_model' }],
    },
    '06_Orientation': {
      header: [
        'domain_key',
        'pattern_key',
        'score_shape',
        'rank_1_signal_key',
        'rank_2_signal_key',
        'rank_3_signal_key',
        'rank_4_signal_key',
      ],
      rows: [
        {
          domain_key: 'domain_key',
          pattern_key: 'signal_1_signal_2_signal_4_signal_3',
          score_shape: 'unsupported_shape',
          rank_1_signal_key: 'signal_1',
          rank_2_signal_key: 'signal_2',
          rank_3_signal_key: 'signal_3',
          rank_4_signal_key: 'signal_4',
        },
      ],
    },
  };

  const diagnostics = validateRankedPatternPackageShape(parsedWorkbook);
  const codes = new Set(diagnostics.map((item) => item.code));

  assert.equal(codes.has('MISSING_REQUIRED_SHEET'), true);
  assert.equal(codes.has('MISSING_REQUIRED_COLUMN'), true);
  assert.equal(codes.has('UNSUPPORTED_ASSESSMENT_MODE'), true);
  assert.equal(codes.has('UNSUPPORTED_RESULT_MODEL'), true);
  assert.equal(codes.has('UNSUPPORTED_SCORE_SHAPE'), true);
  assert.equal(codes.has('PATTERN_KEY_RANK_ORDER_MISMATCH'), true);
});
