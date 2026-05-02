import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';

import { AdminAssessmentAuthoringProvider } from '@/components/admin/admin-assessment-authoring-context';
import { SingleDomainNarrativeBuilder } from '@/components/admin/assessments/single-domain-narrative-builder';
import { buildSingleDomainNarrativeBuilderModel } from '@/lib/assessment-language/single-domain-builder-mappers';
import { buildSingleDomainLanguageValidation } from '@/lib/admin/single-domain-structural-validation';
import type { AdminAssessmentDetailViewModel } from '@/lib/server/admin-assessment-detail';
import type { SingleDomainLanguageBundle } from '@/lib/server/assessment-version-single-domain-language-types';

function createLanguageBundle(overrides?: Partial<SingleDomainLanguageBundle>): SingleDomainLanguageBundle {
  return {
    DOMAIN_FRAMING: [],
    HERO_PAIRS: [],
    DRIVER_CLAIMS: [],
    SIGNAL_CHAPTERS: [],
    BALANCING_SECTIONS: [],
    PAIR_SUMMARIES: [],
    APPLICATION_STATEMENTS: [],
    ...overrides,
  };
}

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
          signalKey: 'supportive',
          label: 'Supportive',
          description: null,
          orderIndex: 1,
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
        signalCount: 2,
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

test('narrative builder mapper preserves the locked six-section order from Task 1', () => {
  const assessment = createAssessment(
    createLanguageBundle({
      DOMAIN_FRAMING: [
        {
          domain_key: 'leadership-style',
          section_title: 'Leadership style',
          intro_paragraph: 'Intro',
          meaning_paragraph: 'Meaning',
          bridge_to_signals: 'Bridge',
          blueprint_context_line: 'Blueprint',
        },
      ],
      HERO_PAIRS: [
        {
          pair_key: 'directive_supportive',
          hero_headline: 'Hero',
          hero_subheadline: 'Subheadline',
          hero_opening: 'Opening',
          hero_strength_paragraph: 'Strength',
          hero_tension_paragraph: 'Tension',
          hero_close_paragraph: 'Close',
        },
      ],
      DRIVER_CLAIMS: [
        {
          domain_key: 'leadership-style',
          pair_key: 'directive_supportive',
          signal_key: 'directive',
          driver_role: 'primary_driver',
          claim_type: 'driver_primary',
          claim_text: 'Primary',
          materiality: 'core',
          priority: 1,
        },
        {
          domain_key: 'leadership-style',
          pair_key: 'directive_supportive',
          signal_key: 'supportive',
          driver_role: 'secondary_driver',
          claim_type: 'driver_secondary',
          claim_text: 'Secondary',
          materiality: 'core',
          priority: 2,
        },
        {
          domain_key: 'leadership-style',
          pair_key: 'directive_supportive',
          signal_key: 'directive',
          driver_role: 'supporting_context',
          claim_type: 'driver_supporting_context',
          claim_text: 'Supporting',
          materiality: 'supporting',
          priority: 3,
        },
        {
          domain_key: 'leadership-style',
          pair_key: 'directive_supportive',
          signal_key: 'supportive',
          driver_role: 'range_limitation',
          claim_type: 'driver_range_limitation',
          claim_text: 'Range',
          materiality: 'material_underplay',
          priority: 4,
        },
      ],
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
      BALANCING_SECTIONS: [
        {
          pair_key: 'directive_supportive',
          balancing_section_title: 'Limitation',
          current_pattern_paragraph: 'Current',
          practical_meaning_paragraph: 'Meaning',
          system_risk_paragraph: 'Risk',
          rebalance_intro: 'Rebalance',
          rebalance_action_1: 'Action 1',
          rebalance_action_2: 'Action 2',
          rebalance_action_3: 'Action 3',
        },
      ],
      PAIR_SUMMARIES: [
        {
          pair_key: 'directive_supportive',
          pair_section_title: 'Pair',
          pair_headline: 'Headline',
          pair_opening_paragraph: 'Opening',
          pair_strength_paragraph: 'Strength',
          pair_tension_paragraph: 'Tension',
          pair_close_paragraph: 'Close',
        },
      ],
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
    }),
  );

  const model = buildSingleDomainNarrativeBuilderModel(assessment);

  assert.deepEqual(
    model.sections.map((section) => section.key),
    ['intro', 'hero', 'drivers', 'pair', 'limitation', 'application'],
  );
  assert.equal(model.readiness.completeCount, 4);
  assert.equal(model.readiness.incompleteCount, 1);
  assert.equal(model.readiness.waitingCount, 1);
});

test('narrative builder renders the six locked sections, readiness summary, and section-specific role guidance', () => {
  const assessment = createAssessment(
    createLanguageBundle({
      DOMAIN_FRAMING: [
        {
          domain_key: 'leadership-style',
          section_title: 'Leadership style',
          intro_paragraph: 'Intro',
          meaning_paragraph: 'Meaning',
          bridge_to_signals: 'Bridge',
          blueprint_context_line: 'Blueprint',
        },
      ],
      HERO_PAIRS: [],
      DRIVER_CLAIMS: [],
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
      ],
      BALANCING_SECTIONS: [],
      PAIR_SUMMARIES: [],
      APPLICATION_STATEMENTS: [],
    }),
  );

  const markup = renderToStaticMarkup(
    <AdminAssessmentAuthoringProvider assessment={assessment}>
      <SingleDomainNarrativeBuilder />
    </AdminAssessmentAuthoringProvider>,
  );

  assert.match(markup, /Single-domain narrative/);
  assert.match(markup, /Narrative readiness/);
  assert.match(markup, /Sections complete/);
  assert.match(markup, /Sections incomplete/);
  assert.match(markup, /Section warnings/);
  assert.match(markup, /Blocking diagnostics/);
  assert.match(markup, /Locked six-section order/);
  assert.match(markup, /Intro/);
  assert.match(markup, /Hero/);
  assert.match(markup, /Drivers/);
  assert.match(markup, /Pair/);
  assert.match(markup, /Limitation/);
  assert.match(markup, /Application/);
  assert.match(markup, /What is this domain about\?/);
  assert.match(markup, /What is the defining pattern here\?/);
  assert.match(markup, /What is creating that pattern\?/);
  assert.match(markup, /How do the top two tendencies combine\?/);
  assert.match(markup, /Where does that pattern become costly or narrow\?/);
  assert.match(markup, /What should the user rely on, notice, and develop\?/);
  assert.match(markup, /primary_driver/);
  assert.match(markup, /secondary_driver/);
  assert.match(markup, /supporting_context/);
  assert.match(markup, /range_limitation/);
  assert.match(markup, /rely_on/);
  assert.match(markup, /notice/);
  assert.match(markup, /develop/);
  assert.match(markup, /pattern_key\|pair_key\|focus_area\|guidance_type\|driver_role/);
  assert.match(markup, /Expected total: 144 rows/);
  assert.match(markup, /domain_key \+ pattern_key \+ focus_area \+ guidance_type \+ driver_role/);
  assert.match(markup, /Pipe-delimited section import/);
  assert.match(markup, /Composer preview/);
  assert.match(markup, /Publish blockers/);
  assert.match(markup, /Intro import contract/);
  assert.doesNotMatch(markup, /SINGLE_DOMAIN_INTRO/);
  assert.match(markup, /single-domain-section-intro/);
  assert.match(markup, /single-domain-section-application/);
  assert.doesNotMatch(markup, /Domain framing/);
  assert.doesNotMatch(markup, /Hero pairs/);
  assert.doesNotMatch(markup, /Balancing sections/);

  assert.ok(markup.indexOf('single-domain-section-intro') < markup.indexOf('single-domain-section-hero'));
  assert.ok(markup.indexOf('single-domain-section-hero') < markup.indexOf('single-domain-section-drivers'));
  assert.ok(markup.indexOf('single-domain-section-drivers') < markup.indexOf('single-domain-section-pair'));
  assert.ok(markup.indexOf('single-domain-section-pair') < markup.indexOf('single-domain-section-limitation'));
  assert.ok(markup.indexOf('single-domain-section-limitation') < markup.indexOf('single-domain-section-application'));
});

test('narrative builder explains the no-draft live-version state once before section imports', () => {
  const assessment = createAssessment(
    createLanguageBundle({
      DOMAIN_FRAMING: [],
      HERO_PAIRS: [],
      DRIVER_CLAIMS: [],
      SIGNAL_CHAPTERS: [],
      BALANCING_SECTIONS: [],
      PAIR_SUMMARIES: [],
      APPLICATION_STATEMENTS: [],
    }),
  );
  assessment.latestDraftVersion = null;
  assessment.publishedVersion = {
    assessmentVersionId: 'version-live',
    versionTag: '2.00',
    status: 'published',
    publishedAt: '',
    questionCount: 24,
    createdAt: '',
    updatedAt: '',
  };

  const markup = renderToStaticMarkup(
    <AdminAssessmentAuthoringProvider assessment={assessment}>
      <SingleDomainNarrativeBuilder />
    </AdminAssessmentAuthoringProvider>,
  );

  assert.match(markup, /Authoring state/);
  assert.match(markup, /Current live version remains available/);
  assert.match(markup, /Current live version 2.00 remains available/);
  assert.match(markup, /No draft is currently in progress/);
  assert.match(markup, /language imports are disabled until a draft version is created/);
  assert.match(markup, /checks below describe what editable content will need before the next publish/);
  assert.match(markup, /Draft required\. See the authoring state above\./);
  assert.match(markup, /Draft required before section import\./);
  assert.doesNotMatch(markup, /Draft version required before this section can import/);
  assert.doesNotMatch(markup, /Create or load a draft version before importing section rows/);
});
