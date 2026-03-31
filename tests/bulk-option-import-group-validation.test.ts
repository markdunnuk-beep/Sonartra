import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildBulkOptionImportPreview,
  type ParsedBulkOptionRow,
  validateBulkOptionGroups,
} from '@/lib/admin/bulk-option-import';

function createRecord(
  questionNumber: number,
  optionLabel: ParsedBulkOptionRow['optionLabel'],
  optionText: string,
  lineNumber: number,
): ParsedBulkOptionRow {
  return {
    lineNumber,
    rawLine: `${questionNumber}|${optionLabel}|${optionText}`,
    questionNumberRaw: String(questionNumber),
    questionNumber,
    optionLabel,
    optionText,
  };
}

test('validates one complete question with A-D', () => {
  const result = validateBulkOptionGroups([
    createRecord(1, 'A', 'Option A', 1),
    createRecord(1, 'B', 'Option B', 2),
    createRecord(1, 'C', 'Option C', 3),
    createRecord(1, 'D', 'Option D', 4),
  ]);

  assert.equal(result.success, true);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.questionGroups, [
    {
      questionNumber: 1,
      options: [
        { lineNumber: 1, optionLabel: 'A', optionText: 'Option A' },
        { lineNumber: 2, optionLabel: 'B', optionText: 'Option B' },
        { lineNumber: 3, optionLabel: 'C', optionText: 'Option C' },
        { lineNumber: 4, optionLabel: 'D', optionText: 'Option D' },
      ],
      optionLabels: ['A', 'B', 'C', 'D'],
      isComplete: true,
      optionCount: 4,
    },
  ]);
});

test('validates multiple complete questions', () => {
  const result = validateBulkOptionGroups([
    createRecord(1, 'A', 'Q1 A', 1),
    createRecord(1, 'B', 'Q1 B', 2),
    createRecord(1, 'C', 'Q1 C', 3),
    createRecord(1, 'D', 'Q1 D', 4),
    createRecord(2, 'A', 'Q2 A', 5),
    createRecord(2, 'B', 'Q2 B', 6),
    createRecord(2, 'C', 'Q2 C', 7),
    createRecord(2, 'D', 'Q2 D', 8),
  ]);

  assert.equal(result.success, true);
  assert.equal(result.questionGroups.length, 2);
  assert.deepEqual(
    result.questionGroups.map((group) => group.questionNumber),
    [1, 2],
  );
});

test('sorts options by A-D order regardless of input row order', () => {
  const result = validateBulkOptionGroups([
    createRecord(3, 'D', 'Option D', 10),
    createRecord(3, 'B', 'Option B', 8),
    createRecord(3, 'A', 'Option A', 7),
    createRecord(3, 'C', 'Option C', 9),
  ]);

  assert.equal(result.success, true);
  assert.deepEqual(
    result.questionGroups[0]?.options.map((option) => option.optionLabel),
    ['A', 'B', 'C', 'D'],
  );
});

test('detects duplicate label within one question', () => {
  const result = validateBulkOptionGroups([
    createRecord(5, 'A', 'Option A1', 1),
    createRecord(5, 'A', 'Option A2', 2),
    createRecord(5, 'C', 'Option C', 3),
    createRecord(5, 'D', 'Option D', 4),
  ]);

  assert.equal(result.success, false);
  assert.deepEqual(
    result.errors.map((error) => error.code),
    ['DUPLICATE_OPTION_LABEL', 'INCOMPLETE_OPTION_SET', 'MISSING_OPTION_LABELS'],
  );
});

test('detects missing label within one question', () => {
  const result = validateBulkOptionGroups([
    createRecord(7, 'A', 'Option A', 1),
    createRecord(7, 'B', 'Option B', 2),
    createRecord(7, 'D', 'Option D', 3),
  ]);

  assert.equal(result.success, false);
  assert.deepEqual(result.errors, [
    {
      questionNumber: 7,
      code: 'INCOMPLETE_OPTION_SET',
      message: 'Question 7 must provide one complete set of A, B, C, and D options.',
      lineNumbers: [1, 2, 3],
    },
    {
      questionNumber: 7,
      code: 'MISSING_OPTION_LABELS',
      message: 'Question 7 is missing option labels: C.',
      lineNumbers: [1, 2, 3],
    },
  ]);
});

test('detects incomplete question with only 3 options', () => {
  const result = validateBulkOptionGroups([
    createRecord(20, 'A', 'Option A', 11),
    createRecord(20, 'B', 'Option B', 12),
    createRecord(20, 'C', 'Option C', 13),
  ]);

  assert.equal(result.success, false);
  assert.equal(result.questionGroups[0]?.isComplete, false);
  assert.equal(result.questionGroups[0]?.optionCount, 3);
  assert.equal(result.errors.some((error) => error.code === 'INCOMPLETE_OPTION_SET'), true);
});

test('detects excess rows over 4 for one question', () => {
  const result = validateBulkOptionGroups([
    createRecord(8, 'A', 'Option A1', 1),
    createRecord(8, 'B', 'Option B', 2),
    createRecord(8, 'C', 'Option C', 3),
    createRecord(8, 'D', 'Option D', 4),
    createRecord(8, 'A', 'Option A2', 5),
  ]);

  assert.equal(result.success, false);
  assert.deepEqual(
    result.errors.map((error) => error.code),
    ['DUPLICATE_OPTION_LABEL', 'EXCESS_OPTION_ROWS', 'INCOMPLETE_OPTION_SET'],
  );
});

test('detects duplicate label plus missing label together', () => {
  const result = validateBulkOptionGroups([
    createRecord(12, 'A', 'Option A1', 1),
    createRecord(12, 'A', 'Option A2', 2),
    createRecord(12, 'C', 'Option C', 3),
    createRecord(12, 'D', 'Option D', 4),
  ]);

  assert.deepEqual(
    result.errors.map((error) => ({
      code: error.code,
      lineNumbers: error.lineNumbers,
    })),
    [
      { code: 'DUPLICATE_OPTION_LABEL', lineNumbers: [1, 2] },
      { code: 'INCOMPLETE_OPTION_SET', lineNumbers: [1, 2, 3, 4] },
      { code: 'MISSING_OPTION_LABELS', lineNumbers: [1, 2, 3, 4] },
    ],
  );
});

test('detects multiple invalid question groups in one run', () => {
  const result = validateBulkOptionGroups([
    createRecord(2, 'A', 'Option A', 1),
    createRecord(2, 'C', 'Option C', 2),
    createRecord(4, 'A', 'Option A1', 3),
    createRecord(4, 'A', 'Option A2', 4),
    createRecord(4, 'B', 'Option B', 5),
    createRecord(4, 'C', 'Option C', 6),
    createRecord(4, 'D', 'Option D', 7),
  ]);

  assert.equal(result.success, false);
  assert.deepEqual(
    result.errors.map((error) => ({ questionNumber: error.questionNumber, code: error.code })),
    [
      { questionNumber: 2, code: 'INCOMPLETE_OPTION_SET' },
      { questionNumber: 2, code: 'MISSING_OPTION_LABELS' },
      { questionNumber: 4, code: 'DUPLICATE_OPTION_LABEL' },
      { questionNumber: 4, code: 'EXCESS_OPTION_ROWS' },
      { questionNumber: 4, code: 'INCOMPLETE_OPTION_SET' },
    ],
  );
});

test('preserves deterministic ordering of question groups', () => {
  const result = validateBulkOptionGroups([
    createRecord(10, 'A', 'Q10 A', 10),
    createRecord(10, 'B', 'Q10 B', 11),
    createRecord(10, 'C', 'Q10 C', 12),
    createRecord(10, 'D', 'Q10 D', 13),
    createRecord(2, 'A', 'Q2 A', 1),
    createRecord(2, 'B', 'Q2 B', 2),
    createRecord(2, 'C', 'Q2 C', 3),
    createRecord(2, 'D', 'Q2 D', 4),
  ]);

  assert.deepEqual(
    result.questionGroups.map((group) => group.questionNumber),
    [2, 10],
  );
});

test('optionally flags duplicate option text as warning', () => {
  const result = validateBulkOptionGroups([
    createRecord(11, 'A', 'Strongly agree', 1),
    createRecord(11, 'B', 'Strongly agree', 2),
    createRecord(11, 'C', 'Prefer not to say', 3),
    createRecord(11, 'D', 'Unsure', 4),
  ]);

  assert.equal(result.success, true);
  assert.deepEqual(result.warnings, [
    {
      questionNumber: 11,
      code: 'DUPLICATE_OPTION_TEXT',
      message: 'Question 11 contains duplicate option text.',
      lineNumbers: [1, 2],
    },
  ]);
});

test('ignores parse errors by consuming only valid parsed records', () => {
  const preview = buildBulkOptionImportPreview([
    '1|A|Option A',
    '1|B|Option B',
    'bad|C|Broken',
    '1|C|Option C',
    '1|D|Option D',
  ].join('\n'));

  assert.equal(preview.parseErrors.length, 1);
  assert.equal(preview.groupErrors.length, 0);
  assert.equal(preview.questionGroups.length, 1);
  assert.equal(preview.success, false);
});

test('returns success false when any grouped validation errors exist', () => {
  const result = validateBulkOptionGroups([
    createRecord(9, 'A', 'Option A', 1),
    createRecord(9, 'B', 'Option B', 2),
    createRecord(9, 'D', 'Option D', 3),
  ]);

  assert.equal(result.success, false);
});

test('returns success true when all question groups are complete and valid', () => {
  const result = validateBulkOptionGroups([
    createRecord(1, 'D', 'Q1 D', 4),
    createRecord(1, 'B', 'Q1 B', 2),
    createRecord(1, 'A', 'Q1 A', 1),
    createRecord(1, 'C', 'Q1 C', 3),
    createRecord(3, 'B', 'Q3 B', 6),
    createRecord(3, 'A', 'Q3 A', 5),
    createRecord(3, 'D', 'Q3 D', 8),
    createRecord(3, 'C', 'Q3 C', 7),
  ]);

  assert.equal(result.success, true);
  assert.equal(result.errors.length, 0);
});
