import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const userShellPath = join(process.cwd(), 'components', 'user', 'user-app-shell.tsx');
const globalsPath = join(process.cwd(), 'app', 'globals.css');

function readSource(path: string): string {
  return readFileSync(path, 'utf8');
}

test('user shell reserves room for selected nav treatment without reintroducing overflow', () => {
  const shellSource = readSource(userShellPath);
  const globalsSource = readSource(globalsPath);

  assert.match(shellSource, /box-border flex w-\[17\.5rem\] flex-col overflow-x-hidden/);
  assert.match(shellSource, /overflow-y-auto overflow-x-hidden pb-4/);
  assert.match(shellSource, /sonartra-shell-nav-track space-y-2/);
  assert.match(shellSource, /min-h-12 w-full items-center/);
  assert.match(
    globalsSource,
    /\.sonartra-shell-nav-track\s*\{\s*padding-right: var\(--sonartra-motion-distance-soft\);/m,
  );
});

test('user shell reprioritises chrome for assessment runner routes on smaller screens', () => {
  const shellSource = readSource(userShellPath);

  assert.match(
    shellSource,
    /const isAssessmentRunnerRoute = \/\^\\\/app\\\/assessments\\\/\[\^\/\]\+\\\/attempts\\\/\[\^\/\]\+\\\/\?\$\/\.test\(pathname\);/,
  );
  assert.match(
    shellSource,
    /const shellDesktopBreakpoint = isAssessmentRunnerRoute \? 'xl' : 'lg';/,
  );
  assert.match(shellSource, /shellDesktopBreakpoint === 'xl' \? 'xl:sticky' : 'lg:sticky'/);
  assert.match(shellSource, /sticky top-0 z-20/);
  assert.match(shellSource, /Runner focus/);
  assert.match(shellSource, /isAssessmentRunnerRoute \? 'Assessment' : 'SONARTRA'/);
  assert.match(shellSource, /px-0 py-0 sm:px-1 sm:py-1 md:px-2 md:py-2 xl:px-5 xl:py-5/);
  assert.match(
    shellSource,
    /border-0 bg-transparent shadow-none[\s\S]*sm:rounded-\[1\.6rem\][\s\S]*sm:border/,
  );
});
