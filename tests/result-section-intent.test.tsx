import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { ResultSectionIntent } from '@/components/results/result-section-intent';
import { RESULT_READING_DOMAIN_SUBSECTIONS } from '@/lib/results/result-reading-sections';

test('ResultSectionIntent renders canonical prompt for a top-level section id', () => {
  const markup = renderToStaticMarkup(<ResultSectionIntent sectionId="hero" />);

  assert.match(
    markup,
    /Read this first\. It captures the pattern that shows up most consistently across your results\./,
  );
  assert.match(markup, /data-result-section-intent="hero"/);
});

test('ResultSectionIntent exposes canonical prompts for all top-level sections', () => {
  const expectedPromptsBySection = {
    intro:
      'Start here. This report explains how your behavioural patterns are organised and how to read them.',
    hero: 'Read this first. It captures the pattern that shows up most consistently across your results.',
    domains:
      'These chapters show how that pattern appears in different areas. Focus on what feels most familiar, not everything at once.',
    application:
      'This is where to act. Choose one or two areas to work on rather than trying to change everything.',
  } as const;

  for (const [sectionId, expectedPrompt] of Object.entries(expectedPromptsBySection)) {
    const markup = renderToStaticMarkup(<ResultSectionIntent sectionId={sectionId} />);

    assert.match(markup, new RegExp(expectedPrompt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(markup, new RegExp(`data-result-section-intent=\"${sectionId}\"`));
  }
});

test('ResultSectionIntent returns null for a domain subsection id', () => {
  const markup = renderToStaticMarkup(<ResultSectionIntent sectionId="domain-core-drivers" />);

  assert.equal(markup, '');
});

test('ResultSectionIntent never renders prompts for domain subsections', () => {
  for (const section of RESULT_READING_DOMAIN_SUBSECTIONS) {
    const markup = renderToStaticMarkup(<ResultSectionIntent sectionId={section.id} />);
    assert.equal(markup, '');
  }
});

test('ResultSectionIntent returns null for a missing section id', () => {
  const markup = renderToStaticMarkup(<ResultSectionIntent sectionId="unknown-section" />);

  assert.equal(markup, '');
});
