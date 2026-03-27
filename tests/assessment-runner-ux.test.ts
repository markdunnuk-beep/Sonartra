import test from 'node:test';
import assert from 'node:assert/strict';

import { getResumeQuestionIndex } from '@/lib/assessment-runner/runner-ux';

test('resume opens on the first unanswered question in canonical order', () => {
  const index = getResumeQuestionIndex([
    { selectedOptionId: 'option-1' },
    { selectedOptionId: 'option-2' },
    { selectedOptionId: null },
    { selectedOptionId: null },
  ]);

  assert.equal(index, 2);
});

test('resume falls back to the first question when nothing is answered yet', () => {
  const index = getResumeQuestionIndex([
    { selectedOptionId: null },
    { selectedOptionId: null },
  ]);

  assert.equal(index, 0);
});

test('resume opens on the last question when every question is already answered', () => {
  const index = getResumeQuestionIndex([
    { selectedOptionId: 'option-1' },
    { selectedOptionId: 'option-2' },
    { selectedOptionId: 'option-3' },
  ]);

  assert.equal(index, 2);
});

test('resume prefers the first unanswered question for sparse response patterns', () => {
  const index = getResumeQuestionIndex([
    { selectedOptionId: 'option-1' },
    { selectedOptionId: null },
    { selectedOptionId: 'option-3' },
  ]);

  assert.equal(index, 1);
});
