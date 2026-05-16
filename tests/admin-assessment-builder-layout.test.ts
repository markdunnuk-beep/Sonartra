import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readSource(...segments: string[]): string {
  return readFileSync(join(process.cwd(), ...segments), 'utf8');
}

test('multi-domain authoring layout redirects to ranked-pattern workflow', () => {
  const source = readSource(
    'app',
    '(admin)',
    'admin',
    'assessments',
    '[assessmentKey]',
    'layout.tsx',
  );

  assert.match(source, /redirect\(`\/admin\/assessments\/ranked-pattern\/\$\{assessmentKey\}\/workflow`\)/);
  assert.doesNotMatch(source, /<AdminPublishedNoDraftBanner/);
  assert.doesNotMatch(source, /<AdminCreateVersionHeaderAction/);
});

test('single-domain authoring layout redirects to ranked-pattern workflow', () => {
  const source = readSource(
    'app',
    '(admin)',
    'admin',
    'assessments',
    'single-domain',
    '[assessmentKey]',
    'layout.tsx',
  );

  assert.match(source, /redirect\(`\/admin\/assessments\/ranked-pattern\/\$\{assessmentKey\}\/workflow`\)/);
  assert.doesNotMatch(source, /<AdminCreateVersionHeaderAction/);
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

test('active create-new-version route invokes draft creation while deprecated single-domain route redirects', () => {
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
  assert.match(singleDomainRouteSource, /redirect\(`\/admin\/assessments\/ranked-pattern\/\$\{assessmentKey\}\/workflow`\)/);
  assert.doesNotMatch(singleDomainRouteSource, /AdminAssessmentVersionPlaceholder/);
  assert.doesNotMatch(singleDomainRouteSource, /mode="single_domain"/);
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

test('authoring layout no longer exposes legacy builder chrome', () => {
  const source = readSource(
    'app',
    '(admin)',
    'admin',
    'assessments',
    '[assessmentKey]',
    'layout.tsx',
  );

  assert.doesNotMatch(source, /Admin Workspace/);
  assert.doesNotMatch(source, /text-\[1\.72rem\].*sm:text-\[2rem\].*lg:text-\[2\.2rem\]/);
  assert.match(source, /ranked-pattern/);
});
