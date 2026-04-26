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

  assert.match(pageSource, /xl:max-w-\[114rem\]/);
  assert.match(pageSource, /xl:grid-cols-\[minmax\(0,1fr\)_minmax\(10\.75rem,12\.25rem\)\]/);
  assert.match(pageSource, /<div className="min-w-0 max-w-none/);
  assert.match(pageSource, /<div className="w-full px-1 md:px-2 xl:px-0\.5">/);
  assert.match(pageSource, /ResultReadingRail\s+className="hidden xl:block xl:pt-1"/);
  assert.match(pageSource, /utilityActions=\{/);
});

test('global styles enable smooth anchors while respecting reduced motion', () => {
  const cssSource = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8');

  assert.match(cssSource, /html \{\n  scroll-behavior: smooth;/);
  assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\) \{\n  html \{\n    scroll-behavior: auto;/);
  assert.match(cssSource, /\.sonartra-motion-progress,\n  \.sonartra-result-rail-item,[\s\S]*transition: none;/);
  assert.match(cssSource, /\.sonartra-motion-nav-item\[aria-current='true'\] \{\n    transform: none;/);
  assert.match(cssSource, /main \{\n  @apply mx-auto min-h-\[calc\(100vh-4rem\)\] w-full max-w-\[1320px\]/);
});

test('result detail page keeps one desktop rail and one mobile progress surface', () => {
  const pageSource = fs.readFileSync(path.join(root, 'app/(user)/app/results/[resultId]/page.tsx'), 'utf8');

  const railCount = pageSource.match(/<ResultReadingRail/g)?.length ?? 0;
  const progressCount = pageSource.match(/<ResultReadingProgress/g)?.length ?? 0;

  assert.equal(railCount, 1);
  assert.equal(progressCount, 1);
});

test('active-section hook wiring remains single-path through rail and progress components', () => {
  const pageSource = fs.readFileSync(path.join(root, 'app/(user)/app/results/[resultId]/page.tsx'), 'utf8');
  const railSource = fs.readFileSync(
    path.join(root, 'components/results/result-reading-rail.tsx'),
    'utf8',
  );
  const progressSource = fs.readFileSync(
    path.join(root, 'components/results/result-reading-progress.tsx'),
    'utf8',
  );

  assert.doesNotMatch(pageSource, /useActiveResultSection/);
  assert.match(railSource, /useActiveResultSectionWithConfig/);
  assert.match(progressSource, /useActiveResultSectionWithConfig/);
  assert.equal(railSource.match(/useActiveResultSectionWithConfig\(/g)?.length ?? 0, 1);
  assert.equal(progressSource.match(/useActiveResultSectionWithConfig\(/g)?.length ?? 0, 1);
});
