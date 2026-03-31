import test from 'node:test';
import assert from 'node:assert/strict';

import { parseBulkOptionImport } from '@/lib/admin/bulk-option-import';

test('parses single valid row', () => {
  const result = parseBulkOptionImport('1|A|I prefer to make decisions quickly');

  assert.equal(result.success, true);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.records, [
    {
      lineNumber: 1,
      rawLine: '1|A|I prefer to make decisions quickly',
      questionNumberRaw: '1',
      questionNumber: 1,
      optionLabel: 'A',
      optionText: 'I prefer to make decisions quickly',
    },
  ]);
});

test('parses multiple valid rows', () => {
  const result = parseBulkOptionImport([
    '1|A|I move quickly and decide fast',
    '1|B|I prefer to discuss options with others',
    '1|C|I focus on process and structure',
    '1|D|I step back and analyse the detail',
  ].join('\n'));

  assert.equal(result.success, true);
  assert.equal(result.records.length, 4);
  assert.deepEqual(
    result.records.map((record) => ({
      lineNumber: record.lineNumber,
      questionNumber: record.questionNumber,
      optionLabel: record.optionLabel,
    })),
    [
      { lineNumber: 1, questionNumber: 1, optionLabel: 'A' },
      { lineNumber: 2, questionNumber: 1, optionLabel: 'B' },
      { lineNumber: 3, questionNumber: 1, optionLabel: 'C' },
      { lineNumber: 4, questionNumber: 1, optionLabel: 'D' },
    ],
  );
});

test('ignores blank lines', () => {
  const result = parseBulkOptionImport('\n1|A|First option\n\n   \n2|B|Second option\n');

  assert.equal(result.success, true);
  assert.equal(result.records.length, 2);
  assert.deepEqual(
    result.records.map((record) => record.lineNumber),
    [2, 5],
  );
});

test('trims extra whitespace around fields', () => {
  const result = parseBulkOptionImport('  4  |  B  |  I prefer more context before deciding  ');

  assert.equal(result.success, true);
  assert.deepEqual(result.records[0], {
    lineNumber: 1,
    rawLine: '  4  |  B  |  I prefer more context before deciding  ',
    questionNumberRaw: '4',
    questionNumber: 4,
    optionLabel: 'B',
    optionText: 'I prefer more context before deciding',
  });
});

test('normalizes lowercase labels to uppercase', () => {
  const result = parseBulkOptionImport('3|c|I focus on process and structure');

  assert.equal(result.success, true);
  assert.equal(result.records[0]?.optionLabel, 'C');
});

test('rejects invalid column count', () => {
  const result = parseBulkOptionImport('1|A');

  assert.equal(result.success, false);
  assert.deepEqual(result.records, []);
  assert.deepEqual(result.errors, [
    {
      lineNumber: 1,
      rawLine: '1|A',
      code: 'INVALID_COLUMN_COUNT',
      message:
        'Each row must contain exactly 3 pipe-delimited columns: question_number | option_label | option_text.',
    },
  ]);
});

test('rejects non-numeric question number', () => {
  const result = parseBulkOptionImport('x|B|Text');

  assert.equal(result.success, false);
  assert.equal(result.errors[0]?.code, 'INVALID_QUESTION_NUMBER');
  assert.equal(result.errors[0]?.message, 'Question number must be a positive integer.');
});

test('rejects zero or negative question number', () => {
  const zeroResult = parseBulkOptionImport('0|A|Text');
  const negativeResult = parseBulkOptionImport('-1|A|Text');

  assert.equal(zeroResult.success, false);
  assert.equal(zeroResult.errors[0]?.code, 'INVALID_QUESTION_NUMBER');
  assert.equal(negativeResult.success, false);
  assert.equal(negativeResult.errors[0]?.code, 'INVALID_QUESTION_NUMBER');
});

test('rejects invalid label outside A-D', () => {
  const result = parseBulkOptionImport('2|E|Text');

  assert.equal(result.success, false);
  assert.equal(result.errors[0]?.code, 'INVALID_OPTION_LABEL');
  assert.equal(result.errors[0]?.message, 'Option label must be one of A, B, C, or D.');
});

test('rejects empty option text', () => {
  const result = parseBulkOptionImport('3|C|   ');

  assert.equal(result.success, false);
  assert.equal(result.errors[0]?.code, 'EMPTY_OPTION_TEXT');
  assert.equal(result.errors[0]?.message, 'Option text is required.');
});

test('returns mixed success and errors for partially valid input', () => {
  const result = parseBulkOptionImport([
    '1|A|First option',
    'x|B|Bad question number',
    '2|d|Fourth option',
    '3|E|Bad label',
    '4|C|   ',
  ].join('\n'));

  assert.equal(result.success, false);
  assert.deepEqual(
    result.records.map((record) => ({
      lineNumber: record.lineNumber,
      questionNumber: record.questionNumber,
      optionLabel: record.optionLabel,
      optionText: record.optionText,
    })),
    [
      { lineNumber: 1, questionNumber: 1, optionLabel: 'A', optionText: 'First option' },
      { lineNumber: 3, questionNumber: 2, optionLabel: 'D', optionText: 'Fourth option' },
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
      { lineNumber: 5, code: 'EMPTY_OPTION_TEXT' },
    ],
  );
});

test('preserves original line numbers when blank lines exist', () => {
  const result = parseBulkOptionImport('\n\n1|A|First option\n\n2|B|Second option\n\nx|C|Broken');

  assert.deepEqual(
    result.records.map((record) => ({
      lineNumber: record.lineNumber,
      optionText: record.optionText,
    })),
    [
      { lineNumber: 3, optionText: 'First option' },
      { lineNumber: 5, optionText: 'Second option' },
    ],
  );
  assert.deepEqual(result.errors, [
    {
      lineNumber: 7,
      rawLine: 'x|C|Broken',
      code: 'INVALID_QUESTION_NUMBER',
      message: 'Question number must be a positive integer.',
    },
  ]);
});
