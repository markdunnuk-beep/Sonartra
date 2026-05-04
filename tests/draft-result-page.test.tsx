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

function countOccurrences(markup: string, value: string) {
  return markup.split(value).length - 1;
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

  assert.match(markup, /data-draft-pattern-signature="true"/);
  assert.match(markup, /Pattern signature/);
  assert.match(markup, /Concentrated pattern/);
  assert.match(markup, /First rank clearly anchors this result/);

  for (const signal of ['Deep Focus', 'Creative Movement', 'Physical Rhythm', 'Social Exchange']) {
    assert.match(markup, new RegExp(`>${signal}<`));
  }

  for (const percentage of ['52%', '26%', '14%', '8%']) {
    assert.match(markup, new RegExp(`>${percentage}<`));
  }

  for (const role of ['Anchor', 'Shaper', 'Support', 'Stretch']) {
    assert.match(markup, new RegExp(`>${role}<`));
  }
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
