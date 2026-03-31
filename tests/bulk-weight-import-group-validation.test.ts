import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildBulkWeightImportPreview,
  type ParsedBulkWeightRow,
  validateBulkWeightGroup,
  validateBulkWeightGroups,
} from '@/lib/admin/bulk-weight-import';

function createRecord(
  questionNumber: number,
  optionLabel: ParsedBulkWeightRow['optionLabel'],
  signalKey: string,
  weight: number,
  lineNumber: number,
): ParsedBulkWeightRow {
  return {
    lineNumber,
    rawLine: `${questionNumber}|${optionLabel}|${signalKey}|${weight}`,
    questionNumberRaw: String(questionNumber),
    questionNumber,
    optionLabel,
    signalKeyRaw: signalKey,
    signalKey,
    weightRaw: String(weight),
    weight,
  };
}

test('validates one simple group with unique signals', () => {
  const result = validateBulkWeightGroups([
    createRecord(1, 'A', 'driver', 3, 1),
    createRecord(1, 'A', 'influencer', 1, 2),
    createRecord(1, 'A', 'analyst', 2, 3),
  ]);

  assert.equal(result.success, true);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.weightGroups, [
    {
      questionNumber: 1,
      optionLabel: 'A',
      groupKey: '1|A',
      weights: [
        { lineNumber: 3, signalKey: 'analyst', weight: 2 },
        { lineNumber: 1, signalKey: 'driver', weight: 3 },
        { lineNumber: 2, signalKey: 'influencer', weight: 1 },
      ],
      weightCount: 3,
      isEmpty: false,
      allZero: false,
      allNegative: false,
    },
  ]);
});

test('validates multiple groups across multiple questions', () => {
  const result = validateBulkWeightGroups([
    createRecord(1, 'A', 'driver', 3, 1),
    createRecord(1, 'B', 'analyst', 2, 2),
    createRecord(2, 'A', 'influencer', 1, 3),
    createRecord(2, 'D', 'implementer', 0, 4),
  ]);

  assert.equal(result.success, true);
  assert.deepEqual(
    result.weightGroups.map((group) => group.groupKey),
    ['1|A', '1|B', '2|A', '2|D'],
  );
});

test('sorts groups by question number then option label', () => {
  const result = validateBulkWeightGroups([
    createRecord(3, 'D', 'implementer', 0, 1),
    createRecord(1, 'C', 'analyst', 2, 2),
    createRecord(1, 'A', 'driver', 3, 3),
    createRecord(3, 'B', 'influencer', 1, 4),
  ]);

  assert.deepEqual(
    result.weightGroups.map((group) => group.groupKey),
    ['1|A', '1|C', '3|B', '3|D'],
  );
});

test('sorts weights within group by signal key', () => {
  const result = validateBulkWeightGroups([
    createRecord(2, 'B', 'implementer', 0, 1),
    createRecord(2, 'B', 'analyst', 2, 2),
    createRecord(2, 'B', 'driver', 3, 3),
  ]);

  assert.deepEqual(
    result.weightGroups[0]?.weights.map((weightRow) => weightRow.signalKey),
    ['analyst', 'driver', 'implementer'],
  );
});

test('detects duplicate signal key within one group', () => {
  const result = validateBulkWeightGroups([
    createRecord(1, 'A', 'driver', 3, 1),
    createRecord(1, 'A', 'driver', 2, 2),
  ]);

  assert.equal(result.success, false);
  assert.deepEqual(result.errors, [
    {
      questionNumber: 1,
      optionLabel: 'A',
      code: 'DUPLICATE_SIGNAL_KEY',
      message: 'Question 1 option A contains duplicate signal keys: driver.',
      lineNumbers: [1, 2],
    },
  ]);
});

test('detects multiple duplicate groups in one run', () => {
  const result = validateBulkWeightGroups([
    createRecord(1, 'A', 'driver', 3, 1),
    createRecord(1, 'A', 'driver', 2, 2),
    createRecord(2, 'C', 'analyst', 1, 3),
    createRecord(2, 'C', 'analyst', 4, 4),
  ]);

  assert.equal(result.success, false);
  assert.deepEqual(
    result.errors.map((error) => ({
      questionNumber: error.questionNumber,
      optionLabel: error.optionLabel,
      code: error.code,
      lineNumbers: error.lineNumbers,
    })),
    [
      { questionNumber: 1, optionLabel: 'A', code: 'DUPLICATE_SIGNAL_KEY', lineNumbers: [1, 2] },
      { questionNumber: 2, optionLabel: 'C', code: 'DUPLICATE_SIGNAL_KEY', lineNumbers: [3, 4] },
    ],
  );
});

test('returns success false when grouped validation errors exist', () => {
  const result = validateBulkWeightGroups([
    createRecord(1, 'A', 'driver', 3, 1),
    createRecord(1, 'A', 'driver', 2, 2),
    createRecord(1, 'B', 'analyst', 0, 3),
  ]);

  assert.equal(result.success, false);
});

test('returns success true when only warnings exist', () => {
  const result = validateBulkWeightGroups([
    createRecord(1, 'A', 'driver', 0, 1),
    createRecord(1, 'A', 'analyst', 0, 2),
  ]);

  assert.equal(result.success, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.warnings.length, 1);
});

test('flags zero-only group as warning', () => {
  const result = validateBulkWeightGroups([
    createRecord(1, 'B', 'driver', 0, 1),
    createRecord(1, 'B', 'influencer', 0, 2),
  ]);

  assert.deepEqual(result.warnings, [
    {
      questionNumber: 1,
      optionLabel: 'B',
      code: 'ZERO_ONLY_WEIGHT_GROUP',
      message: 'Question 1 option B contains only zero weights.',
      lineNumbers: [1, 2],
    },
  ]);
});

test('flags negative-only group as warning', () => {
  const result = validateBulkWeightGroups([
    createRecord(2, 'C', 'control', -1, 1),
    createRecord(2, 'C', 'critical', -2, 2),
  ]);

  assert.deepEqual(result.warnings, [
    {
      questionNumber: 2,
      optionLabel: 'C',
      code: 'NEGATIVE_ONLY_WEIGHT_GROUP',
      message: 'Question 2 option C contains only negative weights.',
      lineNumbers: [1, 2],
    },
  ]);
});

test('preserves line numbers in grouped errors', () => {
  const result = validateBulkWeightGroups([
    createRecord(4, 'D', 'analyst', 1, 7),
    createRecord(4, 'D', 'driver', 3, 8),
    createRecord(4, 'D', 'analyst', 2, 11),
  ]);

  assert.deepEqual(result.errors, [
    {
      questionNumber: 4,
      optionLabel: 'D',
      code: 'DUPLICATE_SIGNAL_KEY',
      message: 'Question 4 option D contains duplicate signal keys: analyst.',
      lineNumbers: [7, 11],
    },
  ]);
});

test('ignores parse errors by consuming only valid parsed records', () => {
  const preview = buildBulkWeightImportPreview([
    '1|A|driver|3',
    'bad|A|driver|2',
    '1|A|driver|1',
    '1|B|analyst|0',
    '1|B|implementer|0',
  ].join('\n'));

  assert.equal(preview.parseErrors.length, 1);
  assert.equal(preview.groupErrors.length, 1);
  assert.equal(preview.warnings.length, 1);
  assert.deepEqual(
    preview.weightGroups.map((group) => group.groupKey),
    ['1|A', '1|B'],
  );
});

test('build preview helper returns combined parse and grouped result', () => {
  const result = buildBulkWeightImportPreview([
    '1|A|driver|3',
    '1|A|driver|1',
    '2|B|analyst|0',
    '2|B|implementer|0',
    'x|A|driver|2',
  ].join('\n'));

  assert.equal(result.success, false);
  assert.equal(result.records.length, 4);
  assert.equal(result.parseErrors.length, 1);
  assert.equal(result.groupErrors.length, 1);
  assert.equal(result.warnings.length, 1);
});

test('defensively flags an empty weight group', () => {
  const result = validateBulkWeightGroup([]);

  assert.equal(result.weightGroup.isEmpty, true);
  assert.deepEqual(result.errors, [
    {
      questionNumber: 0,
      optionLabel: 'A',
      code: 'EMPTY_WEIGHT_GROUP',
      message: 'Question 0 option A does not contain any weight rows.',
      lineNumbers: [],
    },
  ]);
});
