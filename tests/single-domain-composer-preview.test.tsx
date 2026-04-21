import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';

import { AdminAssessmentAuthoringProvider } from '@/components/admin/admin-assessment-authoring-context';
import { SingleDomainComposerPreview } from '@/components/admin/assessments/single-domain-composer-preview';
import { buildSingleDomainLanguageValidation } from '@/lib/admin/single-domain-structural-validation';
import type { AdminAssessmentDetailViewModel } from '@/lib/server/admin-assessment-detail';
import type { SingleDomainLanguageBundle } from '@/lib/server/assessment-version-single-domain-language-types';

function createAssessment(
  languageBundle: SingleDomainLanguageBundle,
): AdminAssessmentDetailViewModel {
  const authoredDomains = [
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
          signalKey: 'structured',
          label: 'Structured',
          description: null,
          orderIndex: 1,
          createdAt: '',
          updatedAt: '',
        },
        {
          signalId: 'signal-3',
          signalKey: 'reflective',
          label: 'Reflective',
          description: null,
          orderIndex: 2,
          createdAt: '',
          updatedAt: '',
        },
      ],
    },
  ] as const;

  return {
    assessmentId: 'assessment-1',
    assessmentKey: 'role-focus',
    mode: 'single_domain',
    modeLabel: 'Single-Domain',
    title: 'Role Focus',
    description: 'Single-domain builder test fixture',
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
      questionCount: 0,
      createdAt: '',
      updatedAt: '',
    },
    builderMode: 'draft',
    authoredDomains,
    questionDomains: [],
    authoredQuestions: [],
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
        signalKey: 'structured',
        signalLabel: 'Structured',
        signalDescription: null,
        signalOrderIndex: 1,
        domainId: 'domain-1',
        domainKey: 'leadership-style',
        domainLabel: 'Leadership style',
        domainOrderIndex: 0,
      },
      {
        signalId: 'signal-3',
        signalKey: 'reflective',
        signalLabel: 'Reflective',
        signalDescription: null,
        signalOrderIndex: 2,
        domainId: 'domain-1',
        domainKey: 'leadership-style',
        domainLabel: 'Leadership style',
        domainOrderIndex: 0,
      },
    ],
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
      blockingErrors: [],
      warnings: [],
      counts: {
        domainCount: 1,
        signalCount: 3,
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
    singleDomainDraftReadiness: null,
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

test('single-domain composer preview renders draft and fixture modes with full report, diagnostics, and provenance', () => {
  const assessment = createAssessment({
    DOMAIN_FRAMING: [
      {
        domain_key: 'leadership-style',
        section_title: 'Leadership style',
        intro_paragraph: 'This domain measures day-to-day leadership stance.',
        meaning_paragraph: 'It focuses on how direction and support are expressed.',
        bridge_to_signals: 'Read strong signals as defaults and weak signals as range limits.',
        blueprint_context_line: 'Use the six-section flow to read the result.',
      },
    ],
    HERO_PAIRS: [
      {
        pair_key: 'directive_structured',
        hero_headline: 'Firm structured delivery',
        hero_subheadline: 'Fast and orderly',
        hero_opening: 'The pattern moves quickly and organizes quickly.',
        hero_strength_paragraph: 'It converts direction into visible structure.',
        hero_tension_paragraph: 'It can narrow the space for reconsideration.',
        hero_close_paragraph: 'The result is disciplined execution.',
      },
    ],
    SIGNAL_CHAPTERS: [
      {
        signal_key: 'directive',
        position_primary_label: 'Primary driver',
        position_secondary_label: 'Secondary driver',
        position_supporting_label: 'Supporting context',
        position_underplayed_label: 'Range limitation',
        chapter_intro_primary: 'Directive pace sets the pattern.',
        chapter_intro_secondary: '',
        chapter_intro_supporting: '',
        chapter_intro_underplayed: '',
        chapter_how_it_shows_up: '',
        chapter_value_outcome: '',
        chapter_value_team_effect: '',
        chapter_risk_behaviour: '',
        chapter_risk_impact: '',
        chapter_development: '',
      },
      {
        signal_key: 'structured',
        position_primary_label: 'Primary driver',
        position_secondary_label: 'Secondary driver',
        position_supporting_label: 'Supporting context',
        position_underplayed_label: 'Range limitation',
        chapter_intro_primary: '',
        chapter_intro_secondary: 'Structured order reinforces the pattern.',
        chapter_intro_supporting: '',
        chapter_intro_underplayed: '',
        chapter_how_it_shows_up: '',
        chapter_value_outcome: '',
        chapter_value_team_effect: '',
        chapter_risk_behaviour: '',
        chapter_risk_impact: '',
        chapter_development: '',
      },
      {
        signal_key: 'reflective',
        position_primary_label: 'Primary driver',
        position_secondary_label: 'Secondary driver',
        position_supporting_label: 'Supporting context',
        position_underplayed_label: 'Range limitation',
        chapter_intro_primary: '',
        chapter_intro_secondary: '',
        chapter_intro_supporting: '',
        chapter_intro_underplayed: 'Reflective range is materially underplayed.',
        chapter_how_it_shows_up: '',
        chapter_value_outcome: '',
        chapter_value_team_effect: '',
        chapter_risk_behaviour: '',
        chapter_risk_impact: '',
        chapter_development: '',
      },
    ],
    BALANCING_SECTIONS: [
      {
        pair_key: 'directive_structured',
        balancing_section_title: 'Compressed reconsideration',
        current_pattern_paragraph: 'The pattern can outrun reflection.',
        practical_meaning_paragraph: 'It becomes easier to move than to reopen the frame.',
        system_risk_paragraph: 'Reflective range can arrive too late to shape the call.',
        rebalance_intro: 'reflective: Reflective range can arrive too late to shape the call.',
        rebalance_action_1: 'Make room for reconsideration.',
        rebalance_action_2: '',
        rebalance_action_3: '',
      },
    ],
    PAIR_SUMMARIES: [
      {
        pair_key: 'directive_structured',
        pair_section_title: 'Directive + Structured',
        pair_headline: 'Directive + Structured',
        pair_opening_paragraph: 'The pair decides early and codifies quickly.',
        pair_strength_paragraph: 'It combines speed with order.',
        pair_tension_paragraph: 'It can harden too soon.',
        pair_close_paragraph: 'The combined pattern favors visible progress.',
      },
    ],
    APPLICATION_STATEMENTS: [
      {
        signal_key: 'directive',
        strength_statement_1: 'Use your pace to move work forward.',
        strength_statement_2: '',
        watchout_statement_1: '',
        watchout_statement_2: '',
        development_statement_1: '',
        development_statement_2: '',
      },
      {
        signal_key: 'reflective',
        strength_statement_1: '',
        strength_statement_2: '',
        watchout_statement_1: 'Notice when urgency is outrunning reflection.',
        watchout_statement_2: '',
        development_statement_1: 'Build a pause before the final call.',
        development_statement_2: '',
      },
    ],
  });

  const markup = renderToStaticMarkup(
    <AdminAssessmentAuthoringProvider assessment={assessment}>
      <SingleDomainComposerPreview />
    </AdminAssessmentAuthoringProvider>,
  );

  assert.match(markup, /Result composer preview/);
  assert.match(markup, /Draft preview/);
  assert.match(markup, /Fixture preview/);
  assert.match(markup, /Composed report/);
  assert.match(markup, /Diagnostics/);
  assert.match(markup, /Provenance/);
  assert.match(markup, /Intro/);
  assert.match(markup, /Hero/);
  assert.match(markup, /Drivers/);
  assert.match(markup, /Pair/);
  assert.match(markup, /Limitation/);
  assert.match(markup, /Application/);
  assert.match(markup, /SINGLE_DOMAIN_DRIVERS/);
});
