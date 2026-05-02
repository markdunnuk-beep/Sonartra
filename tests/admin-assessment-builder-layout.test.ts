import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readSource(...segments: string[]): string {
  return readFileSync(join(process.cwd(), ...segments), 'utf8');
}

test('authoring layout switches into published-no-draft banner mode', () => {
  const source = readSource(
    'app',
    '(admin)',
    'admin',
    'assessments',
    '[assessmentKey]',
    'layout.tsx',
  );

  assert.match(source, /assessment\.builderMode === 'published_no_draft'/);
  assert.match(source, /Browse the published assessment and create a draft when you are ready to change it\./);
  assert.match(source, /<AdminPublishedNoDraftBanner/);
  assert.match(source, /<AdminCreateVersionHeaderAction/);
  assert.match(source, /href=\{`\/admin\/assessments\/\$\{assessment\.assessmentKey\}\/versions\/new`\}/);
  assert.match(source, /space-y-4 sm:space-y-5 lg:space-y-6/);
  assert.match(source, /overflow-hidden p-4 sm:p-5 lg:p-6/);
});

test('single-domain authoring layout exposes the create-new-version placeholder entry point', () => {
  const source = readSource(
    'app',
    '(admin)',
    'admin',
    'assessments',
    'single-domain',
    '[assessmentKey]',
    'layout.tsx',
  );

  assert.match(source, /<AdminCreateVersionHeaderAction/);
  assert.match(
    source,
    /href=\{`\/admin\/assessments\/single-domain\/\$\{assessment\.assessmentKey\}\/versions\/new`\}/,
  );
});

test('header create-version action hides itself on version creation routes only', () => {
  const source = readSource(
    'components',
    'admin',
    'admin-create-version-header-action.tsx',
  );

  assert.match(source, /usePathname/);
  assert.match(source, /pathname\.endsWith\('\/versions\/new'\)/);
  assert.match(source, /return null/);
  assert.match(source, /Create new version/);
});

test('create-new-version routes invoke draft creation and render outcome states', () => {
  const componentSource = readSource(
    'components',
    'admin',
    'admin-assessment-version-placeholder.tsx',
  );
  const multiDomainRouteSource = readSource(
    'app',
    '(admin)',
    'admin',
    'assessments',
    '[assessmentKey]',
    'versions',
    'new',
    'page.tsx',
  );
  const singleDomainRouteSource = readSource(
    'app',
    '(admin)',
    'admin',
    'assessments',
    'single-domain',
    '[assessmentKey]',
    'versions',
    'new',
    'page.tsx',
  );

  assert.match(componentSource, /title="Create draft version"/);
  assert.match(componentSource, /Create the next editable draft from the current published assessment\./);
  assert.match(componentSource, /Create a new draft version from the published assessment\./);
  assert.match(componentSource, /Create draft version/);
  assert.match(componentSource, /A draft version already exists for this assessment\./);
  assert.match(componentSource, /createDraftVersionAction\.bind\(null, mode, assessmentKey\)/);
  assert.match(multiDomainRouteSource, /AdminAssessmentVersionPlaceholder/);
  assert.match(multiDomainRouteSource, /mode="multi_domain"/);
  assert.match(singleDomainRouteSource, /AdminAssessmentVersionPlaceholder/);
  assert.match(singleDomainRouteSource, /mode="single_domain"/);
});

test('guarded authoring stages route published assessments into the reusable read-only state', () => {
  const domainsSource = readSource(
    'app',
    '(admin)',
    'admin',
    'assessments',
    '[assessmentKey]',
    'domains',
    'page.tsx',
  );
  const introSource = readSource('components', 'admin', 'admin-assessment-intro-editor.tsx');

  assert.match(domainsSource, /assessment\.builderMode === 'published_no_draft'/);
  assert.match(domainsSource, /<AdminPublishedNoDraftStageState/);
  assert.match(introSource, /Assessment intro is currently read-only/);
  assert.match(introSource, /Create a draft version before authoring assessment intro content for the next release\./);
});

test('authoring layout tightens header chrome for small screens without removing builder context', () => {
  const source = readSource(
    'app',
    '(admin)',
    'admin',
    'assessments',
    '[assessmentKey]',
    'layout.tsx',
  );

  assert.doesNotMatch(source, /Admin Workspace/);
  assert.match(source, /text-\[1\.72rem\].*sm:text-\[2rem\].*lg:text-\[2\.2rem\]/);
});
