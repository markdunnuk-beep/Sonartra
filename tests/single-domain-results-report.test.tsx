import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';

import { SingleDomainResultsReport } from '@/components/results/single-domain-results-report';
import { createSingleDomainResultsViewModel } from '@/lib/server/single-domain-results-view-model';
import type {
  SingleDomainApplicationStatement,
  SingleDomainResultApplicationRoleItem,
  SingleDomainResultApplicationSection,
  SingleDomainResultPayload,
} from '@/lib/types/single-domain-result';

const globalsPath = join(process.cwd(), 'app', 'globals.css');

function buildPayload(): SingleDomainResultPayload {
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
      hero_subheadline: 'Identity line.',
      hero_opening: 'This is the hero opening.',
      hero_strength_paragraph: 'This is the hero strength paragraph.',
      hero_tension_paragraph: 'This is the hero tension paragraph.',
      hero_close_paragraph: 'This is the hero close paragraph.',
    },
    signals: [
      {
        signal_key: 'vision',
        signal_label: 'Vision',
        rank: 1,
        normalized_score: 38,
        raw_score: 4,
        position: 'primary',
        position_label: 'Primary',
        chapter_intro: 'Vision intro',
        chapter_how_it_shows_up: 'Vision shows up',
        chapter_value_outcome: 'Vision outcome',
        chapter_value_team_effect: 'Vision team effect',
        chapter_risk_behaviour: 'Vision risk behaviour',
        chapter_risk_impact: 'Vision risk impact',
        chapter_development: 'Vision development',
      },
      {
        signal_key: 'delivery',
        signal_label: 'Delivery',
        rank: 2,
        normalized_score: 31,
        raw_score: 3,
        position: 'secondary',
        position_label: 'Secondary',
        chapter_intro: 'Delivery intro',
        chapter_how_it_shows_up: 'Delivery shows up',
        chapter_value_outcome: 'Delivery outcome',
        chapter_value_team_effect: 'Delivery team effect',
        chapter_risk_behaviour: 'Delivery risk behaviour',
        chapter_risk_impact: 'Delivery risk impact',
        chapter_development: 'Delivery development',
      },
      {
        signal_key: 'people',
        signal_label: 'People',
        rank: 3,
        normalized_score: 19,
        raw_score: 2,
        position: 'supporting',
        position_label: 'Supporting',
        chapter_intro: 'People intro',
        chapter_how_it_shows_up: 'People shows up',
        chapter_value_outcome: 'People outcome',
        chapter_value_team_effect: 'People team effect',
        chapter_risk_behaviour: 'People risk behaviour',
        chapter_risk_impact: 'People risk impact',
        chapter_development: 'People development',
      },
      {
        signal_key: 'rigor',
        signal_label: 'Rigor',
        rank: 4,
        normalized_score: 12,
        raw_score: 1,
        position: 'underplayed',
        position_label: 'Underplayed',
        chapter_intro: 'Rigor intro',
        chapter_how_it_shows_up: 'Rigor shows up',
        chapter_value_outcome: 'Rigor outcome',
        chapter_value_team_effect: 'Rigor team effect',
        chapter_risk_behaviour: 'Rigor risk behaviour',
        chapter_risk_impact: 'Rigor creates a range gap here.',
        chapter_development: 'Rigor development',
      },
    ],
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
      pair_headline: 'Combined meaning',
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
        { signal_key: 'rigor', signal_label: 'Rigor', rank: 4, statement: 'Rigor development' },
      ],
    },
    diagnostics: {
      readinessStatus: 'ready',
      scoringMethod: 'option_signal_weights_only',
      normalizationMethod: 'largest_remainder_integer_percentages',
      answeredQuestionCount: 24,
      totalQuestionCount: 24,
      signalCount: 4,
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

function buildFullPatternApplicationSection(
  guidanceType: SingleDomainResultApplicationSection['guidanceType'],
  rows: readonly [
    readonly [SingleDomainResultApplicationRoleItem['driverRole'], string, string, number, string],
    readonly [SingleDomainResultApplicationRoleItem['driverRole'], string, string, number, string],
    readonly [SingleDomainResultApplicationRoleItem['driverRole'], string, string, number, string],
    readonly [SingleDomainResultApplicationRoleItem['driverRole'], string, string, number, string],
  ],
): SingleDomainResultApplicationSection {
  return {
    guidanceType,
    items: rows.map(([driverRole, signalKey, signalLabel, priority, text], index) => ({
      driverRole,
      signalKey,
      signalLabel,
      rank: index + 1,
      priority,
      text,
      linkedClaimType: guidanceType,
    })),
  };
}

function toApplicationStatement(
  item: SingleDomainResultApplicationRoleItem,
): SingleDomainApplicationStatement {
  return {
    signal_key: item.signalKey,
    signal_label: item.signalLabel,
    rank: item.rank,
    statement: item.text,
    driver_role: item.driverRole,
    priority: item.priority,
    linked_claim_type: item.linkedClaimType,
  };
}

function buildFullPatternPayload(): SingleDomainResultPayload {
  const payload = buildPayload();
  const relyOn = buildFullPatternApplicationSection('applied_strength', [
    ['primary_driver', 'results', 'Results', 1, 'RPVP rely primary results'],
    ['secondary_driver', 'vision', 'Vision', 2, 'RPVP rely secondary vision'],
    ['supporting_context', 'people', 'People', 3, 'RPVP rely supporting people'],
    ['range_limitation', 'process', 'Process', 4, 'RPVP rely limitation process'],
  ]);
  const notice = buildFullPatternApplicationSection('watchout', [
    ['primary_driver', 'results', 'Results', 1, 'RPVP notice primary results'],
    ['secondary_driver', 'vision', 'Vision', 2, 'RPVP notice secondary vision'],
    ['supporting_context', 'people', 'People', 3, 'RPVP notice supporting people'],
    ['range_limitation', 'process', 'Process', 4, 'RPVP notice limitation process'],
  ]);
  const develop = buildFullPatternApplicationSection('development_focus', [
    ['primary_driver', 'results', 'Results', 1, 'RPVP develop primary results'],
    ['secondary_driver', 'vision', 'Vision', 2, 'RPVP develop secondary vision'],
    ['supporting_context', 'people', 'People', 3, 'RPVP develop supporting people'],
    ['range_limitation', 'process', 'Process', 4, 'RPVP develop limitation process'],
  ]);

  payload.metadata.domainKey = 'leadership-approach';
  payload.hero.pair_key = 'results_vision';
  payload.balancing.pair_key = 'results_vision';
  payload.pairSummary.pair_key = 'results_vision';
  payload.diagnostics.topPair = 'results_vision';
  payload.signals = [
    {
      ...payload.signals[0]!,
      signal_key: 'results',
      signal_label: 'Results',
      rank: 1,
      normalized_score: 38,
      raw_score: 38,
      position: 'primary',
      position_label: 'Primary',
    },
    {
      ...payload.signals[1]!,
      signal_key: 'vision',
      signal_label: 'Vision',
      rank: 2,
      normalized_score: 31,
      raw_score: 31,
      position: 'secondary',
      position_label: 'Secondary',
    },
    {
      ...payload.signals[2]!,
      signal_key: 'people',
      signal_label: 'People',
      rank: 3,
      normalized_score: 19,
      raw_score: 19,
      position: 'supporting',
      position_label: 'Supporting',
    },
    {
      ...payload.signals[3]!,
      signal_key: 'process',
      signal_label: 'Process',
      rank: 4,
      normalized_score: 12,
      raw_score: 12,
      position: 'underplayed',
      position_label: 'Underplayed',
    },
  ];
  payload.application = {
    patternKey: 'results_vision_people_process',
    pairKey: 'results_vision',
    sections: {
      relyOn,
      notice,
      develop,
    },
    strengths: relyOn.items.map(toApplicationStatement),
    watchouts: notice.items.map(toApplicationStatement),
    developmentFocus: develop.items.map(toApplicationStatement),
  };

  return payload;
}

function countMatches(value: string, pattern: RegExp) {
  return value.match(pattern)?.length ?? 0;
}

test('single-domain results report renders the locked six-section flow and six rail anchors only', () => {
  const markup = renderToStaticMarkup(
    <SingleDomainResultsReport result={createSingleDomainResultsViewModel(buildPayload())} />,
  );

  const orderedSectionIds = ['intro', 'hero', 'drivers', 'pair', 'limitation', 'application'];
  const indexes = orderedSectionIds.map((sectionId) => markup.indexOf(`id="${sectionId}"`));

  indexes.forEach((index) => assert.ok(index >= 0));
  indexes.slice(1).forEach((index, idx) => assert.ok(index > indexes[idx]!));

  for (const anchorId of orderedSectionIds) {
    assert.match(markup, new RegExp(`href=\"#${anchorId}\"`));
  }

  for (const staleAnchor of ['signals', 'balancing', 'pair-summary']) {
    assert.doesNotMatch(markup, new RegExp(`href=\"#${staleAnchor}\"`));
    assert.doesNotMatch(markup, new RegExp(`id=\"${staleAnchor}\"`));
  }

  assert.match(markup, /data-result-reading-rail="true"/);
  assert.doesNotMatch(markup, /sonartra-report-shell-rail/);
});

test('single-domain results report renders persisted full-pattern application output without lower-order fallback', () => {
  const payload = buildFullPatternPayload();
  const viewModel = createSingleDomainResultsViewModel(payload);
  const markup = renderToStaticMarkup(<SingleDomainResultsReport result={viewModel} />);

  assert.equal(payload.application.patternKey, 'results_vision_people_process');
  assert.equal(payload.application.pairKey, 'results_vision');
  assert.equal(payload.application.sections?.relyOn.items.length, 4);
  assert.equal(payload.application.sections?.notice.items.length, 4);
  assert.equal(payload.application.sections?.develop.items.length, 4);
  assert.equal(payload.application.strengths.length, 4);
  assert.equal(payload.application.watchouts.length, 4);
  assert.equal(payload.application.developmentFocus.length, 4);

  assert.match(markup, /What to rely on, notice, and develop/);
  assert.match(markup, />Where to Lean In</);
  assert.match(markup, />Where to Stay Alert</);
  assert.match(markup, />Where to Grow</);
  assert.match(markup, /data-application-area="rely"/);
  assert.match(markup, /data-application-area="notice"/);
  assert.match(markup, /data-application-area="develop"/);

  for (const text of [
    'RPVP rely primary results',
    'RPVP rely secondary vision',
    'RPVP rely supporting people',
    'RPVP rely limitation process',
    'RPVP notice primary results',
    'RPVP notice secondary vision',
    'RPVP notice supporting people',
    'RPVP notice limitation process',
    'RPVP develop primary results',
    'RPVP develop secondary vision',
    'RPVP develop supporting people',
    'RPVP develop limitation process',
  ]) {
    assert.match(markup, new RegExp(text));
  }

  assert.equal(countMatches(markup, /RPVP rely /g), 4);
  assert.equal(countMatches(markup, /RPVP notice /g), 4);
  assert.equal(countMatches(markup, /RPVP develop /g), 4);
  assert.doesNotMatch(markup, /RVPP rely supporting process/);
  assert.doesNotMatch(markup, /RVPP rely limitation people/);
  assert.doesNotMatch(markup, /Vision strength/);
  assert.doesNotMatch(markup, /Delivery watchout/);
  assert.doesNotMatch(markup, /Rigor development/);
  assert.equal(countMatches(markup, /<main\b/g), 1);

  const ids = [...markup.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
});

test('single-domain report shell lets desktop reading rail use the full sticky containing height', () => {
  const cssSource = readFileSync(globalsPath, 'utf8');
  const desktopShellLayoutRule = cssSource.match(
    /@media \(min-width: 1280px\) \{[\s\S]*?\.sonartra-report-shell-layout\s*\{(?<rule>[\s\S]*?)\n    \}/,
  )?.groups?.rule;

  assert.ok(desktopShellLayoutRule);
  assert.match(desktopShellLayoutRule, /align-items: stretch;/);
  assert.doesNotMatch(desktopShellLayoutRule, /align-items: start;/);
});

test('single-domain results report keeps hero, drivers, limitation, and application visually distinct', () => {
  const markup = renderToStaticMarkup(
    <SingleDomainResultsReport result={createSingleDomainResultsViewModel(buildPayload())} />,
  );

  assert.match(markup, /sonartra-report-hero/);
  assert.match(markup, /Your leadership pattern/);
  assert.match(markup, /Your Style at a Glance/);
  assert.match(markup, /What Shapes Your Approach/);
  assert.match(markup, /How Your Style Balances/);
  assert.match(markup, /Where This Can Work Against You/);
  assert.match(markup, /Putting This Into Practice/);
  assert.match(markup, /Vision-led pattern, reinforced by Delivery/);
  assert.match(markup, /This is the hero opening/);
  assert.match(markup, /Pair opening paragraph/);
  assert.match(markup, /Result basis/);
  assert.doesNotMatch(markup, /Why this result was generated/);
  assert.match(markup, /Built from 24\/24 completed responses, ordered to match the result headline/);
  assert.match(markup, /Headline signal evidence/);
  assert.match(markup, /Full signal rank evidence/);
  assert.match(markup, /View full evidence/);
  assert.match(markup, /<details class="sonartra-single-domain-evidence-details">/);
  assert.match(markup, /sonartra-single-domain-proof-grid/);
  assert.match(markup, /sonartra-single-domain-proof-item/);
  assert.match(markup, /Primary signal/);
  assert.match(markup, /Reinforcing signal/);
  assert.match(markup, /Supporting signal/);
  assert.match(markup, /Least available range/);
  assert.match(markup, /Response base/);
  assert.match(markup, /38%/);
  assert.match(markup, /31%/);
  assert.match(markup, /19%/);
  assert.match(markup, /12%/);
  assert.match(markup, /24\/24 completed responses/);
  assert.match(markup, /Signal pattern/);
  assert.match(markup, /Vision appears strongest, Delivery reinforces it, and Rigor is the least available range/);
  assert.match(markup, /Ranked from 24\/24 completed responses/);
  assert.match(markup, /Missing range/);
  assert.match(markup, /Rigor: Balancing your approach/);
  assert.match(markup, /sonartra-single-domain-meta-strip/);
  assert.match(markup, /sonartra-single-domain-version-note/);
  assert.match(markup, />Completed</);
  assert.match(markup, />Time</);
  assert.match(markup, />Assessment</);
  assert.doesNotMatch(markup, />Version</);
  assert.match(markup, /Report version 1\.0\.0/);
  assert.match(markup, />Leading pair</);
  assert.match(markup, /12 Apr 2026/);
  assert.match(markup, /\d{2}:\d{2}/);
  assert.match(markup, /Vision and Delivery/);
  assert.match(markup, /Main cause/);
  assert.match(markup, /Reinforcing cause/);
  assert.match(markup, /Supporting layer/);
  assert.match(markup, /Missing range/);
  assert.match(markup, /sonartra-single-domain-driver-flow/);
  assert.match(markup, /sonartra-single-domain-driver-entry-primary/);
  assert.match(markup, /sonartra-single-domain-driver-entry-limitation/);
  assert.doesNotMatch(markup, /sonartra-single-domain-driver-layout/);
  assert.doesNotMatch(markup, /sonartra-single-domain-driver-support-rail/);
  assert.doesNotMatch(markup, /sonartra-single-domain-driver-context-stack/);
  assert.match(markup, /sonartra-single-domain-section-pair/);
  assert.match(markup, /sonartra-single-domain-section-limitation/);
  assert.match(markup, /sonartra-single-domain-application-flow/);
  assert.match(markup, /sonartra-single-domain-application-entry-rely/);
  assert.match(markup, /sonartra-single-domain-application-entry-notice/);
  assert.match(markup, /sonartra-single-domain-application-entry-develop/);
  assert.match(markup, /sonartra-single-domain-application-entry-header/);
  assert.match(markup, /sonartra-single-domain-application-entry-heading/);
  assert.match(markup, /sonartra-single-domain-application-entry-index/);
  assert.match(markup, /sonartra-single-domain-application-point-primary/);
  assert.doesNotMatch(markup, /sonartra-single-domain-application-grid/);
  assert.doesNotMatch(markup, /sonartra-single-domain-application-card/);
  assert.match(markup, />Primary driver</);
  assert.match(markup, />Secondary driver</);
  assert.match(markup, />Supporting context</);
  assert.match(markup, />Range limitation</);
  assert.match(markup, /<h3 class="sonartra-single-domain-driver-entry-title">Primary driver<\/h3>/);
  assert.match(markup, /<h3 class="sonartra-single-domain-driver-entry-title">Secondary driver<\/h3>/);
  assert.match(markup, />Where to Lean In</);
  assert.match(markup, />Where to Stay Alert</);
  assert.match(markup, />Where to Grow</);
  assert.match(markup, /The strengths you can rely on most when it matters\./);
  assert.match(markup, /Early signs to watch so performance doesn’t drift\./);
  assert.match(markup, /The next areas to focus on to strengthen your effectiveness\./);
  assert.match(markup, /data-application-area="rely"/);
  assert.match(markup, /data-application-area="notice"/);
  assert.match(markup, /data-application-area="develop"/);
  assert.match(markup, />01<\/span>/);
  assert.match(markup, />02<\/span>/);
  assert.match(markup, />03<\/span>/);
  assert.match(markup, /<h3 class="sonartra-single-domain-application-entry-title">Where to Lean In<\/h3>/);
  assert.match(markup, /<h3 class="sonartra-single-domain-application-entry-title">Where to Stay Alert<\/h3>/);
  assert.match(markup, /<h3 class="sonartra-single-domain-application-entry-title">Where to Grow<\/h3>/);
  assert.match(markup, /Vision strength/);
  assert.match(markup, /Delivery watchout/);
  assert.match(markup, /Rigor development/);
  assert.match(markup, /sonartra-single-domain-section-limitation/);
});

test('single-domain results report uses score badges when persisted normalized scores do not sum to 100', () => {
  const payload = buildPayload();
  payload.signals[0]!.normalized_score = 34;
  payload.signals[1]!.normalized_score = 27;
  payload.signals[2]!.normalized_score = 16;
  payload.signals[3]!.normalized_score = 11;

  const markup = renderToStaticMarkup(
    <SingleDomainResultsReport result={createSingleDomainResultsViewModel(payload)} />,
  );

  assert.match(markup, /Score 34/);
  assert.match(markup, /Score 27/);
  assert.match(markup, /Score 16/);
  assert.match(markup, /Score 11/);
  assert.doesNotMatch(markup, />34%<\/span>/);
});

test('single-domain results report reduces dense repeated prose with accessible disclosure', () => {
  const payload = buildPayload();
  payload.hero.hero_strength_paragraph =
    'Results strengthens this pattern by adding urgency and focus. You push work forward and make progress visible. This helps prevent drift and keeps attention on outcomes. The risk is that pace can move ahead of delivery. Results strengthens this pattern by adding urgency and focus. You push for outcomes and help keep work moving. This prevents drift and maintains momentum.';
  payload.signals[0]!.chapter_intro =
    'Vision is the main driver of this pattern. You focus on where the work is going and why it matters. You define direction clearly. This helps create energy and forward movement. Vision is the main driver of this pattern. You focus on where the work is going and why it matters. The risk is that direction can feel clear to you before it is fully understood by others.';

  const markup = renderToStaticMarkup(
    <SingleDomainResultsReport result={createSingleDomainResultsViewModel(payload)} />,
  );

  assert.match(markup, /<details class="sonartra-prose-details">/);
  assert.match(markup, /<summary><span>Read supporting context<\/span><\/summary>/);
  assert.match(markup, /<summary><span>Read more about primary driver<\/span><\/summary>/);
  assert.match(markup, /The risk is that direction can feel clear to you before it is fully understood by others\./);
  assert.match(markup, /data-result-reading-rail="true"/);
  assert.match(markup, /href="#drivers"/);
});

test('single-domain results report carries weaker-signal range language into limitation and application', () => {
  const markup = renderToStaticMarkup(
    <SingleDomainResultsReport result={createSingleDomainResultsViewModel(buildPayload())} />,
  );

  assert.match(markup, /Rigor creates a range gap here/);
  assert.match(markup, /Rigor development/);
  assert.match(markup, /Rigor: System risk paragraph/);
});

test('single-domain results report aligns limitation prefix with accepted pair balancing text', () => {
  const payload = buildPayload();
  payload.hero.pair_key = 'process_results';
  payload.pairSummary.pair_key = 'process_results';
  payload.balancing.pair_key = 'process_results';
  payload.diagnostics.topPair = 'process_results';
  payload.signals = [
    {
      ...payload.signals[0]!,
      signal_key: 'results',
      signal_label: 'Results',
      rank: 1,
      normalized_score: 38,
      raw_score: 38,
      position: 'primary',
      position_label: 'Primary',
    },
    {
      ...payload.signals[1]!,
      signal_key: 'process',
      signal_label: 'Process',
      rank: 2,
      normalized_score: 31,
      raw_score: 31,
      position: 'secondary',
      position_label: 'Secondary',
    },
    {
      ...payload.signals[2]!,
      signal_key: 'people',
      signal_label: 'People',
      rank: 3,
      normalized_score: 19,
      raw_score: 19,
      position: 'supporting',
      position_label: 'Supporting',
    },
    {
      ...payload.signals[3]!,
      signal_key: 'vision',
      signal_label: 'Vision',
      rank: 4,
      normalized_score: 12,
      raw_score: 12,
      position: 'underplayed',
      position_label: 'Underplayed',
    },
  ];
  payload.balancing.balancing_section_title = 'When structure outruns commitment';
  payload.balancing.system_risk_paragraph =
    'The People signal is therefore the missing range to develop around this result.';
  payload.balancing.rebalance_intro =
    'people: The People signal is therefore the missing range to develop around this result.';

  const markup = renderToStaticMarkup(
    <SingleDomainResultsReport result={createSingleDomainResultsViewModel(payload)} />,
  );

  assert.match(markup, /Results-led pattern, reinforced by Process/);
  assert.match(markup, />Leading pair</);
  assert.match(markup, />Results and Process</);
  assert.match(markup, /Shown primary-first to match the headline\./);
  assert.doesNotMatch(markup, /Vision:\s+The People signal/i);
  assert.match(markup, /People:\s+The People signal is therefore the missing range/i);
});

test('single-domain report spacing and labels support lighter mobile scanability without changing anchors', () => {
  const cssSource = readFileSync(globalsPath, 'utf8');

  assert.match(cssSource, /\.sonartra-single-domain-section::before\s*\{[\s\S]*?top:\s*-1\.35rem;/);
  assert.match(cssSource, /\.sonartra-single-domain-report-flow\s*\{[\s\S]*?gap:\s*3\.2rem;/);
  assert.match(cssSource, /\.sonartra-single-domain-proof-grid\s*\{[\s\S]*?gap:\s*0\.56rem;/);
  assert.match(cssSource, /\.sonartra-single-domain-evidence-details\s*\{[\s\S]*?border-top:\s*1px solid rgba\(255, 255, 255, 0\.04\);/);
  assert.match(cssSource, /\.sonartra-single-domain-version-note\s*\{[\s\S]*?color:\s*rgba\(207, 218, 243, 0\.34\);/);
  assert.match(cssSource, /\.sonartra-single-domain-driver-entry\s*\{[\s\S]*?padding-top:\s*1\.5rem;/);
  assert.match(cssSource, /\.sonartra-single-domain-application-flow\s*\{[\s\S]*?gap:\s*1\.9rem;/);
  assert.match(cssSource, /\.sonartra-single-domain-application-entry\s*\{[\s\S]*?border-radius:\s*1\.4rem;/);
  assert.match(cssSource, /\.sonartra-single-domain-application-entry-index\s*\{[\s\S]*?min-width:\s*2\.45rem;/);
  assert.match(cssSource, /\.sonartra-single-domain-application-entry-heading\s*\{[\s\S]*?flex-direction:\s*column;/);
  assert.match(cssSource, /\.sonartra-single-domain-application-entry-subtitle\s*\{[\s\S]*?font-size:\s*0\.92rem;/);
  assert.match(cssSource, /\.sonartra-single-domain-application-point\s*\{[\s\S]*?padding-top:\s*0\.95rem;/);
  assert.match(cssSource, /\.sonartra-single-domain-section-label\s*\{[\s\S]*?text-transform:\s*none;/);
  assert.match(
    cssSource,
    /@media \(max-width: 767px\) \{[\s\S]*?\.sonartra-report-body-soft\s*\{[\s\S]*?line-height:\s*1\.82rem;/,
  );
  assert.match(
    cssSource,
    /@media \(max-width: 767px\) \{[\s\S]*?\.sonartra-single-domain-application-entry\s*\{[\s\S]*?padding:\s*1\.15rem 1rem 1\.05rem;/,
  );
  assert.match(
    cssSource,
    /@media \(max-width: 767px\) \{[\s\S]*?\.sonartra-single-domain-application-entry-subtitle\s*\{[\s\S]*?font-size:\s*0\.87rem;/,
  );
});

test('single-domain results view model preserves authored body casing and formats labels only', () => {
  const payload = buildPayload();
  payload.hero.pair_key = 'results_process';
  payload.hero.hero_strength_paragraph =
    'The risk is over-relying on performance-critical follow-through and outcome-focused pressure.';
  payload.signals[0]!.chapter_intro =
    'Vision can under-read the room when follow-through becomes the only measure.';
  payload.pairSummary.pair_key = 'results_process';
  payload.pairSummary.pair_opening_paragraph =
    'Process and results should remain lower-case when authored that way in a sentence.';
  payload.balancing.pair_key = 'results_process';
  payload.balancing.system_risk_paragraph =
    'People can be under-read when the plan becomes performance-critical too early.';

  const viewModel = createSingleDomainResultsViewModel(payload);
  const markup = renderToStaticMarkup(<SingleDomainResultsReport result={viewModel} />);

  assert.equal(viewModel.pairLabel, 'Results and Process');
  assert.match(markup, /over-relying on performance-critical follow-through/);
  assert.match(markup, /outcome-focused pressure/);
  assert.match(markup, /under-read the room/);
  assert.match(markup, /Process and results should remain lower-case/);
  assert.match(markup, /performance-critical too early/);
  assert.doesNotMatch(markup, /Over Relying/);
  assert.doesNotMatch(markup, /Under Read/);
  assert.doesNotMatch(markup, /Performance Critical/);
  assert.doesNotMatch(markup, /Follow Through/);
  assert.doesNotMatch(markup, /Outcome Focused/);
});
