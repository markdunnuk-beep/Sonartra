import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSingleDomainDraftPreviewInput,
  composeSingleDomainReport,
} from '@/lib/assessment-language/single-domain-composer';
import { SINGLE_DOMAIN_PREVIEW_FIXTURES } from '@/lib/assessment-language/single-domain-preview-fixtures';
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

test('composeSingleDomainReport preserves the locked six-section order for fixture inputs', () => {
  assert.equal(SINGLE_DOMAIN_PREVIEW_FIXTURES.length >= 3, true);
  const fixture = SINGLE_DOMAIN_PREVIEW_FIXTURES[0];
  assert.ok(fixture);

  const report = composeSingleDomainReport(fixture.input);

  assert.deepEqual(
    report.sections.map((section) => section.key),
    ['intro', 'hero', 'drivers', 'pair', 'limitation', 'application'],
  );
  assert.equal(report.sections[2]?.provenance.sourceDatasetKey, 'SINGLE_DOMAIN_DRIVERS');
  assert.equal(report.sections[5]?.focusItems.length, 3);
});

test('draft preview input adapts imported draft bundle rows into the locked preview shape', () => {
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
        hero_opening: 'The Directive and Structured pattern moves quickly and organises quickly.',
        hero_strength_paragraph: 'It converts direction into visible structure.',
        hero_tension_paragraph: 'It can narrow the space for reconsideration.',
        hero_close_paragraph: 'The result is disciplined execution.',
      },
    ],
    DRIVER_CLAIMS: [
      {
        domain_key: 'leadership-style',
        pair_key: 'directive_structured',
        signal_key: 'directive',
        driver_role: 'primary_driver',
        claim_type: 'driver_primary',
        claim_text: 'Pair-scoped Directive claim.',
        materiality: 'core',
        priority: 1,
      },
      {
        domain_key: 'leadership-style',
        pair_key: 'directive_structured',
        signal_key: 'structured',
        driver_role: 'secondary_driver',
        claim_type: 'driver_secondary',
        claim_text: 'Pair-scoped Structured claim.',
        materiality: 'core',
        priority: 2,
      },
      {
        domain_key: 'leadership-style',
        pair_key: 'directive_structured',
        signal_key: 'reflective',
        driver_role: 'supporting_context',
        claim_type: 'driver_supporting_context',
        claim_text: 'Pair-scoped Reflective support claim.',
        materiality: 'supporting',
        priority: 3,
      },
      {
        domain_key: 'leadership-style',
        pair_key: 'directive_structured',
        signal_key: 'reflective',
        driver_role: 'range_limitation',
        claim_type: 'driver_range_limitation',
        claim_text: 'Pair-scoped Reflective range claim.',
        materiality: 'material_underplay',
        priority: 4,
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

  const preview = buildSingleDomainDraftPreviewInput(assessment);

  assert.equal(preview.success, true);
  if (!preview.success) {
    return;
  }

  assert.equal(preview.input.sections.hero.pattern_label, 'Firm structured delivery');
  assert.equal(preview.input.sections.drivers.length, 4);
  assert.equal(preview.input.sections.drivers[0]?.claim_text, 'Pair-scoped Directive claim.');
  assert.equal(
    preview.input.sections.drivers.some((row) => row.claim_text === 'Directive pace sets the pattern.'),
    false,
  );
  assert.equal(preview.input.sections.pair.pair_label, 'Directive + Structured');
  assert.equal(preview.input.sections.limitation.weaker_signal_key, 'reflective');
  assert.equal(preview.input.sections.application.length, 3);

  const report = composeSingleDomainReport(preview.input);
  assert.match(report.sections[1]?.paragraphs.join(' ') ?? '', /Firm structured delivery/);
  assert.match(
    report.sections[4]?.paragraphs.join(' ') ?? '',
    /When Directive dominates without enough Reflective/,
  );
});

test('draft preview uses signal-level fallback for unauthored pairs without reusing another pair', () => {
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
        hero_opening: 'The Directive and Structured pattern moves quickly and organises quickly.',
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
    BALANCING_SECTIONS: [],
    PAIR_SUMMARIES: [
      {
        pair_key: 'directive_structured',
        pair_section_title: 'Directive + Structured',
        pair_headline: 'Directive + Structured',
        pair_opening_paragraph: 'The Directive and Structured pair decides early and codifies quickly.',
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

  const preview = buildSingleDomainDraftPreviewInput(assessment, 'directive_reflective');

  assert.equal(preview.success, true);
  if (!preview.success) {
    return;
  }

  const report = composeSingleDomainReport(preview.input);
  const pairText = report.sections.find((section) => section.key === 'pair')?.paragraphs.join(' ') ?? '';
  const limitationText = report.sections.find((section) => section.key === 'limitation')?.paragraphs.join(' ') ?? '';

  assert.match(pairText, /The combination of Directive and Reflective creates a pattern where/);
  assert.doesNotMatch(pairText, /Directive \+ Structured/);
  assert.match(limitationText, /When Directive dominates without enough Reflective/);
  assert.match(limitationText, /Reflective range is materially underplayed/);
});
