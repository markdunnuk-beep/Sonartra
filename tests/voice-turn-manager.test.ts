import test from 'node:test';
import assert from 'node:assert/strict';

import { createVoiceTurnManager } from '@/lib/voice/runtime/voice-turn-manager';

const assessment = {
  assessmentKey: 'wplp80',
  title: 'Work Preference Lens',
  versionTag: 'v1',
};

const questions = [
  {
    questionId: 'q1',
    questionNumber: 1,
    prompt: 'I prefer to work from a clear plan.',
    options: [],
    selectedOptionId: null,
  },
  {
    questionId: 'q2',
    questionNumber: 2,
    prompt: 'I prefer to adjust as I go.',
    options: [],
    selectedOptionId: null,
  },
] as const;

test('voice turn manager requests the initial active question once', () => {
  const reasons: string[] = [];
  const manager = createVoiceTurnManager({
    assessment,
    questions,
    currentQuestionIndex: 0,
    callbacks: {
      onQuestionRequested(request) {
        reasons.push(request.reason);
      },
    },
  });

  const initialSnapshot = manager.getSnapshot();
  assert.equal(initialSnapshot.status, 'ready');
  assert.equal(initialSnapshot.questionHasBeenSpoken, false);
  assert.equal(initialSnapshot.answerConfirmationState, 'pending');

  const requestedSnapshot = manager.requestInitialQuestion();
  assert.equal(requestedSnapshot.questionHasBeenSpoken, false);
  assert.equal(requestedSnapshot.activeQuestionNumber, 1);
  assert.deepEqual(reasons, ['initial']);

  manager.requestInitialQuestion();
  assert.deepEqual(reasons, ['initial']);

  const spokenSnapshot = manager.markCurrentQuestionSpoken();
  assert.equal(spokenSnapshot.questionHasBeenSpoken, true);
});

test('voice turn manager repeats the current question and advances in canonical order', () => {
  const reasons: string[] = [];
  const numbers: number[] = [];
  const manager = createVoiceTurnManager({
    assessment,
    questions,
    currentQuestionIndex: 0,
    callbacks: {
      onQuestionRequested(request) {
        reasons.push(request.reason);
        numbers.push(request.question.questionNumber);
      },
    },
  });

  manager.requestInitialQuestion();
  manager.markCurrentQuestionSpoken();
  manager.setAnswerConfirmationState('confirmed');
  manager.repeatCurrentQuestion();
  const nextSnapshot = manager.advanceToNextQuestion();

  assert.equal(nextSnapshot.activeQuestionNumber, 2);
  assert.equal(nextSnapshot.questionHasBeenSpoken, false);
  assert.equal(nextSnapshot.answerConfirmationState, 'pending');
  assert.deepEqual(reasons, ['initial', 'repeat', 'advance']);
  assert.deepEqual(numbers, [1, 1, 2]);
});

test('voice turn manager completes after the final canonical question', () => {
  const manager = createVoiceTurnManager({
    assessment,
    questions,
    currentQuestionIndex: 1,
  });

  manager.requestInitialQuestion();
  manager.markCurrentQuestionSpoken();
  manager.setAnswerConfirmationState('corrected');
  const completedSnapshot = manager.advanceToNextQuestion();

  assert.equal(completedSnapshot.status, 'completed');
  assert.equal(completedSnapshot.activeQuestion, null);
  assert.equal(completedSnapshot.activeQuestionNumber, null);
});

test('voice turn manager rejects invalid prepared question indexes', () => {
  const manager = createVoiceTurnManager({
    assessment,
    questions,
    currentQuestionIndex: 8,
  });

  const snapshot = manager.getSnapshot();

  assert.equal(snapshot.status, 'error');
  assert.match(snapshot.error ?? '', /invalid/i);
});

test('voice turn manager blocks progression until the current answer is confirmed or corrected', () => {
  const manager = createVoiceTurnManager({
    assessment,
    questions,
    currentQuestionIndex: 0,
  });

  manager.requestInitialQuestion();
  manager.markCurrentQuestionSpoken();

  const blockedSnapshot = manager.advanceToNextQuestion();
  assert.equal(blockedSnapshot.status, 'ready');
  assert.match(blockedSnapshot.error ?? '', /confirmed or corrected/i);

  manager.setAnswerConfirmationState('confirmed');
  const nextSnapshot = manager.advanceToNextQuestion();
  assert.equal(nextSnapshot.status, 'ready');
  assert.equal(nextSnapshot.activeQuestionNumber, 2);
});
