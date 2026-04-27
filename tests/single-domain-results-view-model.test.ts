import assert from 'node:assert/strict';
import test from 'node:test';

import { createSingleDomainResultsViewModel } from '@/lib/server/single-domain-results-view-model';
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
    signals: allSignals
      .slice(0, signalCount)
      .map(([signalKey, signalLabel, rank, normalizedScore, positionLabel], index) => ({
        signal_key: signalKey,
        signal_label: signalLabel,
        rank,
        normalized_score: normalizedScore,
        raw_score: signalCount - index,
        position:
          rank === 1
            ? 'primary'
            : rank === 2
              ? 'secondary'
              : rank === signalCount
                ? 'underplayed'
                : 'supporting',
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
        {
          signal_key: 'delivery',
          signal_label: 'Delivery',
          rank: 2,
          statement: 'Delivery watchout',
        },
      ],
      developmentFocus: [
        {
          signal_key: 'rigor',
          signal_label: 'Rigor',
          rank: signalCount,
          statement: 'Rigor development',
        },
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

test('single-domain results view model exposes the locked six-section reading structure', () => {
  const viewModel = createSingleDomainResultsViewModel(buildPayload());

  assert.deepEqual(
    viewModel.readingSections.topLevelSections.map((section) => section.id),
    ['intro', 'hero', 'drivers', 'pair', 'limitation', 'application'],
  );
  assert.deepEqual(
    viewModel.readingSections.topLevelSections.map((section) => section.label),
    [
      'Intro',
      'Your Style at a Glance',
      'What Shapes Your Approach',
      'How Your Style Balances',
      'Where This Can Work Against You',
      'Putting This Into Practice',
    ],
  );
  assert.deepEqual(
    viewModel.report.sections.map((section) => section.key),
    ['intro', 'hero', 'drivers', 'pair', 'limitation', 'application'],
  );
  assert.equal(viewModel.pairLabel, 'Vision and Delivery');
  assert.deepEqual(viewModel.metadataItems.map((item) => item.emphasis), [undefined, undefined, undefined, undefined]);
});

test('single-domain results view model maps weaker signals into range limitations and application carry-through', () => {
  const payload = buildPayload(4);
  payload.signals = payload.signals.map((signal) =>
    signal.signal_key === 'rigor'
      ? {
          ...signal,
          position: 'underplayed',
          chapter_risk_impact: 'Rigor risk impact.',
          chapter_development: 'Rigor development line.',
        }
      : signal,
  );

  const viewModel = createSingleDomainResultsViewModel(payload);
  const drivers = viewModel.report.sections.find((section) => section.key === 'drivers');
  const limitation = viewModel.report.sections.find((section) => section.key === 'limitation');
  const application = viewModel.report.sections.find((section) => section.key === 'application');

  assert.ok(drivers);
  assert.ok(limitation);
  assert.ok(application);
  assert.match(
    drivers.focusItems.find((item) => item.label === 'Range limitation')?.content.join(' ') ?? '',
    /Rigor risk impact/,
  );
  assert.match(limitation.paragraphs.join(' '), /Rigor/i);
  assert.match(
    application.focusItems.find((item) => item.label === 'Develop')?.content.join(' ') ?? '',
    /Rigor development/,
  );
});

test('single-domain results view model cleans internal labels and raw pair keys before rendering', () => {
  const payload = buildPayload(4);
  payload.hero.pair_key = 'results_vision';
  payload.hero.hero_subheadline = 'This comes from the persisted integrated meaning.';
  payload.intro.bridge_to_signals =
    'The ranked signals show the report and vision pattern, not results_vision.';
  payload.pairSummary.pair_headline = 'Integrated meaning';

  const viewModel = createSingleDomainResultsViewModel(payload);

  assert.equal(viewModel.pairLabel, 'Results and Vision');
  assert.match(
    viewModel.report.sections.find((section) => section.key === 'pair')?.paragraphs[0] ?? '',
    /Integrated meaning/i,
  );
  assert.match(
    viewModel.report.sections.find((section) => section.key === 'intro')?.paragraphs.join(' ') ?? '',
    /results_vision/i,
  );
});

test('single-domain results view model normalizes narrow release-copy inconsistencies in persisted text', () => {
  const payload = buildPayload(4);
  payload.hero.hero_tension_paragraph = 'The Trade Off is that control can tighten too far.';
  payload.balancing.system_risk_paragraph =
    'people: Over Reliance on structure can reduce adaptability.';

  const viewModel = createSingleDomainResultsViewModel(payload);
  const hero = viewModel.report.sections.find((section) => section.key === 'hero');
  const limitation = viewModel.report.sections.find((section) => section.key === 'limitation');

  assert.ok(hero);
  assert.ok(limitation);
  assert.match(hero.paragraphs.join(' '), /The Trade Off is that control can tighten too far\./);
  assert.match(
    limitation.paragraphs.join(' '),
    /Over Reliance on structure can reduce adaptability\./,
  );
});
