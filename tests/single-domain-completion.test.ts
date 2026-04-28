import test from 'node:test';
import assert from 'node:assert/strict';

import { createAssessmentAttemptLifecycleService } from '@/lib/server/assessment-attempt-lifecycle';
import { createAssessmentCompletionService } from '@/lib/server/assessment-completion-service';
import { createAssessmentRunnerService } from '@/lib/server/assessment-runner-service';
import {
  buildAssessmentWorkspaceViewModel,
  buildDashboardViewModel,
} from '@/lib/server/dashboard-workspace-view-model';
import {
  getExpectedDriverClaimTuples,
  getSingleDomainCanonicalPairKeys,
} from '@/lib/assessment-language/single-domain-canonical';
import { createResultReadModelService } from '@/lib/server/result-read-model';
import { buildSingleDomainResultPayload } from '@/lib/server/single-domain-completion';
import type { AssessmentCompletionPayload } from '@/lib/server/assessment-completion-types';
import { isSingleDomainResultPayload } from '@/lib/types/single-domain-result';
import type {
  ApplicationStatementsRow,
  BalancingSectionsRow,
  DriverClaimsRow,
  DomainFramingRow,
  HeroPairsRow,
  PairSummariesRow,
  SignalChaptersRow,
} from '@/lib/types/single-domain-language';

type AttemptState = {
  attemptId: string;
  userId: string;
  assessmentId: string;
  assessmentVersionId: string;
  assessmentKey: string;
  assessmentMode: 'single_domain' | 'multi_domain';
  versionTag: string;
  lifecycleStatus: 'IN_PROGRESS' | 'SUBMITTED' | 'FAILED' | 'RESULT_READY';
  startedAt: string;
  submittedAt: string | null;
  completedAt: string | null;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
};

type ResponseState = {
  responseId: string;
  attemptId: string;
  questionId: string;
  selectedOptionId: string;
  respondedAt: string;
  updatedAt: string;
};

type ResultState = {
  resultId: string;
  attemptId: string;
  assessmentId: string;
  assessmentVersionId: string;
  pipelineStatus: 'RUNNING' | 'COMPLETED' | 'FAILED';
  readinessStatus: 'PROCESSING' | 'READY' | 'FAILED';
  canonicalResultPayload: AssessmentCompletionPayload | null;
  failureReason: string | null;
  generatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type RuntimeFixture = {
  context: {
    assessment_id: string;
    assessment_key: string;
    assessment_title: string;
    assessment_description: string | null;
    assessment_version_id: string;
    assessment_version_tag: string;
    assessment_mode: string | null;
  };
  domains: Array<{
    domain_id: string;
    domain_key: string;
    domain_label: string;
    domain_description: string | null;
    domain_order_index: number;
  }>;
  signals: Array<{
    signal_id: string;
    signal_key: string;
    signal_label: string;
    signal_description: string | null;
    signal_order_index: number;
    domain_id: string;
  }>;
  questions: Array<{
    question_id: string;
    question_key: string;
    prompt: string;
    question_order_index: number;
    domain_id: string;
    domain_key: string;
  }>;
  options: Array<{
    option_id: string;
    option_key: string;
    option_label: string | null;
    option_text: string;
    option_order_index: number;
    question_id: string | null;
  }>;
  weights: Array<{
    option_signal_weight_id: string;
    option_id: string;
    signal_id: string | null;
    signal_key: string | null;
    weight: string;
    source_weight_key: string | null;
  }>;
  language: {
    DOMAIN_FRAMING: DomainFramingRow[];
    HERO_PAIRS: HeroPairsRow[];
    DRIVER_CLAIMS: DriverClaimsRow[];
    SIGNAL_CHAPTERS: SignalChaptersRow[];
    BALANCING_SECTIONS: BalancingSectionsRow[];
    PAIR_SUMMARIES: PairSummariesRow[];
    APPLICATION_STATEMENTS: ApplicationStatementsRow[];
  };
};

const PAIR_KEYS = [
  'vision_delivery',
  'vision_people',
  'vision_rigor',
  'delivery_people',
  'delivery_rigor',
  'people_rigor',
] as const;

const DRIVER_ROLES: DriverClaimsRow['driver_role'][] = [
  'primary_driver',
  'secondary_driver',
  'supporting_context',
  'range_limitation',
];

function buildRuntimeFixture(): RuntimeFixture {
  return {
    context: {
      assessment_id: 'assessment-1',
      assessment_key: 'role-focus',
      assessment_title: 'Role Focus',
      assessment_description: 'Single-domain assessment',
      assessment_version_id: 'version-1',
      assessment_version_tag: '1.0.0',
      assessment_mode: 'single_domain',
    },
    domains: [{
      domain_id: 'domain-1',
      domain_key: 'leadership-style',
      domain_label: 'Leadership style',
      domain_description: null,
      domain_order_index: 0,
    }],
    signals: ([
      ['signal-vision', 'vision', 'Vision', 0],
      ['signal-delivery', 'delivery', 'Delivery', 1],
      ['signal-people', 'people', 'People', 2],
      ['signal-rigor', 'rigor', 'Rigor', 3],
    ] as const).map(([id, key, label, orderIndex]) => ({
      signal_id: id,
      signal_key: key,
      signal_label: label,
      signal_description: null,
      signal_order_index: orderIndex,
      domain_id: 'domain-1',
    })),
    questions: ['q01', 'q02', 'q03', 'q04'].map((key, index) => ({
      question_id: `question-${index + 1}`,
      question_key: key,
      prompt: `Question ${index + 1}`,
      question_order_index: index,
      domain_id: 'domain-1',
      domain_key: 'leadership-style',
    })),
    options: ([
      ['option-1a', 'q01_a', 'question-1', 0],
      ['option-1b', 'q01_b', 'question-1', 1],
      ['option-2a', 'q02_a', 'question-2', 0],
      ['option-2b', 'q02_b', 'question-2', 1],
      ['option-3a', 'q03_a', 'question-3', 0],
      ['option-3b', 'q03_b', 'question-3', 1],
      ['option-4a', 'q04_a', 'question-4', 0],
      ['option-4b', 'q04_b', 'question-4', 1],
    ] as const).map(([id, key, questionId, orderIndex]) => ({
      option_id: id,
      option_key: key,
      option_label: key.endsWith('a') ? 'A' : 'B',
      option_text: `Text ${key}`,
      option_order_index: orderIndex,
      question_id: questionId,
    })),
    weights: [
      ['weight-1', 'option-1a', 'signal-vision', 'vision', '3'],
      ['weight-2', 'option-1a', 'signal-delivery', 'delivery', '2'],
      ['weight-3', 'option-1b', 'signal-rigor', 'rigor', '1'],
      ['weight-4', 'option-2a', 'signal-vision', 'vision', '2'],
      ['weight-5', 'option-2b', 'signal-people', 'people', '2'],
      ['weight-6', 'option-3a', 'signal-delivery', 'delivery', '3'],
      ['weight-7', 'option-3b', 'signal-rigor', 'rigor', '3'],
      ['weight-8', 'option-4a', 'signal-people', 'people', '3'],
      ['weight-9', 'option-4b', 'signal-rigor', 'rigor', '1'],
    ].map(([id, optionId, signalId, signalKey, weight]) => ({
      option_signal_weight_id: id,
      option_id: optionId,
      signal_id: signalId,
      signal_key: signalKey,
      weight,
      source_weight_key: `${optionId}|${signalKey}`,
    })),
    language: {
      DOMAIN_FRAMING: [{
        domain_key: 'leadership-style',
        section_title: 'Leadership style',
        intro_paragraph: 'This domain introduces how you tend to lead.',
        meaning_paragraph: 'It explains the practical meaning of the pattern.',
        bridge_to_signals: 'The ranked signals show how that pattern is distributed.',
        blueprint_context_line: 'This is the current blueprint context line.',
      }],
      HERO_PAIRS: PAIR_KEYS.map((pair_key) => ({
        pair_key,
        hero_headline: `Hero ${pair_key}`,
        hero_subheadline: `Subheadline ${pair_key}`,
        hero_opening: `Opening ${pair_key}`,
        hero_strength_paragraph: `Strength ${pair_key}`,
        hero_tension_paragraph: `Tension ${pair_key}`,
        hero_close_paragraph: `Close ${pair_key}`,
      })),
      DRIVER_CLAIMS: PAIR_KEYS.flatMap((pair_key) => (
        ['vision', 'delivery', 'people', 'rigor'].flatMap((signal_key) => (
          DRIVER_ROLES.map((driver_role, index) => ({
            domain_key: 'leadership-style',
            pair_key,
            signal_key,
            driver_role,
            claim_type: driver_role === 'primary_driver'
              ? 'driver_primary'
              : driver_role === 'secondary_driver'
                ? 'driver_secondary'
                : driver_role === 'supporting_context'
                  ? 'driver_supporting_context'
                  : 'driver_range_limitation',
            claim_text: `DRIVER_CLAIMS ${pair_key} ${signal_key} ${driver_role} ${index + 1}.`,
            materiality: driver_role === 'range_limitation'
              ? 'material_underplay'
              : driver_role === 'supporting_context'
                ? 'supporting'
                : 'core',
            priority: index + 1,
          }))
        ))
      )),
      SIGNAL_CHAPTERS: ['vision', 'delivery', 'people', 'rigor'].map((signal_key) => ({
        signal_key,
        position_primary_label: 'Primary',
        position_secondary_label: 'Secondary',
        position_supporting_label: 'Supporting',
        position_underplayed_label: 'Underplayed',
        chapter_intro_primary: `${signal_key} primary intro`,
        chapter_intro_secondary: `${signal_key} secondary intro`,
        chapter_intro_supporting: `${signal_key} supporting intro`,
        chapter_intro_underplayed: `${signal_key} underplayed intro`,
        chapter_how_it_shows_up: `${signal_key} shows up`,
        chapter_value_outcome: `${signal_key} outcome`,
        chapter_value_team_effect: `${signal_key} team effect`,
        chapter_risk_behaviour: `${signal_key} risk behaviour`,
        chapter_risk_impact: `${signal_key} risk impact`,
        chapter_development: `${signal_key} development`,
      })),
      BALANCING_SECTIONS: PAIR_KEYS.map((pair_key) => ({
        pair_key,
        balancing_section_title: `Balance ${pair_key}`,
        current_pattern_paragraph: `Current ${pair_key}`,
        practical_meaning_paragraph: `Meaning ${pair_key}`,
        system_risk_paragraph: `Risk ${pair_key}`,
        rebalance_intro: `Rebalance ${pair_key}`,
        rebalance_action_1: `${pair_key} action 1`,
        rebalance_action_2: `${pair_key} action 2`,
        rebalance_action_3: `${pair_key} action 3`,
      })),
      PAIR_SUMMARIES: PAIR_KEYS.map((pair_key) => ({
        pair_key,
        pair_section_title: `Section ${pair_key}`,
        pair_headline: `Headline ${pair_key}`,
        pair_opening_paragraph: `Opening ${pair_key}`,
        pair_strength_paragraph: `Strength ${pair_key}`,
        pair_tension_paragraph: `Tension ${pair_key}`,
        pair_close_paragraph: `Close ${pair_key}`,
      })),
      APPLICATION_STATEMENTS: [
        ['vision', 'Vision'],
        ['delivery', 'Delivery'],
        ['people', 'People'],
        ['rigor', 'Rigor'],
      ].map(([signal_key, label]) => ({
        signal_key,
        strength_statement_1: `${label} strength 1`,
        strength_statement_2: `${label} strength 2`,
        watchout_statement_1: `${label} watchout 1`,
        watchout_statement_2: `${label} watchout 2`,
        development_statement_1: `${label} development 1`,
        development_statement_2: `${label} development 2`,
      })),
    },
  };
}

function buildResponseSet(includeQuestion4 = true) {
  return {
    attemptId: 'attempt-1',
    assessmentKey: 'role-focus',
    versionTag: '1.0.0',
    status: 'submitted' as const,
    submittedAt: '2026-04-12T10:00:00.000Z',
    responsesByQuestionId: {
      'question-1': {
        responseId: 'response-1',
        attemptId: 'attempt-1',
        questionId: 'question-1',
        value: { selectedOptionId: 'option-1a' },
        updatedAt: '2026-04-12T09:57:00.000Z',
      },
      'question-2': {
        responseId: 'response-2',
        attemptId: 'attempt-1',
        questionId: 'question-2',
        value: { selectedOptionId: 'option-2a' },
        updatedAt: '2026-04-12T09:58:00.000Z',
      },
      'question-3': {
        responseId: 'response-3',
        attemptId: 'attempt-1',
        questionId: 'question-3',
        value: { selectedOptionId: 'option-3a' },
        updatedAt: '2026-04-12T09:59:00.000Z',
      },
      ...(includeQuestion4
        ? {
            'question-4': {
              responseId: 'response-4',
              attemptId: 'attempt-1',
              questionId: 'question-4',
              value: { selectedOptionId: 'option-4a' },
              updatedAt: '2026-04-12T10:00:00.000Z',
            },
          }
        : {}),
    },
  };
}

function createDb(config?: {
  attempts?: AttemptState[];
  responses?: ResponseState[];
  results?: ResultState[];
}) {
  const runtime = buildRuntimeFixture();
  const attempts = [...(config?.attempts ?? [{
    attemptId: 'attempt-1',
    userId: 'user-1',
    assessmentId: 'assessment-1',
    assessmentVersionId: 'version-1',
    assessmentKey: 'role-focus',
    assessmentMode: 'single_domain' as const,
    versionTag: '1.0.0',
    lifecycleStatus: 'IN_PROGRESS' as const,
    startedAt: '2026-04-12T09:50:00.000Z',
    submittedAt: null,
    completedAt: null,
    lastActivityAt: '2026-04-12T10:00:00.000Z',
    createdAt: '2026-04-12T09:50:00.000Z',
    updatedAt: '2026-04-12T10:00:00.000Z',
  }])];
  const responses = [...(config?.responses ?? [
    { responseId: 'response-1', attemptId: 'attempt-1', questionId: 'question-1', selectedOptionId: 'option-1a', respondedAt: '2026-04-12T09:57:00.000Z', updatedAt: '2026-04-12T09:57:00.000Z' },
    { responseId: 'response-2', attemptId: 'attempt-1', questionId: 'question-2', selectedOptionId: 'option-2a', respondedAt: '2026-04-12T09:58:00.000Z', updatedAt: '2026-04-12T09:58:00.000Z' },
    { responseId: 'response-3', attemptId: 'attempt-1', questionId: 'question-3', selectedOptionId: 'option-3a', respondedAt: '2026-04-12T09:59:00.000Z', updatedAt: '2026-04-12T09:59:00.000Z' },
    { responseId: 'response-4', attemptId: 'attempt-1', questionId: 'question-4', selectedOptionId: 'option-4a', respondedAt: '2026-04-12T10:00:00.000Z', updatedAt: '2026-04-12T10:00:00.000Z' },
  ])];
  const results = [...(config?.results ?? [])];
  let attemptSequence = attempts.length + 1;
  let resultSequence = results.length + 1;

  return {
    attempts,
    responses,
    results,
    mutateRuntimeDefinition() {
      runtime.signals[0]!.signal_label = 'Changed Vision';
      runtime.options[0]!.option_text = 'Changed answer text';
      runtime.weights[0]!.weight = '99';
      runtime.language.HERO_PAIRS[0]!.hero_headline = 'Changed hero headline';
    },
    reverseTopPairLanguageKeys() {
      runtime.language.HERO_PAIRS
        .filter((row) => row.pair_key === 'vision_delivery')
        .forEach((row) => {
          row.pair_key = 'delivery_vision';
        });
      runtime.language.BALANCING_SECTIONS
        .filter((row) => row.pair_key === 'vision_delivery')
        .forEach((row) => {
          row.pair_key = 'delivery_vision';
        });
      runtime.language.PAIR_SUMMARIES
        .filter((row) => row.pair_key === 'vision_delivery')
        .forEach((row) => {
          row.pair_key = 'delivery_vision';
        });
    },
    removePairLanguage(pairKey: string) {
      runtime.language.HERO_PAIRS = runtime.language.HERO_PAIRS.filter((row) => row.pair_key !== pairKey);
      runtime.language.BALANCING_SECTIONS = runtime.language.BALANCING_SECTIONS.filter((row) => row.pair_key !== pairKey);
      runtime.language.PAIR_SUMMARIES = runtime.language.PAIR_SUMMARIES.filter((row) => row.pair_key !== pairKey);
    },
    cloneTopPairLanguageAcrossPairs() {
      const hero = runtime.language.HERO_PAIRS.find((row) => row.pair_key === 'vision_delivery')!;
      const balancing = runtime.language.BALANCING_SECTIONS.find((row) => row.pair_key === 'vision_delivery')!;
      const pairSummary = runtime.language.PAIR_SUMMARIES.find((row) => row.pair_key === 'vision_delivery')!;

      runtime.language.HERO_PAIRS = PAIR_KEYS.map((pair_key) => ({ ...hero, pair_key }));
      runtime.language.BALANCING_SECTIONS = PAIR_KEYS.map((pair_key) => ({ ...balancing, pair_key }));
      runtime.language.PAIR_SUMMARIES = PAIR_KEYS.map((pair_key) => ({ ...pairSummary, pair_key }));
    },
    blankPositionSpecificLanguageLikeSectionFirstImports() {
      runtime.language.SIGNAL_CHAPTERS.forEach((row) => {
        if (row.signal_key === 'vision') {
          row.chapter_intro_primary = '';
        }
        if (row.signal_key === 'delivery') {
          row.chapter_intro_secondary = '';
        }
        if (row.signal_key === 'people') {
          row.chapter_intro_supporting = '';
        }
        if (row.signal_key === 'rigor') {
          row.chapter_intro_underplayed = '';
          row.chapter_risk_behaviour = '';
          row.chapter_risk_impact = '';
          row.chapter_development = '';
        }
      });
      runtime.language.BALANCING_SECTIONS.forEach((row) => {
        row.system_risk_paragraph = '';
        row.rebalance_action_2 = '';
        row.rebalance_action_3 = '';
      });
    },
    useBlueprintSemanticFallbackFixture() {
      runtime.context.assessment_id = 'blueprint-assessment';
      runtime.context.assessment_key = 'blueprint-understand-how-you-lead';
      runtime.context.assessment_title = 'Blueprint - Understand how you lead';
      runtime.context.assessment_version_id = 'blueprint-version';
      runtime.domains[0]!.domain_key = 'leadership-approach';
      runtime.domains[0]!.domain_label = 'Leadership approach';
      runtime.signals = ([
        ['signal-process', 'process', 'Process', 0],
        ['signal-results', 'results', 'Results', 1],
        ['signal-people', 'people', 'People', 2],
        ['signal-vision', 'vision', 'Vision', 3],
      ] as const).map(([id, key, label, orderIndex]) => ({
        signal_id: id,
        signal_key: key,
        signal_label: label,
        signal_description: null,
        signal_order_index: orderIndex,
        domain_id: 'domain-1',
      }));
      runtime.weights = [
        ['weight-1', 'option-1a', 'signal-results', 'results', '3'],
        ['weight-2', 'option-1a', 'signal-process', 'process', '2'],
        ['weight-3', 'option-2a', 'signal-results', 'results', '3'],
        ['weight-4', 'option-2a', 'signal-process', 'process', '2'],
        ['weight-5', 'option-3a', 'signal-results', 'results', '2'],
        ['weight-6', 'option-3a', 'signal-process', 'process', '2'],
        ['weight-7', 'option-3a', 'signal-people', 'people', '2'],
        ['weight-8', 'option-4a', 'signal-results', 'results', '2'],
        ['weight-9', 'option-4a', 'signal-process', 'process', '2'],
        ['weight-10', 'option-4a', 'signal-people', 'people', '2'],
        ['weight-11', 'option-4a', 'signal-vision', 'vision', '2'],
        ['weight-12', 'option-1b', 'signal-vision', 'vision', '1'],
        ['weight-13', 'option-2b', 'signal-vision', 'vision', '1'],
        ['weight-14', 'option-3b', 'signal-vision', 'vision', '1'],
        ['weight-15', 'option-4b', 'signal-vision', 'vision', '1'],
      ].map(([id, optionId, signalId, signalKey, weight]) => ({
        option_signal_weight_id: id,
        option_id: optionId,
        signal_id: signalId,
        signal_key: signalKey,
        weight,
        source_weight_key: `${optionId}|${signalKey}`,
      }));

      const pairKeys = [
        'results_process',
        'results_vision',
        'results_people',
        'process_people',
        'process_vision',
        'vision_people',
      ];

      runtime.language.DOMAIN_FRAMING = [{
        domain_key: 'leadership-approach',
        section_title: 'Leadership approach',
        intro_paragraph: 'This domain introduces how you lead.',
        meaning_paragraph: 'It explains the practical meaning of the pattern.',
        bridge_to_signals: 'The ranked signals show how that pattern is distributed.',
        blueprint_context_line: 'This is the current blueprint context line.',
      }];
      runtime.language.HERO_PAIRS = pairKeys.map((pair_key) => ({
        pair_key,
        hero_headline: `Hero ${pair_key}`,
        hero_subheadline: `Subheadline ${pair_key}`,
        hero_opening: `Opening ${pair_key}`,
        hero_strength_paragraph: `Strength ${pair_key}`,
        hero_tension_paragraph: `Tension ${pair_key}`,
        hero_close_paragraph: `Close ${pair_key}`,
      }));
      runtime.language.PAIR_SUMMARIES = pairKeys.map((pair_key) => ({
        pair_key,
        pair_section_title: `Section ${pair_key}`,
        pair_headline: `Headline ${pair_key}`,
        pair_opening_paragraph: `Opening ${pair_key}`,
        pair_strength_paragraph: `Strength ${pair_key}`,
        pair_tension_paragraph: `Tension ${pair_key}`,
        pair_close_paragraph: `Close ${pair_key}`,
      }));
      runtime.language.BALANCING_SECTIONS = pairKeys.map((pair_key) => ({
        pair_key,
        balancing_section_title: pair_key === 'results_process'
          ? 'When structure outruns commitment'
          : `Balance ${pair_key}`,
        current_pattern_paragraph: pair_key === 'results_process'
          ? 'The cost of this pattern is that structure and outcomes can receive more attention than how people are responding.'
          : `Current ${pair_key}`,
        practical_meaning_paragraph: pair_key === 'results_process'
          ? 'The limitation appears when the situation needs more patience, listening, or a better read of how people feel about the work.'
          : `Meaning ${pair_key}`,
        system_risk_paragraph: pair_key === 'results_process'
          ? 'The People signal is therefore the missing range to develop around this result.'
          : `Risk ${pair_key}`,
        rebalance_intro: pair_key === 'results_process'
          ? 'people: The People signal is therefore the missing range to develop around this result.'
          : `Rebalance ${pair_key}`,
        rebalance_action_1: pair_key === 'results_process'
          ? 'Bring people into the thinking before the plan is fixed.'
          : `${pair_key} action 1`,
        rebalance_action_2: '',
        rebalance_action_3: '',
      }));
      runtime.language.SIGNAL_CHAPTERS = [
        {
          signal_key: 'results',
          position_primary_label: 'Primary driver',
          position_secondary_label: 'Secondary driver',
          position_supporting_label: 'Supporting context',
          position_underplayed_label: 'Range limitation',
          chapter_intro_primary: '',
          chapter_intro_secondary: 'Results strengthens this pattern by adding urgency and focus.',
          chapter_intro_supporting: 'Results sits behind the pattern as a supporting influence.',
          chapter_intro_underplayed: 'Results is the weaker range in this result.',
          chapter_how_it_shows_up: 'Results strengthens this pattern by adding urgency and focus.',
          chapter_value_outcome: 'Results helps keep work moving and outcome focused.',
          chapter_value_team_effect: 'Results helps others understand what progress requires.',
          chapter_risk_behaviour: 'Results is the weaker range in this result.',
          chapter_risk_impact: 'Results is the weaker range in this result.',
          chapter_development: 'Results is the weaker range in this result.',
        },
        {
          signal_key: 'process',
          position_primary_label: 'Primary driver',
          position_secondary_label: 'Secondary driver',
          position_supporting_label: 'Supporting context',
          position_underplayed_label: 'Range limitation',
          chapter_intro_primary: 'Process is the main driver of this pattern.',
          chapter_intro_secondary: '',
          chapter_intro_supporting: 'Process sits behind the pattern as a supporting influence.',
          chapter_intro_underplayed: 'Process is the weaker range in this result.',
          chapter_how_it_shows_up: 'Process is the main driver of this pattern.',
          chapter_value_outcome: '',
          chapter_value_team_effect: '',
          chapter_risk_behaviour: 'Process is the weaker range in this result.',
          chapter_risk_impact: 'Process is the weaker range in this result.',
          chapter_development: 'Process is the weaker range in this result.',
        },
        {
          signal_key: 'people',
          position_primary_label: 'Primary driver',
          position_secondary_label: 'Secondary driver',
          position_supporting_label: 'Supporting context',
          position_underplayed_label: 'Range limitation',
          chapter_intro_primary: 'People is the main driver of this pattern.',
          chapter_intro_secondary: 'People strengthens this pattern by shaping engagement.',
          chapter_intro_supporting: '',
          chapter_intro_underplayed: 'People is the weaker range in this result.',
          chapter_how_it_shows_up: 'People is the main driver of this pattern.',
          chapter_value_outcome: '',
          chapter_value_team_effect: '',
          chapter_risk_behaviour: 'People is the weaker range in this result.',
          chapter_risk_impact: 'People is the weaker range in this result.',
          chapter_development: 'People is the weaker range in this result.',
        },
        {
          signal_key: 'vision',
          position_primary_label: 'Primary driver',
          position_secondary_label: 'Secondary driver',
          position_supporting_label: 'Supporting context',
          position_underplayed_label: 'Range limitation',
          chapter_intro_primary: 'Vision is the main driver of this pattern.',
          chapter_intro_secondary: 'Vision strengthens this pattern by giving the work direction.',
          chapter_intro_supporting: 'Vision sits behind the pattern as a supporting influence.',
          chapter_intro_underplayed: '',
          chapter_how_it_shows_up: 'Vision is the main driver of this pattern.',
          chapter_value_outcome: '',
          chapter_value_team_effect: '',
          chapter_risk_behaviour: '',
          chapter_risk_impact: '',
          chapter_development: '',
        },
      ];
      runtime.language.APPLICATION_STATEMENTS = [
        ['results', 'Results'],
        ['process', 'Process'],
        ['people', 'People'],
        ['vision', 'Vision'],
      ].map(([signal_key, label]) => ({
        signal_key,
        strength_statement_1: `${label} strength 1`,
        strength_statement_2: `${label} strength 2`,
        watchout_statement_1: `${label} watchout 1`,
        watchout_statement_2: `${label} watchout 2`,
        development_statement_1: `${label} development 1`,
        development_statement_2: `${label} development 2`,
      }));
      runtime.language.DRIVER_CLAIMS = [];
    },
    useBlueprintPairScopedDriverClaims() {
      const signalKeys = ['process', 'results', 'people', 'vision'];
      const pairKeys = [...getSingleDomainCanonicalPairKeys(signalKeys)];

      runtime.language.DRIVER_CLAIMS = getExpectedDriverClaimTuples({
        domainKey: 'leadership-approach',
        signalKeys,
        pairKeys,
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
        claim_text: tuple.pairKey === 'results_process'
          ? tuple.driverRole === 'primary_driver'
            ? 'DRIVER_CLAIMS results_process results primary text.'
            : tuple.driverRole === 'secondary_driver'
              ? 'DRIVER_CLAIMS results_process process secondary text.'
              : tuple.driverRole === 'supporting_context'
                ? 'DRIVER_CLAIMS results_process people supporting text.'
                : 'DRIVER_CLAIMS results_process vision range text.'
          : `DRIVER_CLAIMS ${tuple.pairKey} ${tuple.signalKey} ${tuple.driverRole}.`,
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
    },
    db: {
      async query<T>(text: string, params?: unknown[]) {
        const sql = text.replace(/\s+/g, ' ').trim();

        if (sql.includes('a.title AS assessment_title') && sql.includes("WHERE av.lifecycle_status = 'PUBLISHED'")) {
          return {
            rows: ([{
              assessment_id: runtime.context.assessment_id,
              assessment_key: runtime.context.assessment_key,
              assessment_title: runtime.context.assessment_title,
              assessment_description: runtime.context.assessment_description,
              assessment_version_id: runtime.context.assessment_version_id,
              version_tag: runtime.context.assessment_version_tag,
              published_at: '2026-04-12T09:45:00.000Z',
              question_count: String(runtime.questions.length),
            }] as unknown[]) as T[],
          };
        }

        if (sql.includes('FROM assessments a') && sql.includes("WHERE a.assessment_key = $1") && sql.includes("av.lifecycle_status = 'PUBLISHED'")) {
          if ((params?.[0] as string) !== runtime.context.assessment_key) {
            return { rows: [] as T[] };
          }

          return {
            rows: ([{
              assessment_id: runtime.context.assessment_id,
              assessment_key: runtime.context.assessment_key,
              assessment_version_id: runtime.context.assessment_version_id,
              version_tag: runtime.context.assessment_version_tag,
            }] as unknown[]) as T[],
          };
        }

        if (sql.includes('FROM attempts') && sql.includes("AND lifecycle_status = 'IN_PROGRESS'")) {
          const [userId, assessmentId] = params as [string, string];
          const row = attempts
            .filter((attempt) => attempt.userId === userId && attempt.assessmentId === assessmentId && attempt.lifecycleStatus === 'IN_PROGRESS')
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.attemptId.localeCompare(left.attemptId))[0];

          return {
            rows: (row
              ? [({
                  attempt_id: row.attemptId,
                  user_id: row.userId,
                  assessment_id: row.assessmentId,
                  assessment_version_id: row.assessmentVersionId,
                  lifecycle_status: row.lifecycleStatus,
                  started_at: row.startedAt,
                  submitted_at: row.submittedAt,
                  completed_at: row.completedAt,
                  last_activity_at: row.lastActivityAt,
                  created_at: row.createdAt,
                  updated_at: row.updatedAt,
                } as unknown)]
              : []) as T[],
          };
        }

        if (sql.includes('FROM attempts') && sql.includes('WHERE user_id = $1') && sql.includes('assessment_id = $2') && !sql.includes("AND lifecycle_status = 'IN_PROGRESS'")) {
          const [userId, assessmentId] = params as [string, string];
          const row = attempts
            .filter((attempt) => attempt.userId === userId && attempt.assessmentId === assessmentId)
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.attemptId.localeCompare(left.attemptId))[0];

          return {
            rows: (row
              ? [({
                  attempt_id: row.attemptId,
                  user_id: row.userId,
                  assessment_id: row.assessmentId,
                  assessment_version_id: row.assessmentVersionId,
                  lifecycle_status: row.lifecycleStatus,
                  started_at: row.startedAt,
                  submitted_at: row.submittedAt,
                  completed_at: row.completedAt,
                  last_activity_at: row.lastActivityAt,
                  created_at: row.createdAt,
                  updated_at: row.updatedAt,
                } as unknown)]
              : []) as T[],
          };
        }

        if (sql.includes('INSERT INTO attempts') && sql.includes("VALUES ($1, $2, $3, 'IN_PROGRESS')")) {
          const [userId, assessmentId, assessmentVersionId] = params as [string, string, string];
          const attemptId = `attempt-${attemptSequence++}`;
          const row: AttemptState = {
            attemptId,
            userId,
            assessmentId,
            assessmentVersionId,
            assessmentKey: runtime.context.assessment_key,
            assessmentMode: 'single_domain',
            versionTag: runtime.context.assessment_version_tag,
            lifecycleStatus: 'IN_PROGRESS',
            startedAt: '2026-04-12T09:50:00.000Z',
            submittedAt: null,
            completedAt: null,
            lastActivityAt: '2026-04-12T09:50:00.000Z',
            createdAt: '2026-04-12T09:50:00.000Z',
            updatedAt: '2026-04-12T09:50:00.000Z',
          };
          attempts.push(row);

          return {
            rows: ([{
              attempt_id: row.attemptId,
              user_id: row.userId,
              assessment_id: row.assessmentId,
              assessment_version_id: row.assessmentVersionId,
              lifecycle_status: row.lifecycleStatus,
              started_at: row.startedAt,
              submitted_at: row.submittedAt,
              completed_at: row.completedAt,
              last_activity_at: row.lastActivityAt,
              created_at: row.createdAt,
              updated_at: row.updatedAt,
            }] as unknown[]) as T[],
          };
        }

        if (sql.includes('COUNT(DISTINCT question_id) AS answered_questions')) {
          const answeredQuestions = new Set(
            responses
              .filter((row) => row.attemptId === (params?.[0] as string))
              .map((row) => row.questionId),
          ).size;

          return {
            rows: ([{ answered_questions: answeredQuestions }] as unknown[]) as T[],
          };
        }

        if (sql.includes('COUNT(*) AS total_questions') && sql.includes('FROM questions WHERE assessment_version_id = $1')) {
          return {
            rows: ([{ total_questions: runtime.questions.length }] as unknown[]) as T[],
          };
        }

        if (sql.includes('FROM attempts t') && sql.includes('WHERE t.id = $1')) {
          const row = attempts.find((attempt) => attempt.attemptId === (params?.[0] as string));
          return {
            rows: (row
              ? [{
                  attempt_id: row.attemptId,
                  user_id: row.userId,
                  assessment_id: row.assessmentId,
                  assessment_version_id: row.assessmentVersionId,
                  assessment_key: row.assessmentKey,
                  assessment_mode: row.assessmentMode,
                  version_tag: row.versionTag,
                  lifecycle_status: row.lifecycleStatus,
                  started_at: row.startedAt,
                  submitted_at: row.submittedAt,
                  completed_at: row.completedAt,
                  last_activity_at: row.lastActivityAt,
                  created_at: row.createdAt,
                  updated_at: row.updatedAt,
                }]
              : []) as T[],
          };
        }

        if (sql.includes('FROM questions q') && sql.includes('INNER JOIN domains d ON d.id = q.domain_id') && sql.includes('INNER JOIN options o ON o.question_id = q.id')) {
          const rows = runtime.questions.flatMap((question) => {
            const domain = runtime.domains.find((entry) => entry.domain_id === question.domain_id)!;
            return runtime.options
              .filter((option) => option.question_id === question.question_id)
              .sort((left, right) => left.option_order_index - right.option_order_index || left.option_id.localeCompare(right.option_id))
              .map((option) => ({
                question_id: question.question_id,
                question_key: question.question_key,
                prompt: question.prompt,
                question_order_index: question.question_order_index,
                domain_title: domain.domain_label,
                option_id: option.option_id,
                option_key: option.option_key,
                option_label: option.option_label,
                option_text: option.option_text,
                option_order_index: option.option_order_index,
              }));
          });

          return { rows: rows as T[] };
        }

        if (sql.includes('FROM responses') && sql.includes('WHERE attempt_id = $1') && sql.includes('selected_option_id') && !sql.includes('SELECT DISTINCT ON')) {
          return {
            rows: responses
              .filter((row) => row.attemptId === (params?.[0] as string))
              .map((row) => ({
                question_id: row.questionId,
                selected_option_id: row.selectedOptionId,
              })) as T[],
          };
        }

        if (sql.includes('COALESCE(r.answered_questions, 0) AS answered_questions')) {
          const [attemptId] = params as [string, string];
          const answeredQuestions = responses.filter((row) => row.attemptId === attemptId).length;
          return {
            rows: ([{
              answered_questions: answeredQuestions,
              total_questions: runtime.questions.length,
            }] as unknown[]) as T[],
          };
        }

        if (sql.includes('SELECT 1 AS valid_row')) {
          const [, questionId, selectedOptionId] = params as [string, string, string];
          const valid = runtime.options.some((option) => option.question_id === questionId && option.option_id === selectedOptionId);
          return {
            rows: (valid ? ([{ valid_row: 1 }] as unknown[]) : []) as T[],
          };
        }

        if (sql.includes('INSERT INTO responses') && sql.includes('ON CONFLICT (attempt_id, question_id) DO UPDATE')) {
          const [attemptId, questionId, selectedOptionId] = params as [string, string, string];
          const existing = responses.find((row) => row.attemptId === attemptId && row.questionId === questionId);
          if (existing) {
            existing.selectedOptionId = selectedOptionId;
            existing.updatedAt = '2026-04-12T10:00:00.000Z';
          } else {
            responses.push({
              responseId: `response-${responses.length + 1}`,
              attemptId,
              questionId,
              selectedOptionId,
              respondedAt: '2026-04-12T10:00:00.000Z',
              updatedAt: '2026-04-12T10:00:00.000Z',
            });
          }

          return { rows: [] as T[] };
        }

        if (sql.includes('UPDATE attempts') && sql.includes('last_activity_at = NOW()') && !sql.includes('lifecycle_status =')) {
          const attempt = attempts.find((entry) => entry.attemptId === (params?.[0] as string));
          if (attempt) {
            attempt.lastActivityAt = '2026-04-12T10:00:00.000Z';
            attempt.updatedAt = '2026-04-12T10:00:00.000Z';
          }
          return { rows: [] as T[] };
        }

        if (sql.includes('FROM results WHERE attempt_id = $1')) {
          const row = results.find((result) => result.attemptId === (params?.[0] as string));
          return {
            rows: (row
              ? [{
                  result_id: row.resultId,
                  attempt_id: row.attemptId,
                  pipeline_status: row.pipelineStatus,
                  readiness_status: row.readinessStatus,
                  generated_at: row.generatedAt,
                  failure_reason: row.failureReason,
                  has_canonical_result_payload: row.canonicalResultPayload !== null,
                  canonical_result_payload: row.canonicalResultPayload,
                  created_at: row.createdAt,
                  updated_at: row.updatedAt,
                }]
              : []) as T[],
          };
        }

        if (sql.includes('SELECT DISTINCT ON (r.question_id)')) {
          return {
            rows: responses.map((row) => ({
              response_id: row.responseId,
              attempt_id: row.attemptId,
              question_id: row.questionId,
              selected_option_id: row.selectedOptionId,
              responded_at: row.respondedAt,
              updated_at: row.updatedAt,
            })) as T[],
          };
        }

        if (sql.includes("lifecycle_status = 'SUBMITTED'")) {
          const attempt = attempts.find((entry) => entry.attemptId === (params?.[0] as string));
          if (attempt) {
            attempt.lifecycleStatus = 'SUBMITTED';
            attempt.submittedAt = attempt.submittedAt ?? '2026-04-12T10:00:00.000Z';
            attempt.completedAt = attempt.completedAt ?? '2026-04-12T10:00:00.000Z';
          }
          return { rows: [] as T[] };
        }

        if (sql.includes("lifecycle_status = 'RESULT_READY'")) {
          const attempt = attempts.find((entry) => entry.attemptId === (params?.[0] as string));
          if (attempt) {
            attempt.lifecycleStatus = 'RESULT_READY';
            attempt.completedAt = '2026-04-12T10:00:00.000Z';
          }
          return { rows: [] as T[] };
        }

        if (sql.includes("lifecycle_status = 'FAILED'")) {
          const attempt = attempts.find((entry) => entry.attemptId === (params?.[0] as string));
          if (attempt) {
            attempt.lifecycleStatus = 'FAILED';
            attempt.completedAt = '2026-04-12T10:00:00.000Z';
          }
          return { rows: [] as T[] };
        }

        if (sql.includes("'RUNNING', 'PROCESSING'")) {
          const [attemptId, assessmentId, assessmentVersionId] = params as [string, string, string];
          const row = {
            resultId: `result-${resultSequence++}`,
            attemptId,
            assessmentId,
            assessmentVersionId,
            pipelineStatus: 'RUNNING' as const,
            readinessStatus: 'PROCESSING' as const,
            canonicalResultPayload: null,
            failureReason: null,
            generatedAt: null,
            createdAt: '2026-04-12T10:00:00.000Z',
            updatedAt: '2026-04-12T10:00:00.000Z',
          };
          results.splice(0, results.length, row);
          return { rows: ([{ result_id: row.resultId }] as unknown[]) as T[] };
        }

        if (sql.includes("'COMPLETED', 'READY'")) {
          const payload = JSON.parse((params as [string, string, string, string])[3]) as AssessmentCompletionPayload;
          const current = results[0]!;
          current.pipelineStatus = 'COMPLETED';
          current.readinessStatus = 'READY';
          current.canonicalResultPayload = payload;
          current.failureReason = null;
          current.generatedAt = '2026-04-12T10:00:00.000Z';
          return { rows: ([{ result_id: current.resultId }] as unknown[]) as T[] };
        }

        if (sql.includes("'FAILED', 'FAILED'")) {
          const current = results[0]!;
          current.pipelineStatus = 'FAILED';
          current.readinessStatus = 'FAILED';
          current.canonicalResultPayload = null;
          current.failureReason = (params as [string, string, string, string])[3];
          return { rows: ([{ result_id: current.resultId }] as unknown[]) as T[] };
        }

        if (sql.includes('FROM assessment_versions av INNER JOIN assessments a ON a.id = av.assessment_id WHERE av.id = $1')) {
          return { rows: [runtime.context] as T[] };
        }

        if (sql.includes('FROM domains WHERE assessment_version_id = $1')) {
          return { rows: runtime.domains as T[] };
        }

        if (sql.includes('FROM signals s WHERE s.assessment_version_id = $1')) {
          return { rows: runtime.signals as T[] };
        }

        if (sql.includes('FROM questions q LEFT JOIN domains d ON d.id = q.domain_id')) {
          return { rows: runtime.questions as T[] };
        }

        if (sql.includes('FROM options o WHERE o.assessment_version_id = $1')) {
          return { rows: runtime.options as T[] };
        }

        if (sql.includes('FROM option_signal_weights osw INNER JOIN options o ON o.id = osw.option_id LEFT JOIN signals s ON s.id = osw.signal_id')) {
          return { rows: runtime.weights as T[] };
        }

        if (sql.includes('FROM assessment_version_single_domain_framing')) {
          return { rows: runtime.language.DOMAIN_FRAMING as T[] };
        }

        if (sql.includes('FROM assessment_version_single_domain_hero_pairs')) {
          return { rows: runtime.language.HERO_PAIRS as T[] };
        }

        if (sql.includes('FROM assessment_version_single_domain_driver_claims')) {
          return { rows: runtime.language.DRIVER_CLAIMS as T[] };
        }

        if (sql.includes('FROM assessment_version_single_domain_signal_chapters')) {
          return { rows: runtime.language.SIGNAL_CHAPTERS as T[] };
        }

        if (sql.includes('FROM assessment_version_single_domain_balancing_sections')) {
          return { rows: runtime.language.BALANCING_SECTIONS as T[] };
        }

        if (sql.includes('FROM assessment_version_single_domain_pair_summaries')) {
          return { rows: runtime.language.PAIR_SUMMARIES as T[] };
        }

        if (sql.includes('FROM assessment_version_single_domain_application_statements')) {
          return { rows: runtime.language.APPLICATION_STATEMENTS as T[] };
        }

        if (sql.includes('ORDER BY COALESCE(r.generated_at, r.created_at) DESC, r.id DESC')) {
          return {
            rows: results
              .filter((row) => row.readinessStatus === 'READY')
              .map((row) => ({
                result_id: row.resultId,
                attempt_id: row.attemptId,
                assessment_id: row.assessmentId,
                assessment_key: 'role-focus',
                assessment_mode: 'single_domain',
                assessment_title: 'Role Focus',
                version_tag: '1.0.0',
                readiness_status: row.readinessStatus,
                generated_at: row.generatedAt,
                created_at: row.createdAt,
                canonical_result_payload: row.canonicalResultPayload,
              })) as T[],
          };
        }

        if (sql.includes('WHERE r.id = $1')) {
          const row = results.find((entry) => entry.resultId === (params?.[0] as string));
          return {
            rows: (row
              ? [{
                  result_id: row.resultId,
                  attempt_id: row.attemptId,
                  assessment_id: row.assessmentId,
                  assessment_key: 'role-focus',
                  assessment_mode: 'single_domain',
                  assessment_title: 'Role Focus',
                  version_tag: '1.0.0',
                  readiness_status: row.readinessStatus,
                  generated_at: row.generatedAt,
                  created_at: row.createdAt,
                  canonical_result_payload: row.canonicalResultPayload,
                }]
              : []) as T[],
          };
        }

        throw new Error(`Unhandled SQL in single-domain completion test: ${sql}`);
      },
    },
  };
}

test('single-domain payload assembles deterministically from authored runtime data', async () => {
  const harness = createDb();
  const payload = await buildSingleDomainResultPayload({
    db: harness.db,
    assessmentVersionId: 'version-1',
    responses: buildResponseSet(),
  });

  assert.equal(payload.metadata.mode, 'single_domain');
  assert.equal(payload.diagnostics.topPair, 'vision_delivery');
  assert.deepEqual(payload.signals.map((signal) => signal.signal_key), ['vision', 'delivery', 'people', 'rigor']);
  assert.deepEqual(payload.signals.map((signal) => signal.raw_score), [5, 5, 3, 0]);
  assert.deepEqual(payload.signals.map((signal) => signal.position), ['primary', 'secondary', 'supporting', 'underplayed']);
  assert.equal(payload.intro.section_title, 'Leadership style');
  assert.equal(payload.hero.hero_headline, 'Hero vision_delivery');
  assert.equal(payload.balancing.pair_key, 'vision_delivery');
  assert.equal(payload.pairSummary.pair_headline, 'Headline vision_delivery');
  assert.deepEqual(payload.application.strengths.map((item) => item.statement), ['Vision strength 1', 'Delivery strength 2', 'People strength 2']);
  assert.deepEqual(payload.application.watchouts.map((item) => item.statement), ['Vision watchout 1', 'Delivery watchout 2', 'Rigor watchout 2']);
  assert.deepEqual(payload.application.developmentFocus.map((item) => item.statement), ['Rigor development 1', 'People development 2', 'Delivery development 2']);
});

test('single-domain payload rejects reversed pair language rows for the active canonical pair key', async () => {
  const harness = createDb();
  harness.reverseTopPairLanguageKeys();

  await assert.rejects(
    () => buildSingleDomainResultPayload({
      db: harness.db,
      assessmentVersionId: 'version-1',
      responses: buildResponseSet(),
    }),
    /Missing canonical HERO_PAIRS row for pair "vision_delivery"/i,
  );
});

test('single-domain payload fails when active pair language is missing', async () => {
  const harness = createDb();
  harness.removePairLanguage('vision_delivery');

  await assert.rejects(
    () => buildSingleDomainResultPayload({
      db: harness.db,
      assessmentVersionId: 'version-1',
      responses: buildResponseSet(),
    }),
    /Missing canonical HERO_PAIRS row for pair "vision_delivery"/i,
  );
});

test('single-domain payload maps sparse section-first language into required payload fields', async () => {
  const harness = createDb();
  harness.blankPositionSpecificLanguageLikeSectionFirstImports();

  const payload = await buildSingleDomainResultPayload({
    db: harness.db,
    assessmentVersionId: 'version-1',
    responses: buildResponseSet(),
  });

  assert.equal(isSingleDomainResultPayload(payload), true);
  assert.equal(payload.signals[0]?.signal_key, 'vision');
  assert.equal(payload.signals[0]?.chapter_intro, 'DRIVER_CLAIMS vision_delivery vision primary_driver 1.');
  assert.equal(payload.signals[1]?.signal_key, 'delivery');
  assert.equal(payload.signals[1]?.chapter_intro, 'DRIVER_CLAIMS vision_delivery delivery secondary_driver 2.');
  assert.equal(payload.signals[2]?.signal_key, 'people');
  assert.equal(payload.signals[2]?.chapter_intro, 'DRIVER_CLAIMS vision_delivery people supporting_context 3.');
  assert.equal(payload.signals[3]?.signal_key, 'rigor');
  assert.equal(payload.signals[3]?.chapter_intro, 'DRIVER_CLAIMS vision_delivery rigor range_limitation 4.');
  assert.equal(payload.signals[3]?.chapter_risk_impact, 'DRIVER_CLAIMS vision_delivery rigor range_limitation 4.');
  assert.equal(payload.balancing.system_risk_paragraph, 'Rebalance vision_delivery');
  assert.deepEqual(payload.balancing.rebalance_actions, [
    'vision_delivery action 1',
    'Rebalance vision_delivery',
    'Rebalance vision_delivery',
  ]);
});

test('single-domain completion fails when pair-scoped driver claims are missing', async () => {
  const harness = createDb();
  harness.useBlueprintSemanticFallbackFixture();

  await assert.rejects(
    () => buildSingleDomainResultPayload({
      db: harness.db,
      assessmentVersionId: 'blueprint-version',
      responses: buildResponseSet(),
    }),
    /DRIVER_CLAIMS should contain exactly one row for each exact runtime lookup tuple/i,
  );
});

test('single-domain completion resolves drivers from exact pair-scoped driver claims', async () => {
  const harness = createDb();
  harness.useBlueprintSemanticFallbackFixture();
  harness.useBlueprintPairScopedDriverClaims();

  const payload = await buildSingleDomainResultPayload({
    db: harness.db,
    assessmentVersionId: 'blueprint-version',
    responses: buildResponseSet(),
  });

  const signalText = (signalKey: string) => {
    const signal = payload.signals.find((entry) => entry.signal_key === signalKey);
    assert.ok(signal, `Expected signal ${signalKey}`);
    return signal.chapter_intro;
  };

  assert.equal(isSingleDomainResultPayload(payload), true);
  assert.equal(payload.diagnostics.topPair, 'results_process');
  assert.deepEqual(payload.signals.map((signal) => signal.signal_key), ['results', 'process', 'people', 'vision']);
  assert.deepEqual(payload.signals.map((signal) => signal.position), ['primary', 'secondary', 'supporting', 'underplayed']);
  assert.equal(signalText('results'), 'DRIVER_CLAIMS results_process results primary text.');
  assert.equal(signalText('process'), 'DRIVER_CLAIMS results_process process secondary text.');
  assert.equal(signalText('people'), 'DRIVER_CLAIMS results_process people supporting text.');
  assert.equal(signalText('vision'), 'DRIVER_CLAIMS results_process vision range text.');
  assert.equal(
    payload.diagnostics.warnings.some((warning) => warning.includes('single_domain_pair_driver_claim_missing')),
    false,
  );
  assert.equal(
    payload.diagnostics.warnings.filter((warning) => warning.includes('source=driver_claims')).length,
    4,
  );
  assert.equal(
    payload.signals.every((signal) => [
      signal.chapter_intro,
      signal.chapter_how_it_shows_up,
      signal.chapter_value_outcome,
      signal.chapter_value_team_effect,
      signal.chapter_risk_behaviour,
      signal.chapter_risk_impact,
      signal.chapter_development,
    ].every((value) => value.trim().length > 0)),
    true,
  );
});

test('single-domain completion fails without exact pair-scoped driver claims', async () => {
  const harness = createDb();
  harness.useBlueprintSemanticFallbackFixture();

  await assert.rejects(
    () => buildSingleDomainResultPayload({
      db: harness.db,
      assessmentVersionId: 'blueprint-version',
      responses: buildResponseSet(),
    }),
    /DRIVER_CLAIMS should contain exactly one row for each exact runtime lookup tuple/i,
  );
});

test('single-domain payload fails when canonical pair rows are cloned from a different pair', async () => {
  const harness = createDb();
  harness.cloneTopPairLanguageAcrossPairs();

  await assert.rejects(
    () => buildSingleDomainResultPayload({
      db: harness.db,
      assessmentVersionId: 'version-1',
      responses: {
        attemptId: 'attempt-1',
        assessmentKey: 'role-focus',
        versionTag: '1.0.0',
        status: 'submitted',
        submittedAt: '2026-04-12T10:00:00.000Z',
        responsesByQuestionId: {
          'question-1': { responseId: 'response-1', attemptId: 'attempt-1', questionId: 'question-1', value: { selectedOptionId: 'option-1b' }, updatedAt: '2026-04-12T09:57:00.000Z' },
          'question-2': { responseId: 'response-2', attemptId: 'attempt-1', questionId: 'question-2', value: { selectedOptionId: 'option-2b' }, updatedAt: '2026-04-12T09:58:00.000Z' },
          'question-3': { responseId: 'response-3', attemptId: 'attempt-1', questionId: 'question-3', value: { selectedOptionId: 'option-3a' }, updatedAt: '2026-04-12T09:59:00.000Z' },
          'question-4': { responseId: 'response-4', attemptId: 'attempt-1', questionId: 'question-4', value: { selectedOptionId: 'option-4a' }, updatedAt: '2026-04-12T10:00:00.000Z' },
        },
      },
    }),
    /Missing canonical HERO_PAIRS row for pair "delivery_people"/i,
  );
});

test('single-domain completion marks ready only when the canonical payload is structurally complete', async () => {
  const harness = createDb();
  const service = createAssessmentCompletionService({ db: harness.db });
  const result = await service.completeAssessmentAttempt({ attemptId: 'attempt-1', userId: 'user-1' });

  assert.equal(result.mode, 'single_domain');
  assert.equal(result.resultStatus, 'ready');
  assert.equal(harness.attempts[0]?.lifecycleStatus, 'RESULT_READY');
  assert.equal(harness.results[0]?.readinessStatus, 'READY');
  assert.equal(harness.results[0]?.canonicalResultPayload?.metadata.mode, 'single_domain');
  assert.equal(isSingleDomainResultPayload(harness.results[0]?.canonicalResultPayload), true);
});

test('incomplete single-domain attempts fail and never become ready', async () => {
  const harness = createDb({
    responses: [
      { responseId: 'response-1', attemptId: 'attempt-1', questionId: 'question-1', selectedOptionId: 'option-1a', respondedAt: '2026-04-12T09:57:00.000Z', updatedAt: '2026-04-12T09:57:00.000Z' },
      { responseId: 'response-2', attemptId: 'attempt-1', questionId: 'question-2', selectedOptionId: 'option-2a', respondedAt: '2026-04-12T09:58:00.000Z', updatedAt: '2026-04-12T09:58:00.000Z' },
      { responseId: 'response-3', attemptId: 'attempt-1', questionId: 'question-3', selectedOptionId: 'option-3a', respondedAt: '2026-04-12T09:59:00.000Z', updatedAt: '2026-04-12T09:59:00.000Z' },
    ],
  });
  const service = createAssessmentCompletionService({ db: harness.db });

  await assert.rejects(() => service.completeAssessmentAttempt({ attemptId: 'attempt-1', userId: 'user-1' }), /every question to be answered/i);
  assert.equal(harness.attempts[0]?.lifecycleStatus, 'FAILED');
  assert.equal(harness.results[0]?.readinessStatus, 'FAILED');
});

test('single-domain result retrieval returns the payload cleanly without affecting list semantics', async () => {
  const harness = createDb();
  const payload = await buildSingleDomainResultPayload({
    db: harness.db,
    assessmentVersionId: 'version-1',
    responses: buildResponseSet(),
  });

  harness.results.push({
    resultId: 'result-read',
    attemptId: 'attempt-1',
    assessmentId: 'assessment-1',
    assessmentVersionId: 'version-1',
    pipelineStatus: 'COMPLETED',
    readinessStatus: 'READY',
    canonicalResultPayload: payload,
    failureReason: null,
    generatedAt: '2026-04-12T10:00:00.000Z',
    createdAt: '2026-04-12T10:00:00.000Z',
    updatedAt: '2026-04-12T10:00:00.000Z',
  });

  const service = createResultReadModelService({ db: harness.db });
  const list = await service.listAssessmentResults({ userId: 'user-1' });
  const detail = await service.getAssessmentResultDetail({ userId: 'user-1', resultId: 'result-read' });

  assert.equal(list[0]?.mode, 'single_domain');
  assert.equal(list[0]?.topSignal?.signalKey, 'vision');
  assert.equal(detail.mode, 'single_domain');
  assert.equal(detail.singleDomainResult?.hero.hero_headline, 'Hero vision_delivery');
});

test('published single-domain runtime regression proves start-to-ready persisted retrieval flow', async () => {
  const harness = createDb({
    attempts: [],
    responses: [],
  });
  const lifecycleService = createAssessmentAttemptLifecycleService({ db: harness.db });
  const runnerService = createAssessmentRunnerService({
    db: harness.db,
    lifecycleService,
    definitionRepository: {
      async getAssessmentDefinitionByVersion() {
        return null;
      },
    },
  });
  const resultReadModel = createResultReadModelService({ db: harness.db });
  const userId = 'user-regression';

  const started = await lifecycleService.startAssessmentAttempt({
    userId,
    assessmentKey: 'role-focus',
  });

  assert.equal(started.status, 'in_progress');
  assert.equal(started.assessmentVersionId, 'version-1');
  assert.equal(started.versionTag, '1.0.0');
  assert.equal(started.totalQuestions, 4);
  assert.ok(started.attemptId);

  const runner = await runnerService.getAssessmentRunnerViewModel({
    userId,
    assessmentKey: 'role-focus',
    attemptId: started.attemptId!,
  });

  assert.equal(runner.status, 'in_progress');
  assert.deepEqual(
    runner.questions.map((question) => question.questionKey),
    ['q01', 'q02', 'q03', 'q04'],
  );
  assert.deepEqual(
    runner.questions.map((question) => question.options.map((option) => option.text)),
    [
      ['Text q01_a', 'Text q01_b'],
      ['Text q02_a', 'Text q02_b'],
      ['Text q03_a', 'Text q03_b'],
      ['Text q04_a', 'Text q04_b'],
    ],
  );

  const firstQuestion = runner.questions[0]!;
  await runnerService.saveAssessmentResponse({
    userId,
    assessmentKey: 'role-focus',
    attemptId: started.attemptId!,
    questionId: firstQuestion.questionId,
    selectedOptionId: firstQuestion.options[0]!.optionId,
  });
  const overwrite = await runnerService.saveAssessmentResponse({
    userId,
    assessmentKey: 'role-focus',
    attemptId: started.attemptId!,
    questionId: firstQuestion.questionId,
    selectedOptionId: firstQuestion.options[1]!.optionId,
  });

  assert.equal(overwrite.selectedOptionId, 'option-1b');
  assert.equal(overwrite.answeredQuestions, 1);

  for (const question of runner.questions.slice(1)) {
    await runnerService.saveAssessmentResponse({
      userId,
      assessmentKey: 'role-focus',
      attemptId: started.attemptId!,
      questionId: question.questionId,
      selectedOptionId: question.options[0]!.optionId,
    });
  }

  assert.equal(harness.responses.length, runner.questions.length);
  assert.equal(
    harness.responses.filter((response) => response.questionId === firstQuestion.questionId).length,
    1,
  );
  assert.equal(
    harness.responses.find((response) => response.questionId === firstQuestion.questionId)?.selectedOptionId,
    'option-1b',
  );

  const submitted = await runnerService.completeAssessmentAttempt({
    userId,
    assessmentKey: 'role-focus',
    attemptId: started.attemptId!,
  });

  assert.equal(submitted.kind, 'ready');
  assert.match(submitted.href, /\/app\/results\/single-domain\/result-\d+/);
  assert.equal(submitted.completion.mode, 'single_domain');
  assert.equal(submitted.completion.resultStatus, 'ready');
  assert.equal(harness.attempts[0]?.lifecycleStatus, 'RESULT_READY');
  assert.equal(harness.results[0]?.readinessStatus, 'READY');
  assert.equal(harness.results[0]?.canonicalResultPayload?.metadata.mode, 'single_domain');

  const workspace = await buildAssessmentWorkspaceViewModel({
    db: harness.db,
    userId,
  });
  const dashboard = await buildDashboardViewModel({
    db: harness.db,
    userId,
  });
  const resultList = await resultReadModel.listAssessmentResults({ userId });
  const resultDetail = await resultReadModel.getAssessmentResultDetail({
    userId,
    resultId: harness.results[0]!.resultId,
  });
  const entryResolution = await runnerService.resolveAssessmentEntry({
    userId,
    assessmentKey: 'role-focus',
  });

  assert.equal(workspace.assessments.length, 1);
  assert.equal(workspace.assessments[0]?.assessmentKey, 'role-focus');
  assert.equal(workspace.assessments[0]?.status, 'ready');
  assert.equal(workspace.assessments[0]?.latestReadyResultId, harness.results[0]?.resultId);

  assert.equal(dashboard.readyResultCount, 1);
  assert.equal(dashboard.processingCount, 0);
  assert.equal(dashboard.latestReadyResult?.href, `/app/results/single-domain/${harness.results[0]?.resultId}`);

  assert.equal(resultList.length, 1);
  assert.equal(resultList[0]?.mode, 'single_domain');
  assert.equal(resultList[0]?.resultId, harness.results[0]?.resultId);

  assert.equal(resultDetail.mode, 'single_domain');
  assert.equal(resultDetail.singleDomainResult?.metadata.attemptId, started.attemptId);
  assert.equal(
    resultDetail.singleDomainResult?.hero.hero_headline,
    harness.results[0]?.canonicalResultPayload?.hero.hero_headline,
  );

  assert.deepEqual(entryResolution, {
    kind: 'result',
    assessmentKey: 'role-focus',
    resultId: harness.results[0]!.resultId,
    href: `/app/results/single-domain/${harness.results[0]!.resultId}`,
  });

  const baselineList = JSON.stringify(resultList);
  const baselineDetail = JSON.stringify(resultDetail);
  const baselineWorkspace = JSON.stringify(workspace);
  const baselineDashboard = JSON.stringify(dashboard);

  harness.mutateRuntimeDefinition();

  assert.equal(
    JSON.stringify(await resultReadModel.listAssessmentResults({ userId })),
    baselineList,
  );
  assert.equal(
    JSON.stringify(await resultReadModel.getAssessmentResultDetail({
      userId,
      resultId: harness.results[0]!.resultId,
    })),
    baselineDetail,
  );
  assert.equal(
    JSON.stringify(await buildAssessmentWorkspaceViewModel({
      db: harness.db,
      userId,
    })),
    baselineWorkspace,
  );
  assert.equal(
    JSON.stringify(await buildDashboardViewModel({
      db: harness.db,
      userId,
    })),
    baselineDashboard,
  );
});

test('multi-domain attempts still route through the injected multi-domain engine path', async () => {
  const harness = createDb({
    attempts: [{
      attemptId: 'attempt-2',
      userId: 'user-1',
      assessmentId: 'assessment-1',
      assessmentVersionId: 'version-2',
      assessmentKey: 'wplp80',
      assessmentMode: 'multi_domain',
      versionTag: '1.0.0',
      lifecycleStatus: 'IN_PROGRESS',
      startedAt: '2026-04-12T09:50:00.000Z',
      submittedAt: null,
      completedAt: null,
      lastActivityAt: '2026-04-12T10:00:00.000Z',
      createdAt: '2026-04-12T09:50:00.000Z',
      updatedAt: '2026-04-12T10:00:00.000Z',
    }],
    responses: [{
      responseId: 'response-md-1',
      attemptId: 'attempt-2',
      questionId: 'question-1',
      selectedOptionId: 'option-1a',
      respondedAt: '2026-04-12T10:00:00.000Z',
      updatedAt: '2026-04-12T10:00:00.000Z',
    }],
  });
  let engineCalls = 0;
  const service = createAssessmentCompletionService({
    db: harness.db,
    executeEngine: async () => {
      engineCalls += 1;
      return {
        metadata: { assessmentKey: 'wplp80', assessmentTitle: 'WPLP-80', version: '1.0.0', attemptId: 'attempt-2', completedAt: '2026-04-12T10:00:00.000Z' },
        intro: { assessmentDescription: null },
        hero: { headline: 'Multi hero', subheadline: null, summary: null, narrative: 'Narrative', pressureOverlay: null, environmentOverlay: null, primaryPattern: { label: 'Vision', signalKey: 'vision', signalLabel: 'Vision' }, heroPattern: null, domainPairWinners: [], traitTotals: [], matchedPatterns: [], domainHighlights: [] },
        domains: [],
        actions: { strengths: [], watchouts: [], developmentFocus: [] },
        application: { thesis: { headline: '', summary: '', sourceKeys: { heroPatternKey: '' } }, signatureContribution: { title: '', summary: '', items: [] }, patternRisks: { title: '', summary: '', items: [] }, rangeBuilder: { title: '', summary: '', items: [] }, actionPlan30: { keepDoing: '', watchFor: '', practiceNext: '', askOthers: '' } },
        diagnostics: { readinessStatus: 'ready', scoring: { scoringMethod: 'option_signal_weights_only', totalQuestions: 1, answeredQuestions: 1, unansweredQuestions: 0, totalResponsesProcessed: 1, totalWeightsApplied: 1, totalScoreMass: 1, zeroScoreSignalCount: 0, zeroAnswerSubmission: false, warnings: [], generatedAt: '2026-04-12T10:00:00.000Z' }, normalization: { normalizationMethod: 'largest_remainder_integer_percentages', totalScoreMass: 1, zeroMass: false, globalPercentageSum: 100, domainPercentageSums: {}, roundingAdjustmentsApplied: 0, zeroScoreSignalCount: 0, warnings: [], generatedAt: '2026-04-12T10:00:00.000Z' }, answeredQuestionCount: 1, totalQuestionCount: 1, missingQuestionIds: [], topSignalSelectionBasis: 'normalized_rank', rankedSignalCount: 1, domainCount: 0, zeroMass: false, zeroMassTopSignalFallbackApplied: false, warnings: [], generatedAt: '2026-04-12T10:00:00.000Z' },
      };
    },
  });

  const result = await service.completeAssessmentAttempt({ attemptId: 'attempt-2', userId: 'user-1' });
  assert.equal(engineCalls, 1);
  assert.equal(result.mode, 'multi_domain');
});
