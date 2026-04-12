import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { SingleDomainResultsReport } from '@/components/results/single-domain-results-report';
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

test('single-domain results report renders sections in the intended order with one bridge line', () => {
  const markup = renderToStaticMarkup(
    <SingleDomainResultsReport result={createSingleDomainResultsViewModel(buildPayload())} />,
  );

  const introIndex = markup.indexOf('id="intro"');
  const heroIndex = markup.indexOf('id="hero"');
  const signalsIndex = markup.indexOf('id="signals"');
  const bridgeIndex = markup.indexOf(
    'On their own, these signals describe you. Together, they explain how you actually operate.',
  );
  const balancingIndex = markup.indexOf('id="balancing"');
  const pairSummaryIndex = markup.indexOf('id="pair-summary"');
  const applicationIndex = markup.indexOf('id="application"');

  assert.ok(introIndex >= 0);
  assert.ok(heroIndex > introIndex);
  assert.ok(signalsIndex > heroIndex);
  assert.ok(bridgeIndex > signalsIndex);
  assert.ok(balancingIndex > bridgeIndex);
  assert.ok(pairSummaryIndex > balancingIndex);
  assert.ok(applicationIndex > pairSummaryIndex);
  assert.equal(
    markup.match(/On their own, these signals describe you\. Together, they explain how you actually operate\./g)?.length ?? 0,
    1,
  );
});

test('single-domain results report reuses guide rail labels for the single-domain structure', () => {
  const markup = renderToStaticMarkup(
    <SingleDomainResultsReport result={createSingleDomainResultsViewModel(buildPayload())} />,
  );

  for (const label of [
    'Introduction',
    'Your Behaviour Pattern',
    'Inside This Domain',
    'Balancing Your Approach',
    'How This Shows Up',
    'Application',
  ]) {
    assert.match(markup, new RegExp(`>${label}<`));
  }

  for (const anchorId of ['intro', 'hero', 'signals', 'balancing', 'pair-summary', 'application']) {
    assert.match(markup, new RegExp(`href=\"#${anchorId}\"`));
  }
});

test('single-domain results report supports variable signal counts without collapsing the chapter flow', () => {
  const markup = renderToStaticMarkup(
    <SingleDomainResultsReport result={createSingleDomainResultsViewModel(buildPayload(5))} />,
  );

  assert.equal(markup.match(/Signal 0[1-5]/g)?.length ?? 0, 5);
  assert.match(markup, />Vision intro</);
  assert.match(markup, />Clarity intro</);
});

test('single-domain results report renders balancing, pair summary, and application from persisted payload fields', () => {
  const markup = renderToStaticMarkup(
    <SingleDomainResultsReport result={createSingleDomainResultsViewModel(buildPayload(4))} />,
  );

  assert.match(markup, />Current pattern paragraph\.</);
  assert.match(markup, />Integrated meaning</);
  assert.match(markup, />Vision strength</);
  assert.match(markup, />Delivery watchout</);
  assert.match(markup, />Rigor development</);
});
