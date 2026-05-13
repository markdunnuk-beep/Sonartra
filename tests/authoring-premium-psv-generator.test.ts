import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  generatePremiumResultPsv,
  generatePremiumResultPsvFromRows,
} from '@/scripts/authoring/generate-premium-result-psv';
import {
  premiumFieldMapRequiredColumns,
} from '@/scripts/authoring/validate-premium-field-map';

type Row = Record<string, string>;

const outDir = 'preview';
const header = premiumFieldMapRequiredColumns.join('|');

function baseRow(overrides: Partial<Row> = {}): Row {
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
    source_excerpt: 'Process and Results work together.',
    transformation_rule: 'Map source to field.',
    final_text: 'Structured progress through practical order',
    drift_check: 'Preserves paired meaning.',
    quality_notes: 'orientation_title',
    status: 'review',
    ...overrides,
  };
}

function scoreShapeRows(overrides: Partial<Row> = {}): Row[] {
  return [
    baseRow({ field_key: 'orientation_title', final_text: 'Structured progress through practical order', ...overrides }),
    baseRow({ field_key: 'rank_1_phrase', final_text: 'You lead first by making work clearer.', ...overrides }),
    baseRow({ field_key: 'rank_2_phrase', final_text: 'Results keeps that structure connected to progress.', ...overrides }),
    baseRow({ field_key: 'rank_3_phrase', final_text: 'People adds shared ownership.', ...overrides }),
    baseRow({ field_key: 'rank_4_phrase', final_text: 'Vision connects the route to direction.', ...overrides }),
    baseRow({ field_key: 'orientation_summary', final_text: 'Your leadership approach creates a clear route for progress.', ...overrides }),
    baseRow({ field_key: 'score_shape_summary', final_text: 'The paired shape means Process and Results work together.', ...overrides }),
  ];
}

function listRows(sectionKey: '11_Strengths' | '12_Narrowing' | '13_Application', marker: string): Row[] {
  if (sectionKey === '11_Strengths') {
    return [
      baseRow({ section_key: sectionKey, field_key: 'strength_title', score_shape: '', source_anchor: 'value_creation', final_text: 'Repeatable progress', quality_notes: marker }),
      baseRow({ section_key: sectionKey, field_key: 'strength_text', score_shape: '', source_anchor: 'value_creation', final_text: 'You make progress easier to coordinate.', quality_notes: marker }),
      baseRow({ section_key: sectionKey, field_key: 'linked_signal_key', score_shape: '', source_anchor: 'pattern_identity', final_text: 'process', quality_notes: marker }),
    ];
  }

  if (sectionKey === '12_Narrowing') {
    return [
      baseRow({ section_key: sectionKey, field_key: 'narrowing_title', score_shape: '', source_anchor: 'hidden_cost', final_text: 'Organised before owned', quality_notes: marker }),
      baseRow({ section_key: sectionKey, field_key: 'narrowing_text', score_shape: '', source_anchor: 'hidden_cost', final_text: 'The route can become clear before ownership forms.', quality_notes: marker }),
      baseRow({ section_key: sectionKey, field_key: 'missing_range_signal_key', score_shape: '', source_anchor: 'rank_3_extension', final_text: 'people', quality_notes: marker }),
    ];
  }

  return [
    baseRow({ section_key: sectionKey, field_key: 'application_title', score_shape: '', source_anchor: 'development_moves', final_text: 'Invite ownership', quality_notes: marker }),
    baseRow({ section_key: sectionKey, field_key: 'application_text', score_shape: '', source_anchor: 'development_moves', final_text: 'Ask who needs to shape the route before it is fixed.', quality_notes: marker }),
    baseRow({ section_key: sectionKey, field_key: 'linked_signal_key', score_shape: '', source_anchor: 'rank_3_extension', final_text: 'people', quality_notes: marker }),
  ];
}

function generate(rows: Row[], includeReview = true) {
  return generatePremiumResultPsvFromRows(rows, { outDir, includeReview });
}

function fileContent(result: ReturnType<typeof generate>, sectionKey: string): string {
  return result.files.find((file) => file.sectionKey === sectionKey)?.content ?? '';
}

function serialize(rows: readonly Row[]): string {
  return [
    header,
    ...rows.map((row) => premiumFieldMapRequiredColumns.map((field) => row[field] ?? '').join('|')),
  ].join('\n');
}

test('emits one 06_Orientation preview row from review field map with includeReview', () => {
  const result = generate(scoreShapeRows(), true);
  const orientation = result.files.find((file) => file.sectionKey === '06_Orientation');

  assert.equal(orientation?.rowCount, 1);
  assert.match(orientation?.content ?? '', /Structured progress through practical order/);
});

test('emits no review rows by default', () => {
  const result = generatePremiumResultPsvFromRows(scoreShapeRows(), { outDir });

  assert.equal(result.rowsEmitted, 0);
});

test('emits approved rows by default', () => {
  const result = generatePremiumResultPsvFromRows(scoreShapeRows({ status: 'approved' }), { outDir });

  assert.equal(result.files.find((file) => file.sectionKey === '06_Orientation')?.rowCount, 1);
});

test('strips authoring-only fields from generated output', () => {
  const result = generate(scoreShapeRows(), true);
  const content = fileContent(result, '06_Orientation');

  for (const field of ['source_anchor', 'source_excerpt', 'transformation_rule', 'drift_check', 'quality_notes']) {
    assert.equal(content.includes(field), false);
  }
});

test('fails if a required grouped field is missing', () => {
  assert.throws(
    () => generate(scoreShapeRows().filter((row) => row.field_key !== 'rank_4_phrase')),
    /rank_4_phrase is missing/,
  );
});

test('fails on duplicate score-shape field rows', () => {
  assert.throws(() => generate([...scoreShapeRows(), scoreShapeRows()[0]]), /duplicate mapped field orientation_title/);
});

test('groups list-section rows by quality_notes item marker', () => {
  const result = generate(listRows('11_Strengths', 'strength_2'), true);
  const content = fileContent(result, '11_Strengths');

  assert.match(content, /strength_2\|2\|Repeatable progress/);
});

test('derives strength narrowing and application keys plus priority', () => {
  const result = generate([
    ...listRows('11_Strengths', 'strength_3'),
    ...listRows('12_Narrowing', 'narrowing_2'),
    ...listRows('13_Application', 'application_1'),
  ]);

  assert.match(fileContent(result, '11_Strengths'), /strength_3\|3\|/);
  assert.match(fileContent(result, '12_Narrowing'), /narrowing_2\|2\|/);
  assert.match(fileContent(result, '13_Application'), /application_1\|1\|/);
});

test('fails if list-section quality_notes item marker is missing', () => {
  assert.throws(() => generate(listRows('11_Strengths', 'not_an_item')), /quality_notes must be strength_1/);
});

test('output is deterministic', () => {
  const rows = [...scoreShapeRows(), ...listRows('11_Strengths', 'strength_1')];
  const first = generate(rows, true);
  const second = generate([...rows].reverse(), true);

  assert.deepEqual(
    first.files.map((file) => file.content),
    second.files.map((file) => file.content),
  );
});

test('preserves final_text without semantic rewriting', () => {
  const preserved = 'Your leadership approach creates a clear route for progress.';
  const result = generate(scoreShapeRows().map((row) =>
    row.field_key === 'orientation_summary' ? { ...row, final_text: preserved } : row,
  ));

  assert.match(fileContent(result, '06_Orientation'), new RegExp(preserved));
});

test('refuses invalid field maps through validator before generation', async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'premium-psv-'));
  const inputPath = path.join(tempDir, 'invalid.psv');
  const source = serialize(scoreShapeRows()).replace('06_Orientation', '08_Signal_Roles');

  await writeFile(inputPath, source, 'utf8');

  await assert.rejects(
    () => generatePremiumResultPsv({ inputs: [inputPath], outDir: tempDir, includeReview: true }),
    /Field map validation failed before generation/,
  );

  await rm(tempDir, { recursive: true, force: true });
});
