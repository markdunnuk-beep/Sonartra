import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('repo defines Clerk middleware for authenticated app and admin route requests', () => {
  const source = readFileSync(join(process.cwd(), 'proxy.ts'), 'utf8');

  assert.match(source, /import\s+\{\s*clerkMiddleware\s*\}\s+from\s+'@clerk\/nextjs\/server';/);
  assert.match(source, /export\s+default\s+clerkMiddleware\(\);/);
  assert.match(source, /export const config =/);
  assert.match(source, /'\/\(\(\?!_next/);
  assert.match(source, /\/\(api\|trpc\)\(\.\*\)/);
});
