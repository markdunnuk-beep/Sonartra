import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  builderSteps,
  getActiveStepSlug,
  getStepStatus,
  type AdminAssessmentStepperState,
} from '@/lib/admin/admin-assessment-stepper';

const componentPath = join(process.cwd(), 'components', 'admin', 'admin-assessment-stepper.tsx');
const helperPath = join(process.cwd(), 'lib', 'admin', 'admin-assessment-stepper.ts');
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

function createAssessmentState(
  overrides: Partial<AdminAssessmentStepperState> = {},
): AdminAssessmentStepperState {
  return {
    assessmentKey: 'wplp80',
    builderMode: 'draft',
    authoredDomains: [],
    availableSignals: [],
    authoredQuestions: [],
    weightingSummary: {
      totalOptions: 0,
      weightedOptions: 0,
      unmappedOptions: 0,
      totalMappings: 0,
    },
    draftValidation: {
      status: 'not_ready',
      draftVersionId: 'version-draft',
      draftVersionTag: '1.0.1',
      isPublishReady: false,
      blockingErrors: [],
      sections: [],
      counts: {
        domainCount: 0,
        signalCount: 0,
        questionCount: 0,
        optionCount: 0,
        weightedOptionCount: 0,
        unmappedOptionCount: 0,
      },
    },
    stepCompletion: {
      assessmentIntro: 'incomplete',
      language: 'incomplete',
    },
    ...overrides,
  };
}

test('builder navigation includes the language step in the correct sequence', () => {
  assert.deepEqual(
    builderSteps.map((step) => step.slug),
    [
      'overview',
      'assessment-intro',
      'domains',
      'signals',
      'questions',
      'responses',
      'weights',
      'language',
      'review',
    ],
  );
});

test('builder navigation resolves language as a first-class active route', () => {
  const helperSource = readSource(helperPath);
  const componentSource = readSource(componentPath);

  assert.equal(getActiveStepSlug('/admin/assessments/wplp80/language', 'wplp80'), 'language');
  assert.match(helperSource, /case 'assessment-intro':/);
  assert.match(helperSource, /case 'language':/);
  assert.match(componentSource, /href: `\/admin\/assessments\/\$\{assessment\.assessmentKey\}\/\$\{step\.slug\}`/);
  assert.match(componentSource, /overflow-x-auto/);
  assert.match(componentSource, /min-w-\[11rem\] shrink-0/);
});

test('stepper marks assessment intro complete when meaningful draft intro content exists', () => {
  const assessment = createAssessmentState({
    stepCompletion: {
      assessmentIntro: 'complete',
      language: 'incomplete',
    },
  });

  assert.equal(getStepStatus('assessment-intro', 'overview', assessment), 'complete');
});

test('stepper leaves assessment intro incomplete when no meaningful draft intro content exists', () => {
  const assessment = createAssessmentState({
    stepCompletion: {
      assessmentIntro: 'incomplete',
      language: 'incomplete',
    },
  });

  assert.equal(getStepStatus('assessment-intro', 'overview', assessment), 'incomplete');
});

test('stepper marks language complete when imported language datasets exist', () => {
  const assessment = createAssessmentState({
    stepCompletion: {
      assessmentIntro: 'incomplete',
      language: 'complete',
    },
  });

  assert.equal(getStepStatus('language', 'overview', assessment), 'complete');
});

test('stepper uses a neutral language state when dataset availability cannot be evaluated safely', () => {
  const assessment = createAssessmentState({
    stepCompletion: {
      assessmentIntro: 'neutral',
      language: 'neutral',
    },
  });

  assert.equal(getStepStatus('assessment-intro', 'overview', assessment), 'neutral');
  assert.equal(getStepStatus('language', 'overview', assessment), 'neutral');
});

test('stepper switches into reference mode when a published assessment has no editable draft', () => {
  const assessment = createAssessmentState({
    builderMode: 'published_no_draft',
  });

  assert.equal(getStepStatus('overview', 'overview', assessment), 'active');
  assert.equal(getStepStatus('domains', 'overview', assessment), 'reference');
  assert.equal(getStepStatus('review', 'overview', assessment), 'reference');
});

test('assessment intro route now delegates to the persisted authoring step instead of a static placeholder', () => {
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

  assert.match(source, /getAdminAssessmentIntroStepViewModel\(getDbPool\(\), assessmentKey\)/);
  assert.match(source, /return <AdminAssessmentIntroEditor viewModel=\{viewModel\} \/>;/);
});

test('language route delegates to the server-side view model and renders the shared step shell', () => {
  const source = readSource(pagePath);

  assert.match(source, /getAdminAssessmentLanguageStepViewModel\(getDbPool\(\), assessmentKey\)/);
  assert.match(source, /return <AdminAssessmentLanguageStep viewModel=\{viewModel\} \/>;/);
  assert.match(source, /notFound\(\)/);
});
