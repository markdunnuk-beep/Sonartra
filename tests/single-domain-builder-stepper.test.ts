import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  getSingleDomainBuilderNextAction,
  getSingleDomainBuilderProgress,
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
    singleDomainDraftReadiness: null,
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

test('active single-domain routes do not change empty or waiting stages into in-progress', () => {
  const assessment = createAssessmentState();

  assert.equal(getSingleDomainBuilderStepStatus('domain', assessment, 'domain'), 'empty');
  assert.equal(getSingleDomainBuilderStepStatus('signals', assessment, 'signals'), 'waiting');
  assert.equal(getSingleDomainBuilderStepStatus('questions', assessment, 'questions'), 'waiting');
  assert.equal(getSingleDomainBuilderStepStatus('responses', assessment, 'responses'), 'waiting');
  assert.equal(getSingleDomainBuilderStepStatus('weightings', assessment, 'weightings'), 'waiting');
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
          {
            optionId: 'option-2',
            optionKey: 'q01_b',
            optionLabel: 'B',
            optionText: 'Disagree',
            orderIndex: 1,
            createdAt: '',
            updatedAt: '',
            weightingStatus: 'unmapped',
            signalWeights: [],
          },
          {
            optionId: 'option-3',
            optionKey: 'q01_c',
            optionLabel: 'C',
            optionText: 'Depends',
            orderIndex: 2,
            createdAt: '',
            updatedAt: '',
            weightingStatus: 'unmapped',
            signalWeights: [],
          },
          {
            optionId: 'option-4',
            optionKey: 'q01_d',
            optionLabel: 'D',
            optionText: 'Not me',
            orderIndex: 3,
            createdAt: '',
            updatedAt: '',
            weightingStatus: 'unmapped',
            signalWeights: [],
          },
        ],
      },
    ],
    weightingSummary: {
      totalOptions: 4,
      weightedOptions: 0,
      unmappedOptions: 4,
      totalMappings: 0,
    },
  });

  assert.equal(getSingleDomainBuilderStepStatus('responses', assessment), 'complete');
  assert.equal(getSingleDomainBuilderStepStatus('weightings', assessment), 'empty');
});

test('single-domain responses stay in progress while imported scaffold options are still blank', () => {
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
        options: ['A', 'B', 'C', 'D'].map((label, index) => ({
          optionId: `option-${label}`,
          optionKey: `q01_${label.toLowerCase()}`,
          optionLabel: label,
          optionText: '',
          orderIndex: index,
          createdAt: '',
          updatedAt: '',
          weightingStatus: 'unmapped' as const,
          signalWeights: [],
        })),
      },
    ],
    weightingSummary: {
      totalOptions: 4,
      weightedOptions: 0,
      unmappedOptions: 4,
      totalMappings: 0,
    },
  });

  assert.equal(getSingleDomainBuilderStepStatus('responses', assessment), 'in_progress');
  assert.equal(getSingleDomainBuilderStepStatus('weightings', assessment), 'waiting');
  assert.deepEqual(getSingleDomainBuilderNextAction(assessment), {
    step: 'responses',
    title: 'Finish response coverage',
    description: 'Responses are only complete when each persisted question has its canonical A-D options filled with real text.',
    ctaLabel: 'Continue to Responses',
  });
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
  assert.equal(getSingleDomainBuilderStepStatus('language', assessment, 'language'), 'waiting');
});

test('single-domain language stays waiting when authored signals cannot yet derive pairs', () => {
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
        signals: [
          {
            signalId: 'signal-1',
            signalKey: 'directive',
            label: 'Directive',
            description: null,
            orderIndex: 0,
            createdAt: '',
            updatedAt: '',
          },
        ],
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
    singleDomainLanguageValidation: buildSingleDomainLanguageValidation({
      authoredDomains: [
        {
          domainId: 'domain-1',
          domainKey: 'leadership-style',
          label: 'Leadership style',
          description: null,
          orderIndex: 0,
          createdAt: '',
          updatedAt: '',
          signals: [
            {
              signalId: 'signal-1',
              signalKey: 'directive',
              label: 'Directive',
              description: null,
              orderIndex: 0,
              createdAt: '',
              updatedAt: '',
            },
          ],
        },
      ],
      languageBundle: {
        DOMAIN_FRAMING: [],
        HERO_PAIRS: [],
        SIGNAL_CHAPTERS: [],
        BALANCING_SECTIONS: [],
        PAIR_SUMMARIES: [],
        APPLICATION_STATEMENTS: [],
      },
    }),
  });

  assert.equal(getSingleDomainBuilderStepStatus('language', assessment), 'waiting');
});

test('single-domain overview guidance follows authored state instead of staying fixed', () => {
  const emptyAssessment = createAssessmentState();
  const inFlightAssessment = createAssessmentState({
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
  });

  assert.deepEqual(getSingleDomainBuilderNextAction(emptyAssessment), {
    step: 'domain',
    title: 'Define the one allowed domain',
    description: 'Start in Domain to lock the assessment to a single domain record before authoring downstream structure.',
    ctaLabel: 'Continue to Domain',
  });
  assert.deepEqual(getSingleDomainBuilderNextAction(inFlightAssessment), {
    step: 'questions',
    title: 'Author the first question',
    description: 'Questions turn the domain and signal structure into something the runtime can actually serve.',
    ctaLabel: 'Continue to Questions',
  });
});

test('single-domain overview routes to the first real runtime blocker instead of dead-ending in review', () => {
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
        signals: [
          {
            signalId: 'signal-1',
            signalKey: 'directive',
            label: 'Directive',
            description: null,
            orderIndex: 0,
            createdAt: '',
            updatedAt: '',
          },
          {
            signalId: 'signal-2',
            signalKey: 'supportive',
            label: 'Supportive',
            description: null,
            orderIndex: 1,
            createdAt: '',
            updatedAt: '',
          },
        ],
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
      {
        signalId: 'signal-2',
        signalKey: 'supportive',
        signalLabel: 'Supportive',
        signalDescription: null,
        signalOrderIndex: 1,
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
        options: ['A', 'B', 'C', 'D'].map((label, index) => ({
          optionId: `option-${label}`,
          optionKey: `q01_${label.toLowerCase()}`,
          optionLabel: label,
          optionText: `Option ${label}`,
          orderIndex: index,
          createdAt: '',
          updatedAt: '',
          weightingStatus: 'weighted' as const,
          signalWeights: [{
            optionSignalWeightId: `weight-${label}`,
            signalId: 'signal-1',
            signalKey: 'directive',
            signalLabel: 'Directive',
            signalDomainId: 'domain-1',
            signalDomainKey: 'leadership-style',
            signalDomainLabel: 'Leadership style',
            weight: '1',
            createdAt: '',
            updatedAt: '',
          }],
        })),
      },
    ],
    weightingSummary: {
      totalOptions: 4,
      weightedOptions: 4,
      unmappedOptions: 0,
      totalMappings: 4,
    },
    singleDomainLanguageValidation: buildSingleDomainLanguageValidation({
      authoredDomains: [
        {
          domainId: 'domain-1',
          domainKey: 'leadership-style',
          label: 'Leadership style',
          description: null,
          orderIndex: 0,
          createdAt: '',
          updatedAt: '',
          signals: [
            {
              signalId: 'signal-1',
              signalKey: 'directive',
              label: 'Directive',
              description: null,
              orderIndex: 0,
              createdAt: '',
              updatedAt: '',
            },
            {
              signalId: 'signal-2',
              signalKey: 'supportive',
              label: 'Supportive',
              description: null,
              orderIndex: 1,
              createdAt: '',
              updatedAt: '',
            },
          ],
        },
      ],
      languageBundle: {
        DOMAIN_FRAMING: [{
          domain_key: 'leadership-style',
          section_title: 'Leadership style',
          intro_paragraph: 'Intro',
          meaning_paragraph: 'Meaning',
          bridge_to_signals: 'Bridge',
          blueprint_context_line: 'Blueprint',
        }],
        HERO_PAIRS: [],
        SIGNAL_CHAPTERS: [
          {
            signal_key: 'directive',
            position_primary_label: 'Primary',
            position_secondary_label: 'Secondary',
            position_supporting_label: 'Supporting',
            position_underplayed_label: 'Underplayed',
            chapter_intro_primary: 'A',
            chapter_intro_secondary: 'B',
            chapter_intro_supporting: 'C',
            chapter_intro_underplayed: 'D',
            chapter_how_it_shows_up: 'E',
            chapter_value_outcome: 'F',
            chapter_value_team_effect: 'G',
            chapter_risk_behaviour: 'H',
            chapter_risk_impact: 'I',
            chapter_development: 'J',
          },
          {
            signal_key: 'supportive',
            position_primary_label: 'Primary',
            position_secondary_label: 'Secondary',
            position_supporting_label: 'Supporting',
            position_underplayed_label: 'Underplayed',
            chapter_intro_primary: 'A',
            chapter_intro_secondary: 'B',
            chapter_intro_supporting: 'C',
            chapter_intro_underplayed: 'D',
            chapter_how_it_shows_up: 'E',
            chapter_value_outcome: 'F',
            chapter_value_team_effect: 'G',
            chapter_risk_behaviour: 'H',
            chapter_risk_impact: 'I',
            chapter_development: 'J',
          },
        ],
        BALANCING_SECTIONS: [],
        PAIR_SUMMARIES: [],
        APPLICATION_STATEMENTS: [
          {
            signal_key: 'directive',
            strength_statement_1: 'S1',
            strength_statement_2: 'S2',
            watchout_statement_1: 'W1',
            watchout_statement_2: 'W2',
            development_statement_1: 'D1',
            development_statement_2: 'D2',
          },
          {
            signal_key: 'supportive',
            strength_statement_1: 'S1',
            strength_statement_2: 'S2',
            watchout_statement_1: 'W1',
            watchout_statement_2: 'W2',
            development_statement_1: 'D1',
            development_statement_2: 'D2',
          },
        ],
      },
    }),
    singleDomainDraftReadiness: {
      isReady: false,
      issues: [
        {
          code: 'hero_pairs_count_mismatch',
          section: 'language',
          message: 'HERO_PAIRS must contain exactly 1 row to match the current signal-derived pair count.',
          severity: 'blocking',
        },
      ],
      counts: {
        domainCount: 1,
        signalCount: 2,
        derivedPairCount: 1,
        questionCount: 1,
        optionCount: 4,
        weightCount: 4,
        questionsWithoutOptionsCount: 0,
        optionsWithoutWeightsCount: 0,
        orphanOptionCount: 0,
        unresolvedWeightSignalCount: 0,
        languageRowCounts: {
          DOMAIN_FRAMING: 1,
          HERO_PAIRS: 0,
          SIGNAL_CHAPTERS: 2,
          BALANCING_SECTIONS: 0,
          PAIR_SUMMARIES: 0,
          APPLICATION_STATEMENTS: 2,
        },
      },
      expectations: {
        requiredDomainCount: 1,
        minimumSignalCount: 1,
        minimumQuestionCount: 1,
        expectedDerivedPairCount: 1,
        expectedLanguageRowCounts: {
          DOMAIN_FRAMING: 1,
          HERO_PAIRS: 1,
          SIGNAL_CHAPTERS: 2,
          BALANCING_SECTIONS: 1,
          PAIR_SUMMARIES: 1,
          APPLICATION_STATEMENTS: 2,
        },
      },
      runtimeDefinition: null,
    },
  });

  assert.deepEqual(getSingleDomainBuilderNextAction(assessment), {
    step: 'language',
    title: 'Fix the language blocker',
    description: 'HERO_PAIRS must contain exactly 1 row to match the current signal-derived pair count.',
    ctaLabel: 'Continue to Language',
  });
});

test('single-domain progress excludes the informational overview stage from completion totals', () => {
  const assessment = createAssessmentState();

  assert.deepEqual(getSingleDomainBuilderProgress(assessment), {
    completeCount: 0,
    actionableCompleteCount: 0,
    actionableTotalCount: 7,
  });
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
  assert.match(source, /getSingleDomainBuilderNextAction/);
  assert.match(source, /getSingleDomainBuilderProgress/);
  assert.doesNotMatch(source, /title="Overview"/);
  assert.doesNotMatch(source, /description="Assessment title, description, version context, and the single-domain builder contract\."/);
});
