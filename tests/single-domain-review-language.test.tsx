import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';

import { AdminAssessmentAuthoringProvider } from '@/components/admin/admin-assessment-authoring-context';
import { SingleDomainReviewAuthoring } from '@/components/admin/single-domain-structural-authoring';
import { buildSingleDomainLanguageValidation } from '@/lib/admin/single-domain-structural-validation';
import type { AdminAssessmentDetailViewModel } from '@/lib/server/admin-assessment-detail';
import type { SingleDomainLanguageBundle } from '@/lib/server/assessment-version-single-domain-language-types';

function buildAssessment(languageBundle: SingleDomainLanguageBundle): AdminAssessmentDetailViewModel {
  const authoredDomains: AdminAssessmentDetailViewModel['authoredDomains'] = [{
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
        signalCount: 2,
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
      isReady:
        languageBundle.DOMAIN_FRAMING.length > 0
        && languageBundle.HERO_PAIRS.length === 1
        && languageBundle.SIGNAL_CHAPTERS.length === 2
        && languageBundle.BALANCING_SECTIONS.length === 1
        && languageBundle.PAIR_SUMMARIES.length === 1
        && languageBundle.APPLICATION_STATEMENTS.length === 2,
      issues:
        languageBundle.DOMAIN_FRAMING.length > 0
        && languageBundle.HERO_PAIRS.length === 1
        && languageBundle.SIGNAL_CHAPTERS.length === 2
        && languageBundle.BALANCING_SECTIONS.length === 1
        && languageBundle.PAIR_SUMMARIES.length === 1
        && languageBundle.APPLICATION_STATEMENTS.length === 2
          ? []
          : [{
              code: 'hero_pairs_count_mismatch',
              section: 'language',
              message: 'HERO_PAIRS must contain exactly 1 row.',
              severity: 'blocking',
            }],
      counts: {
        domainCount: 1,
        signalCount: 2,
        derivedPairCount: 1,
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
  assert.match(markup, /0\/1\+/);
  assert.match(markup, /0\/2/);
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

test('review step reflects complete language datasets accurately', () => {
  const markup = renderToStaticMarkup(
    <AdminAssessmentAuthoringProvider
      assessment={buildAssessment({
        DOMAIN_FRAMING: [{
          domain_key: 'leadership-style',
          section_title: 'Leadership style',
          intro_paragraph: 'Intro',
          meaning_paragraph: 'Meaning',
          bridge_to_signals: 'Bridge',
          blueprint_context_line: 'Blueprint',
        }],
        HERO_PAIRS: [{
          pair_key: 'directive_supportive',
          hero_headline: 'Headline',
          hero_subheadline: 'Subheadline',
          hero_opening: 'Opening',
          hero_strength_paragraph: 'Strength',
          hero_tension_paragraph: 'Tension',
          hero_close_paragraph: 'Close',
        }],
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
        BALANCING_SECTIONS: [{
          pair_key: 'directive_supportive',
          balancing_section_title: 'Balance',
          current_pattern_paragraph: 'Pattern',
          practical_meaning_paragraph: 'Meaning',
          system_risk_paragraph: 'Risk',
          rebalance_intro: 'Intro',
          rebalance_action_1: 'A1',
          rebalance_action_2: 'A2',
          rebalance_action_3: 'A3',
        }],
        PAIR_SUMMARIES: [{
          pair_key: 'directive_supportive',
          pair_section_title: 'Section',
          pair_headline: 'Headline',
          pair_opening_paragraph: 'Opening',
          pair_strength_paragraph: 'Strength',
          pair_tension_paragraph: 'Tension',
          pair_close_paragraph: 'Close',
        }],
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
      })}
    >
      <SingleDomainReviewAuthoring />
    </AdminAssessmentAuthoringProvider>,
  );

  assert.match(markup, /All six locked single-domain language datasets meet the current completeness contract/i);
  assert.match(markup, /Runtime definition can load cleanly/i);
  assert.match(markup, /1\/1\+/);
  assert.match(markup, /2\/2/);
  assert.doesNotMatch(markup, /must contain exactly/i);
});
