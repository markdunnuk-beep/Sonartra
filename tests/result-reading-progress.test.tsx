import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { ResultReadingProgress } from '@/components/results/result-reading-progress';

test('renders current top-level label for active section', () => {
  const markup = renderToStaticMarkup(<ResultReadingProgress activeSectionIdOverride="hero" />);

  assert.match(markup, />Your Pattern</);
  assert.match(markup, /aria-label="Report reading progress"/);
});

test('renders top-level progress count based on active top-level section', () => {
  const markup = renderToStaticMarkup(<ResultReadingProgress activeSectionIdOverride="application" />);

  assert.match(markup, />4 of 4</);
  assert.match(markup, /style="width:100%"/);
});

test('maps active domain subsection to Domain Chapters label and top-level progress', () => {
  const markup = renderToStaticMarkup(
    <ResultReadingProgress activeSectionIdOverride="domain-core-drivers" />,
  );

  assert.match(markup, />Domain Chapters</);
  assert.match(markup, />3 of 4</);
  assert.match(markup, /style="width:75%"/);
});

test('applies intended mobile\/tablet visibility classes', () => {
  const markup = renderToStaticMarkup(<ResultReadingProgress activeSectionIdOverride="intro" />);

  assert.match(markup, /class="xl:hidden"/);
  assert.match(markup, /sticky top-16/);
  assert.match(markup, /data-result-reading-progress="true"/);
  assert.doesNotMatch(markup, /<nav/);
});


test('progress indicator uses shared motion class for restrained transitions', () => {
  const markup = renderToStaticMarkup(<ResultReadingProgress activeSectionIdOverride="hero" />);

  assert.match(markup, /class="sonartra-motion-progress h-px bg-white\/48"/);
});

test('unknown sections safely resolve to first canonical top-level step', () => {
  const markup = renderToStaticMarkup(
    <ResultReadingProgress activeSectionIdOverride="not-a-real-section" />,
  );

  assert.match(markup, />Introduction</);
  assert.match(markup, />1 of 4</);
  assert.match(markup, /style="width:25%"/);
});
