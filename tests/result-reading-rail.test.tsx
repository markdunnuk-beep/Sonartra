import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { ResultReadingRail } from '@/components/results/result-reading-rail';

test('reading rail renders expected top-level section labels', () => {
  const markup = renderToStaticMarkup(<ResultReadingRail activeSectionIdOverride={null} />);

  assert.match(markup, />Introduction</);
  assert.match(markup, />Your Pattern</);
  assert.match(markup, />Domain Chapters</);
  assert.match(markup, />Application</);
  assert.match(markup, /aria-label="Report reading navigation"/);
});

test('reading rail renders nested domain items beneath Domain Chapters', () => {
  const markup = renderToStaticMarkup(<ResultReadingRail activeSectionIdOverride={null} />);

  assert.match(markup, />Operating Style</);
  assert.match(markup, />Core Drivers</);
  assert.match(markup, />Leadership Approach</);
  assert.match(markup, />Tension Response</);
  assert.match(markup, />Environment Fit</);
  assert.match(markup, />Pressure Response</);

  const domainChaptersIndex = markup.indexOf('>Domain Chapters<');
  const firstNestedIndex = markup.indexOf('>Operating Style<');

  assert.ok(domainChaptersIndex >= 0);
  assert.ok(firstNestedIndex > domainChaptersIndex);
});

test('active top-level section receives aria-current semantics', () => {
  const markup = renderToStaticMarkup(<ResultReadingRail activeSectionIdOverride="hero" />);

  assert.match(markup, /href="#hero"[^>]*aria-current="location"/);
  assert.doesNotMatch(markup, /href="#intro"[^>]*aria-current="location"/);
  assert.doesNotMatch(markup, /href="#application"[^>]*aria-current="location"/);
});

test('only the active domain subsection receives aria-current semantics', () => {
  const markup = renderToStaticMarkup(
    <ResultReadingRail activeSectionIdOverride="domain-core-drivers" />,
  );

  assert.doesNotMatch(markup, /href="#domains"[^>]*aria-current="location"/);
  assert.match(markup, /href="#domain-core-drivers"[^>]*aria-current="location"/);
  assert.doesNotMatch(markup, /href="#domain-operating-style"[^>]*aria-current="location"/);

  const currentCount = markup.match(/aria-current="location"/g)?.length ?? 0;
  assert.equal(currentCount, 1);
});

test('each rail item targets a stable in-page anchor id', () => {
  const markup = renderToStaticMarkup(<ResultReadingRail activeSectionIdOverride={null} />);

  for (const anchorId of [
    'intro',
    'hero',
    'domains',
    'application',
    'domain-operating-style',
    'domain-core-drivers',
    'domain-leadership-approach',
    'domain-tension-response',
    'domain-environment-fit',
    'domain-pressure-response',
  ]) {
    assert.match(markup, new RegExp(`href=\"#${anchorId}\"`));
  }
});

test('reading rail links remain keyboard-focusable anchors with visible focus classes', () => {
  const markup = renderToStaticMarkup(<ResultReadingRail activeSectionIdOverride={null} />);

  const anchorCount = markup.match(/<a /g)?.length ?? 0;
  const focusClassCount = markup.match(/sonartra-focus-ring/g)?.length ?? 0;

  assert.equal(anchorCount, 10);
  assert.equal(focusClassCount, 10);
  assert.match(markup, /data-result-reading-rail="true"/);
  assert.match(markup, /<nav[^>]*aria-label="Report reading navigation"/);
  assert.match(markup, /<ul aria-label="Domain chapters"/);
});
