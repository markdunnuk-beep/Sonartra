import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';

import { SonartraIntroduction } from '@/components/results/sonartra-introduction';
import { SonartraIntroductionVisual } from '@/components/results/sonartra-introduction-visual';

test('sonartra introduction renders the fixed heading and lead without props', () => {
  const markup = renderToStaticMarkup(<SonartraIntroduction />);

  assert.match(markup, /How to read this report/);
  assert.match(markup, /Understand the patterns behind your results/);
  assert.match(
    markup,
    /This report is designed to help you understand how you tend to think, respond, and operate across the areas measured by this assessment\./,
  );
  assert.match(markup, /data-sonartra-introduction="true"/);
  assert.match(markup, /lg:grid-cols-\[minmax\(0,1\.1fr\)_minmax\(19rem,25rem\)\]/);
});

test('sonartra introduction renders the explanatory sections and closing guidance', () => {
  const markup = renderToStaticMarkup(<SonartraIntroduction />);

  assert.match(markup, />Domains</);
  assert.match(markup, />Signals</);
  assert.match(markup, />Signal Pairs</);
  assert.match(markup, />How to use this report</);
  assert.match(markup, /Depending on the assessment, the number and focus of Domains may vary\./);
  assert.match(markup, /Start with the overall picture, then move into the detail\./);
});

test('sonartra introduction visual renders generic model labels and pair example', () => {
  const markup = renderToStaticMarkup(<SonartraIntroductionVisual />);

  const domainLabelCount = markup.match(/>Domain</g)?.length ?? 0;
  const signalLabelCount = markup.match(/>Signal</g)?.length ?? 0;

  assert.match(markup, /data-sonartra-introduction-visual="true"/);
  assert.match(markup, /Model overview/);
  assert.match(markup, /Domains vary by assessment/);
  assert.match(markup, /Signal Pair relationship/);
  assert.ok(domainLabelCount >= 3);
  assert.ok(signalLabelCount >= 4);
  assert.doesNotMatch(markup, /24 signals/i);
  assert.doesNotMatch(markup, /6 domains/i);
});
