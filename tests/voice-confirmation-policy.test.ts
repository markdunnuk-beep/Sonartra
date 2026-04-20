import test from 'node:test';
import assert from 'node:assert/strict';

import { getVoiceConfirmationMode } from '@/lib/voice/resolution/voice-confirmation-policy';

test('high-confidence candidates auto-accept', () => {
  const mode = getVoiceConfirmationMode({
    status: 'resolved',
    confidence: 0.94,
    inferredOptionId: 'option-a',
  });

  assert.equal(mode, 'auto_accept');
});

test('medium-confidence candidates require confirmation', () => {
  const mode = getVoiceConfirmationMode({
    status: 'low_confidence',
    confidence: 0.76,
    inferredOptionId: 'option-b',
  });

  assert.equal(mode, 'require_confirmation');
});

test('low-confidence candidates require retry', () => {
  const mode = getVoiceConfirmationMode({
    status: 'low_confidence',
    confidence: 0.55,
    inferredOptionId: 'option-c',
  });

  assert.equal(mode, 'require_retry');
});

test('unresolved answers require retry even without a candidate', () => {
  const mode = getVoiceConfirmationMode({
    status: 'unresolved',
    confidence: null,
    inferredOptionId: null,
  });

  assert.equal(mode, 'require_retry');
});
