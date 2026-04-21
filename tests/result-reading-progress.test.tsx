import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { ResultReadingProgress } from '@/components/results/result-reading-progress';
import { SINGLE_DOMAIN_RESULT_READING_SECTIONS } from '@/lib/results/result-reading-sections';

test('renders current top-level label for active section', () => {
  const markup = renderToStaticMarkup(<ResultReadingProgress activeSectionIdOverride="hero" />);

  assert.match(markup, />Your Behaviour Pattern</);
  assert.match(markup, /aria-label="Report reading progress"/);
  assert.match(markup, /Now reading/);
});

test('renders compact step markers for top-level chapter progression', () => {
  const markup = renderToStaticMarkup(<ResultReadingProgress activeSectionIdOverride="application" />);

  const progressMarkerCount = markup.match(/sonartra-motion-progress block h-1\.5 rounded-full/g)?.length ?? 0;

  assert.equal(progressMarkerCount, 4);
  assert.match(markup, />04</);
});

test('maps active domain subsection to parent and child reading context', () => {
  const markup = renderToStaticMarkup(
    <ResultReadingProgress activeSectionIdOverride="domain-core-drivers" />,
  );

  assert.match(markup, />How It Shows Up</);
  assert.match(markup, />Core Drivers</);
  assert.match(markup, /Up next/);
  assert.match(markup, />Leadership Approach</);
});

test('applies intended mobile\/tablet visibility classes', () => {
  const markup = renderToStaticMarkup(<ResultReadingProgress activeSectionIdOverride="intro" />);

  assert.match(markup, /class="xl:hidden"/);
  assert.match(markup, /sticky top-16/);
  assert.match(markup, /sonartra-result-mobile-progress-surface/);
  assert.match(markup, /data-result-reading-progress="true"/);
  assert.doesNotMatch(markup, /<nav/);
});


test('progress markers use shared motion class for restrained transitions', () => {
  const markup = renderToStaticMarkup(<ResultReadingProgress activeSectionIdOverride="hero" />);

  assert.match(markup, /sonartra-motion-progress block h-1\.5 rounded-full/);
});

test('unknown sections safely resolve to first canonical top-level step', () => {
  const markup = renderToStaticMarkup(
    <ResultReadingProgress activeSectionIdOverride="not-a-real-section" />,
  );

  assert.match(markup, />Introduction</);
  assert.match(markup, />01</);
  assert.match(markup, />Your Behaviour Pattern</);
});

test('progress component can follow the single-domain top-level sequence', () => {
  const markup = renderToStaticMarkup(
    <ResultReadingProgress
      activeSectionIdOverride="limitation"
      sectionsConfig={SINGLE_DOMAIN_RESULT_READING_SECTIONS}
    />,
  );

  assert.match(markup, />Limitation</);
  assert.match(markup, />05</);
  assert.match(markup, />Application</);
  assert.equal(markup.match(/sonartra-motion-progress block h-1\.5 rounded-full/g)?.length ?? 0, 6);
});
