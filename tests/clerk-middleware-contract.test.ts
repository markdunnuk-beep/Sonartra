import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('repo defines Clerk middleware for authenticated app and admin route requests', () => {
  const source = readFileSync(join(process.cwd(), 'proxy.ts'), 'utf8');

  assert.match(
    source,
    /import\s+\{\s*clerkMiddleware,\s*createRouteMatcher\s*\}\s+from\s+'@clerk\/nextjs\/server';/,
  );
  assert.match(
    source,
    /import\s+\{\s*isDevAdminBypassEnabled\s*\}\s+from\s+'@\/lib\/server\/dev-admin-bypass';/,
  );
  assert.match(source, /const isUserAppRoute = createRouteMatcher\(\['\/app\(\.\*\)'\]\);/);
  assert.match(source, /const isAdminRoute = createRouteMatcher\(\['\/admin\(\.\*\)'\]\);/);
  assert.match(source, /if \(isUserAppRoute\(request\)\) \{/);
  assert.match(source, /if \(isAdminRoute\(request\) && !isDevAdminBypassEnabled\(\)\) \{/);
  assert.match(source, /await auth\.protect\(\);/);
  assert.match(source, /export const config =/);
  assert.match(source, /'\/\(\(\?!_next/);
  assert.match(source, /\/\(api\|trpc\)\(\.\*\)/);
  assert.doesNotMatch(source, /sonartra\.vercel\.app/i);
});
