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
  assert.equal([...markup.matchAll(/data-ranked-pattern-signal-role-group="true"/g)].length, 4);
  assert.equal([...markup.matchAll(/data-ranked-pattern-signal-role-card="true"/g)].length, 12);
  assert.equal([...markup.matchAll(/What this helps/g)].length, 4);
  assert.equal([...markup.matchAll(/Watch for/g)].length, 4);
  assert.equal([...markup.matchAll(/Try this/g)].length, 4);
  assert.match(markup, /Clear starting point/);
  assert.match(markup, /Range can compress/);
  assert.match(markup, /Use the ranked order/);
  assert.match(markup, /Take the whole pattern forward/);
});

test('ranked-pattern signal profile maps persisted 08_Signal_Roles fields explicitly', () => {
  const payload = rankedPayload({
    signalRoles: [
      {
        lookupKey: 'role_alpha_1',
        signalKey: 'alpha',
        rankPosition: 1,
        fieldValues: {
          rank_position: '1',
          rank_role: 'dominant',
          title: 'Alpha role title',
          description: 'Alpha role meaning belongs in the intro.',
          productive_expression: 'Alpha productive expression belongs under what this helps.',
          risk_pattern: 'Alpha risk pattern belongs under watch for.',
          development_note: 'Alpha development note belongs under try this.',
        },
      },
      {
        lookupKey: 'role_beta_2',
        signalKey: 'beta',
        rankPosition: 2,
        fieldValues: {
          rank_position: '2',
          rank_role: 'secondary',
          title: 'Beta role title',
          description: 'Beta role meaning belongs in the intro.',
          productive_expression: 'Beta productive expression belongs under what this helps.',
          risk_pattern: 'Beta risk pattern belongs under watch for.',
          development_note: 'Beta development note belongs under try this.',
        },
      },
      {
        lookupKey: 'role_gamma_3',
        signalKey: 'gamma',
        rankPosition: 3,
        fieldValues: {
          rank_position: '3',
          rank_role: 'tertiary',
          title: 'Gamma role title',
          description: 'Gamma role meaning belongs in the intro.',
          productive_expression: 'Gamma productive expression belongs under what this helps.',
          risk_pattern: 'Gamma risk pattern belongs under watch for.',
          development_note: 'Gamma development note belongs under try this.',
        },
      },
      {
        lookupKey: 'role_delta_4',
        signalKey: 'delta',
        rankPosition: 4,
        fieldValues: {
          rank_position: '4',
          rank_role: 'least_expressed',
          title: 'Delta role title',
          description: 'Delta role meaning belongs in the intro.',
          productive_expression: 'Delta productive expression belongs under what this helps.',
          risk_pattern: 'Delta risk pattern belongs under watch for.',
          development_note: 'Delta development note belongs under try this.',
        },
      },
    ],
  });
  const markup = renderToStaticMarkup(<RankedPatternResultReport payload={payload} />);

  assert.match(markup, /Alpha role title/);
  assert.match(markup, /Alpha role meaning belongs in the intro/);
  assert.match(markup, /What this helps[\s\S]*Alpha productive expression belongs under what this helps/);
  assert.match(markup, /Watch for[\s\S]*Alpha risk pattern belongs under watch for/);
  assert.match(markup, /Try this[\s\S]*Alpha development note belongs under try this/);
  assert.match(markup, /Main route/);
  assert.match(markup, /Supporting route/);
  assert.match(markup, /Extending range/);
  assert.match(markup, /Deliberate range/);
  assert.doesNotMatch(markup, />dominant</);
  assert.doesNotMatch(markup, />secondary</);
  assert.doesNotMatch(markup, />tertiary</);
  assert.doesNotMatch(markup, />least_expressed</);
  assert.doesNotMatch(markup, /undefined|null/);
});

test('ranked-pattern strengths cards render persisted 11_Strengths fields explicitly', () => {
  const payload = rankedPayload({
    strengths: [
      {
        lookupKey: 'strength_alpha_1',
        itemKey: 'strength_1',
        priority: 1,
        fieldValues: {
          strength_title: 'Clear outcomes people can act on',
          strength_text: 'At your best, this leadership pattern names the outcome and the next step.',
          linked_signal_key: 'alpha_signal',
        },
      },
      {
        lookupKey: 'strength_beta_2',
        itemKey: 'strength_2',
        priority: 2,
        fieldValues: {
          strength_title: 'Momentum with a usable path',
          strength_text: 'Others benefit because the work has a clearer route and handover.',
          linked_signal_key: 'beta_signal',
        },
      },
      {
        lookupKey: 'strength_gamma_3',
        itemKey: 'strength_3',
        priority: 3,
        fieldValues: {
          strength_title: 'Progress people can understand and sustain',
          strength_text: 'This strengthens your leadership because the main route becomes easier to carry.',
          linked_signal_key: 'gamma_signal',
        },
      },
    ],
  });
  const markup = renderToStaticMarkup(<RankedPatternResultReport payload={payload} />);

  assert.match(markup, /Priority 1/);
  assert.match(markup, /<h3[^>]*>Clear outcomes people can act on<\/h3>/);
  assert.match(markup, /<p[^>]*>At your best, this leadership pattern names the outcome and the next step\.<\/p>/);
  assert.match(markup, /Alpha Signal/);
  assert.doesNotMatch(markup, />alpha_signal</);
  assert.doesNotMatch(markup, /alpha_signal<\/p>/);
  assert.doesNotMatch(markup, /undefined|null/);

  const priorityPosition = markup.indexOf('Priority 1');
  const titlePosition = markup.indexOf('Clear outcomes people can act on');
  const bodyPosition = markup.indexOf('At your best, this leadership pattern names the outcome and the next step.');
  assert.ok(priorityPosition < titlePosition, 'priority label should render before the strength title');
  assert.ok(titlePosition < bodyPosition, 'strength title should render before strength text');
});

test('ranked-pattern narrowing cards render persisted 12_Narrowing fields explicitly', () => {
  const payload = rankedPayload({
    narrowing: [
      {
        lookupKey: 'narrowing_alpha_1',
        itemKey: 'narrowing_1',
        priority: 1,
        fieldValues: {
          narrowing_title: 'Moving before trust has caught up',
          narrowing_text: 'The leadership risk is increasing pace before confidence is strong enough.',
          missing_range_signal_key: 'people',
        },
      },
      {
        lookupKey: 'narrowing_beta_2',
        itemKey: 'narrowing_2',
        priority: 2,
        fieldValues: {
          narrowing_title: 'Structure without enough direction',
          narrowing_text: 'The work can become orderly without being clear about where it is heading.',
          missing_range_signal_key: 'vision',
        },
      },
      {
        lookupKey: 'narrowing_gamma_3',
        itemKey: 'narrowing_3',
        priority: 3,
        fieldValues: {
          narrowing_title: 'Decisions without enough handover',
          narrowing_text: 'The next step can be named before the route is easy for others to follow.',
          missing_range_signal_key: 'process',
        },
      },
    ],
  });
  const markup = renderToStaticMarkup(<RankedPatternResultReport payload={payload} />);

  assert.match(markup, /Priority 1/);
  assert.match(markup, /<h3[^>]*>Moving before trust has caught up<\/h3>/);
  assert.match(markup, /<p[^>]*>The leadership risk is increasing pace before confidence is strong enough\.<\/p>/);
  assert.match(markup, /People/);
  assert.doesNotMatch(markup, />people</);
  assert.doesNotMatch(markup, /people<\/p>/);
  assert.doesNotMatch(markup, /missing_range_signal_key/);
  assert.doesNotMatch(markup, /undefined|null/);

  const priorityPosition = markup.indexOf('Priority 1');
  const signalPosition = markup.indexOf('People');
  const titlePosition = markup.indexOf('Moving before trust has caught up');
  const bodyPosition = markup.indexOf('The leadership risk is increasing pace before confidence is strong enough.');
  assert.ok(priorityPosition < titlePosition, 'priority label should render before the narrowing title');
  assert.ok(signalPosition < titlePosition, 'signal tag should render before the narrowing title');
  assert.ok(titlePosition < bodyPosition, 'narrowing title should render before narrowing text');
});

test('ranked-pattern result renderer reads persisted ranks, percentages, score shape, and pattern key', () => {
  const markup = renderToStaticMarkup(<RankedPatternResultReport payload={rankedPayload()} />);

  for (const expected of ['Alpha', 'Beta', 'Gamma', 'Delta', '55%', '25%', '12%', '8%']) {
    assert.match(markup, new RegExp(expected));
  }

  assert.match(markup, /data-ranked-pattern-signal-distribution="true"/);
  assert.equal([...markup.matchAll(/data-ranked-pattern-snapshot-card="true"/g)].length, 4);
  const snapshotOrder = ['Alpha', 'Beta', 'Gamma', 'Delta'].map((label) => markup.indexOf(`>${label}</p>`));
  assert.deepEqual(snapshotOrder, [...snapshotOrder].sort((left, right) => left - right));
  assert.match(markup, /Signal shape/);
  assert.match(markup, /One signal is carrying most of this pattern/);
  assert.match(markup, /Completed responses/);
  assert.doesNotMatch(markup, />Responses</);
  assert.doesNotMatch(markup, /Score shape/);
  assert.doesNotMatch(markup, /Pattern shape/);
  assert.doesNotMatch(markup, /Ranked spread/);
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
