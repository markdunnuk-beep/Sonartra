import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';

import { HeroPatternMedallion } from '@/components/results/hero-pattern-medallion';
import {
  getHeroPatternMedallionLabel,
  HERO_PATTERN_KEYS,
  HeroPatternMedallionSvg,
  isHeroPatternKey,
} from '@/components/results/hero-pattern-medallion-assets';

const medallionComponentPath = join(
  process.cwd(),
  'components',
  'results',
  'hero-pattern-medallion.tsx',
);

const medallionAssetsPath = join(
  process.cwd(),
  'components',
  'results',
  'hero-pattern-medallion-assets.tsx',
);

const globalsPath = join(process.cwd(), 'app', 'globals.css');

test('hero pattern key guard only accepts the authored medallion keys', () => {
  assert.equal(isHeroPatternKey('forceful_driver'), true);
  assert.equal(isHeroPatternKey('balanced_operator'), true);
  assert.equal(isHeroPatternKey('unknown_pattern'), false);
  assert.equal(HERO_PATTERN_KEYS.length, 9);
});

test('hero pattern medallion label mapping stays deterministic across all nine patterns', () => {
  const labels = HERO_PATTERN_KEYS.map((patternKey) => getHeroPatternMedallionLabel(patternKey));

  assert.deepEqual(labels, [
    'Forceful Driver',
    'Exacting Controller',
    'Delivery Commander',
    'Deliberate Craftsperson',
    'Grounded Planner',
    'Relational Catalyst',
    'Adaptive Mobiliser',
    'Steady Steward',
    'Balanced Operator',
  ]);
});

test('hero pattern medallion renders the shared shell and selected pattern asset', () => {
  const markup = renderToStaticMarkup(
    <HeroPatternMedallion patternKey="adaptive_mobiliser" label="Adaptive Mobiliser" />,
  );

  assert.match(markup, /data-hero-pattern-medallion="adaptive_mobiliser"/);
  assert.match(markup, /hero-pattern-medallion-shell relative isolate/);
  assert.match(markup, /hero-pattern-medallion-glow/);
  assert.match(markup, /hero-pattern-medallion-svg h-auto w-full/);
  assert.match(markup, /role="img"/);
  assert.match(markup, /aria-label="Adaptive Mobiliser"/);
  assert.match(markup, /hero-pattern-bg-adaptive_mobiliser/);
  assert.match(markup, /hero-pattern-frame-adaptive_mobiliser/);
  assert.match(markup, /hero-pattern-inner-adaptive_mobiliser/);
});

test('hero pattern medallion returns nothing when the persisted key is missing or unsupported', () => {
  assert.equal(renderToStaticMarkup(<HeroPatternMedallion patternKey={null} />), '');
  assert.equal(renderToStaticMarkup(<HeroPatternMedallion patternKey="unsupported" />), '');
});

test('hero pattern medallion source includes first-appearance animation and reduced-motion fallback', () => {
  const source = readFileSync(medallionComponentPath, 'utf8');
  const globalsSource = readFileSync(globalsPath, 'utf8');

  assert.doesNotMatch(source, /<style>/);
  assert.doesNotMatch(source, /HERO_PATTERN_MEDALLION_CSS/);
  assert.match(globalsSource, /hero-pattern-medallion-settle/);
  assert.match(globalsSource, /hero-pattern-medallion-symbol-settle/);
  assert.match(globalsSource, /hero-pattern-medallion-bloom/);
  assert.match(globalsSource, /prefers-reduced-motion: no-preference/);
  assert.match(globalsSource, /prefers-reduced-motion: reduce/);
  assert.match(globalsSource, /animation: none !important;/);
});

test('delivery commander and steady steward medallions use abstract structured seals rather than literal icon silhouettes', () => {
  const assetsSource = readFileSync(medallionAssetsPath, 'utf8');
  const deliveryMarkup = renderToStaticMarkup(
    <HeroPatternMedallionSvg patternKey="delivery_commander" title="Delivery Commander" />,
  );
  const stewardMarkup = renderToStaticMarkup(
    <HeroPatternMedallionSvg patternKey="steady_steward" title="Steady Steward" />,
  );

  assert.match(deliveryMarkup, /M56 100h48/);
  assert.match(deliveryMarkup, /M64 84h40/);
  assert.match(deliveryMarkup, /M72 68h32/);
  assert.doesNotMatch(deliveryMarkup, /M50 100 70 80l14 14 28-32/);

  assert.match(stewardMarkup, /M80 50c18 0 31 14 31 32s-13 32-31 32-31-14-31-32 13-32 31-32Z/);
  assert.match(stewardMarkup, /M80 58c13 0 22 10 22 24s-9 24-22 24-22-10-22-24 9-24 22-24Z/);
  assert.doesNotMatch(stewardMarkup, /M80 52 106 62v20c0 18-10 31-26 38-16-7-26-20-26-38V62z/);

  assert.match(assetsSource, /delivery_commander/);
  assert.match(assetsSource, /steady_steward/);
});

test('hero pattern medallion svg preserves accessible titles and unique gradient ids per pattern', () => {
  const deliveryMarkup = renderToStaticMarkup(
    <HeroPatternMedallionSvg patternKey="delivery_commander" title="Delivery Commander" />,
  );
  const balancedMarkup = renderToStaticMarkup(
    <HeroPatternMedallionSvg patternKey="balanced_operator" title="Balanced Operator" />,
  );

  assert.match(deliveryMarkup, /<title>Delivery Commander<\/title>/);
  assert.match(balancedMarkup, /<title>Balanced Operator<\/title>/);
  assert.match(deliveryMarkup, /hero-pattern-bg-delivery_commander/);
  assert.match(balancedMarkup, /hero-pattern-bg-balanced_operator/);
  assert.notEqual(deliveryMarkup, balancedMarkup);
});
