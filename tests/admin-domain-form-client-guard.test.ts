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

test('create domain form change handlers stay local and avoid direct submit/navigation calls', () => {
  const source = readComponentSource();

  assert.match(source, /const nextLabel = event\.currentTarget\.value/);
  assert.match(source, /syncDomainKeyFromLabel\(previousState, nextLabel\)/);
  assert.match(source, /const nextKey = event\.currentTarget\.value/);
  assert.match(source, /syncDomainKeyFromManualInput\(previousState, nextKey\)/);
  assert.doesNotMatch(source, /requestSubmit\(/);
  assert.doesNotMatch(source, /router\.(refresh|push|replace)\(/);
  assert.doesNotMatch(source, /redirect\(/);
});

test('non-submit inline editor controls stay explicit button elements', () => {
  const source = readComponentSource();

  assert.match(source, /onClick=\{startEditing\}[\s\S]*type="button"/);
});

test('create domain draft is not rehydrated from action state during typing', () => {
  const source = readComponentSource();

  assert.doesNotMatch(
    source,
    /setDraftState\(\s*createDomainKeyDraftState\(\{\s*label:\s*currentState\.values\.label,\s*key:\s*currentState\.values\.key,/,
  );
});

test('create domain server action is memoized so typing does not replace the action identity', () => {
  const source = readComponentSource();

  assert.match(source, /const createDomainFormAction = useMemo\(/);
  assert.match(source, /useActionState\(\s*createDomainFormAction,/);
  assert.doesNotMatch(source, /useActionState\(\s*createDomainAction\.bind/);
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
