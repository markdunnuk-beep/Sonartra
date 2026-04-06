import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';

import { SonartraIntroduction } from '@/components/results/sonartra-introduction';
import { SonartraIntroductionVisual } from '@/components/results/sonartra-introduction-visual';

const introductionComponentPath = join(
  process.cwd(),
  'components',
  'results',
  'sonartra-introduction.tsx',
);

const visualComponentPath = join(
  process.cwd(),
  'components',
  'results',
  'sonartra-introduction-visual.tsx',
);

test('sonartra introduction renders the fixed heading and lead without props', () => {
  const markup = renderToStaticMarkup(<SonartraIntroduction />);

  assert.match(markup, /How to read this report/);
  assert.match(markup, /Understand the patterns behind your results/);
  assert.match(
    markup,
    /This report is designed to help you understand how you tend to think, respond, and operate across the areas measured by this assessment\./,
  );
  assert.match(markup, /data-sonartra-introduction="true"/);
  assert.match(markup, /data-sonartra-introduction-steps="true"/);
});

test('sonartra introduction stays a static system layer with no props or server coupling', () => {
  const source = readFileSync(introductionComponentPath, 'utf8');

  assert.match(source, /export function SonartraIntroduction\(\)/);
  assert.match(source, /<SonartraIntroductionVisual className="mx-auto w-full max-w-\[34rem\]" \/>/);
  assert.doesNotMatch(source, /Readonly<\{/);
  assert.doesNotMatch(source, /props/);
  assert.doesNotMatch(source, /getDbPool|getRequestUserId|createResultReadModelService/);
  assert.doesNotMatch(source, /admin|featureFlag|flag/i);
});

test('sonartra introduction renders the three-step explainer and removes redundant guidance', () => {
  const markup = renderToStaticMarkup(<SonartraIntroduction />);

  assert.match(markup, />Domains</);
  assert.match(markup, />Signals</);
  assert.match(markup, />Signal Pairs</);
  assert.match(markup, /Broad areas being measured in the assessment\./);
  assert.match(markup, /Specific behavioural patterns being read within a Domain\./);
  assert.match(markup, /The strongest signals in a Domain read together to show how behaviour combines in practice\./);
  assert.doesNotMatch(markup, />How to use this report</);
  assert.doesNotMatch(markup, /Start with the overall picture, then move into the detail\./);
});

test('sonartra introduction renders the concept sequence before the model overview visual', () => {
  const markup = renderToStaticMarkup(<SonartraIntroduction />);

  const domainsIndex = markup.indexOf('>Domains<');
  const signalsIndex = markup.indexOf('>Signals<');
  const pairsIndex = markup.indexOf('>Signal Pairs<');
  const visualHeadingIndex = markup.indexOf('How your results are built');

  assert.ok(domainsIndex >= 0);
  assert.ok(signalsIndex > domainsIndex);
  assert.ok(pairsIndex > signalsIndex);
  assert.ok(visualHeadingIndex > pairsIndex);
});

test('sonartra introduction visual renders the generic behaviour flow diagram', () => {
  const markup = renderToStaticMarkup(<SonartraIntroductionVisual />);
  const source = readFileSync(visualComponentPath, 'utf8');

  const domainLabelCount = markup.match(/>Domain</g)?.length ?? 0;
  const signalLabelCount = markup.match(/>Signal [12]</g)?.length ?? 0;

  assert.match(markup, /data-sonartra-introduction-visual="true"/);
  assert.match(markup, /How your results are built/);
  assert.match(markup, /Signal 1/);
  assert.match(markup, /Signal 2/);
  assert.match(markup, /Broad area being measured\. For example, <strong[^>]*>Leadership Style<\/strong>\./);
  assert.match(markup, /Specific pattern being read\. For example, <strong[^>]*>Vision<\/strong>\./);
  assert.match(markup, /Specific pattern being read\. For example, <strong[^>]*>Process<\/strong>\./);
  assert.match(markup, /Strongest signals in that Domain\. For example, <strong[^>]*>Vision-Process<\/strong>\./);
  assert.match(markup, /Behaviour in practice/);
  assert.match(markup, /Strategic thinking with structured workable plans\./);
  assert.ok(domainLabelCount >= 1);
  assert.ok(signalLabelCount >= 2);
  assert.doesNotMatch(markup, /Static visual/i);
  assert.match(source, /prefers-reduced-motion: no-preference/);
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /sonartra-flow-line-vertical/);
  assert.doesNotMatch(source, /24 signals|6 domains|wplp80|Sonartra Signals/i);
  assert.doesNotMatch(markup, /24 signals/i);
  assert.doesNotMatch(markup, /6 domains/i);
});
