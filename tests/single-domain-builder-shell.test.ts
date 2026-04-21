import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getAssessmentBuilderBasePath } from '@/lib/admin/assessment-builder-paths';

function readSource(...segments: string[]): string {
  return readFileSync(join(process.cwd(), ...segments), 'utf8');
}

test('single-domain builder layout loads draft context and guards multi-domain assessments', () => {
  const source = readSource(
    'app',
    '(admin)',
    'admin',
    'assessments',
    'single-domain',
    '[assessmentKey]',
    'layout.tsx',
  );

  assert.match(source, /getSingleDomainBuilderAssessment/);
  assert.match(source, /if \(redirectTo\) \{\s+redirect\(redirectTo\);/);
  assert.match(source, /Editable draft/);
  assert.match(source, /Single-domain builder scaffold for one domain only, variable signals/);
  assert.match(source, /This builder supports one domain only\./);
});

test('single-domain builder path helper routes multi-domain and single-domain builders separately', () => {
  assert.equal(getAssessmentBuilderBasePath('wplp80', 'multi_domain'), '/admin/assessments/wplp80');
  assert.equal(
    getAssessmentBuilderBasePath('role-focus', 'single_domain'),
    '/admin/assessments/single-domain/role-focus',
  );
});

test('single-domain builder step navigation renders the dedicated eight-step rail', () => {
  const stepperSource = readSource('components', 'admin', 'single-domain-builder-stepper.tsx');

  assert.match(stepperSource, /aria-label="Single-domain builder steps"/);
  assert.match(stepperSource, /Step \{activeIndex \+ 1\} of \{steps.length\}/);
  assert.match(
    stepperSource,
    /Every stage stays viewable so readiness can\s+be checked without route access changing the underlying status/,
  );
  assert.match(stepperSource, /authoring stages complete/);
  assert.match(stepperSource, /getAssessmentBuilderStepPath/);
  assert.match(stepperSource, /Current step/);
  assert.match(stepperSource, /View all steps/);
  assert.match(stepperSource, /sm:hidden/);
  assert.match(stepperSource, /prefetch=\{false\}/);
});

test('signals step copy keeps signal count flexible and avoids a fixed four-signal model', () => {
  const source = readSource('components', 'admin', 'single-domain-builder-pages.tsx');

  assert.match(source, /Signal count stays open-ended here/);
  assert.match(source, /do not assume a fixed four-signal structure/i);
});

test('language step now routes into the locked six-section narrative builder shell', () => {
  const pageSource = readSource('components', 'admin', 'single-domain-builder-pages.tsx');
  const builderSource = readSource(
    'components',
    'admin',
    'assessments',
    'single-domain-narrative-builder.tsx',
  );
  const composerPreviewSource = readSource(
    'components',
    'admin',
    'assessments',
    'single-domain-composer-preview.tsx',
  );

  assert.match(pageSource, /return <SingleDomainNarrativeBuilder \/>;/);
  assert.match(builderSource, /<SingleDomainComposerPreview \/>/);
  assert.match(composerPreviewSource, /id="single-domain-composer-preview"/);
  assert.match(
    builderSource,
    /section-first contract: intro, hero, drivers, pair, limitation, and application/i,
  );
  assert.match(builderSource, /Narrative readiness/);
  assert.doesNotMatch(
    builderSource,
    /domain framing, hero pairs, signal chapters, balancing sections, pair summaries, and application statements/i,
  );
});

test('single-domain builder model keeps six section-native import contracts and no legacy dataset-family labels', () => {
  const mapperSource = readSource('lib', 'assessment-language', 'single-domain-builder-mappers.ts');
  const navSource = readSource(
    'components',
    'admin',
    'assessments',
    'single-domain-section-nav.tsx',
  );

  assert.match(mapperSource, /intro: 'Intro import contract'/);
  assert.match(mapperSource, /hero: 'Hero import contract'/);
  assert.match(mapperSource, /drivers: 'Drivers import contract'/);
  assert.match(mapperSource, /pair: 'Pair import contract'/);
  assert.match(mapperSource, /limitation: 'Limitation import contract'/);
  assert.match(mapperSource, /application: 'Application import contract'/);
  assert.match(navSource, /Locked six-section order/);
  assert.doesNotMatch(
    navSource,
    /DOMAIN_FRAMING|HERO_PAIRS|SIGNAL_CHAPTERS|BALANCING_SECTIONS|PAIR_SUMMARIES|APPLICATION_STATEMENTS/,
  );
});

test('review step renders the seven readiness scaffold categories', () => {
  const source = readSource('components', 'admin', 'single-domain-builder-pages.tsx');

  assert.match(source, /label: 'Overview'/);
  assert.match(source, /label: 'Domain'/);
  assert.match(source, /label: 'Signals'/);
  assert.match(source, /label: 'Questions'/);
  assert.match(source, /label: 'Responses'/);
  assert.match(source, /label: 'Weightings'/);
  assert.match(source, /label: 'Language'/);
});

test('weightings question scope selector keeps stable id and name attributes for browser/a11y tooling', () => {
  const source = readSource('components', 'admin', 'single-domain-structural-authoring.tsx');

  assert.match(source, /const questionScopeFieldId = 'single-domain-weightings-question-scope'/);
  assert.match(source, /<select[\s\S]*id=\{questionScopeFieldId\}/);
  assert.match(source, /<select[\s\S]*name="questionScope"/);
});

test('existing multi-domain builder remains on its original route structure', () => {
  const dashboardSource = readSource('lib', 'server', 'admin-assessment-dashboard.ts');
  const multiDomainLayoutSource = readSource(
    'app',
    '(admin)',
    'admin',
    'assessments',
    '[assessmentKey]',
    'layout.tsx',
  );

  assert.match(dashboardSource, /getAssessmentBuilderBasePath\(assessmentKey, mode\)/);
  assert.match(multiDomainLayoutSource, /<AdminAssessmentStepper/);
  assert.match(multiDomainLayoutSource, /getAdminAssessmentDetailByKey/);
});
