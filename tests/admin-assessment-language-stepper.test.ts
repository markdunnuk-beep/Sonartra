import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentPath = join(process.cwd(), 'components', 'admin', 'admin-assessment-stepper.tsx');
const pagePath = join(
  process.cwd(),
  'app',
  '(admin)',
  'admin',
  'assessments',
  '[assessmentKey]',
  'language',
  'page.tsx',
);

function readSource(path: string): string {
  return readFileSync(path, 'utf8');
}

test('builder navigation includes the language step in the correct sequence', () => {
  const source = readSource(componentPath);
  const overviewIndex = source.indexOf("{ slug: 'overview', label: 'Overview' }");
  const introIndex = source.indexOf("{ slug: 'assessment-intro', label: 'Assessment Intro' }");
  const domainsIndex = source.indexOf("{ slug: 'domains', label: 'Domains' }");
  const signalsIndex = source.indexOf("{ slug: 'signals', label: 'Signals' }");
  const questionsIndex = source.indexOf("{ slug: 'questions', label: 'Questions' }");
  const responsesIndex = source.indexOf("{ slug: 'responses', label: 'Responses' }");
  const weightsIndex = source.indexOf("{ slug: 'weights', label: 'Weights' }");
  const languageIndex = source.indexOf("{ slug: 'language', label: 'Language' }");
  const reviewIndex = source.indexOf("{ slug: 'review', label: 'Review' }");

  assert.ok(overviewIndex >= 0);
  assert.ok(introIndex > overviewIndex);
  assert.ok(domainsIndex > introIndex);
  assert.ok(signalsIndex > domainsIndex);
  assert.ok(questionsIndex > signalsIndex);
  assert.ok(responsesIndex > questionsIndex);
  assert.ok(weightsIndex > responsesIndex);
  assert.ok(languageIndex > weightsIndex);
  assert.ok(reviewIndex > languageIndex);
});

test('builder navigation resolves language as a first-class active route', () => {
  const source = readSource(componentPath);

  assert.match(source, /case 'assessment-intro':/);
  assert.match(source, /case 'language':/);
  assert.match(source, /href: `\/admin\/assessments\/\$\{assessment\.assessmentKey\}\/\$\{step\.slug\}`/);
});

test('assessment intro route renders a structural placeholder shell', () => {
  const source = readSource(
    join(
      process.cwd(),
      'app',
      '(admin)',
      'admin',
      'assessments',
      '[assessmentKey]',
      'assessment-intro',
      'page.tsx',
    ),
  );

  assert.match(source, /title="Assessment Intro"/);
  assert.match(source, /pre-assessment introduction shown before participants enter the runner/);
  assert.match(source, /Placeholder shell/);
  assert.match(source, /Task 2/);
  assert.doesNotMatch(source, /save/i);
});

test('language route delegates to the server-side view model and renders the shared step shell', () => {
  const source = readSource(pagePath);

  assert.match(source, /getAdminAssessmentLanguageStepViewModel\(getDbPool\(\), assessmentKey\)/);
  assert.match(source, /return <AdminAssessmentLanguageStep viewModel=\{viewModel\} \/>;/);
  assert.match(source, /notFound\(\)/);
});
