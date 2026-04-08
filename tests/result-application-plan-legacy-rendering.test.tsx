import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';

import { ApplicationPlan } from '@/components/results/application-plan';

const pagePath = join(
  process.cwd(),
  'app',
  '(user)',
  'app',
  'results',
  '[resultId]',
  'page.tsx',
);

test('page renders without application section markup for a legacy payload', () => {
  const markup = renderToStaticMarkup(<ApplicationPlan application={null} />);

  assert.equal(markup, '');
});

test('legacy-safe results page still does not reintroduce the old action section', () => {
  const source = readFileSync(pagePath, 'utf8');

  assert.match(source, /<ApplicationPlan application=\{result\.application\} \/>/);
  assert.doesNotMatch(source, /What to keep doing/);
  assert.doesNotMatch(source, /Where to be careful/);
  assert.doesNotMatch(source, /Where to focus next/);
  assert.doesNotMatch(source, /actions\.strengths/);
  assert.doesNotMatch(source, /actions\.watchouts/);
  assert.doesNotMatch(source, /actions\.developmentFocus/);
});
