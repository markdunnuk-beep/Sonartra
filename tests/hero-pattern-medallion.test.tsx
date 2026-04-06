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
  assert.match(markup, /rounded-full border border-white\/10/);
  assert.match(markup, /rgba\(152,113,255,0\.22\)/);
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

test('hero pattern medallions use the flatter two-tone brand field and simplified geometry', () => {
  const assetsSource = readFileSync(medallionAssetsPath, 'utf8');
  const deliveryMarkup = renderToStaticMarkup(
    <HeroPatternMedallionSvg patternKey="delivery_commander" title="Delivery Commander" />,
  );
  const stewardMarkup = renderToStaticMarkup(
    <HeroPatternMedallionSvg patternKey="steady_steward" title="Steady Steward" />,
  );
  const driverMarkup = renderToStaticMarkup(
    <HeroPatternMedallionSvg patternKey="forceful_driver" title="Forceful Driver" />,
  );

  assert.match(deliveryMarkup, /M56 98h48/);
  assert.match(deliveryMarkup, /M104 60v44/);
  assert.match(deliveryMarkup, /stroke="#f7f4ff"/);

  assert.match(stewardMarkup, /circle cx="80" cy="80" r="28"/);
  assert.match(stewardMarkup, /circle cx="80" cy="80" r="18"/);
  assert.match(stewardMarkup, /M62 80h36/);
  assert.match(driverMarkup, /#8f63ff/);
  assert.doesNotMatch(assetsSource, /hero-pattern-frame-/);
  assert.doesNotMatch(assetsSource, /hero-pattern-inner-/);

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
