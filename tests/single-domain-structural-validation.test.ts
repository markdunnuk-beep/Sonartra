import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSingleDomainLanguageValidation,
  buildSingleDomainStructuralValidation,
  getExpectedSignalPairCount,
} from '@/lib/admin/single-domain-structural-validation';

test('pair count derives from the current authored signal count', () => {
  assert.equal(getExpectedSignalPairCount(0), 0);
  assert.equal(getExpectedSignalPairCount(1), 0);
  assert.equal(getExpectedSignalPairCount(2), 1);
  assert.equal(getExpectedSignalPairCount(3), 3);
  assert.equal(getExpectedSignalPairCount(5), 10);
});

test('review validation surfaces real structural readiness issues for single-domain drafts', () => {
  const validation = buildSingleDomainStructuralValidation({
    authoredDomains: [],
    authoredQuestions: [],
    languageReady: false,
  });

  assert.equal(validation.domainCount, 0);
  assert.equal(validation.signalCount, 0);
  assert.equal(validation.questionCount, 0);
  assert.match(
    validation.issues.map((issue) => issue.code).join(','),
    /missing_domain/,
  );
  assert.match(
    validation.issues.map((issue) => issue.code).join(','),
    /missing_signals/,
  );
  assert.match(
    validation.issues.map((issue) => issue.code).join(','),
    /missing_questions/,
  );

  const domainSection = validation.sections.find((section) => section.key === 'domain');
  const weightingSection = validation.sections.find((section) => section.key === 'weightings');

  assert.equal(domainSection?.status, 'attention');
  assert.equal(weightingSection?.status, 'ready');
});

test('review validation flags multiple domains so the builder can block second-domain drift explicitly', () => {
  const validation = buildSingleDomainStructuralValidation({
    authoredDomains: [
      {
        domainId: 'domain-1',
        domainKey: 'focus',
        label: 'Focus',
        description: null,
        orderIndex: 0,
        createdAt: '',
        updatedAt: '',
        signals: [],
      },
      {
        domainId: 'domain-2',
        domainKey: 'extra',
        label: 'Extra',
        description: null,
        orderIndex: 1,
        createdAt: '',
        updatedAt: '',
        signals: [],
      },
    ],
    authoredQuestions: [],
    languageReady: false,
  });

  assert.ok(validation.issues.some((issue) => issue.code === 'multiple_domains'));
  assert.equal(validation.sections.find((section) => section.key === 'domain')?.status, 'attention');
});

test('review validation marks questions with no options and options with no weights explicitly', () => {
  const validation = buildSingleDomainStructuralValidation({
    authoredDomains: [
      {
        domainId: 'domain-1',
        domainKey: 'focus',
        label: 'Focus',
        description: null,
        orderIndex: 0,
        createdAt: '',
        updatedAt: '',
        signals: [
          {
            signalId: 'signal-1',
            signalKey: 'clarity',
            label: 'Clarity',
            description: null,
            orderIndex: 0,
            createdAt: '',
            updatedAt: '',
          },
        ],
      },
    ],
    authoredQuestions: [
      {
        questionId: 'question-1',
        questionKey: 'q01',
        prompt: 'Question one',
        orderIndex: 0,
        domainId: 'domain-1',
        domainKey: 'focus',
        domainLabel: 'Focus',
        domainType: 'SIGNAL_GROUP',
        createdAt: '',
        updatedAt: '',
        options: [],
      },
      {
        questionId: 'question-2',
        questionKey: 'q02',
        prompt: 'Question two',
        orderIndex: 1,
        domainId: 'domain-1',
        domainKey: 'focus',
        domainLabel: 'Focus',
        domainType: 'SIGNAL_GROUP',
        createdAt: '',
        updatedAt: '',
        options: [
          {
            optionId: 'option-1',
            optionKey: 'q02_a',
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
    languageReady: false,
  });

  assert.equal(validation.questionsWithoutOptionsCount, 1);
  assert.equal(validation.optionsWithoutWeightsCount, 1);
  assert.equal(validation.mappingCount, 0);
  assert.ok(validation.issues.some((issue) => issue.code === 'questions_without_options'));
  assert.ok(validation.issues.some((issue) => issue.code === 'options_without_weights'));
  assert.ok(validation.issues.some((issue) => issue.code === 'missing_weights'));
});

test('hero pair completeness derives from the current signal-derived pair count', () => {
  const validation = buildSingleDomainLanguageValidation({
    authoredDomains: [{
      domainId: 'domain-1',
      domainKey: 'focus',
      label: 'Focus',
      description: null,
      orderIndex: 0,
      createdAt: '',
      updatedAt: '',
      signals: [
        { signalId: 'signal-1', signalKey: 'directive', label: 'Directive', description: null, orderIndex: 0, createdAt: '', updatedAt: '' },
        { signalId: 'signal-2', signalKey: 'supportive', label: 'Supportive', description: null, orderIndex: 1, createdAt: '', updatedAt: '' },
        { signalId: 'signal-3', signalKey: 'analytical', label: 'Analytical', description: null, orderIndex: 2, createdAt: '', updatedAt: '' },
      ],
    }],
    languageBundle: {
      DOMAIN_FRAMING: [],
      HERO_PAIRS: [{
        pair_key: 'directive_supportive',
        hero_headline: 'One',
        hero_subheadline: 'One',
        hero_opening: 'One',
        hero_strength_paragraph: 'One',
        hero_tension_paragraph: 'One',
        hero_close_paragraph: 'One',
      }],
      SIGNAL_CHAPTERS: [],
      BALANCING_SECTIONS: [],
      PAIR_SUMMARIES: [],
      APPLICATION_STATEMENTS: [],
    },
  });

  const heroPairs = validation.datasets.find((dataset) => dataset.datasetKey === 'HERO_PAIRS');

  assert.equal(validation.expectedPairCount, 3);
  assert.equal(heroPairs?.actualRowCount, 1);
  assert.equal(heroPairs?.expectedRowCount, 3);
  assert.equal(heroPairs?.isReady, false);
});

test('signal chapters and application statements completeness derive from the current signal count', () => {
  const validation = buildSingleDomainLanguageValidation({
    authoredDomains: [{
      domainId: 'domain-1',
      domainKey: 'focus',
      label: 'Focus',
      description: null,
      orderIndex: 0,
      createdAt: '',
      updatedAt: '',
      signals: [
        { signalId: 'signal-1', signalKey: 'directive', label: 'Directive', description: null, orderIndex: 0, createdAt: '', updatedAt: '' },
        { signalId: 'signal-2', signalKey: 'supportive', label: 'Supportive', description: null, orderIndex: 1, createdAt: '', updatedAt: '' },
      ],
    }],
    languageBundle: {
      DOMAIN_FRAMING: [],
      HERO_PAIRS: [],
      SIGNAL_CHAPTERS: [{
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
      }],
      BALANCING_SECTIONS: [],
      PAIR_SUMMARIES: [],
      APPLICATION_STATEMENTS: [{
        signal_key: 'directive',
        strength_statement_1: 'S1',
        strength_statement_2: 'S2',
        watchout_statement_1: 'W1',
        watchout_statement_2: 'W2',
        development_statement_1: 'D1',
        development_statement_2: 'D2',
      }],
    },
  });

  const signalChapters = validation.datasets.find((dataset) => dataset.datasetKey === 'SIGNAL_CHAPTERS');
  const applicationStatements = validation.datasets.find((dataset) => dataset.datasetKey === 'APPLICATION_STATEMENTS');

  assert.equal(validation.signalCount, 2);
  assert.equal(signalChapters?.expectedRowCount, 2);
  assert.equal(signalChapters?.isReady, false);
  assert.equal(applicationStatements?.expectedRowCount, 2);
  assert.equal(applicationStatements?.isReady, false);
});
