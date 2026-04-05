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

  assert.match(
    shellSource,
    /box-border flex w-\[17\.5rem\] flex-col overflow-x-hidden/,
  );
  assert.match(shellSource, /overflow-y-auto overflow-x-hidden pb-4/);
  assert.match(shellSource, /sonartra-shell-nav-track space-y-2/);
  assert.match(shellSource, /min-h-12 w-full items-center/);
  assert.match(
    globalsSource,
    /\.sonartra-shell-nav-track\s*\{\s*padding-right: var\(--sonartra-motion-distance-soft\);/m,
  );
});
