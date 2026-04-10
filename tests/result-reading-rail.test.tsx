import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { ResultReadingRail } from '@/components/results/result-reading-rail';

test('reading rail renders expected top-level section labels', () => {
  const markup = renderToStaticMarkup(<ResultReadingRail activeSectionIdOverride={null} />);

  assert.match(markup, /src="\/images\/sonartra-logo\.svg"/);
  assert.match(markup, /alt="Sonartra"/);
  assert.match(markup, />01<\/span>/);
  assert.match(markup, />02<\/span>/);
  assert.match(markup, />03<\/span>/);
  assert.match(markup, />04<\/span>/);
  assert.match(markup, />Introduction</);
  assert.match(markup, />Your Behaviour Pattern</);
  assert.match(markup, />How It Shows Up</);
  assert.match(markup, />How to Apply This</);
  assert.match(markup, /aria-label="Report reading navigation"/);
});

test('reading rail renders utility actions beneath navigation with accessible labels', () => {
  const markup = renderToStaticMarkup(<ResultReadingRail activeSectionIdOverride={null} />);

  assert.match(markup, /aria-label="Report utilities"/);
  assert.match(markup, /aria-label="Share on LinkedIn"/);
  assert.match(markup, /aria-label="Share by email"/);
  assert.match(markup, /aria-label="Download PDF"/);
  assert.match(markup, /PDF export coming soon/);
});

test('reading rail renders nested domain items beneath How It Shows Up without numbering', () => {
  const markup = renderToStaticMarkup(<ResultReadingRail activeSectionIdOverride={null} />);

  assert.match(markup, />Operating Style</);
  assert.match(markup, />Core Drivers</);
  assert.match(markup, />Leadership Approach</);
  assert.match(markup, />Tension Response</);
  assert.match(markup, />Environment Fit</);
  assert.match(markup, />Pressure Response</);

  const domainChaptersIndex = markup.indexOf('>How It Shows Up<');
  const firstNestedIndex = markup.indexOf('>Operating Style<');

  assert.ok(domainChaptersIndex >= 0);
  assert.ok(firstNestedIndex > domainChaptersIndex);
  assert.equal(markup.includes('>05</span><span class="min-w-0">Operating Style<'), false);
  assert.equal(markup.includes('>06</span><span class="min-w-0">Core Drivers<'), false);
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

test('rail renders one semantic nav list hierarchy without duplicate surfaces', () => {
  const markup = renderToStaticMarkup(<ResultReadingRail activeSectionIdOverride={null} />);

  const navCount = markup.match(/<nav /g)?.length ?? 0;
  const topLevelListCount = markup.match(/<ul class="sonartra-result-rail-track relative space-y-0\.5 pl-1\.5" role="list">/g)?.length ?? 0;
  const nestedListCount = markup.match(/<ul aria-label="Domain chapters"/g)?.length ?? 0;

  assert.equal(navCount, 1);
  assert.equal(topLevelListCount, 1);
  assert.equal(nestedListCount, 1);
});

test('rail provides restrained current and next reading cues', () => {
  const markup = renderToStaticMarkup(
    <ResultReadingRail activeSectionIdOverride="domain-core-drivers" />,
  );

  assert.match(markup, /Current chapter/);
  assert.match(markup, /Up next/);
  assert.match(markup, /data-reading-state="current"/);
  assert.match(markup, /data-reading-state="next"/);
});

test('reading rail links remain keyboard-focusable anchors with visible focus classes', () => {
  const markup = renderToStaticMarkup(<ResultReadingRail activeSectionIdOverride={null} />);

  const anchorCount = markup.match(/<a /g)?.length ?? 0;
  const focusClassCount = markup.match(/sonartra-focus-ring/g)?.length ?? 0;

  assert.equal(anchorCount, 11);
  assert.equal(focusClassCount, 13);
  assert.match(markup, /data-result-reading-rail="true"/);
  assert.match(markup, /<nav[^>]*aria-label="Report reading navigation"/);
  assert.match(markup, /<ul aria-label="Domain chapters"/);
});
