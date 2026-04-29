import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';

import { AdminAssessmentAuthoringProvider } from '@/components/admin/admin-assessment-authoring-context';
import { SingleDomainReviewAuthoring } from '@/components/admin/single-domain-structural-authoring';
import {
  buildSingleDomainLanguageValidation,
  getExpectedSignalPairCount,
  getExpectedSingleDomainApplicationStatementRowCount,
} from '@/lib/admin/single-domain-structural-validation';
import { getExpectedDriverClaimTuples } from '@/lib/assessment-language/single-domain-canonical';
import type { AdminAssessmentDetailViewModel } from '@/lib/server/admin-assessment-detail';
import type { SingleDomainLanguageBundle } from '@/lib/server/assessment-version-single-domain-language-types';
import type { ApplicationStatementsRow } from '@/lib/types/single-domain-language';
import type { DriverClaimsRow } from '@/lib/types/single-domain-language';

const DEFAULT_SIGNAL_KEYS = ['directive', 'supportive'] as const;

function buildApplicationStatementRows(signalKeys: readonly string[]): ApplicationStatementsRow[] {
  const focusMappings = [
    ['rely_on', 'applied_strength'],
    ['notice', 'watchout'],
    ['develop', 'development_focus'],
  ] as const;
  const roleMappings = [
    ['primary_driver', 0, 1],
    ['secondary_driver', 1, 2],
    ['supporting_context', 2, 3],
    ['range_limitation', 3, 4],
  ] as const;
  const rows: ApplicationStatementsRow[] = [];

  for (let firstIndex = 0; firstIndex < signalKeys.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < signalKeys.length; secondIndex += 1) {
      const remaining = signalKeys.filter((_, index) => index !== firstIndex && index !== secondIndex);
      for (const [third, fourth] of [[remaining[0], remaining[1]], [remaining[1], remaining[0]]] as const) {
        if (!third || !fourth) {
          continue;
        }
        const patternSignals = [signalKeys[firstIndex]!, signalKeys[secondIndex]!, third, fourth];
        const patternKey = patternSignals.join('_');
        const pairKey = patternSignals.slice(0, 2).join('_');

        for (const [focusArea, guidanceType] of focusMappings) {
          for (const [driverRole, signalIndex, priority] of roleMappings) {
            rows.push({
              domain_key: 'leadership-style',
              pattern_key: patternKey,
              pair_key: pairKey,
              focus_area: focusArea,
              guidance_type: guidanceType,
              driver_role: driverRole,
              signal_key: patternSignals[signalIndex]!,
              priority,
              guidance_text: 'Placeholder application guidance.',
              linked_claim_type: guidanceType,
              strength_statement_1: '',
              strength_statement_2: '',
              watchout_statement_1: '',
              watchout_statement_2: '',
              development_statement_1: '',
              development_statement_2: '',
            });
          }
        }
      }
    }
  }

  return rows;
}

function buildPairKeys(signalKeys: readonly string[]): string[] {
  return [
    ...new Set(
      getExpectedDriverClaimTuples({
        domainKey: 'leadership-style',
        signalKeys,
      }).map((tuple) => tuple.pairKey),
    ),
  ];
}

function buildDriverClaimRows(signalKeys: readonly string[]): DriverClaimsRow[] {
  return getExpectedDriverClaimTuples({
    domainKey: 'leadership-style',
    signalKeys,
  }).map((tuple) => ({
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
  }));
}

function buildAssessment(
  languageBundle: SingleDomainLanguageBundle,
  signalKeys: readonly string[] = DEFAULT_SIGNAL_KEYS,
): AdminAssessmentDetailViewModel {
  const expectedPairCount = getExpectedSignalPairCount(signalKeys.length);
  const expectedApplicationRowCount = getExpectedSingleDomainApplicationStatementRowCount(signalKeys.length);
  const languageIsReady = languageBundle.DOMAIN_FRAMING.length > 0
    && languageBundle.HERO_PAIRS.length === expectedPairCount
    && languageBundle.SIGNAL_CHAPTERS.length === signalKeys.length
    && languageBundle.BALANCING_SECTIONS.length === expectedPairCount
    && languageBundle.PAIR_SUMMARIES.length === expectedPairCount
    && languageBundle.APPLICATION_STATEMENTS.length === expectedApplicationRowCount;
  const authoredDomains: AdminAssessmentDetailViewModel['authoredDomains'] = [{
    domainId: 'domain-1',
    domainKey: 'leadership-style',
    label: 'Leadership style',
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
  }];

  return {
    assessmentId: 'assessment-1',
    assessmentKey: 'role-focus',
    mode: 'single_domain',
    modeLabel: 'Single-Domain',
    title: 'Role Focus',
    description: null,
    isActive: true,
    createdAt: '',
    updatedAt: '',
    versions: [],
    publishedVersion: null,
    latestDraftVersion: {
      assessmentVersionId: 'version-1',
      versionTag: '1.0.0',
      status: 'draft',
      publishedAt: null,
      questionCount: 1,
      createdAt: '',
      updatedAt: '',
    },
    builderMode: 'draft',
    authoredDomains,
    questionDomains: [],
    authoredQuestions: [{
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
      options: [{
        optionId: 'option-1',
        optionKey: 'q01_a',
        optionLabel: 'A',
        optionText: 'Agree',
        orderIndex: 0,
        createdAt: '',
        updatedAt: '',
        weightingStatus: 'weighted',
        signalWeights: [{
          optionSignalWeightId: 'weight-1',
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
      }],
    }],
    availableSignals: signalKeys.map((signalKey, index) => ({
      signalId: `signal-${index + 1}`,
      signalKey,
      signalLabel: signalKey,
      signalDescription: null,
      signalOrderIndex: index,
      domainId: 'domain-1',
      domainKey: 'leadership-style',
      domainLabel: 'Leadership style',
      domainOrderIndex: 0,
    })),
    weightingSummary: {
      totalOptions: 1,
      weightedOptions: 1,
      unmappedOptions: 0,
      totalMappings: 1,
    },
    draftValidation: {
      status: 'not_ready',
      isPublishReady: false,
      assessmentId: 'assessment-1',
      assessmentKey: 'role-focus',
      draftVersionId: 'version-1',
      draftVersionTag: '1.0.0',
      sections: [],
      blockingErrors: [],
      warnings: [],
      counts: {
        domainCount: 1,
        signalCount: signalKeys.length,
        questionCount: 1,
        optionCount: 1,
        weightedOptionCount: 1,
        unmappedOptionCount: 0,
        weightMappingCount: 1,
        applicationThesisCount: 0,
        applicationContributionCount: 0,
        applicationRiskCount: 0,
        applicationDevelopmentCount: 0,
        applicationActionPromptsCount: 0,
      },
    },
    singleDomainDraftReadiness: {
      isReady: languageIsReady,
      issues:
        languageIsReady
          ? []
          : [{
              code: 'hero_pairs_count_mismatch',
              section: 'language',
              message: `HERO_PAIRS must contain exactly ${expectedPairCount} row${expectedPairCount === 1 ? '' : 's'}.`,
              severity: 'blocking',
            }],
      counts: {
        domainCount: 1,
        signalCount: signalKeys.length,
        derivedPairCount: expectedPairCount,
        questionCount: 1,
        optionCount: 1,
        weightCount: 1,
        questionsWithoutOptionsCount: 0,
        optionsWithoutWeightsCount: 0,
        orphanOptionCount: 0,
        unresolvedWeightSignalCount: 0,
        languageRowCounts: {
          DOMAIN_FRAMING: languageBundle.DOMAIN_FRAMING.length,
          HERO_PAIRS: languageBundle.HERO_PAIRS.length,
          SIGNAL_CHAPTERS: languageBundle.SIGNAL_CHAPTERS.length,
          BALANCING_SECTIONS: languageBundle.BALANCING_SECTIONS.length,
          PAIR_SUMMARIES: languageBundle.PAIR_SUMMARIES.length,
          APPLICATION_STATEMENTS: languageBundle.APPLICATION_STATEMENTS.length,
        },
      },
      expectations: {
        requiredDomainCount: 1,
        minimumSignalCount: 1,
        minimumQuestionCount: 1,
        expectedDerivedPairCount: expectedPairCount,
        expectedLanguageRowCounts: {
          DOMAIN_FRAMING: 1,
          HERO_PAIRS: expectedPairCount,
          SIGNAL_CHAPTERS: signalKeys.length,
          BALANCING_SECTIONS: expectedPairCount,
          PAIR_SUMMARIES: expectedPairCount,
          APPLICATION_STATEMENTS: expectedApplicationRowCount,
        },
      },
      runtimeDefinition: null,
    },
    stepCompletion: {
      assessmentIntro: 'incomplete',
      language: 'incomplete',
    },
    singleDomainLanguageBundle: languageBundle,
    singleDomainLanguageValidation: buildSingleDomainLanguageValidation({
      authoredDomains,
      languageBundle,
    }),
  };
}

test('review step reflects incomplete language datasets accurately', () => {
  const markup = renderToStaticMarkup(
    <AdminAssessmentAuthoringProvider
      assessment={buildAssessment({
        DOMAIN_FRAMING: [],
        HERO_PAIRS: [],
        SIGNAL_CHAPTERS: [],
        BALANCING_SECTIONS: [],
        PAIR_SUMMARIES: [],
        APPLICATION_STATEMENTS: [],
      })}
    >
      <SingleDomainReviewAuthoring />
    </AdminAssessmentAuthoringProvider>,
  );

  assert.match(markup, /Language/);
  assert.match(markup, /Runtime definition is still blocked/i);
  assert.match(markup, /DOMAIN_FRAMING must contain at least 1 row/i);
  assert.match(markup, /HERO_PAIRS must contain exactly 1 row/i);
  assert.match(markup, /Current blocker/i);
  assert.match(markup, /Missing or invalid in Language/i);
  assert.match(markup, /Fix in Language/i);
  assert.match(markup, /0\/1\+/);
  assert.match(markup, /Waiting on at least four authored signals before full-pattern application rows can be assessed/i);
});

test('review step keeps zero-data structural sections out of ready states', () => {
  const assessment = buildAssessment({
    DOMAIN_FRAMING: [],
    HERO_PAIRS: [],
    SIGNAL_CHAPTERS: [],
    BALANCING_SECTIONS: [],
    PAIR_SUMMARIES: [],
    APPLICATION_STATEMENTS: [],
  });
  const markup = renderToStaticMarkup(
    <AdminAssessmentAuthoringProvider
      assessment={{
        ...assessment,
        authoredQuestions: [],
        weightingSummary: {
          totalOptions: 0,
          weightedOptions: 0,
          unmappedOptions: 0,
          totalMappings: 0,
        },
      }}
    >
      <SingleDomainReviewAuthoring />
    </AdminAssessmentAuthoringProvider>,
  );

  assert.match(markup, /Responses/);
  assert.match(markup, /Weightings/);
  assert.match(markup, /Waiting on authored questions before responses can be assessed/i);
  assert.match(markup, /Waiting on authored responses before weightings can be assessed/i);
  assert.doesNotMatch(markup, /Responses[\s\S]{0,220}No blocking structural issues in this section\./);
  assert.doesNotMatch(markup, /Weightings[\s\S]{0,220}No blocking structural issues in this section\./);
});

test('review step keeps language in waiting when pair-derived prerequisites do not yet exist', () => {
  const assessment = buildAssessment({
    DOMAIN_FRAMING: [],
    HERO_PAIRS: [],
    SIGNAL_CHAPTERS: [],
    BALANCING_SECTIONS: [],
    PAIR_SUMMARIES: [],
    APPLICATION_STATEMENTS: [],
  });
  const markup = renderToStaticMarkup(
    <AdminAssessmentAuthoringProvider
      assessment={{
        ...assessment,
        authoredDomains: [{
          ...assessment.authoredDomains[0]!,
          signals: [assessment.authoredDomains[0]!.signals[0]!],
        }],
        availableSignals: [assessment.availableSignals[0]!],
        singleDomainLanguageBundle: {
          DOMAIN_FRAMING: [],
          HERO_PAIRS: [],
          SIGNAL_CHAPTERS: [],
          BALANCING_SECTIONS: [],
          PAIR_SUMMARIES: [],
          APPLICATION_STATEMENTS: [],
        },
        singleDomainLanguageValidation: buildSingleDomainLanguageValidation({
          authoredDomains: [{
            ...assessment.authoredDomains[0]!,
            signals: [assessment.authoredDomains[0]!.signals[0]!],
          }],
          languageBundle: {
            DOMAIN_FRAMING: [],
            HERO_PAIRS: [],
            SIGNAL_CHAPTERS: [],
            BALANCING_SECTIONS: [],
            PAIR_SUMMARIES: [],
            APPLICATION_STATEMENTS: [],
          },
        }),
      }}
    >
      <SingleDomainReviewAuthoring />
    </AdminAssessmentAuthoringProvider>,
  );

  assert.match(markup, /Language/);
  assert.match(markup, /Waiting/);
  assert.match(markup, /waiting on the current authored signal and pair structure/i);
});

test('review step reflects complete language datasets accurately', () => {
  const signalKeys = ['directive', 'supportive', 'analytical', 'adaptive'] as const;
  const pairKeys = buildPairKeys(signalKeys);
  const assessment = buildAssessment({
    DOMAIN_FRAMING: [{
      domain_key: 'leadership-style',
      section_title: 'Leadership style',
      intro_paragraph: 'Intro',
      meaning_paragraph: 'Meaning',
      bridge_to_signals: 'Bridge',
      blueprint_context_line: 'Blueprint',
    }],
    HERO_PAIRS: pairKeys.map((pairKey) => ({
      pair_key: pairKey,
      hero_headline: pairKey,
      hero_subheadline: 'Subheadline',
      hero_opening: 'Opening',
      hero_strength_paragraph: 'Strength',
      hero_tension_paragraph: 'Tension',
      hero_close_paragraph: 'Close',
    })),
    DRIVER_CLAIMS: buildDriverClaimRows(signalKeys),
    SIGNAL_CHAPTERS: signalKeys.map((signalKey) => ({
        signal_key: signalKey,
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
    })),
    BALANCING_SECTIONS: pairKeys.map((pairKey) => ({
      pair_key: pairKey,
      balancing_section_title: 'Balance',
      current_pattern_paragraph: 'Pattern',
      practical_meaning_paragraph: 'Meaning',
      system_risk_paragraph: 'Risk',
      rebalance_intro: 'Intro',
      rebalance_action_1: 'A1',
      rebalance_action_2: 'A2',
      rebalance_action_3: 'A3',
    })),
    PAIR_SUMMARIES: pairKeys.map((pairKey) => ({
      pair_key: pairKey,
      pair_section_title: 'Section',
      pair_headline: pairKey,
      pair_opening_paragraph: 'Opening',
      pair_strength_paragraph: 'Strength',
      pair_tension_paragraph: 'Tension',
      pair_close_paragraph: 'Close',
    })),
    APPLICATION_STATEMENTS: buildApplicationStatementRows(signalKeys),
  }, signalKeys);
  const markup = renderToStaticMarkup(
    <AdminAssessmentAuthoringProvider
      assessment={{
        ...assessment,
        draftValidation: {
          ...assessment.draftValidation,
          status: 'ready',
          isPublishReady: true,
        },
      }}
    >
      <SingleDomainReviewAuthoring />
    </AdminAssessmentAuthoringProvider>,
  );

  assert.match(markup, /All six locked single-domain language datasets meet the current completeness contract/i);
  assert.match(markup, /Runtime definition can load cleanly/i);
  assert.match(markup, /Publish assessment/i);
  assert.match(markup, /Ready to publish/i);
  assert.match(markup, /1\/1\+/);
  assert.match(markup, /144\/144/);
  assert.doesNotMatch(markup, /must contain exactly/i);
});

test('review step keeps the publish CTA disabled with a clear reason when the draft is not publishable', () => {
  const markup = renderToStaticMarkup(
    <AdminAssessmentAuthoringProvider
      assessment={buildAssessment({
        DOMAIN_FRAMING: [],
        HERO_PAIRS: [],
        SIGNAL_CHAPTERS: [],
        BALANCING_SECTIONS: [],
        PAIR_SUMMARIES: [],
        APPLICATION_STATEMENTS: [],
      })}
    >
      <SingleDomainReviewAuthoring />
    </AdminAssessmentAuthoringProvider>,
  );

  assert.match(markup, /Publish assessment/i);
  assert.match(markup, /Review required/i);
  assert.match(markup, /Resolve the blocking review issues before publishing\./i);
  assert.match(markup, /button[^>]+disabled[^>]*>Publish assessment<\/button>/i);
});

test('review step keeps the affected section out of ready when runtime readiness names a blocker there', () => {
  const assessment = buildAssessment({
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
  });

  const markup = renderToStaticMarkup(
    <AdminAssessmentAuthoringProvider assessment={assessment}>
      <SingleDomainReviewAuthoring />
    </AdminAssessmentAuthoringProvider>,
  );

  assert.match(markup, /Language/);
  assert.doesNotMatch(markup, /Language[\s\S]{0,240}No blocking structural issues in this section\./);
  assert.match(markup, /HERO_PAIRS must contain exactly 1 row/i);
});
