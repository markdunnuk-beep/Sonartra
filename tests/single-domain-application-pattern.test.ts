import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSingleDomainApplicationPattern } from '@/lib/assessment-language/single-domain-application-pattern';

test('buildSingleDomainApplicationPattern derives full pattern, pair, and role mapping', () => {
  const pattern = buildSingleDomainApplicationPattern([
    'results',
    'vision',
    'people',
    'process',
  ]);

  assert.equal(pattern.patternKey, 'results_vision_people_process');
  assert.equal(pattern.pairKey, 'results_vision');
  assert.deepEqual(pattern.signalByRole, {
    primary_driver: 'results',
    secondary_driver: 'vision',
    supporting_context: 'people',
    range_limitation: 'process',
  });
  assert.deepEqual(pattern.roleBySignal, {
    results: 'primary_driver',
    vision: 'secondary_driver',
    people: 'supporting_context',
    process: 'range_limitation',
  });
});

test('buildSingleDomainApplicationPattern preserves lower-signal order', () => {
  const first = buildSingleDomainApplicationPattern([
    'results',
    'vision',
    'people',
    'process',
  ]);
  const second = buildSingleDomainApplicationPattern([
    'results',
    'vision',
    'process',
    'people',
  ]);

  assert.equal(first.signalByRole.supporting_context, 'people');
  assert.equal(first.signalByRole.range_limitation, 'process');
  assert.equal(second.signalByRole.supporting_context, 'process');
  assert.equal(second.signalByRole.range_limitation, 'people');
});

test('buildSingleDomainApplicationPattern rejects fewer than four ranked signals', () => {
  assert.throws(
    () => buildSingleDomainApplicationPattern(['results', 'vision', 'people']),
    /requires at least four ranked signals/i,
  );
});

