import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSingleDomainLanguageValidation,
  buildSingleDomainStructuralValidation,
  getExpectedSignalPairCount,
} from '@/lib/admin/single-domain-structural-validation';
import { getExpectedDriverClaimTuples } from '@/lib/assessment-language/single-domain-canonical';

const HERO_PAIR_TEST_DOMAIN = [{
  domainId: 'domain-1',
  domainKey: 'focus',
  label: 'Focus',
  description: null,
  orderIndex: 0,
  createdAt: '',
  updatedAt: '',
  signals: [
    { signalId: 'signal-1', signalKey: 'results', label: 'Results', description: null, orderIndex: 0, createdAt: '', updatedAt: '' },
    { signalId: 'signal-2', signalKey: 'people', label: 'People', description: null, orderIndex: 1, createdAt: '', updatedAt: '' },
  ],
}] as const;

function buildHeroPairLanguageValidation(heroHeadline: string) {
  return buildSingleDomainLanguageValidation({
    authoredDomains: HERO_PAIR_TEST_DOMAIN,
    languageBundle: {
      DOMAIN_FRAMING: [],
      HERO_PAIRS: [{
        pair_key: 'results_people',
        hero_headline: heroHeadline,
        hero_subheadline: 'Subheadline',
        hero_opening: 'Opening',
        hero_strength_paragraph: 'Strength',
        hero_tension_paragraph: 'Tension',
        hero_close_paragraph: 'Close',
      }],
      DRIVER_CLAIMS: [],
      SIGNAL_CHAPTERS: [],
      BALANCING_SECTIONS: [],
      PAIR_SUMMARIES: [],
      APPLICATION_STATEMENTS: [],
    },
  });
}

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
  const responseSection = validation.sections.find((section) => section.key === 'responses');
  const languageSection = validation.sections.find((section) => section.key === 'language');

  assert.equal(domainSection?.status, 'attention');
  assert.equal(responseSection?.status, 'waiting');
  assert.equal(weightingSection?.status, 'waiting');
  assert.equal(languageSection?.status, 'waiting');
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

test('review validation keeps responses incomplete when scaffold options still have blank text', () => {
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
        options: [
          {
            optionId: 'option-1',
            optionKey: 'q01_a',
            optionLabel: 'A',
            optionText: 'Clear answer',
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
            optionText: '',
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
            optionText: 'Clear answer',
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
            optionText: 'Clear answer',
            orderIndex: 3,
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

  assert.equal(validation.sections.find((section) => section.key === 'responses')?.status, 'attention');
  assert.equal(validation.sections.find((section) => section.key === 'weightings')?.status, 'waiting');
  assert.ok(validation.issues.some((issue) => issue.code === 'blank_response_text'));
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
      DRIVER_CLAIMS: [],
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

test('hero pair language completeness fails when visible text does not reference the active pair', () => {
  const validation = buildHeroPairLanguageValidation('Shared direction');
  const heroPairs = validation.datasets.find((dataset) => dataset.datasetKey === 'HERO_PAIRS');

  assert.equal(heroPairs?.isReady, false);
  assert.equal(validation.overallReady, false);
  assert.match(heroPairs?.detail ?? '', /Invalid HERO_PAIRS: results_people must reference results and people, or the active pair key\./i);
  assert.ok(heroPairs?.issues.some((issue) => issue.code === 'language_hero_pairs_content_mismatch'));
});

test('hero pair language completeness passes when visible text references both active signals', () => {
  const validation = buildHeroPairLanguageValidation('Results and People');
  const heroPairs = validation.datasets.find((dataset) => dataset.datasetKey === 'HERO_PAIRS');

  assert.equal(heroPairs?.isReady, true);
  assert.match(heroPairs?.detail ?? '', /HERO_PAIRS matches the current derived pair count/i);
});

test('hero pair language completeness passes pair-reference validation when visible text references the active pair key', () => {
  const validation = buildHeroPairLanguageValidation('results_people');
  const heroPairs = validation.datasets.find((dataset) => dataset.datasetKey === 'HERO_PAIRS');

  assert.equal(heroPairs?.isReady, true);
  assert.equal(heroPairs?.issues.some((issue) => issue.code === 'language_hero_pairs_content_mismatch'), false);
});

test('language completeness and review language section agree when hero pair text is invalid', () => {
  const languageValidation = buildHeroPairLanguageValidation('Shared direction');
  const structuralValidation = buildSingleDomainStructuralValidation({
    authoredDomains: HERO_PAIR_TEST_DOMAIN,
    authoredQuestions: [],
    languageValidation,
  });
  const languageSection = structuralValidation.sections.find((section) => section.key === 'language');

  assert.equal(languageValidation.overallReady, false);
  assert.equal(languageSection?.status, 'attention');
  assert.ok(structuralValidation.issues.some((issue) => issue.code === 'language_hero_pairs_content_mismatch'));
});

test('application statements completeness derives from the current signal count while signal chapters stay out of builder readiness', () => {
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
      DRIVER_CLAIMS: [],
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
  assert.equal(signalChapters, undefined);
  assert.equal(applicationStatements?.expectedRowCount, 2);
  assert.equal(applicationStatements?.isReady, false);
  assert.equal(applicationStatements?.status, 'attention');
});


test('driver claims completeness requires the full exact runtime tuple matrix', () => {
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
        { signalId: 'signal-1', signalKey: 'results', label: 'Results', description: null, orderIndex: 0, createdAt: '', updatedAt: '' },
        { signalId: 'signal-2', signalKey: 'process', label: 'Process', description: null, orderIndex: 1, createdAt: '', updatedAt: '' },
        { signalId: 'signal-3', signalKey: 'vision', label: 'Vision', description: null, orderIndex: 2, createdAt: '', updatedAt: '' },
        { signalId: 'signal-4', signalKey: 'people', label: 'People', description: null, orderIndex: 3, createdAt: '', updatedAt: '' },
      ],
    }],
    languageBundle: {
      DOMAIN_FRAMING: [],
      HERO_PAIRS: [],
      DRIVER_CLAIMS: [],
      SIGNAL_CHAPTERS: [],
      BALANCING_SECTIONS: [],
      PAIR_SUMMARIES: [],
      APPLICATION_STATEMENTS: [],
    },
  });

  const driverClaims = validation.datasets.find((dataset) => dataset.datasetKey === 'DRIVER_CLAIMS');

  assert.equal(validation.expectedPairCount, 6);
  assert.equal(driverClaims?.expectedRowCount, 48);
  assert.equal(driverClaims?.completeRowCount, 0);
  assert.equal(driverClaims?.actualRowCount, 0);
  assert.equal(driverClaims?.status, 'not_started');
});

test('driver claims validation exposes per-pair 8 of 8 coverage only when exact tuples exist', () => {
  const signalKeys = ['results', 'process', 'vision', 'people'] as const;
  const validation = buildSingleDomainLanguageValidation({
    authoredDomains: [{
      domainId: 'domain-1',
      domainKey: 'focus',
      label: 'Focus',
      description: null,
      orderIndex: 0,
      createdAt: '',
      updatedAt: '',
      signals: signalKeys.map((signalKey, index) => ({
        signalId: `signal-${index + 1}`,
        signalKey,
        label: signalKey,
        description: null,
        orderIndex: index,
        createdAt: '',
        updatedAt: '',
      })),
    }],
    languageBundle: {
      DOMAIN_FRAMING: [],
      HERO_PAIRS: [],
      DRIVER_CLAIMS: getExpectedDriverClaimTuples({
        domainKey: 'focus',
        signalKeys,
      })
        .filter((tuple) => !(tuple.pairKey === 'results_process'
          && tuple.signalKey === 'process'
          && tuple.driverRole === 'primary_driver'))
        .map((tuple) => ({
          domain_key: tuple.domainKey,
          pair_key: tuple.pairKey,
          signal_key: tuple.signalKey,
          driver_role: tuple.driverRole,
          claim_type: tuple.driverRole === 'primary_driver'
            ? 'driver_primary'
            : tuple.driverRole === 'secondary_driver'
              ? 'driver_secondary'
              : tuple.driverRole === 'supporting_context'
                ? 'driver_supporting_context'
                : 'driver_range_limitation',
          claim_text: `${tuple.pairKey} ${tuple.signalKey} ${tuple.driverRole}`,
          materiality: tuple.driverRole === 'range_limitation'
            ? 'material_underplay'
            : tuple.driverRole === 'supporting_context'
              ? 'supporting'
              : 'core',
          priority: tuple.driverRole === 'primary_driver'
            ? 1
            : tuple.driverRole === 'secondary_driver'
              ? 2
              : tuple.driverRole === 'supporting_context'
                ? 3
                : 4,
        })),
      SIGNAL_CHAPTERS: [],
      BALANCING_SECTIONS: [],
      PAIR_SUMMARIES: [],
      APPLICATION_STATEMENTS: [],
    },
  });

  const driverClaims = validation.datasets.find((dataset) => dataset.datasetKey === 'DRIVER_CLAIMS');
  const resultsProcess = driverClaims?.driverClaimMatrix?.pairs.find((pair) => pair.pairKey === 'results_process');
  const resultsVision = driverClaims?.driverClaimMatrix?.pairs.find((pair) => pair.pairKey === 'results_vision');

  assert.equal(driverClaims?.expectedRowCount, 48);
  assert.equal(driverClaims?.actualRowCount, 47);
  assert.equal(driverClaims?.completeRowCount, 47);
  assert.ok(driverClaims?.issues.some((issue) => issue.code === 'language_driver_claims_matrix_invalid'));
  assert.equal(resultsProcess?.completeRowCount, 7);
  assert.equal(resultsProcess?.expectedRowCount, 8);
  assert.ok(resultsProcess?.missingTuples.includes('focus|results_process|process|primary_driver'));
  assert.equal(resultsVision?.completeRowCount, 8);
});

test('language validation never treats zero expected rows as ready when prerequisites are missing', () => {
  const validation = buildSingleDomainLanguageValidation({
    authoredDomains: [],
    languageBundle: {
      DOMAIN_FRAMING: [],
      HERO_PAIRS: [],
      DRIVER_CLAIMS: [],
      SIGNAL_CHAPTERS: [],
      BALANCING_SECTIONS: [],
      PAIR_SUMMARIES: [],
      APPLICATION_STATEMENTS: [],
    },
  });

  const heroPairs = validation.datasets.find((dataset) => dataset.datasetKey === 'HERO_PAIRS');

  assert.equal(validation.overallReady, false);
  assert.equal(heroPairs?.expectedRowCount, 0);
  assert.equal(heroPairs?.isReady, false);
  assert.equal(heroPairs?.status, 'waiting');
  assert.match(heroPairs?.detail ?? '', /Waiting on authored signals/i);
  assert.equal(validation.datasets.some((dataset) => dataset.datasetKey === 'SIGNAL_CHAPTERS'), false);
});
