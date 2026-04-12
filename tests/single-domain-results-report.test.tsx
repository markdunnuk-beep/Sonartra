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
    'The signals below show what is carrying this pattern, what supports it, and what stays quieter in the background.',
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
    markup.match(/The signals below show what is carrying this pattern, what supports it, and what stays quieter in the background\./g)?.length ?? 0,
    1,
  );
});

test('single-domain results report reuses guide rail labels for the single-domain structure', () => {
  const markup = renderToStaticMarkup(
    <SingleDomainResultsReport result={createSingleDomainResultsViewModel(buildPayload())} />,
  );

  for (const label of [
    'Leadership style',
    'Behaviour pattern',
    'Inside this domain',
    'Balancing your approach',
    'How this shows up',
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
  assert.match(markup, />Clarity</);
  assert.match(markup, /Clarity sits further in the background here and tends to take a back seat to the leading signals\./);
});

test('single-domain results report compresses zero-weight and underplayed signals instead of rendering full chapters', () => {
  const payload = buildPayload(4);
  payload.signals = payload.signals.map((signal) => (
    signal.signal_key === 'delivery'
      ? {
          ...signal,
          normalized_score: 0,
          raw_score: 0,
          position: 'secondary',
          position_label: 'Secondary',
          chapter_intro: 'Delivery plays a strong role in how you operate.',
          chapter_risk_impact: 'You rely on delivery to keep standards clear.',
        }
      : signal
  ));

  const markup = renderToStaticMarkup(
    <SingleDomainResultsReport result={createSingleDomainResultsViewModel(payload)} />,
  );

  assert.match(markup, />Vision intro</);
  assert.match(markup, />Delivery is less present in this result and is not a primary driver in this domain\.</);
  assert.equal(markup.match(/>How it shows up</g)?.length ?? 0, 1);
  assert.equal(markup.match(/>Less present in this result</g)?.length ?? 0, 2);
  assert.match(markup, />Context and underplayed signals</);
  assert.doesNotMatch(markup, /plays a strong role|you rely on/i);
});

test('single-domain results report keeps secondary signals lighter than primary chapters', () => {
  const payload = buildPayload(4);
  payload.signals = payload.signals.map((signal) => (
    signal.signal_key === 'delivery'
      ? {
          ...signal,
          chapter_intro: 'Delivery plays a strong role in how you operate.',
        }
      : signal
  ));

  const markup = renderToStaticMarkup(
    <SingleDomainResultsReport result={createSingleDomainResultsViewModel(payload)} />,
  );

  assert.equal(markup.match(/>How it shows up</g)?.length ?? 2, 2);
  assert.equal(markup.match(/>Effect on others</g)?.length ?? 1, 1);
  assert.equal(markup.match(/>Context and underplayed signals</g)?.length ?? 1, 1);
  assert.match(markup, />Delivery gives this domain steady support, but it works behind the leading signal rather than setting the tone on its own\.</);
  assert.doesNotMatch(markup, /Delivery plays a strong role/i);
});

test('single-domain results report prevents the 100-0 contradiction from resurfacing in rendered copy', () => {
  const payload = buildPayload(4);
  payload.signals = payload.signals.map((signal) => {
    if (signal.signal_key === 'vision') {
      return { ...signal, normalized_score: 100, raw_score: 12 };
    }

    return {
      ...signal,
      normalized_score: 0,
      raw_score: 0,
      position: signal.signal_key === 'delivery' ? 'secondary' : 'underplayed',
      chapter_intro: `${signal.signal_label} plays a strong role in how you operate.`,
      chapter_risk_impact: `${signal.signal_label} is central to how you stay effective.`,
    };
  });

  const markup = renderToStaticMarkup(
    <SingleDomainResultsReport result={createSingleDomainResultsViewModel(payload)} />,
  );

  assert.match(markup, />100% of the emphasis in this domain\.</);
  assert.equal(markup.match(/>0% of the emphasis in this domain\.</g)?.length ?? 0, 3);
  assert.doesNotMatch(markup, /plays a strong role|central to how you/i);
  assert.match(markup, /not a primary driver|less present|back seat/i);
});

test('single-domain results report renders cleaned balancing, pair summary, and application copy', () => {
  const markup = renderToStaticMarkup(
    <SingleDomainResultsReport result={createSingleDomainResultsViewModel(buildPayload(4))} />,
  );

  assert.match(markup, />Current pattern paragraph\.</);
  assert.match(markup, /Combined meaning/i);
  assert.match(markup, />Vision strength</);
  assert.match(markup, />Delivery watchout</);
  assert.match(markup, />Rigor development</);
});

test('single-domain results report tightens the opening shell and removes procedural scaffolding copy', () => {
  const payload = buildPayload(4);
  payload.intro.intro_paragraph = 'A direct view of how you lead when the stakes are real.';
  payload.intro.meaning_paragraph = 'It highlights the behaviours other people are most likely to feel from you and the trade-offs that come with them.';
  payload.intro.bridge_to_signals = 'The signals below are ranked based on your responses.';
  payload.intro.blueprint_context_line = 'Why it matters in practice.';
  payload.hero.hero_subheadline = 'The pattern people are most likely to recognise first.';
  payload.hero.hero_opening = 'It brings pace, direction, and visible follow-through.';
  payload.hero.hero_strength_paragraph = 'You are likely to come across as clear, decisive, and hard to knock off course once the direction feels right.';

  const markup = renderToStaticMarkup(
    <SingleDomainResultsReport result={createSingleDomainResultsViewModel(payload)} />,
  );

  assert.match(markup, />What this domain says about the way you operate\.</);
  assert.match(markup, />Why it matters</);
  assert.match(markup, />What keeps it effective</);
  assert.match(markup, />Where to keep range</);
  assert.match(markup, />You are likely to come across as clear, decisive, and hard to knock off course once the direction feels right\.</);
  assert.doesNotMatch(markup, /Start here|Read this first|This introduction frames the domain|signals below are ranked based on your responses/i);
});

test('single-domain results report strips internal terms, raw keys, and unavailable utilities from the rendered output', () => {
  const payload = buildPayload(4);
  payload.intro.bridge_to_signals = 'The ranked signals show the persisted vision_results pattern.';
  payload.hero.hero_subheadline = 'This comes from the persisted integrated meaning.';
  payload.balancing.practical_meaning_paragraph = 'This section avoids recomputing in the UI.';
  payload.pairSummary.pair_headline = 'Integrated meaning';

  const markup = renderToStaticMarkup(
    <SingleDomainResultsReport result={createSingleDomainResultsViewModel(payload)} />,
  );

  for (const forbidden of [
    'persisted',
    'recomputing',
    'integrated meaning',
    'vision_results',
    'vision_delivery',
    'signal-vision',
    'Download PDF',
    'Share on LinkedIn',
  ]) {
    assert.doesNotMatch(markup, new RegExp(forbidden, 'i'));
  }

  assert.match(markup, />Vision and Delivery</);
  assert.match(markup, /Combined meaning/i);
  assert.doesNotMatch(markup, />The leading tendencies show the Direction and Delivery pattern\.</);
});

test('single-domain results report removes raw single-domain signal and pair labels from user-facing output', () => {
  const payload = buildPayload(4);
  payload.hero.pair_key = 'results_vision';
  payload.hero.hero_subheadline = 'The leading combination is report × Vision.';
  payload.intro.bridge_to_signals = 'The leading tendencies show the report and vision pattern, not results_vision.';
  payload.signals = payload.signals.map((signal) => {
    if (signal.signal_key === 'vision') {
      return {
        ...signal,
        signal_label: 'VISION',
      };
    }

    if (signal.signal_key === 'delivery') {
      return {
        ...signal,
        signal_key: 'results',
        signal_label: 'REPORT',
      };
    }

    return signal;
  });
  payload.application.watchouts = [
    { signal_key: 'results', signal_label: 'report', rank: 2, statement: 'Watchout statement' },
  ];

  const markup = renderToStaticMarkup(
    <SingleDomainResultsReport result={createSingleDomainResultsViewModel(payload)} />,
  );

  assert.match(markup, />Delivery and Vision</);
  assert.match(markup, />Delivery</);
  assert.match(markup, />Delivery[^<]*Rank 2</);
  assert.doesNotMatch(markup, />report and vision</i);
  assert.doesNotMatch(markup, /report × Vision/i);
  assert.doesNotMatch(markup, />REPORT</);
  assert.doesNotMatch(markup, /results_vision/i);
});
