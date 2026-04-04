import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentPath = join(
  process.cwd(),
  'components',
  'admin',
  'admin-domain-signal-authoring.tsx',
);
const domainsPagePath = join(
  process.cwd(),
  'app',
  '(admin)',
  'admin',
  'assessments',
  '[assessmentKey]',
  'domains',
  'page.tsx',
);
const domainsLayoutPath = join(
  process.cwd(),
  'app',
  '(admin)',
  'admin',
  'assessments',
  '[assessmentKey]',
  'layout.tsx',
);

function readComponentSource(): string {
  return readFileSync(componentPath, 'utf8');
}

function readDomainsPageSource(): string {
  return readFileSync(domainsPagePath, 'utf8');
}

function readDomainsLayoutSource(): string {
  return readFileSync(domainsLayoutPath, 'utf8');
}

test('domain authoring no longer renders a manual create domain form', () => {
  const source = readComponentSource();

  assert.doesNotMatch(source, /CreateDomainForm/);
  assert.doesNotMatch(source, /createDomainAction/);
  assert.doesNotMatch(source, /syncDomainKeyFromLabel/);
  assert.doesNotMatch(source, /syncDomainKeyFromManualInput/);
  assert.doesNotMatch(source, /DOMAIN_KEY_PATTERN/);
});

test('signal authoring no longer renders a manual create signal form', () => {
  const source = readComponentSource();

  assert.doesNotMatch(source, /CreateSignalForm/);
  assert.doesNotMatch(source, /createSignalAction/);
  assert.doesNotMatch(source, /syncSignalKeyFromName/);
  assert.doesNotMatch(source, /syncSignalKeyFromManualInput/);
  assert.doesNotMatch(source, /createSignalKeyDraftState/);
  assert.doesNotMatch(source, /SIGNAL_KEY_PATTERN/);
  assert.doesNotMatch(source, /sonartra-page-eyebrow">Add signal/);
  assert.doesNotMatch(source, /idleLabel="Add signal"/);
  assert.doesNotMatch(source, /pendingLabel="Adding signal\.\.\."/);
});

test('non-submit inline editor controls stay explicit button elements', () => {
  const source = readComponentSource();

  assert.match(source, /onClick=\{startEditing\}[\s\S]*type="button"/);
});

test('admin domain authoring path does not use mutable draft values as React keys', () => {
  const source = readComponentSource();

  assert.doesNotMatch(source, /key=\{draft/i);
  assert.doesNotMatch(source, /key=\{.*label.*\}/i);
  assert.doesNotMatch(source, /key=\{.*domainKey.*\}/i);
  assert.doesNotMatch(source, /key=\{.*signalKey.*\}/i);
  assert.doesNotMatch(source, /key=\{.*JSON\.stringify/i);
  assert.doesNotMatch(source, /key=\{.*domains\.length/i);
});

test('admin domain route wrappers do not introduce parent form nesting', () => {
  const pageSource = readDomainsPageSource();
  const layoutSource = readDomainsLayoutSource();

  assert.doesNotMatch(pageSource, /<form/i);
  assert.doesNotMatch(layoutSource, /<form/i);
});
