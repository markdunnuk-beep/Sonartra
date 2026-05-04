import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { DraftRankedResultPreview } from '@/components/draft/draft-ranked-result-preview';

const requiredHeadings = [
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

test('draft ranked result page renders all schema section headings in order', () => {
  const markup = renderToStaticMarkup(<DraftRankedResultPreview />);
  const headingPositions = requiredHeadings.map((heading) => {
    const position = markup.indexOf(`>${heading}</h2>`);

    assert.notEqual(position, -1, `${heading} heading should render`);
    return position;
  });

  assert.deepEqual(headingPositions, [...headingPositions].sort((left, right) => left - right));
});

test('draft ranked result page is clearly marked as static prototype content', () => {
  const markup = renderToStaticMarkup(<DraftRankedResultPreview />);

  assert.match(markup, /Draft report prototype/);
  assert.match(markup, /Static schema-faithful UX validation page/);
  assert.match(markup, /Static sample \/ not live result/);
  assert.match(markup, /ranked pattern import schema/);
});

test('draft ranked result page does not expose legacy single-domain section labels', () => {
  const markup = renderToStaticMarkup(<DraftRankedResultPreview />);

  assert.doesNotMatch(markup, />Hero</);
  assert.doesNotMatch(markup, />Drivers</);
  assert.doesNotMatch(markup, />Pair</);
  assert.doesNotMatch(markup, />Limitation</);
});
