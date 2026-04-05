import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateHeroPattern } from '@/lib/engine/hero';
import type { ResultDomainSummary, RuntimeHeroDefinition } from '@/lib/engine/types';

function buildDomainSummary(params: {
  domainId: string;
  domainKey: string;
  domainTitle: string;
  signals: Array<{
    signalId: string;
    signalKey: string;
    signalTitle: string;
    percentage: number;
    rank: number;
  }>;
}): ResultDomainSummary {
  return {
    domainId: params.domainId,
    domainKey: params.domainKey,
    domainTitle: params.domainTitle,
    domainSource: 'signal_group',
    rawTotal: 10,
    normalizedValue: 10,
    percentage: 100,
    signalCount: params.signals.length,
    answeredQuestionCount: 1,
    rankedSignalIds: params.signals.map((signal) => signal.signalId),
    signalScores: params.signals.map((signal) => ({
      signalId: signal.signalId,
      signalKey: signal.signalKey,
      signalTitle: signal.signalTitle,
      domainId: params.domainId,
      domainKey: params.domainKey,
      domainSource: 'signal_group',
      isOverlay: false,
      overlayType: 'none',
      rawTotal: signal.percentage,
      normalizedValue: signal.percentage,
      percentage: signal.percentage,
      domainPercentage: signal.percentage,
      rank: signal.rank,
    })),
    interpretation: null,
  };
}

function buildHeroDefinition(): RuntimeHeroDefinition {
  return {
    fallbackPatternKey: 'balanced_operator',
    pairTraitWeights: [
      { profileDomainKey: 'operatingStyle', pairKey: 'driver_influencer', traitKey: 'adaptive', weight: 1, orderIndex: 1 },
      { profileDomainKey: 'operatingStyle', pairKey: 'driver_influencer', traitKey: 'assertive', weight: 1, orderIndex: 2 },
      { profileDomainKey: 'coreDrivers', pairKey: 'purpose_reward', traitKey: 'adaptive', weight: 1, orderIndex: 1 },
      { profileDomainKey: 'leadershipApproach', pairKey: 'directive_inclusive', traitKey: 'people_led', weight: 1, orderIndex: 1 },
      { profileDomainKey: 'tensionResponse', pairKey: 'accommodate_compete', traitKey: 'adaptive', weight: 1, orderIndex: 1 },
      { profileDomainKey: 'environmentFit', pairKey: 'autonomy_collaboration', traitKey: 'flexible', weight: 1, orderIndex: 1 },
      { profileDomainKey: 'pressureResponse', pairKey: 'critical_scatter', traitKey: 'adaptive', weight: 1, orderIndex: 1 },
    ],
    patternRules: [
      {
        patternKey: 'adaptive_mobiliser',
        priority: 24,
        conditions: [
          { traitKey: 'adaptive', operator: '>=', value: 3 },
          { traitKey: 'flexible', operator: '>=', value: 1 },
        ],
        exclusions: [],
      },
    ],
    patternLanguage: [
      {
        patternKey: 'adaptive_mobiliser',
        headline: 'Adaptive Mobiliser',
        subheadline: 'Fast and flexible across shifting conditions.',
        summary: 'You adapt quickly while keeping people moving.',
        narrative: 'You tend to reorient in motion and keep momentum alive.',
        pressureOverlay: 'Under pressure you may accelerate adaptation.',
        environmentOverlay: 'You do best where room to adjust remains visible.',
      },
      {
        patternKey: 'balanced_operator',
        headline: 'Balanced Operator',
        subheadline: null,
        summary: null,
        narrative: 'No single Hero pattern dominates strongly.',
        pressureOverlay: null,
        environmentOverlay: null,
      },
    ],
  };
}

function buildHeroDomainSummaries(): readonly ResultDomainSummary[] {
  return [
    buildDomainSummary({
      domainId: 'style',
      domainKey: 'signal_style',
      domainTitle: 'Operating Style',
      signals: [
        { signalId: 'style-driver', signalKey: 'style_driver', signalTitle: 'Driver', percentage: 56, rank: 1 },
        { signalId: 'style-influencer', signalKey: 'style_influencer', signalTitle: 'Influencer', percentage: 44, rank: 2 },
      ],
    }),
    buildDomainSummary({
      domainId: 'mot',
      domainKey: 'signal_mot',
      domainTitle: 'Core Drivers',
      signals: [
        { signalId: 'mot-purpose', signalKey: 'mot_purpose', signalTitle: 'Purpose', percentage: 61, rank: 1 },
        { signalId: 'mot-reward', signalKey: 'mot_reward', signalTitle: 'Reward', percentage: 39, rank: 2 },
      ],
    }),
    buildDomainSummary({
      domainId: 'lead',
      domainKey: 'signal_lead',
      domainTitle: 'Leadership Approach',
      signals: [
        { signalId: 'lead-directive', signalKey: 'lead_directive', signalTitle: 'Directive', percentage: 57, rank: 1 },
        { signalId: 'lead-inclusive', signalKey: 'lead_inclusive', signalTitle: 'Inclusive', percentage: 43, rank: 2 },
      ],
    }),
    buildDomainSummary({
      domainId: 'conflict',
      domainKey: 'signal_conflict',
      domainTitle: 'Tension Response',
      signals: [
        { signalId: 'conflict-compete', signalKey: 'conflict_compete', signalTitle: 'Compete', percentage: 59, rank: 1 },
        { signalId: 'conflict-accommodate', signalKey: 'conflict_accommodate', signalTitle: 'Accommodate', percentage: 41, rank: 2 },
      ],
    }),
    buildDomainSummary({
      domainId: 'culture',
      domainKey: 'signal_culture',
      domainTitle: 'Environment Fit',
      signals: [
        { signalId: 'culture-autonomy', signalKey: 'culture_autonomy', signalTitle: 'Autonomy', percentage: 52, rank: 1 },
        { signalId: 'culture-collaboration', signalKey: 'culture_collaboration', signalTitle: 'Collaboration', percentage: 48, rank: 2 },
      ],
    }),
    buildDomainSummary({
      domainId: 'stress',
      domainKey: 'signal_stress',
      domainTitle: 'Pressure Response',
      signals: [
        { signalId: 'stress-criticality', signalKey: 'stress_criticality', signalTitle: 'Criticality', percentage: 55, rank: 1 },
        { signalId: 'stress-scatter', signalKey: 'stress_scatter', signalTitle: 'Scatter', percentage: 45, rank: 2 },
      ],
    }),
  ];
}

test('hero engine aggregates traits and selects the first matching rule by priority', () => {
  const result = evaluateHeroPattern({
    heroDefinition: buildHeroDefinition(),
    domainSummaries: buildHeroDomainSummaries(),
  });

  assert.equal(result.patternKey, 'adaptive_mobiliser');
  assert.equal(result.priority, 24);
  assert.equal(result.isFallback, false);
  assert.equal(result.traitTotals.adaptive, 4);
  assert.equal(result.traitTotals.flexible, 1);
  assert.equal(result.domainPairWinners[0]?.pairKey, 'driver_influencer');
  assert.deepEqual(result.matchedPatterns, [{ patternKey: 'adaptive_mobiliser', priority: 24 }]);
});

test('hero engine falls back to balanced_operator when no pattern rules match', () => {
  const heroDefinition = {
    ...buildHeroDefinition(),
    patternRules: [
      {
        patternKey: 'adaptive_mobiliser',
        priority: 24,
        conditions: [{ traitKey: 'adaptive', operator: '>=', value: 8 }],
        exclusions: [],
      },
    ],
  } satisfies RuntimeHeroDefinition;

  const result = evaluateHeroPattern({
    heroDefinition,
    domainSummaries: buildHeroDomainSummaries(),
  });

  assert.equal(result.patternKey, 'balanced_operator');
  assert.equal(result.priority, null);
  assert.equal(result.isFallback, true);
  assert.equal(result.headline, 'Balanced Operator');
});
