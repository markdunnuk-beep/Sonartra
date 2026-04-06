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
  assert.match(markup, /This report is designed to help you see how you naturally think, respond, and operate\./);
  assert.match(
    markup,
    /Rather than placing you into a single label, Sonartra reveals the patterns that consistently show up in your behaviour\./,
  );
  assert.match(markup, /Once you can see them clearly, you can work with them rather than against them\./);
  assert.match(markup, /data-sonartra-introduction="true"/);
  assert.match(markup, /data-sonartra-introduction-steps="true"/);
});

test('sonartra introduction stays a static system layer with no props or server coupling', () => {
  const source = readFileSync(introductionComponentPath, 'utf8');

  assert.match(source, /export function SonartraIntroduction\(\)/);
  assert.match(source, /<SonartraIntroductionVisual className="sonartra-intro-reveal mx-auto w-full max-w-\[34rem\]" \/>/);
  assert.match(source, /data-sonartra-intro-reveal="header"/);
  assert.match(source, /data-sonartra-intro-reveal="supporting"/);
  assert.doesNotMatch(source, /Readonly<\{/);
  assert.doesNotMatch(source, /props/);
  assert.doesNotMatch(source, /getDbPool|getRequestUserId|createResultReadModelService/);
  assert.doesNotMatch(source, /admin|featureFlag|flag/i);
});

test('sonartra introduction renders the three-step explainer and removes redundant guidance', () => {
  const markup = renderToStaticMarkup(<SonartraIntroduction />);

  assert.match(markup, />How your results are built</);
  assert.match(markup, /Your results are not based on one answer or one moment\./);
  assert.match(markup, /They are built from consistent signals that appear across the assessment\./);
  assert.match(markup, /We break this down into three simple layers:/);
  assert.match(markup, />Domains</);
  assert.match(markup, />Signals</);
  assert.match(markup, />Signal Pairs</);
  assert.match(markup, /Broad areas of behaviour being measured\./);
  assert.match(markup, /These represent the key parts of how you operate\./);
  assert.match(markup, /Specific behavioural patterns within each Domain\./);
  assert.match(markup, /These are the traits that show how you tend to operate\./);
  assert.match(markup, /The strongest Signals in a Domain, read together\./);
  assert.match(markup, /Because behaviour rarely shows up in isolation\./);
  assert.match(markup, /This is where your results become more accurate and more useful\./);
  assert.doesNotMatch(markup, />How to use this report</);
  assert.doesNotMatch(markup, /Start with the overall picture, then move into the detail\./);
});

test('sonartra introduction renders the concept sequence before the model overview visual', () => {
  const markup = renderToStaticMarkup(<SonartraIntroduction />);

  const stepsContainerIndex = markup.indexOf('data-sonartra-introduction-steps="true"');
  const domainsIndex = markup.indexOf('>Domains<');
  const signalsIndex = markup.indexOf('>Signals<');
  const pairsIndex = markup.indexOf('>Signal Pairs<');
  const visualIndex = markup.indexOf('data-sonartra-introduction-visual="true"');

  assert.ok(stepsContainerIndex >= 0);
  assert.ok(domainsIndex >= 0);
  assert.ok(signalsIndex > domainsIndex);
  assert.ok(pairsIndex > signalsIndex);
  assert.ok(visualIndex > stepsContainerIndex);
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
  assert.match(markup, /A broad area of behaviour\. For example: <strong[^>]*>Leadership Approach<\/strong>\./);
  assert.match(markup, /A dominant pattern\. For example: <strong[^>]*>Vision<\/strong>\./);
  assert.match(markup, /A dominant pattern\. For example: <strong[^>]*>Process<\/strong>\./);
  assert.match(markup, /How those patterns combine\. <strong[^>]*>Vision-Process<\/strong>\./);
  assert.match(markup, /Behaviour in practice/);
  assert.match(markup, /What this actually looks like in the real world\./);
  assert.match(markup, /You think strategically, but you also translate ideas into structured, workable plans\./);
  assert.ok(domainLabelCount >= 1);
  assert.ok(signalLabelCount >= 2);
  assert.doesNotMatch(markup, /Static visual/i);
  assert.match(markup, /data-sonartra-visual-reveal="domain"/);
  assert.match(markup, /data-sonartra-visual-reveal="pair"/);
  assert.match(source, /prefers-reduced-motion: no-preference/);
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /sonartra-flow-line-vertical/);
  assert.match(source, /sonartra-visual-reveal/);
  assert.doesNotMatch(source, /24 signals|6 domains|wplp80|Sonartra Signals/i);
  assert.doesNotMatch(markup, /24 signals/i);
  assert.doesNotMatch(markup, /6 domains/i);
});
