import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDomainKeyDraftState,
  isValidDomainKey,
  slugifyDomainKey,
  syncDomainKeyFromLabel,
  syncDomainKeyFromManualInput,
} from '@/lib/utils/domain-key';

test('slugifyDomainKey normalizes labels into deterministic hyphen slugs', () => {
  assert.equal(slugifyDomainKey(' Core Drivers '), 'core-drivers');
  assert.equal(slugifyDomainKey('Core / Drivers___Updated'), 'core-drivers-updated');
  assert.equal(slugifyDomainKey('---Core***Drivers---'), 'core-drivers');
});

test('new domain draft auto-generates and live-updates while key is untouched', () => {
  const initial = createDomainKeyDraftState({ label: '', key: '' });
  const withName = syncDomainKeyFromLabel(initial, 'Core Drivers');
  const updatedName = syncDomainKeyFromLabel(withName, 'Core Drivers Updated');

  assert.equal(withName.key, 'core-drivers');
  assert.equal(updatedName.key, 'core-drivers-updated');
  assert.equal(updatedName.keyManuallyEdited, false);
});

test('manual domain key override stops auto-sync until cleared', () => {
  const generated = syncDomainKeyFromLabel(
    createDomainKeyDraftState({ label: '', key: '' }),
    'Core Drivers',
  );
  const overridden = syncDomainKeyFromManualInput(generated, 'core-drivers-v2');
  const renamed = syncDomainKeyFromLabel(overridden, 'Core Drivers Revised');
  const resumed = syncDomainKeyFromLabel(
    syncDomainKeyFromManualInput(renamed, ''),
    'Core Drivers Final',
  );

  assert.equal(overridden.key, 'core-drivers-v2');
  assert.equal(overridden.keyManuallyEdited, true);
  assert.equal(renamed.key, 'core-drivers-v2');
  assert.equal(resumed.key, 'core-drivers-final');
  assert.equal(resumed.keyManuallyEdited, false);
});

test('existing saved domain keys are preserved in edit mode', () => {
  const existing = createDomainKeyDraftState({
    label: 'Core Drivers',
    key: 'leadership-style',
    mode: 'edit',
  });
  const renamed = syncDomainKeyFromLabel(existing, 'Core Drivers Updated');

  assert.equal(existing.key, 'leadership-style');
  assert.equal(renamed.key, 'leadership-style');
});

test('domain key validation only accepts lowercase hyphen slugs', () => {
  assert.equal(isValidDomainKey('core-drivers'), true);
  assert.equal(isValidDomainKey('Core-Drivers'), false);
  assert.equal(isValidDomainKey('core_drivers'), false);
  assert.equal(isValidDomainKey('core--drivers'), false);
  assert.equal(isValidDomainKey(''), false);
});
