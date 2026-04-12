import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  getSingleDomainBuilderStepStatus,
  type SingleDomainBuilderStepperState,
} from '@/lib/admin/single-domain-builder-stepper';
import { buildSingleDomainLanguageValidation } from '@/lib/admin/single-domain-structural-validation';

function createAssessmentState(
  overrides: Partial<SingleDomainBuilderStepperState> = {},
): SingleDomainBuilderStepperState {
  return {
    builderMode: 'draft',
    latestDraftVersion: {
      assessmentVersionId: 'version-1',
      versionTag: '1.0.0',
      status: 'draft',
      publishedAt: null,
      questionCount: 0,
      createdAt: '',
      updatedAt: '',
    },
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
      isPublishReady: false,
      assessmentId: 'assessment-1',
      assessmentKey: 'role-focus',
      draftVersionId: 'version-1',
      draftVersionTag: '1.0.0',
      sections: [],
      blockingErrors: [
        {
          code: 'missing_domain',
          message: 'Add a domain before publishing.',
          severity: 'blocking',
        },
      ],
      warnings: [],
      counts: {
        domainCount: 0,
        signalCount: 0,
        questionCount: 0,
        optionCount: 0,
        weightedOptionCount: 0,
        unmappedOptionCount: 0,
        weightMappingCount: 0,
        applicationThesisCount: 0,
        applicationContributionCount: 0,
        applicationRiskCount: 0,
        applicationDevelopmentCount: 0,
        applicationActionPromptsCount: 0,
      },
    },
    stepCompletion: {
      assessmentIntro: 'incomplete',
      language: 'incomplete',
    },
    singleDomainLanguageValidation: buildSingleDomainLanguageValidation({
      authoredDomains: [],
      languageBundle: {
        DOMAIN_FRAMING: [],
        HERO_PAIRS: [],
        SIGNAL_CHAPTERS: [],
        BALANCING_SECTIONS: [],
        PAIR_SUMMARIES: [],
        APPLICATION_STATEMENTS: [],
      },
    }),
    ...overrides,
  };
}

test('single-domain stepper keeps viewable incomplete stages out of blocked semantics', () => {
  const assessment = createAssessmentState();

  assert.equal(getSingleDomainBuilderStepStatus('signals', assessment), 'waiting');
  assert.equal(getSingleDomainBuilderStepStatus('questions', assessment), 'waiting');
  assert.equal(getSingleDomainBuilderStepStatus('responses', assessment), 'waiting');
  assert.equal(getSingleDomainBuilderStepStatus('weightings', assessment), 'waiting');
  assert.equal(getSingleDomainBuilderStepStatus('review', assessment), 'waiting');
});

test('active single-domain steps do not report empty while the admin is working on them', () => {
  const assessment = createAssessmentState();

  assert.equal(getSingleDomainBuilderStepStatus('domain', assessment, 'domain'), 'in_progress');
  assert.equal(getSingleDomainBuilderStepStatus('signals', assessment, 'signals'), 'in_progress');
});

test('single-domain responses can complete while weightings stays in progress', () => {
  const assessment = createAssessmentState({
    authoredDomains: [
      {
        domainId: 'domain-1',
        domainKey: 'leadership-style',
        label: 'Leadership style',
        description: null,
        orderIndex: 0,
        createdAt: '',
        updatedAt: '',
        signals: [],
      },
    ],
    availableSignals: [
      {
        signalId: 'signal-1',
        signalKey: 'directive',
        signalLabel: 'Directive',
        signalDescription: null,
        signalOrderIndex: 0,
        domainId: 'domain-1',
        domainKey: 'leadership-style',
        domainLabel: 'Leadership style',
        domainOrderIndex: 0,
      },
    ],
    authoredQuestions: [
      {
        questionId: 'question-1',
        questionKey: 'q01',
        prompt: 'Question one',
        orderIndex: 0,
        domainId: 'domain-1',
        domainKey: 'leadership-style',
        domainLabel: 'Leadership style',
        domainType: 'SIGNAL_GROUP',
        createdAt: '',
        updatedAt: '',
        options: [
          {
            optionId: 'option-1',
            optionKey: 'q01_a',
            optionLabel: 'A',
            optionText: 'Agree',
            orderIndex: 0,
            createdAt: '',
            updatedAt: '',
            weightingStatus: 'unmapped',
            signalWeights: [],
          },
        ],
      },
    ],
    weightingSummary: {
      totalOptions: 1,
      weightedOptions: 0,
      unmappedOptions: 1,
      totalMappings: 0,
    },
  });

  assert.equal(getSingleDomainBuilderStepStatus('responses', assessment), 'complete');
  assert.equal(getSingleDomainBuilderStepStatus('weightings', assessment), 'empty');
});

test('single-domain review never reports blocked while the route stays viewable', () => {
  const assessment = createAssessmentState({
    draftValidation: {
      ...createAssessmentState().draftValidation,
      blockingErrors: [
        {
          code: 'options_without_weights',
          message: 'Every option needs at least one weight.',
          severity: 'blocking',
        },
      ],
    },
  });

  assert.equal(getSingleDomainBuilderStepStatus('review', assessment), 'waiting');
});

test('single-domain language waits instead of overstating progress when no structure exists', () => {
  const assessment = createAssessmentState();

  assert.equal(getSingleDomainBuilderStepStatus('language', assessment), 'waiting');
  assert.equal(getSingleDomainBuilderStepStatus('language', assessment, 'language'), 'in_progress');
});

test('single-domain stepper source no longer renders a blocked badge', () => {
  const source = readFileSync(
    join(process.cwd(), 'components', 'admin', 'single-domain-builder-stepper.tsx'),
    'utf8',
  );

  assert.doesNotMatch(source, /Blocked/);
});

test('single-domain stepper uses reference states for published assessments without a draft', () => {
  const assessment = createAssessmentState({
    builderMode: 'published_no_draft',
    latestDraftVersion: null,
  });

  assert.equal(getSingleDomainBuilderStepStatus('domain', assessment), 'reference');
  assert.equal(getSingleDomainBuilderStepStatus('review', assessment), 'reference');
});

test('single-domain overview surfaces a stronger next action and avoids repeated contract framing', () => {
  const source = readFileSync(
    join(process.cwd(), 'components', 'admin', 'single-domain-builder-pages.tsx'),
    'utf8',
  );

  assert.match(source, /Builder overview/);
  assert.match(source, /What this builder is for/);
  assert.match(source, /Next step/);
  assert.match(source, /Define the one allowed domain/);
  assert.match(source, /Continue to Domain/);
  assert.doesNotMatch(source, /title="Overview"/);
  assert.doesNotMatch(source, /description="Assessment title, description, version context, and the single-domain builder contract\."/);
});
