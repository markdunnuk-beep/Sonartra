import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSignalKeyDraftState,
  slugifySignalKey,
  syncSignalKeyFromManualInput,
  syncSignalKeyFromName,
} from '@/lib/utils/signal-key';

test('slugifySignalKey matches the shared hyphen slug rules', () => {
  assert.equal(slugifySignalKey(' Directive '), 'directive');
  assert.equal(slugifySignalKey('Core / Driver___Plus'), 'core-driver-plus');
  assert.equal(slugifySignalKey('---Core***Driver---'), 'core-driver');
});

test('new signal draft auto-generates and live-updates while key is untouched', () => {
  const initial = createSignalKeyDraftState({ label: '', key: '' });
  const withName = syncSignalKeyFromName(initial, 'Core Driver');
  const updatedName = syncSignalKeyFromName(withName, 'Core Driver Plus');

  assert.equal(withName.key, 'core-driver');
  assert.equal(updatedName.key, 'core-driver-plus');
  assert.equal(updatedName.keyManuallyEdited, false);
});

test('manual signal key override stops auto-sync until cleared', () => {
  const generated = syncSignalKeyFromName(
    createSignalKeyDraftState({ label: '', key: '' }),
    'Directive',
  );
  const overridden = syncSignalKeyFromManualInput(generated, 'directive-v2');
  const renamed = syncSignalKeyFromName(overridden, 'Directive Plus');
  const resumed = syncSignalKeyFromName(
    syncSignalKeyFromManualInput(renamed, ''),
    'Directive Final',
  );

  assert.equal(overridden.key, 'directive-v2');
  assert.equal(overridden.keyManuallyEdited, true);
  assert.equal(renamed.key, 'directive-v2');
  assert.equal(resumed.key, 'directive-final');
  assert.equal(resumed.keyManuallyEdited, false);
});

test('existing saved signal keys are preserved in edit mode', () => {
  const existing = createSignalKeyDraftState({
    label: 'Directive',
    key: 'style_directive',
    mode: 'edit',
  });
  const renamed = syncSignalKeyFromName(existing, 'Directive Updated');

  assert.equal(existing.key, 'style_directive');
  assert.equal(renamed.key, 'style_directive');
});
