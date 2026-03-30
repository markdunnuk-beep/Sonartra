import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentPath = join(
  process.cwd(),
  'components',
  'admin',
  'admin-question-option-authoring.tsx',
);

function readComponentSource(): string {
  return readFileSync(componentPath, 'utf8');
}

test('bulk paste form memoizes its server action before useActionState', () => {
  const source = readComponentSource();

  assert.match(source, /const createBulkQuestionsFormAction = useMemo\(/);
  assert.match(source, /useActionState\(createBulkQuestionsFormAction,/);
  assert.doesNotMatch(source, /useActionState\(\s*createBulkQuestions\.bind/);
});

test('multi-domain bulk paste form memoizes its server action before useActionState', () => {
  const source = readComponentSource();

  assert.match(source, /const createBulkQuestionsByDomainFormAction = useMemo\(/);
  assert.match(source, /useActionState\(createBulkQuestionsByDomainFormAction,/);
  assert.doesNotMatch(source, /useActionState\(\s*createBulkQuestionsByDomain\.bind/);
});

test('bulk paste textarea snapshots event values before updating local state', () => {
  const source = readComponentSource();

  assert.match(source, /const nextQuestionLines = event\.currentTarget\.value/);
  assert.match(source, /setQuestionLines\(nextQuestionLines\)/);
  assert.doesNotMatch(source, /setQuestionLines\(event\.currentTarget\.value\)/);
});

test('bulk paste textarea does not mirror action state back into typing state', () => {
  const source = readComponentSource();

  assert.doesNotMatch(source, /setQuestionLines\(currentState\.values\.questionLines\)/);
});

test('bulk paste non-submit controls remain explicit button-safe forms', () => {
  const source = readComponentSource();

  assert.match(source, /onClick=\{startEditing\}[\s\S]*type="button"/);
});


test('multi-domain bulk paste textarea snapshots event values before updating local state', () => {
  const source = readComponentSource();

  assert.match(source, /const nextQuestionLines = event\.currentTarget\.value[\s\S]*setQuestionLines\(nextQuestionLines\)/);
});

test('multi-domain bulk paste textarea does not mirror action state back into typing state', () => {
  const source = readComponentSource();

  assert.doesNotMatch(source, /setQuestionLines\(currentState\.values\.questionLines\)/);
});
