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
      'Leadership style',
      'Behaviour pattern',
      'Inside this domain',
      'Balancing your approach',
      'How this shows up',
      'Application',
    ],
  );
  assert.equal(viewModel.bridgeLine, SINGLE_DOMAIN_RESULTS_BRIDGE_LINE);
  assert.deepEqual(viewModel.hero.pairSignalLabels, ['Vision', 'Delivery']);
  assert.deepEqual(
    viewModel.readingSections.topLevelSections.map((section) => section.intentPrompt),
    [
      'What this domain says about the way you operate.',
      'The clearest read of the pattern leading this domain.',
      'How the signal mix creates the pattern you see here.',
      'Where this pattern helps, where it can narrow your range, and how to bring it back into balance.',
      'How the leading tendencies work together when this domain is at its most recognisable.',
      'Practical points to lean on, watch for, and develop from here.',
    ],
  );
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
  assert.equal(viewModel.signals[0]?.semanticState, 'dominant');
  assert.equal(viewModel.signals[1]?.tier, 'underplayed');
  assert.equal(viewModel.signals[1]?.semanticState, 'underplayed');
  assert.equal(viewModel.signals[2]?.tier, 'supporting');
  assert.equal(viewModel.signals[2]?.semanticState, 'contextual');
  assert.equal(viewModel.signals[3]?.tier, 'underplayed');
  assert.deepEqual(
    viewModel.signals[0]?.narrativeSections.map((section) => section.label),
    ['How it shows up', 'What it adds', 'Effect on others', 'When it overreaches', 'What to watch', 'How to stretch it'],
  );
  assert.deepEqual(
    viewModel.signals[1]?.narrativeSections.map((section) => section.label),
    ['What to watch', 'How to stretch it'],
  );
});

test('single-domain results view model blocks strong-presence wording for zero-score signals', () => {
  const payload = buildPayload(4);
  payload.signals = payload.signals.map((signal) => (
    signal.signal_key === 'delivery'
      ? {
          ...signal,
          normalized_score: 0,
          raw_score: 0,
          position: 'secondary',
          chapter_intro: 'Delivery plays a strong role in how you operate.',
          chapter_risk_impact: 'You rely on delivery even when conditions change quickly.',
          chapter_development: 'This is central to how you stay effective.',
        }
      : signal
  ));

  const viewModel = createSingleDomainResultsViewModel(payload);
  const deliverySignal = viewModel.signals.find((signal) => signal.signalKey === 'delivery');

  assert.ok(deliverySignal);
  assert.equal(deliverySignal.tier, 'underplayed');
  assert.equal(deliverySignal.semanticState, 'underplayed');
  assert.match(deliverySignal.chapterIntro, /less present|not a primary driver/i);
  assert.match(deliverySignal.riskImpact, /not a primary driver|less relied on|back seat/i);
  assert.doesNotMatch(
    `${deliverySignal.chapterIntro} ${deliverySignal.riskImpact} ${deliverySignal.developmentLine}`,
    /plays a strong role|strongly shapes|drives your behaviour|you rely on|central to how you|core part of your approach/i,
  );
});

test('single-domain results view model downgrades dominant phrasing for underplayed and supporting semantics', () => {
  const payload = buildPayload(4);
  payload.signals = payload.signals.map((signal) => {
    if (signal.signal_key === 'people') {
      return {
        ...signal,
        chapter_intro: 'People is central to how you operate in this domain.',
        chapter_how_it_shows_up: 'People strongly shapes how you behave with others.',
      };
    }

    if (signal.signal_key === 'rigor') {
      return {
        ...signal,
        chapter_intro: 'Rigor drives your behaviour and sets the tone.',
        chapter_risk_impact: 'Rigor is a core part of your approach.',
      };
    }

    return signal;
  });

  const viewModel = createSingleDomainResultsViewModel(payload);
  const peopleSignal = viewModel.signals.find((signal) => signal.signalKey === 'people');
  const rigorSignal = viewModel.signals.find((signal) => signal.signalKey === 'rigor');

  assert.ok(peopleSignal);
  assert.equal(peopleSignal.tier, 'supporting');
  assert.equal(peopleSignal.semanticState, 'contextual');
  assert.match(peopleSignal.chapterIntro, /supporting position|adds context/i);
  assert.doesNotMatch(
    `${peopleSignal.chapterIntro} ${peopleSignal.howItShowsUp}`,
    /central to how you|strongly shapes/i,
  );

  assert.ok(rigorSignal);
  assert.equal(rigorSignal.tier, 'underplayed');
  assert.match(rigorSignal.chapterIntro, /less present|back seat/i);
  assert.doesNotMatch(
    `${rigorSignal.chapterIntro} ${rigorSignal.riskImpact}`,
    /drives your behaviour|core part of your approach|sets the tone/i,
  );
});

test('single-domain results view model preserves strong primary language while moderating secondary copy', () => {
  const payload = buildPayload(4);
  payload.signals = payload.signals.map((signal) => {
    if (signal.signal_key === 'vision') {
      return {
        ...signal,
        chapter_intro: 'Vision plays a strong role and drives your behaviour in this domain.',
      };
    }

    if (signal.signal_key === 'delivery') {
      return {
        ...signal,
        chapter_intro: 'Delivery plays a strong role and is central to how you operate.',
      };
    }

    return signal;
  });

  const viewModel = createSingleDomainResultsViewModel(payload);
  const visionSignal = viewModel.signals.find((signal) => signal.signalKey === 'vision');
  const deliverySignal = viewModel.signals.find((signal) => signal.signalKey === 'delivery');

  assert.ok(visionSignal);
  assert.equal(visionSignal.tier, 'primary');
  assert.match(visionSignal.chapterIntro, /plays a strong role/i);

  assert.ok(deliverySignal);
  assert.equal(deliverySignal.tier, 'secondary');
  assert.equal(deliverySignal.semanticState, 'reinforcing');
  assert.match(deliverySignal.chapterIntro, /steady support|behind the leading signal/i);
  assert.doesNotMatch(deliverySignal.chapterIntro, /plays a strong role|central to how you/i);
});

test('single-domain results view model maps balancing, pair summary, and application from persisted fields only', () => {
  const viewModel = createSingleDomainResultsViewModel(buildPayload(3));

  assert.equal(viewModel.balancing.sectionTitle, 'Balancing your approach');
  assert.equal(viewModel.pairSummary.headline, 'combined meaning');
  assert.equal(viewModel.application.strengths[0]?.statement, 'Vision strength');
  assert.equal(viewModel.application.watchouts[0]?.statement, 'Delivery watchout');
  assert.equal(viewModel.application.developmentFocus[0]?.statement, 'Rigor development');
});
