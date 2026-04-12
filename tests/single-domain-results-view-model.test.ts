import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createSingleDomainResultsViewModel,
  SINGLE_DOMAIN_RESULTS_BRIDGE_LINE,
} from '@/lib/server/single-domain-results-view-model';
import type { SingleDomainResultPayload } from '@/lib/types/single-domain-result';

function buildPayload(signalCount = 4): SingleDomainResultPayload {
  const allSignals = [
    ['vision', 'Vision', 1, 38, 'Primary'],
    ['delivery', 'Delivery', 2, 31, 'Secondary'],
    ['people', 'People', 3, 19, 'Supporting'],
    ['rigor', 'Rigor', 4, 12, 'Underplayed'],
    ['clarity', 'Clarity', 5, 8, 'Supporting'],
  ] as const;

  return {
    metadata: {
      assessmentKey: 'role-focus',
      assessmentTitle: 'Role Focus',
      version: '1.0.0',
      attemptId: 'attempt-1',
      mode: 'single_domain',
      domainKey: 'leadership-style',
      generatedAt: '2026-04-12T10:00:00.000Z',
      completedAt: '2026-04-12T10:00:00.000Z',
    },
    intro: {
      section_title: 'Leadership style',
      intro_paragraph: 'This domain introduces how you tend to lead.',
      meaning_paragraph: 'It explains the practical meaning of the pattern.',
      bridge_to_signals: 'The ranked signals show how that pattern is distributed.',
      blueprint_context_line: 'This is the current blueprint context line.',
    },
    hero: {
      pair_key: 'vision_delivery',
      hero_headline: 'Directive and grounded',
      hero_subheadline: 'This is the hero subheadline.',
      hero_opening: 'This is the hero opening.',
      hero_strength_paragraph: 'This is the hero strength paragraph.',
      hero_tension_paragraph: 'This is the hero tension paragraph.',
      hero_close_paragraph: 'This is the hero close paragraph.',
    },
    signals: allSignals.slice(0, signalCount).map(([signalKey, signalLabel, rank, normalizedScore, positionLabel], index) => ({
      signal_key: signalKey,
      signal_label: signalLabel,
      rank,
      normalized_score: normalizedScore,
      raw_score: signalCount - index,
      position: rank === 1 ? 'primary' : rank === 2 ? 'secondary' : rank === signalCount ? 'underplayed' : 'supporting',
      position_label: positionLabel,
      chapter_intro: `${signalLabel} intro`,
      chapter_how_it_shows_up: `${signalLabel} shows up`,
      chapter_value_outcome: `${signalLabel} outcome`,
      chapter_value_team_effect: `${signalLabel} team effect`,
      chapter_risk_behaviour: `${signalLabel} risk behaviour`,
      chapter_risk_impact: `${signalLabel} risk impact`,
      chapter_development: `${signalLabel} development`,
    })),
    balancing: {
      pair_key: 'vision_delivery',
      balancing_section_title: 'Balancing your approach',
      current_pattern_paragraph: 'Current pattern paragraph.',
      practical_meaning_paragraph: 'Practical meaning paragraph.',
      system_risk_paragraph: 'System risk paragraph.',
      rebalance_intro: 'Rebalance intro.',
      rebalance_actions: ['Action one', 'Action two', 'Action three'],
    },
    pairSummary: {
      pair_key: 'vision_delivery',
      pair_section_title: 'How this shows up',
      pair_headline: 'Integrated meaning',
      pair_opening_paragraph: 'Pair opening paragraph.',
      pair_strength_paragraph: 'Pair strength paragraph.',
      pair_tension_paragraph: 'Pair tension paragraph.',
      pair_close_paragraph: 'Pair close paragraph.',
    },
    application: {
      strengths: [
        { signal_key: 'vision', signal_label: 'Vision', rank: 1, statement: 'Vision strength' },
      ],
      watchouts: [
        { signal_key: 'delivery', signal_label: 'Delivery', rank: 2, statement: 'Delivery watchout' },
      ],
      developmentFocus: [
        { signal_key: 'rigor', signal_label: 'Rigor', rank: signalCount, statement: 'Rigor development' },
      ],
    },
    diagnostics: {
      readinessStatus: 'ready',
      scoringMethod: 'option_signal_weights_only',
      normalizationMethod: 'largest_remainder_integer_percentages',
      answeredQuestionCount: 24,
      totalQuestionCount: 24,
      signalCount,
      derivedPairCount: 6,
      topPair: 'vision_delivery',
      counts: {
        domainCount: 1,
        questionCount: 24,
        optionCount: 96,
        weightCount: 192,
      },
      warnings: [],
    },
  };
}

test('single-domain results view model exposes the intended reading structure and bridge line', () => {
  const viewModel = createSingleDomainResultsViewModel(buildPayload());

  assert.deepEqual(
    viewModel.readingSections.topLevelSections.map((section) => section.label),
    [
      'Introduction',
      'Your Behaviour Pattern',
      'Inside This Domain',
      'Balancing Your Approach',
      'How This Shows Up',
      'Application',
    ],
  );
  assert.equal(viewModel.bridgeLine, SINGLE_DOMAIN_RESULTS_BRIDGE_LINE);
  assert.deepEqual(viewModel.hero.pairSignalLabels, ['Vision', 'Delivery']);
});

test('single-domain results view model keeps persisted signal counts variable and ordered by rank', () => {
  const viewModel = createSingleDomainResultsViewModel(buildPayload(5));

  assert.equal(viewModel.signals.length, 5);
  assert.deepEqual(
    viewModel.signals.map((signal) => signal.signalKey),
    ['vision', 'delivery', 'people', 'rigor', 'clarity'],
  );
  assert.equal(viewModel.signals[4]?.normalizedScore, 8);
});

test('single-domain results view model derives narrative tiers from persisted position and score weight', () => {
  const payload = buildPayload(4);
  payload.signals = payload.signals.map((signal) => (
    signal.signal_key === 'delivery'
      ? { ...signal, normalized_score: 0, raw_score: 0, position: 'secondary' }
      : signal
  ));

  const viewModel = createSingleDomainResultsViewModel(payload);

  assert.equal(viewModel.signals[0]?.tier, 'primary');
  assert.equal(viewModel.signals[1]?.tier, 'underplayed');
  assert.equal(viewModel.signals[2]?.tier, 'supporting');
  assert.equal(viewModel.signals[3]?.tier, 'underplayed');
  assert.deepEqual(
    viewModel.signals[0]?.narrativeSections.map((section) => section.label),
    ['How it shows up', 'Value outcome', 'Team effect', 'Risk behaviour', 'Risk impact', 'Development line'],
  );
  assert.deepEqual(
    viewModel.signals[1]?.narrativeSections.map((section) => section.label),
    ['Risk impact', 'Development line'],
  );
});

test('single-domain results view model maps balancing, pair summary, and application from persisted fields only', () => {
  const viewModel = createSingleDomainResultsViewModel(buildPayload(3));

  assert.equal(viewModel.balancing.sectionTitle, 'Balancing your approach');
  assert.equal(viewModel.pairSummary.headline, 'Integrated meaning');
  assert.equal(viewModel.application.strengths[0]?.statement, 'Vision strength');
  assert.equal(viewModel.application.watchouts[0]?.statement, 'Delivery watchout');
  assert.equal(viewModel.application.developmentFocus[0]?.statement, 'Rigor development');
});
