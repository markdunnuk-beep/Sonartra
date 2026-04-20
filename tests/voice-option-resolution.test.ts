import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveVoiceOption } from '@/lib/voice/resolution/voice-option-resolution';

const question = {
  questionId: 'question-1',
  prompt: 'When beginning a new initiative, I usually:',
  options: [
    {
      optionId: 'option-a',
      label: 'A',
      text: 'Start immediately and refine as I go',
    },
    {
      optionId: 'option-b',
      label: 'B',
      text: 'Map out the plan in detail first',
    },
    {
      optionId: 'option-c',
      label: 'C',
      text: 'Speak to key stakeholders before acting',
    },
    {
      optionId: 'option-d',
      label: 'D',
      text: 'Wait for clarity and direction',
    },
  ],
} as const;

test('resolves explicit ordinal references', () => {
  const result = resolveVoiceOption({
    question,
    transcript: 'the second one',
  });

  assert.equal(result.result.status, 'resolved');
  assert.equal(result.result.inferredOptionId, 'option-b');
});

test('returns low_confidence for hedged explicit references', () => {
  const result = resolveVoiceOption({
    question,
    transcript: 'probably the first',
  });

  assert.equal(result.result.status, 'low_confidence');
  assert.equal(result.result.inferredOptionId, 'option-a');
});

test('resolves option-label references', () => {
  const result = resolveVoiceOption({
    question,
    transcript: 'more like B',
  });

  assert.equal(result.result.status, 'low_confidence');
  assert.equal(result.result.inferredOptionId, 'option-b');
});

test('returns unresolved for multiple option references', () => {
  const result = resolveVoiceOption({
    question,
    transcript: 'between A and C',
  });

  assert.equal(result.result.status, 'unresolved');
  assert.equal(result.result.inferredOptionId, null);
});

test('returns invalid_input for empty transcript', () => {
  const result = resolveVoiceOption({
    question,
    transcript: '   ',
  });

  assert.equal(result.result.status, 'invalid_input');
  assert.equal(result.result.inferredOptionId, null);
});

test('returns unresolved for clearly off-topic answers', () => {
  const result = resolveVoiceOption({
    question,
    transcript: "I don't know, anything is fine",
  });

  assert.equal(result.result.status, 'unresolved');
  assert.equal(result.result.inferredOptionId, null);
});

test('resolves strong natural-language option paraphrases', () => {
  const result = resolveVoiceOption({
    question,
    transcript: 'I would map out the plan in detail first before doing anything else',
  });

  assert.equal(result.result.status, 'resolved');
  assert.equal(result.result.inferredOptionId, 'option-b');
});
