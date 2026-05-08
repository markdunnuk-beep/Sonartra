import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  RankedPatternResultReport,
} from '@/components/results/ranked-pattern-result-report';
import { isRankedPatternRenderablePayload } from '@/lib/results/ranked-pattern-renderable';
import { SingleDomainResultReport } from '@/components/results/single-domain-result-report';
import { createSingleDomainResultsViewModel } from '@/lib/server/single-domain-results-view-model';
import type { SingleDomainResultPayload } from '@/lib/types/single-domain-result';
import { buildRankedPatternResultPayload } from '@/tests/fixtures/ranked-pattern-result-payload';

function rankedPayload(overrides?: Record<string, unknown>): SingleDomainResultPayload {
  return {
    ...buildRankedPatternResultPayload(),
    ...overrides,
  } as SingleDomainResultPayload;
}

function legacyPayload(): SingleDomainResultPayload {
  return {
    metadata: {
      assessmentKey: 'legacy_assessment',
      assessmentTitle: 'Legacy Assessment',
      version: '1.0.0',
      attemptId: 'attempt-legacy',
      mode: 'single_domain',
      domainKey: 'legacy_domain',
      generatedAt: '2026-05-07T10:00:00.000Z',
      completedAt: '2026-05-07T10:00:00.000Z',
    },
    intro: {
      section_title: 'Legacy intro',
      intro_paragraph: 'Legacy intro paragraph.',
      meaning_paragraph: 'Legacy meaning paragraph.',
      bridge_to_signals: 'Legacy bridge.',
      blueprint_context_line: 'Legacy context.',
    },
    hero: {
      pair_key: 'alpha_beta',
      hero_headline: 'Legacy headline',
      hero_subheadline: 'Legacy subheadline.',
      hero_opening: 'Legacy opening.',
      hero_strength_paragraph: 'Legacy strength.',
      hero_tension_paragraph: 'Legacy tension.',
      hero_close_paragraph: 'Legacy close.',
    },
    signals: [
      {
        signal_key: 'alpha',
        signal_label: 'Alpha',
        rank: 1,
        normalized_score: 60,
        raw_score: 6,
        position: 'primary',
        position_label: 'Primary',
        chapter_intro: 'Alpha intro',
        chapter_how_it_shows_up: 'Alpha shows up',
        chapter_value_outcome: 'Alpha outcome',
        chapter_value_team_effect: 'Alpha team effect',
        chapter_risk_behaviour: 'Alpha risk',
        chapter_risk_impact: 'Alpha impact',
        chapter_development: 'Alpha development',
      },
      {
        signal_key: 'beta',
        signal_label: 'Beta',
        rank: 2,
        normalized_score: 40,
        raw_score: 4,
        position: 'secondary',
        position_label: 'Secondary',
        chapter_intro: 'Beta intro',
        chapter_how_it_shows_up: 'Beta shows up',
        chapter_value_outcome: 'Beta outcome',
        chapter_value_team_effect: 'Beta team effect',
        chapter_risk_behaviour: 'Beta risk',
        chapter_risk_impact: 'Beta impact',
        chapter_development: 'Beta development',
      },
    ],
    balancing: {
      pair_key: 'alpha_beta',
      balancing_section_title: 'Legacy balancing',
      current_pattern_paragraph: 'Legacy current pattern.',
      practical_meaning_paragraph: 'Legacy practical meaning.',
      system_risk_paragraph: 'Legacy risk.',
      rebalance_intro: 'Legacy rebalance.',
      rebalance_actions: ['One'],
    },
    pairSummary: {
      pair_key: 'alpha_beta',
      pair_section_title: 'Legacy pair',
      pair_headline: 'Legacy pair headline',
      pair_opening_paragraph: 'Legacy pair opening.',
      pair_strength_paragraph: 'Legacy pair strength.',
      pair_tension_paragraph: 'Legacy pair tension.',
      pair_close_paragraph: 'Legacy pair close.',
    },
    application: {
      strengths: [{ signal_key: 'alpha', signal_label: 'Alpha', rank: 1, statement: 'Alpha strength.' }],
      watchouts: [{ signal_key: 'beta', signal_label: 'Beta', rank: 2, statement: 'Beta watchout.' }],
      developmentFocus: [{ signal_key: 'beta', signal_label: 'Beta', rank: 2, statement: 'Beta development.' }],
    },
    diagnostics: {
      readinessStatus: 'ready',
      scoringMethod: 'option_signal_weights_only',
      normalizationMethod: 'largest_remainder_integer_percentages',
      answeredQuestionCount: 2,
      totalQuestionCount: 2,
      signalCount: 2,
      derivedPairCount: 1,
      topPair: 'alpha_beta',
      counts: {
        domainCount: 1,
        questionCount: 2,
        optionCount: 8,
        weightCount: 8,
      },
      warnings: [],
    },
  };
}

test('ranked-pattern result renderer displays persisted reader-first sections in order', () => {
  const markup = renderToStaticMarkup(<RankedPatternResultReport payload={rankedPayload()} />);
  const expectedHeadings = [
    'Introduction',
    'Pattern at a Glance',
    'Core Interpretation',
    'Signal Profile',
    'What Shapes This Pattern',
    'How the Pattern Works',
    'What Comes Easily',
    'Where It Can Narrow',
    'How to Use It',
    'Take Forward',
  ];
  const headingPositions = expectedHeadings.map((heading) => {
    const position = markup.indexOf(`>${heading}</h2>`);
    assert.notEqual(position, -1, `${heading} should render`);
    return position;
  });

  assert.deepEqual(headingPositions, [...headingPositions].sort((left, right) => left - right));
  assert.match(markup, /data-ranked-pattern-result="true"/);
  assert.match(markup, /You may recognise this as a clear first-route pattern/);
  assert.match(markup, /Concentrated pattern/);
  assert.doesNotMatch(markup, /Version 1\.0\.0 · Pattern alpha_beta_gamma_delta/);
  assert.match(markup, /How to read this result/);
  assert.match(markup, /You may recognise this as a clear first-route pattern/);
  assert.match(markup, /Clear starting point/);
  assert.match(markup, /Range can compress/);
  assert.match(markup, /Use the ranked order/);
  assert.match(markup, /Take the whole pattern forward/);
});

test('ranked-pattern result renderer reads persisted ranks, percentages, score shape, and pattern key', () => {
  const markup = renderToStaticMarkup(<RankedPatternResultReport payload={rankedPayload()} />);

  for (const expected of ['Alpha', 'Beta', 'Gamma', 'Delta', '55%', '25%', '12%', '8%']) {
    assert.match(markup, new RegExp(expected));
  }

  assert.match(markup, /data-ranked-pattern-signal-distribution="true"/);
  assert.match(markup, /Score shape/);
  assert.match(markup, /Concentrated pattern/);
  assert.match(markup, /Pattern reference: alpha_beta_gamma_delta/);
  assert.doesNotMatch(markup, /Leading pair/);
  assert.doesNotMatch(markup, /Hero pair/);
  assert.doesNotMatch(markup, /Balancing pair/);
  assert.doesNotMatch(markup, />Drivers</);
  assert.doesNotMatch(markup, />Pair</);
  assert.doesNotMatch(markup, />Limitation</);
});

test('ranked-pattern renderer fails closed for missing required sections', () => {
  const payload = rankedPayload({ closingIntegration: undefined });
  const markup = renderToStaticMarkup(<RankedPatternResultReport payload={payload} />);

  assert.equal(isRankedPatternRenderablePayload(payload), false);
  assert.match(markup, /This ranked-pattern result cannot be displayed/);
  assert.doesNotMatch(markup, /Take the whole pattern forward/);
});

test('legacy single-domain renderer path remains available', () => {
  const markup = renderToStaticMarkup(
    <SingleDomainResultReport result={createSingleDomainResultsViewModel(legacyPayload())} />,
  );

  assert.match(markup, /Legacy Assessment/);
  assert.match(markup, /Leading pair/);
  assert.match(markup, /href="#drivers"/);
  assert.doesNotMatch(markup, /data-ranked-pattern-result="true"/);
});
