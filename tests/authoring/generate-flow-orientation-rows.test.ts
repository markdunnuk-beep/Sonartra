import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  flowStateAuthoringConstants,
  readerFirstLookupKeyRecommendation,
  readerFirstRequiredHeaders,
  readerFirstRowCountRules,
} from '@/content/authoring/reader-first-schema-manifest';
import { flowOrientationForbiddenPhrases } from '@/content/authoring/flow-state/flow-orientation-phrase-library';
import {
  flowOrientationOutputPath,
  generateFlowOrientationRows,
  serializeFlowOrientationRows,
  validateFlowOrientationRows,
} from '@/scripts/authoring/generate-flow-orientation-rows';

test('Flow State orientation generator creates the expected 96 rows', () => {
  const rows = generateFlowOrientationRows();
  const patternKeys = new Set(rows.map((row) => row.pattern_key));
  const scoreShapes = new Set(rows.map((row) => row.score_shape));

  assert.equal(rows.length, readerFirstRowCountRules['06_Orientation'].expectedRows);
  assert.equal(patternKeys.size, flowStateAuthoringConstants.requiredPatternCount);
  assert.equal(scoreShapes.size, flowStateAuthoringConstants.requiredScoreShapeCount);
});

test('Flow State orientation rows validate against the schema manifest', () => {
  const rows = generateFlowOrientationRows();
  const serialized = serializeFlowOrientationRows(rows);
  const summary = validateFlowOrientationRows(rows, serialized);

  assert.deepEqual(summary.errors, []);
  assert.equal(summary.pass, true);
  assert.equal(serialized.split('\n').length, 97);
  assert.equal(serialized.split('\n')[0], readerFirstRequiredHeaders['06_Orientation'].join('|'));
});

test('Flow State orientation rows are lookup-safe and avoid forbidden phrases', () => {
  const rows = generateFlowOrientationRows();
  const lookupKeys = new Set<string>();
  const forbiddenPattern = new RegExp(flowOrientationForbiddenPhrases.join('|'), 'i');

  for (const row of rows) {
    assert.equal(row.lookup_key.includes('|'), false);
    assert.equal(
      row.lookup_key,
      [
        flowStateAuthoringConstants.domainKey,
        row.pattern_key,
        row.score_shape,
      ].join(readerFirstLookupKeyRecommendation.delimiter),
    );
    assert.equal(lookupKeys.has(row.lookup_key), false);
    lookupKeys.add(row.lookup_key);

    for (const value of Object.values(row)) {
      assert.equal(value.includes('|'), false);
      assert.equal(forbiddenPattern.test(value), false);
    }
  }
});

test('each Flow State orientation pattern contains every signal exactly once', () => {
  const rows = generateFlowOrientationRows();

  for (const row of rows) {
    assert.deepEqual(
      new Set([
        row.rank_1_signal_key,
        row.rank_2_signal_key,
        row.rank_3_signal_key,
        row.rank_4_signal_key,
      ]),
      new Set(flowStateAuthoringConstants.signals),
    );
  }
});

test('generated Flow State orientation PSV exists with 97 lines and 16 columns per row', async () => {
  const output = await readFile(flowOrientationOutputPath, 'utf8');
  const lines = output.trimEnd().split('\n');

  assert.equal(lines.length, 97);

  for (const line of lines) {
    assert.equal(line.split('|').length, 16);
  }
});
