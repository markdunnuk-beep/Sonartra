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
  assert.match(markup, /lg:grid-cols-\[minmax\(0,1\.1fr\)_minmax\(19rem,25rem\)\]/);
});

test('sonartra introduction stays a static system layer with no props or server coupling', () => {
  const source = readFileSync(introductionComponentPath, 'utf8');

  assert.match(source, /export function SonartraIntroduction\(\)/);
  assert.match(source, /<SonartraIntroductionVisual className="lg:sticky lg:top-8" \/>/);
  assert.doesNotMatch(source, /Readonly<\{/);
  assert.doesNotMatch(source, /props/);
  assert.doesNotMatch(source, /getDbPool|getRequestUserId|createResultReadModelService/);
  assert.doesNotMatch(source, /admin|featureFlag|flag/i);
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

test('sonartra introduction visual renders the generic behaviour flow diagram', () => {
  const markup = renderToStaticMarkup(<SonartraIntroductionVisual />);
  const source = readFileSync(visualComponentPath, 'utf8');

  const domainLabelCount = markup.match(/>Domain</g)?.length ?? 0;
  const signalLabelCount = markup.match(/>Signal</g)?.length ?? 0;

  assert.match(markup, /data-sonartra-introduction-visual="true"/);
  assert.match(markup, /How your results are built/);
  assert.match(markup, /Domains vary by assessment, but the interpretation path stays consistent\./);
  assert.match(markup, /Patterns read together/);
  assert.match(markup, /Behaviour in practice/);
  assert.match(markup, /How patterns show up in real situations/);
  assert.ok(domainLabelCount >= 1);
  assert.ok(signalLabelCount >= 3);
  assert.doesNotMatch(markup, /Static visual/i);
  assert.doesNotMatch(source, /24 signals|6 domains|wplp80|Sonartra Signals/i);
  assert.doesNotMatch(markup, /24 signals/i);
  assert.doesNotMatch(markup, /6 domains/i);
});
