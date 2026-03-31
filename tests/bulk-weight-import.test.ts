import test from 'node:test';
import assert from 'node:assert/strict';

import { parseBulkWeightImport } from '@/lib/admin/bulk-weight-import';

test('parses a single valid row', () => {
  const result = parseBulkWeightImport('1|A|driver|3');

  assert.equal(result.success, true);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.records, [
    {
      lineNumber: 1,
      rawLine: '1|A|driver|3',
      questionNumberRaw: '1',
      questionNumber: 1,
      optionLabel: 'A',
      signalKeyRaw: 'driver',
      signalKey: 'driver',
      weightRaw: '3',
      weight: 3,
    },
  ]);
});

test('parses multiple valid rows', () => {
  const result = parseBulkWeightImport([
    '1|A|driver|3',
    '1|A|influencer|1',
    '1|A|implementer|0',
    '1|A|analyst|2',
  ].join('\n'));

  assert.equal(result.success, true);
  assert.equal(result.records.length, 4);
  assert.deepEqual(
    result.records.map((record) => ({
      lineNumber: record.lineNumber,
      questionNumber: record.questionNumber,
      optionLabel: record.optionLabel,
      signalKey: record.signalKey,
      weight: record.weight,
    })),
    [
      { lineNumber: 1, questionNumber: 1, optionLabel: 'A', signalKey: 'driver', weight: 3 },
      { lineNumber: 2, questionNumber: 1, optionLabel: 'A', signalKey: 'influencer', weight: 1 },
      { lineNumber: 3, questionNumber: 1, optionLabel: 'A', signalKey: 'implementer', weight: 0 },
      { lineNumber: 4, questionNumber: 1, optionLabel: 'A', signalKey: 'analyst', weight: 2 },
    ],
  );
});

test('ignores blank lines', () => {
  const result = parseBulkWeightImport('\n1|A|driver|3\n\n   \n2|B|influencer|1\n');

  assert.equal(result.success, true);
  assert.equal(result.records.length, 2);
  assert.deepEqual(
    result.records.map((record) => record.lineNumber),
    [2, 5],
  );
});

test('trims extra whitespace around all fields', () => {
  const result = parseBulkWeightImport('  04  |  b  |  Driver_Profile  |  1.5  ');

  assert.equal(result.success, true);
  assert.deepEqual(result.records[0], {
    lineNumber: 1,
    rawLine: '  04  |  b  |  Driver_Profile  |  1.5  ',
    questionNumberRaw: '04',
    questionNumber: 4,
    optionLabel: 'B',
    signalKeyRaw: 'Driver_Profile',
    signalKey: 'driver_profile',
    weightRaw: '1.5',
    weight: 1.5,
  });
});

test('normalizes lowercase option labels to uppercase', () => {
  const result = parseBulkWeightImport('3|c|driver|2');

  assert.equal(result.success, true);
  assert.equal(result.records[0]?.optionLabel, 'C');
});

test('normalizes signal keys to lowercase', () => {
  const result = parseBulkWeightImport('3|C|Decision-Speed|2');

  assert.equal(result.success, true);
  assert.equal(result.records[0]?.signalKey, 'decision-speed');
});

test('parses zero as a valid weight', () => {
  const result = parseBulkWeightImport('2|B|driver|0');

  assert.equal(result.success, true);
  assert.equal(result.records[0]?.weight, 0);
});

test('parses negative numbers', () => {
  const result = parseBulkWeightImport('2|B|driver|-1');

  assert.equal(result.success, true);
  assert.equal(result.records[0]?.weight, -1);
});

test('parses decimals', () => {
  const result = parseBulkWeightImport('2|B|driver|0.5');

  assert.equal(result.success, true);
  assert.equal(result.records[0]?.weight, 0.5);
});

test('rejects invalid column count', () => {
  const result = parseBulkWeightImport('1|A|driver');

  assert.equal(result.success, false);
  assert.deepEqual(result.records, []);
  assert.deepEqual(result.errors, [
    {
      lineNumber: 1,
      rawLine: '1|A|driver',
      code: 'INVALID_COLUMN_COUNT',
      message:
        'Each row must contain exactly 4 pipe-delimited columns: question_number | option_label | signal_key | weight.',
    },
  ]);
});

test('rejects non-numeric question number', () => {
  const result = parseBulkWeightImport('x|A|driver|3');

  assert.equal(result.success, false);
  assert.equal(result.errors[0]?.code, 'INVALID_QUESTION_NUMBER');
  assert.equal(result.errors[0]?.message, 'Question number must be a positive integer.');
});

test('rejects zero or negative question number', () => {
  const zeroResult = parseBulkWeightImport('0|A|driver|3');
  const negativeResult = parseBulkWeightImport('-1|A|driver|3');

  assert.equal(zeroResult.success, false);
  assert.equal(zeroResult.errors[0]?.code, 'INVALID_QUESTION_NUMBER');
  assert.equal(negativeResult.success, false);
  assert.equal(negativeResult.errors[0]?.code, 'INVALID_QUESTION_NUMBER');
});

test('rejects invalid option label outside A-D', () => {
  const result = parseBulkWeightImport('1|E|driver|3');

  assert.equal(result.success, false);
  assert.equal(result.errors[0]?.code, 'INVALID_OPTION_LABEL');
  assert.equal(result.errors[0]?.message, 'Option label must be one of A, B, C, or D.');
});

test('rejects empty signal key', () => {
  const result = parseBulkWeightImport('1|A||3');

  assert.equal(result.success, false);
  assert.equal(result.errors[0]?.code, 'EMPTY_SIGNAL_KEY');
  assert.equal(result.errors[0]?.message, 'Signal key is required.');
});

test('rejects empty weight', () => {
  const result = parseBulkWeightImport('1|A|driver|');

  assert.equal(result.success, false);
  assert.equal(result.errors[0]?.code, 'EMPTY_WEIGHT');
  assert.equal(result.errors[0]?.message, 'Weight is required.');
});

test('rejects invalid non-numeric weight', () => {
  const result = parseBulkWeightImport('1|A|driver|abc');

  assert.equal(result.success, false);
  assert.equal(result.errors[0]?.code, 'INVALID_WEIGHT');
  assert.equal(result.errors[0]?.message, 'Weight must be a valid number.');
});

test('returns mixed records and errors for partially valid input', () => {
  const result = parseBulkWeightImport([
    '1|A|driver|3',
    'x|B|influencer|1',
    '2|d|Implementer|0',
    '3|E|analyst|2',
    '4|C||1',
    '5|A|driver|abc',
  ].join('\n'));

  assert.equal(result.success, false);
  assert.deepEqual(
    result.records.map((record) => ({
      lineNumber: record.lineNumber,
      questionNumber: record.questionNumber,
      optionLabel: record.optionLabel,
      signalKey: record.signalKey,
      weight: record.weight,
    })),
    [
      { lineNumber: 1, questionNumber: 1, optionLabel: 'A', signalKey: 'driver', weight: 3 },
      { lineNumber: 3, questionNumber: 2, optionLabel: 'D', signalKey: 'implementer', weight: 0 },
    ],
  );
  assert.deepEqual(
    result.errors.map((error) => ({
      lineNumber: error.lineNumber,
      code: error.code,
    })),
    [
      { lineNumber: 2, code: 'INVALID_QUESTION_NUMBER' },
      { lineNumber: 4, code: 'INVALID_OPTION_LABEL' },
      { lineNumber: 5, code: 'EMPTY_SIGNAL_KEY' },
      { lineNumber: 6, code: 'INVALID_WEIGHT' },
    ],
  );
});

test('preserves line numbers when blank lines exist', () => {
  const result = parseBulkWeightImport('\n\n1|A|driver|3\n\n2|B|influencer|1\n\nx|C|analyst|2');

  assert.deepEqual(
    result.records.map((record) => ({
      lineNumber: record.lineNumber,
      signalKey: record.signalKey,
    })),
    [
      { lineNumber: 3, signalKey: 'driver' },
      { lineNumber: 5, signalKey: 'influencer' },
    ],
  );
  assert.deepEqual(result.errors, [
    {
      lineNumber: 7,
      rawLine: 'x|C|analyst|2',
      code: 'INVALID_QUESTION_NUMBER',
      message: 'Question number must be a positive integer.',
    },
  ]);
});
