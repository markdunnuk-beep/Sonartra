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
  assert.match(pageSource, /searchParams:\s*Promise<\{\s*assignmentMutation\?: string\s*\}>;/);
  assert.match(pageSource, /mutationFeedbackKey=\{resolvedSearchParams\.assignmentMutation \?\? null\}/);
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

test('admin user detail component keeps the operational record layout and wires the safe assignment controls', () => {
  const componentSource = readSource('components', 'admin', 'admin-user-detail.tsx');
  const registrySource = readSource('components', 'admin', 'admin-users-registry.tsx');
  const controlsSource = readSource('components', 'admin', 'admin-user-assignment-controls.tsx');

  assert.match(componentSource, /Assessment timeline/);
  assert.match(componentSource, /View result/);
  assert.match(componentSource, /data-assignment-timeline-row="true"/);
  assert.match(componentSource, /data-assignment-timeline-state=\{tone\}/);
  assert.match(componentSource, /data-assignment-timeline-result="ready"/);
  assert.match(componentSource, /Result ready/);
  assert.match(componentSource, /rounded-full border border-white\/12 bg-white\/\[0\.06\]/);
  assert.match(componentSource, /No canonical result yet/);
  assert.match(componentSource, /rounded-2xl border border-white\/8 bg-black\/10 px-4 py-3/);
  assert.match(componentSource, /\[overflow-wrap:anywhere\]/);
  assert.match(componentSource, /showsSecondaryEmail/);
  assert.match(componentSource, /SectionHeader\s*\n\s*eyebrow=\"Controls\"/);
  assert.match(componentSource, /SectionHeader\s*\n\s*eyebrow=\"State\"/);
  assert.match(componentSource, /SectionHeader\s*\n\s*eyebrow=\"Timeline\"/);
  assert.match(componentSource, /Internal user record for assignment sequencing and result access\./);
  assert.ok(componentSource.indexOf('eyebrow="Controls"') < componentSource.indexOf('eyebrow="State"'));
  assert.ok(componentSource.indexOf('eyebrow="State"') < componentSource.indexOf('eyebrow="Timeline"'));
  assert.doesNotMatch(componentSource, /label: 'Current assessment'/);
  assert.doesNotMatch(componentSource, /label: 'Next assessment'/);
  assert.doesNotMatch(componentSource, /label: 'Last activity'/);
  assert.match(componentSource, /AdminUserAssignmentControls/);
  assert.match(componentSource, /mutationFeedbackKey: string \| null/);
  assert.match(controlsSource, /useActionState\(\s*createAdminUserAssignmentAction,/);
  assert.match(controlsSource, /useActionState\(\s*reorderAdminUserAssignmentAction,/);
  assert.match(controlsSource, /useActionState\(\s*removeAdminUserAssignmentAction,/);
  assert.match(controlsSource, /Add assignment/);
  assert.match(controlsSource, /Move earlier/);
  assert.match(controlsSource, /Move later/);
  assert.match(controlsSource, /Remove/);
  assert.match(controlsSource, /Assignment added\./);
  assert.match(controlsSource, /Sequence updated\./);
  assert.match(controlsSource, /Assignment removed\./);
  assert.match(controlsSource, /controls\.editableSummary/);
  assert.match(controlsSource, /attemptStateLabel/);
  assert.match(controlsSource, /resultStateLabel/);
  assert.match(controlsSource, /executionStateLabel/);
  assert.match(controlsSource, /Canonical result/);
  assert.match(controlsSource, /data-assignment-row="true"/);
  assert.match(controlsSource, /data-assignment-state=\{tone\}/);
  assert.match(controlsSource, /data-assignment-removal=\{assignment\.canRemove \? 'safe' : 'blocked'\}/);
  assert.match(controlsSource, /data-assignment-actions=\{assignment\.canRemove \? 'safe-removal' : 'locked-removal'\}/);
  assert.match(controlsSource, /Safe removal/);
  assert.match(controlsSource, /Removal locked/);
  assert.match(controlsSource, /Editable queue/);
  assert.match(controlsSource, /Fixed history/);
  assert.match(controlsSource, /Started history/);
  assert.match(controlsSource, /Completed history/);
  assert.match(controlsSource, /Result ready/);
  assert.match(controlsSource, /Canonical result ready/);
  assert.match(controlsSource, /This queued row is still in play\./);
  assert.match(controlsSource, /This row now reads as part of the fixed record\./);
  assert.match(controlsSource, /controls\.ruleSummary/);
  assert.match(registrySource, /href=\{item\.detailHref\}/);
});
