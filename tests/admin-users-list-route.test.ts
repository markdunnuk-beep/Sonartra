import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readSource(...segments: string[]): string {
  return readFileSync(join(process.cwd(), ...segments), 'utf8');
}

test('admin users route reuses the shared admin layout foundation and server view model', () => {
  const pageSource = readSource('app', '(admin)', 'admin', 'users', 'page.tsx');
  const layoutSource = readSource('app', '(admin)', 'layout.tsx');

  assert.match(
    pageSource,
    /import\s+\{\s*buildAdminUsersListPageViewModel\s*\}\s+from\s+'@\/lib\/server\/admin-users-list';/,
  );
  assert.match(pageSource, /import\s+\{\s*getDbPool\s*\}\s+from\s+'@\/lib\/server\/db';/);
  assert.match(pageSource, /return <AdminUsersRegistry viewModel=\{viewModel\} \/>;/);
  assert.doesNotMatch(pageSource, /@clerk\/nextjs|currentUser\(|auth\(/);

  assert.match(
    layoutSource,
    /import\s+\{\s*requireAdminRequestUserContext\s*\}\s+from\s+'@\/lib\/server\/admin-access';/,
  );
});

test('admin users registry stays on internal persisted data and deterministic sequencing labels', () => {
  const registrySource = readSource('components', 'admin', 'admin-users-registry.tsx');
  const viewModelSource = readSource('lib', 'server', 'admin-users-list.ts');

  assert.match(registrySource, /Operational user registry/);
  assert.match(registrySource, /function getPrimaryIdentity/);
  assert.match(registrySource, /function getIdentityEyebrow/);
  assert.match(registrySource, /Name on record/);
  assert.match(registrySource, /Email-only record/);
  assert.match(registrySource, /<UsersCards/);
  assert.match(registrySource, /className=\"hidden overflow-hidden p-0 xl:block\"/);
  assert.match(registrySource, /className=\"grid gap-4 xl:hidden\"/);
  assert.match(registrySource, /hidden flex-wrap gap-2 pt-4 lg:flex/);
  assert.match(registrySource, /ButtonLink className=\"self-start\" href=\{item\.detailHref\}/);
  assert.match(registrySource, /Open record/);
  assert.match(viewModelSource, /currentAssessmentLabel/);
  assert.match(viewModelSource, /nextAssessmentLabel/);
  assert.match(viewModelSource, /assignment\.status !== 'completed'/);
  assert.match(viewModelSource, /detailHref: `\/admin\/users\/\$\{seed\.id\}`/);
  assert.doesNotMatch(viewModelSource, /@clerk\/nextjs|currentUser\(|auth\(/);
  assert.doesNotMatch(viewModelSource, /canonical_result_payload|normalizedScores|engine-scoring/i);
});
