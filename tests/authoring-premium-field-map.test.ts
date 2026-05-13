import assert from 'node:assert/strict';
import test from 'node:test';

import {
  premiumFieldMapRequiredColumns,
  validatePremiumFieldMapText,
} from '@/scripts/authoring/validate-premium-field-map';

type Row = Record<string, string>;

const header = premiumFieldMapRequiredColumns.join('|');

function validRow(overrides: Partial<Row> = {}): Row {
  return {
    section_key: '06_Orientation',
    field_key: 'orientation_title',
    pattern_key: 'process_results_people_vision',
    score_shape: 'paired',
    rank_1_signal_key: 'process',
    rank_2_signal_key: 'results',
    rank_3_signal_key: 'people',
    rank_4_signal_key: 'vision',
    source_anchor: 'pattern_identity',
    source_excerpt: 'Your leadership pattern is led by Process.',
    transformation_rule: 'Condense the ranked route into a title.',
    final_text: 'Structured progress with practical momentum',
    drift_check: 'Preserves rank order and paired score-shape meaning.',
    quality_notes: 'Specific enough for review.',
    status: 'review',
    ...overrides,
  };
}

function serialize(rows: readonly Row[], customHeader = header): string {
  const fields = customHeader.split('|');

  return [
    customHeader,
    ...rows.map((row) => fields.map((field) => row[field] ?? '').join('|')),
  ].join('\n');
}

function errorsFor(source: string): string[] {
  return validatePremiumFieldMapText(source).findings
    .filter((finding) => finding.severity === 'error')
    .map((finding) => finding.code);
}

test('valid minimal score-shape-dependent field map passes', () => {
  const result = validatePremiumFieldMapText(serialize([validRow()]));

  assert.equal(result.pass, true);
  assert.equal(result.rowsChecked, 1);
  assert.deepEqual(result.findings, []);
});

test('missing required column fails', () => {
  const badHeader = premiumFieldMapRequiredColumns
    .filter((field) => field !== 'source_excerpt')
    .join('|');

  assert.ok(errorsFor(serialize([validRow()], badHeader)).includes('HEADER_MISMATCH'));
});

test('invalid section_key fails', () => {
  assert.ok(errorsFor(serialize([validRow({ section_key: '08_Signal_Roles' })])).includes('INVALID_SECTION_KEY'));
});

test('invalid field_key for section fails', () => {
  assert.ok(errorsFor(serialize([validRow({ field_key: 'headline' })])).includes('INVALID_FIELD_KEY'));
});

test('invalid score_shape fails', () => {
  assert.ok(errorsFor(serialize([validRow({ score_shape: 'stepped' })])).includes('INVALID_SCORE_SHAPE'));
});

test('missing score_shape for score-shape-dependent section fails', () => {
  assert.ok(errorsFor(serialize([validRow({ score_shape: '' })])).includes('REQUIRED_VALUE_MISSING'));
});

test('pattern-level section with blank score_shape passes', () => {
  const result = validatePremiumFieldMapText(
    serialize([
      validRow({
        section_key: '11_Strengths',
        field_key: 'strength_title',
        score_shape: '',
        source_anchor: 'value_creation',
      }),
    ]),
  );

  assert.equal(result.pass, true);
  assert.deepEqual(result.findings, []);
});

test('pattern-level section with score_shape warns but passes', () => {
  const result = validatePremiumFieldMapText(
    serialize([
      validRow({
        section_key: '13_Application',
        field_key: 'application_title',
        source_anchor: 'development_moves',
      }),
    ]),
  );

  assert.equal(result.pass, true);
  assert.ok(result.findings.some((finding) => finding.code === 'PATTERN_LEVEL_SCORE_SHAPE_IGNORED'));
});

test('invalid signal key fails', () => {
  assert.ok(
    errorsFor(
      serialize([
        validRow({
          rank_3_signal_key: 'strategy',
          pattern_key: 'process_results_strategy_vision',
        }),
      ]),
    ).includes('INVALID_SIGNAL_KEY'),
  );
});

test('duplicate rank signal fails', () => {
  assert.ok(
    errorsFor(
      serialize([
        validRow({
          rank_3_signal_key: 'results',
          pattern_key: 'process_results_results_vision',
        }),
      ]),
    ).includes('DUPLICATE_RANK_SIGNAL'),
  );
});

test('missing rank signal fails', () => {
  assert.ok(errorsFor(serialize([validRow({ rank_4_signal_key: '' })])).includes('REQUIRED_VALUE_MISSING'));
});

test('pattern_key not matching rank order fails', () => {
  assert.ok(
    errorsFor(serialize([validRow({ pattern_key: 'results_process_people_vision' })])).includes(
      'PATTERN_KEY_RANK_MISMATCH',
    ),
  );
});

test('missing source_anchor fails', () => {
  assert.ok(errorsFor(serialize([validRow({ source_anchor: '' })])).includes('REQUIRED_VALUE_MISSING'));
});

test('invalid source_anchor fails', () => {
  assert.ok(errorsFor(serialize([validRow({ source_anchor: 'unsupported_anchor' })])).includes('INVALID_SOURCE_ANCHOR'));
});

test('missing final_text fails for review approved and active', () => {
  for (const status of ['review', 'approved', 'active']) {
    assert.ok(errorsFor(serialize([validRow({ status, final_text: '' })])).includes('FINAL_TEXT_REQUIRED'));
  }
});

test('missing final_text passes for draft', () => {
  const result = validatePremiumFieldMapText(serialize([validRow({ status: 'draft', final_text: '' })]));

  assert.equal(result.pass, true);
});

test('missing final_text passes for rejected and needs_revision', () => {
  for (const status of ['rejected', 'needs_revision']) {
    const result = validatePremiumFieldMapText(serialize([validRow({ status, final_text: '' })]));

    assert.equal(result.pass, true);
  }
});

test('duplicate field row fails for score-shape-dependent sections', () => {
  assert.ok(errorsFor(serialize([validRow(), validRow()])).includes('DUPLICATE_SCORE_SHAPE_FIELD_ROW'));
});

