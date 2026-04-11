import test from 'node:test';
import assert from 'node:assert/strict';

import { getRunnerState } from '@/lib/assessment-runner/runner-state';

test('partial answers derive IN_PROGRESS', () => {
  assert.equal(
    getRunnerState({
      answeredCount: 12,
      totalQuestions: 90,
      attemptStatus: 'in_progress',
    }),
    'IN_PROGRESS',
  );
});

test('all answers with editable attempt derive ANSWERED_AWAITING_SUBMIT', () => {
  assert.equal(
    getRunnerState({
      answeredCount: 90,
      totalQuestions: 90,
      attemptStatus: 'in_progress',
    }),
    'ANSWERED_AWAITING_SUBMIT',
  );
});

test('submitted lifecycle states derive SUBMITTED', () => {
  assert.equal(
    getRunnerState({
      answeredCount: 90,
      totalQuestions: 90,
      attemptStatus: 'completed_processing',
    }),
    'SUBMITTED',
  );
});

test('ready lifecycle states derive SUBMITTED', () => {
  assert.equal(
    getRunnerState({
      answeredCount: 90,
      totalQuestions: 90,
      attemptStatus: 'ready',
    }),
    'SUBMITTED',
  );
});
