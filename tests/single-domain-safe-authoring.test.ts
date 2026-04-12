import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildSingleDomainCreateDomainValues,
  buildSingleDomainCreateSignalValues,
  buildSingleDomainLockedDomainValues,
  buildSingleDomainLockedSignalValues,
  isSingleDomainActionStateSuccess,
  serializeSingleDomainFormSnapshot,
  shouldBlockSingleDomainNavigation,
} from '@/lib/admin/single-domain-safe-authoring';

test('single-domain create values auto-generate canonical keys from labels', () => {
  assert.deepEqual(
    buildSingleDomainCreateDomainValues({
      label: 'Leadership Style',
      key: '',
      description: '',
    }),
    {
      label: 'Leadership Style',
      key: 'leadership-style',
      description: '',
    },
  );

  assert.deepEqual(
    buildSingleDomainCreateSignalValues({
      label: 'Core Driver / Plus',
      key: '',
      description: '',
    }),
    {
      label: 'Core Driver / Plus',
      key: 'core-driver-plus',
      description: '',
    },
  );
});

test('single-domain locked values preserve canonical keys when labels change', () => {
  assert.equal(
    buildSingleDomainLockedDomainValues(
      { label: 'Updated label', key: 'ignored', description: '' },
      'leadership-style',
    ).key,
    'leadership-style',
  );

  assert.equal(
    buildSingleDomainLockedSignalValues(
      { label: 'Updated signal', key: 'ignored', description: '' },
      'directive',
    ).key,
    'directive',
  );
});

test('single-domain dirty-state helpers detect successful saves and stable snapshots', () => {
  assert.equal(
    isSingleDomainActionStateSuccess({
      formError: null,
      fieldErrors: {},
      values: { label: '', key: '', description: '' },
    }),
    true,
  );

  assert.equal(
    isSingleDomainActionStateSuccess({
      formError: 'Failed',
      fieldErrors: {},
      values: { label: '', key: '', description: '' },
    }),
    false,
  );

  assert.equal(
    serializeSingleDomainFormSnapshot([
      ['description', 'Alpha'],
      ['label', 'Leadership'],
    ]),
    'description=Alpha&label=Leadership',
  );
});

test('single-domain dirty-state prompt logic only blocks meaningful navigations', () => {
  assert.equal(
    shouldBlockSingleDomainNavigation({
      currentHref: 'https://example.com/admin/assessments/single-domain/demo/domain',
      nextHref: 'https://example.com/admin/assessments/single-domain/demo/signals',
      hasDirtyChanges: true,
      isPrimaryNavigation: true,
    }),
    true,
  );

  assert.equal(
    shouldBlockSingleDomainNavigation({
      currentHref: 'https://example.com/admin/assessments/single-domain/demo/domain',
      nextHref: 'https://example.com/admin/assessments/single-domain/demo/domain',
      hasDirtyChanges: true,
      isPrimaryNavigation: true,
    }),
    false,
  );

  assert.equal(
    shouldBlockSingleDomainNavigation({
      currentHref: 'https://example.com/admin/assessments/single-domain/demo/domain',
      nextHref: 'https://example.com/admin/assessments/single-domain/demo/signals',
      hasDirtyChanges: false,
      isPrimaryNavigation: true,
    }),
    false,
  );
});

test('single-domain structural authoring source locks canonical keys and uses the unsaved-change guard', () => {
  const source = readFileSync(
    join(process.cwd(), 'components', 'admin', 'single-domain-structural-authoring.tsx'),
    'utf8',
  );

  assert.match(source, /CanonicalKeyField/);
  assert.match(source, /useSingleDomainDirtyForm/);
  assert.match(source, /readOnly/);
  assert.match(source, /The canonical key will be generated from the label when the domain is created/);
  assert.match(source, /This canonical key is locked after creation so downstream references stay stable/);
});

test('single-domain builder layout wires the shared unsaved-change provider', () => {
  const source = readFileSync(
    join(
      process.cwd(),
      'app',
      '(admin)',
      'admin',
      'assessments',
      'single-domain',
      '[assessmentKey]',
      'layout.tsx',
    ),
    'utf8',
  );

  assert.match(source, /SingleDomainUnsavedChangesProvider/);
});
