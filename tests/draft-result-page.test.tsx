import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { DraftRankedResultPreview } from '@/components/draft/draft-ranked-result-preview';
import { rankedPatternExample } from '@/content/draft-result/ranked-pattern-example';

const requiredHeadings = [
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
] as const;

const previousDisplayLabels = [
  'Context',
  'Orientation',
  'Recognition',
  'Signal roles',
  'Pattern mechanics',
  'Pattern synthesis',
  'Strengths',
  'Narrowing',
  'Application',
  'Closing integration',
] as const;

const requiredSectionHrefs = [
  '#context',
  '#orientation',
  '#recognition',
  '#signal-roles',
  '#pattern-mechanics',
  '#pattern-synthesis',
  '#strengths',
  '#narrowing',
  '#application',
  '#closing-integration',
] as const;

function countOccurrences(markup: string, value: string) {
  return markup.split(value).length - 1;
}

function expectedPolishedSignalCasing(text: string) {
  return text
    .replace(/\bDeep focus\b/g, 'Deep Focus')
    .replace(/\bCreative movement\b/g, 'Creative Movement')
    .replace(/\bPhysical rhythm\b/g, 'Physical Rhythm')
    .replace(/\bSocial exchange\b/g, 'Social Exchange');
}

function getExpectedSignatureRows() {
  const [orientation] = rankedPatternExample['06_Orientation'];
  const signalRoles = rankedPatternExample['08_Signal_Roles'];
  const rankedSignalKeys = [
    orientation.rank_1_signal_key,
    orientation.rank_2_signal_key,
    orientation.rank_3_signal_key,
    orientation.rank_4_signal_key,
  ] as const;
  const scores = [52, 26, 14, 8] as const;
  const roles = ['Main route', 'Adds energy', 'Support', 'Use deliberately'] as const;

  return rankedSignalKeys.map((signalKey, index) => ({
    label: signalRoles.find((role) => role.signal_key === signalKey)?.signal_label ?? signalKey,
    rank: index + 1,
    role: index === 2 && signalKey === 'physical_rhythm' ? 'Helps reset' : roles[index],
    score: scores[index],
  }));
}

test('draft ranked result page renders all report-facing section headings in order', () => {
  const markup = renderToStaticMarkup(<DraftRankedResultPreview />);
  const headingPositions = requiredHeadings.map((heading) => {
    const position = markup.indexOf(`>${heading}</h2>`);

    assert.notEqual(position, -1, `${heading} heading should render`);
    return position;
  });

  assert.deepEqual(headingPositions, [...headingPositions].sort((left, right) => left - right));
});

test('draft ranked result page does not render old schema labels as h2 headings or rail labels', () => {
  const markup = renderToStaticMarkup(<DraftRankedResultPreview />);

  for (const label of previousDisplayLabels) {
    assert.doesNotMatch(markup, new RegExp(`>${label}</h2>`));
    assert.doesNotMatch(markup, new RegExp(`>${label}</span>`));
  }
});

test('draft ranked result page renders the live-style reading rail cues', () => {
  const markup = renderToStaticMarkup(<DraftRankedResultPreview />);

  assert.match(markup, /data-draft-result-reading-rail="true"/);
  assert.match(markup, /src="\/images\/brand\/sonartra-logo-white\.svg"/);
  assert.match(markup, /alt="Sonartra"/);
  assert.match(markup, /aria-current="step"/);
  assert.match(markup, /Now reading/);
  assert.match(markup, /Up next/);

  for (const heading of requiredHeadings) {
    assert.match(markup, new RegExp(`>${heading}<`));
  }
});

test('draft ranked result page renders a compact mobile section navigator', () => {
  const markup = renderToStaticMarkup(<DraftRankedResultPreview />);

  assert.match(markup, /data-draft-mobile-section-navigator="true"/);
  assert.match(markup, /aria-label="Mobile draft report sections"/);
  assert.match(markup, /aria-label="Open report sections"/);
  assert.match(markup, /aria-expanded="false"/);
  assert.match(markup, />Reading</);
  assert.match(markup, />Sections</);

  for (const heading of requiredHeadings) {
    assert.match(markup, new RegExp(`>${heading}<`));
  }

  for (const href of requiredSectionHrefs) {
    assert.match(markup, new RegExp(`href="${href}"`));
  }
});

test('draft ranked result page keeps one subtle prototype marker without schema chrome', () => {
  const markup = renderToStaticMarkup(<DraftRankedResultPreview />);

  assert.equal(countOccurrences(markup, 'Prototype preview'), 1);
  assert.doesNotMatch(markup, /Draft report prototype/i);
  assert.doesNotMatch(markup, /Static schema-faithful UX validation page/);
  assert.doesNotMatch(markup, /Static sample \/ not live result/i);
  assert.doesNotMatch(markup, /ranked pattern import schema/);
  assert.doesNotMatch(markup, /Briefing section/i);
  assert.doesNotMatch(markup, /Draft example only\. Replace with final domain copy before release\./);
  assert.doesNotMatch(markup, />flow-state</i);
});

test('draft ranked result page renders the pattern signature signal band', () => {
  const markup = renderToStaticMarkup(<DraftRankedResultPreview />);
  const expectedSignatureRows = getExpectedSignatureRows();

  assert.match(markup, /data-draft-pattern-signature="true"/);
  assert.match(markup, /Pattern signature/);
  assert.match(markup, /Concentrated pattern/);
  assert.match(markup, /The first signal is the clearest starting point/);

  const ariaLabelPositions = expectedSignatureRows.map(({ label, rank, role, score }) => {
    const ariaLabel = `${label}, rank ${rank}, ${role}, ${score}%`;
    const position = markup.indexOf(`aria-label="${ariaLabel}"`);

    assert.notEqual(position, -1, `${ariaLabel} should render in the pattern signature`);
    assert.match(markup, new RegExp(`>${score}%<`));
    assert.match(markup, new RegExp(`>${label}<`));

    return position;
  });

  assert.deepEqual(ariaLabelPositions, [...ariaLabelPositions].sort((left, right) => left - right));

  for (const { label, score } of expectedSignatureRows.slice(0, 2)) {
    assert.match(markup, new RegExp(`>${score}%<.*>${label}<`, 's'));
  }

  for (const previousRole of ['ANCHOR', 'SHAPER', 'STRETCH', 'STRETCH RANGE']) {
    assert.doesNotMatch(markup, new RegExp(`>${previousRole}<`));
  }
});

test('draft ranked result page renders plain signal profile sublabels', () => {
  const markup = renderToStaticMarkup(<DraftRankedResultPreview />);
  const [orientation] = rankedPatternExample['06_Orientation'];

  for (const label of ['What this helps', 'Watch for', 'Try this']) {
    assert.match(markup, new RegExp(`>${label}<`));
  }

  for (const previousLabel of ['PRODUCTIVE EXPRESSION', 'RISK PATTERN', 'DEVELOPMENT NOTE', 'STRETCH RANGE']) {
    assert.doesNotMatch(markup, new RegExp(`>${previousLabel}<`));
  }

  assert.match(markup, new RegExp(`>${expectedPolishedSignalCasing(orientation.orientation_title)}<`));
  assert.doesNotMatch(markup, />Deep focus|>Creative movement|>Physical rhythm|>Social exchange/);
});

test('draft ranked result page renders a draft-only reading mode toggle with dark as default', () => {
  const markup = renderToStaticMarkup(<DraftRankedResultPreview />);

  assert.match(markup, /data-focus-mode="false"/);
  assert.match(markup, /data-reading-mode="dark"/);
  assert.match(markup, /aria-label="Switch to light reading mode"/);
  assert.match(markup, /aria-pressed="false"/);
  assert.match(markup, />light<\/span>/);
});

test('draft ranked result page renders a rail focus mode toggle without fullscreen markup', () => {
  const markup = renderToStaticMarkup(<DraftRankedResultPreview />);

  assert.match(markup, /aria-label="Enter focus mode"/);
  assert.match(markup, />Focus<\/span>/);
  assert.doesNotMatch(markup, /requestFullscreen/);
  assert.doesNotMatch(markup, /fullscreenchange/);
});

test('draft ranked result page does not expose legacy single-domain section labels', () => {
  const markup = renderToStaticMarkup(<DraftRankedResultPreview />);

  assert.doesNotMatch(markup, />Hero</);
  assert.doesNotMatch(markup, />Drivers</);
  assert.doesNotMatch(markup, />Pair</);
  assert.doesNotMatch(markup, />Limitation</);
});

test('draft ranked result page keeps fixture-driven content without duplicate mechanism output', () => {
  const markup = renderToStaticMarkup(<DraftRankedResultPreview />);
  const [context] = rankedPatternExample['05_Context'];
  const [mechanics] = rankedPatternExample['09_Pattern_Mechanics'];
  const [synthesis] = rankedPatternExample['10_Pattern_Synthesis'];

  assert.ok(markup.includes(context.domain_definition));
  assert.ok(markup.includes(synthesis.synthesis_title));
  assert.ok(markup.includes(synthesis.synthesis_text));
  assert.equal(countOccurrences(markup, mechanics.core_mechanism), 1);
  assert.ok(markup.includes(mechanics.why_it_shows_up));
  assert.ok(markup.includes(mechanics.what_it_protects));
});
