import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

test('result detail desktop layout uses widened container and rebalanced columns', () => {
  const pageSource = fs.readFileSync(
    path.join(root, 'app/(user)/app/results/[resultId]/page.tsx'),
    'utf8',
  );

  assert.match(pageSource, /xl:max-w-\[96rem\]/);
  assert.match(pageSource, /xl:grid-cols-\[minmax\(0,3fr\)_minmax\(12\.5rem,1fr\)\]/);
  assert.match(pageSource, /<main className="min-w-0 max-w-none/);
  assert.match(pageSource, /ResultReadingRail className="hidden xl:block xl:pt-0\.5"/);
});

test('global styles enable smooth anchors while respecting reduced motion', () => {
  const cssSource = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8');

  assert.match(cssSource, /html \{\n  scroll-behavior: smooth;/);
  assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\) \{\n  html \{\n    scroll-behavior: auto;/);
});
