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
