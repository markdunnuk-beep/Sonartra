import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readSource(...segments: string[]): string {
  return readFileSync(join(process.cwd(), ...segments), 'utf8');
}

test('admin user detail route reuses the shared admin runtime foundation and fails missing users closed', () => {
  const pageSource = readSource('app', '(admin)', 'admin', 'users', '[userId]', 'page.tsx');
  const layoutSource = readSource('app', '(admin)', 'layout.tsx');
  const detailSource = readSource('lib', 'server', 'admin-user-detail.ts');

  assert.match(pageSource, /import\s+\{\s*notFound\s*\}\s+from\s+'next\/navigation';/);
  assert.match(
    pageSource,
    /import\s+\{\s*buildAdminUserDetailViewModel\s*\}\s+from\s+'@\/lib\/server\/admin-user-detail';/,
  );
  assert.match(pageSource, /if \(!viewModel\) \{\s*notFound\(\);/);
  assert.doesNotMatch(pageSource, /@clerk\/nextjs|currentUser\(|auth\(/);

  assert.match(
    layoutSource,
    /import\s+\{\s*requireAdminRequestUserContext\s*\}\s+from\s+'@\/lib\/server\/admin-access';/,
  );

  assert.match(detailSource, /getAssessmentResultHref/);
  assert.match(detailSource, /WHERE u\.id = \$1::uuid/);
  assert.doesNotMatch(detailSource, /@clerk\/nextjs|currentUser\(|auth\(/);
});

test('admin user detail component remains an operational record with timeline and deferred controls only', () => {
  const componentSource = readSource('components', 'admin', 'admin-user-detail.tsx');
  const registrySource = readSource('components', 'admin', 'admin-users-registry.tsx');

  assert.match(componentSource, /Assessment timeline/);
  assert.match(componentSource, /Assignment controls are intentionally deferred/);
  assert.match(componentSource, /View result/);
  assert.match(registrySource, /href=\{item\.detailHref\}/);
});
