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

function readComponentSource(): string {
  return readFileSync(componentPath, 'utf8');
}

test('create domain form change handlers stay local and avoid direct submit/navigation calls', () => {
  const source = readComponentSource();

  assert.match(source, /syncDomainKeyFromLabel\(previousState, event\.currentTarget\.value\)/);
  assert.match(source, /syncDomainKeyFromManualInput\(previousState, event\.currentTarget\.value\)/);
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
