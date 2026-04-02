import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDomainSignalRingViewModel,
  computeSignalDisplayStrength,
} from '@/lib/server/domain-signal-ring-view-model';

function buildPayload(
  domainSummaries: readonly unknown[],
): { domainSummaries: readonly unknown[] } {
  return { domainSummaries };
}

test('domain signal ring mapper preserves authored domain order', () => {
  const rings = buildDomainSignalRingViewModel(
    buildPayload(
      Object.freeze([
        {
          domainId: 'domain-z',
          domainKey: 'zeta',
          domainTitle: 'Zeta',
          domainSource: 'signal_group',
          rawTotal: 10,
          normalizedValue: 50,
          percentage: 50,
          signalScores: Object.freeze([]),
          signalCount: 0,
          answeredQuestionCount: 1,
          rankedSignalIds: Object.freeze([]),
          interpretation: null,
        },
        {
          domainId: 'domain-a',
          domainKey: 'alpha',
          domainTitle: 'Alpha',
          domainSource: 'signal_group',
          rawTotal: 10,
          normalizedValue: 50,
          percentage: 50,
          signalScores: Object.freeze([]),
          signalCount: 0,
          answeredQuestionCount: 1,
          rankedSignalIds: Object.freeze([]),
          interpretation: null,
        },
      ]),
    ),
  );

  assert.deepEqual(rings.map((ring) => ring.domainKey), ['zeta', 'alpha']);
});

test('domain signal ring mapper preserves authored signal order while deriving top flags', () => {
  const rings = buildDomainSignalRingViewModel(
    buildPayload(
      Object.freeze([
        {
          domainId: 'domain-1',
          domainKey: 'custom_domain',
          domainTitle: 'Custom Domain',
          domainSource: 'signal_group',
          rawTotal: 20,
          normalizedValue: 100,
          percentage: 100,
          signalScores: Object.freeze([
            {
              signalId: 'signal-2',
              signalKey: 'second_listed',
              signalTitle: 'Second Listed',
              domainId: 'domain-1',
              domainKey: 'custom_domain',
              domainSource: 'signal_group',
              isOverlay: false,
              overlayType: 'none',
              rawTotal: 4,
              normalizedValue: 40,
              percentage: 40,
              domainPercentage: 40,
              rank: 2,
            },
            {
              signalId: 'signal-1',
              signalKey: 'first_by_score',
              signalTitle: 'First By Score',
              domainId: 'domain-1',
              domainKey: 'custom_domain',
              domainSource: 'signal_group',
              isOverlay: false,
              overlayType: 'none',
              rawTotal: 8,
              normalizedValue: 80,
              percentage: 80,
              domainPercentage: 80,
              rank: 1,
            },
            {
              signalId: 'signal-3',
              signalKey: 'third_by_score',
              signalTitle: 'Third By Score',
              domainId: 'domain-1',
              domainKey: 'custom_domain',
              domainSource: 'signal_group',
              isOverlay: false,
              overlayType: 'none',
              rawTotal: 6,
              normalizedValue: 60,
              percentage: 60,
              domainPercentage: 60,
              rank: 3,
            },
          ]),
          signalCount: 3,
          answeredQuestionCount: 1,
          rankedSignalIds: Object.freeze(['signal-1', 'signal-3', 'signal-2']),
          interpretation: {
            domainKey: 'custom_domain',
            primarySignalKey: 'first_by_score',
            primaryPercent: 80,
            secondarySignalKey: 'third_by_score',
            secondaryPercent: 60,
            summary: 'Custom summary.',
          },
        },
      ]),
    ),
  );

  assert.deepEqual(rings[0]?.signals.map((signal) => signal.signalKey), [
    'second_listed',
    'first_by_score',
    'third_by_score',
  ]);
  assert.equal(rings[0]?.signals[1]?.isTopSignal, true);
  assert.equal(rings[0]?.signals[2]?.isSecondSignal, true);
  assert.equal(rings[0]?.topSignalKey, 'first_by_score');
  assert.equal(rings[0]?.domainSummary, 'Custom summary.');
  assert.equal(rings[0]?.signals[1]?.displayStrength, 0.84);
});

test('domain signal ring mapper handles equal scores deterministically by authored order', () => {
  const rings = buildDomainSignalRingViewModel(
    buildPayload(
      Object.freeze([
        {
          domainId: 'domain-1',
          domainKey: 'equal_scores',
          domainTitle: 'Equal Scores',
          domainSource: 'signal_group',
          rawTotal: 20,
          normalizedValue: 100,
          percentage: 100,
          signalScores: Object.freeze([
            {
              signalId: 'signal-a',
              signalKey: 'alpha_signal',
              signalTitle: 'Alpha Signal',
              domainId: 'domain-1',
              domainKey: 'equal_scores',
              domainSource: 'signal_group',
              isOverlay: false,
              overlayType: 'none',
              rawTotal: 7,
              normalizedValue: 70,
              percentage: 70,
              domainPercentage: 70,
              rank: 1,
            },
            {
              signalId: 'signal-b',
              signalKey: 'beta_signal',
              signalTitle: 'Beta Signal',
              domainId: 'domain-1',
              domainKey: 'equal_scores',
              domainSource: 'signal_group',
              isOverlay: false,
              overlayType: 'none',
              rawTotal: 7,
              normalizedValue: 70,
              percentage: 70,
              domainPercentage: 70,
              rank: 2,
            },
            {
              signalId: 'signal-c',
              signalKey: 'gamma_signal',
              signalTitle: 'Gamma Signal',
              domainId: 'domain-1',
              domainKey: 'equal_scores',
              domainSource: 'signal_group',
              isOverlay: false,
              overlayType: 'none',
              rawTotal: 1,
              normalizedValue: 10,
              percentage: 10,
              domainPercentage: 10,
              rank: 3,
            },
          ]),
          signalCount: 3,
          answeredQuestionCount: 1,
          rankedSignalIds: Object.freeze(['signal-a', 'signal-b', 'signal-c']),
          interpretation: null,
        },
      ]),
    ),
  );

  assert.equal(rings[0]?.signals[0]?.isTopSignal, true);
  assert.equal(rings[0]?.signals[1]?.isSecondSignal, true);
  assert.deepEqual(rings[0]?.signals.map((signal) => signal.rankWithinDomain), [1, 2, 3]);
});

test('domain signal ring mapper handles missing and partial signal score data safely', () => {
  const rings = buildDomainSignalRingViewModel({
    domainSummaries: Object.freeze([
      {
        domainKey: 'partial_domain',
        domainTitle: 'Partial Domain',
        signalScores: Object.freeze([
          {
            signalKey: 'missing_score',
            signalTitle: 'Missing Score',
          },
          {
            signalKey: 'has_fallback_score',
            signalTitle: 'Has Fallback Score',
            normalizedValue: 55,
          },
        ]),
      } as never,
      {
        domainKey: 'empty_domain',
        domainTitle: 'Empty Domain',
      } as never,
    ]),
  });

  assert.equal(rings[0]?.signals[0]?.scorePercent, null);
  assert.equal(rings[0]?.signals[0]?.displayStrength, 0.2);
  assert.equal(rings[0]?.signals[0]?.rankWithinDomain, null);
  assert.equal(rings[0]?.signals[1]?.scorePercent, 55);
  assert.equal(rings[0]?.signals[1]?.displayStrength, 0.64);
  assert.equal(rings[0]?.signals[1]?.isTopSignal, true);
  assert.deepEqual(rings[1]?.signals, []);
  assert.equal(rings[1]?.signalCount, 0);
  assert.equal(rings[1]?.topSignalKey, null);
});

test('domain signal ring mapper does not depend on Sonartra-specific labels and supports non-standard signal counts', () => {
  const rings = buildDomainSignalRingViewModel(
    buildPayload(
      Object.freeze([
        {
          domainId: 'domain-xyz',
          domainKey: 'orbital_patterns',
          domainTitle: 'Orbital Patterns',
          domainSource: 'signal_group',
          rawTotal: 30,
          normalizedValue: 100,
          percentage: 100,
          signalScores: Object.freeze([
            {
              signalId: 'signal-1',
              signalKey: 'northbound',
              signalTitle: 'Northbound',
              domainId: 'domain-xyz',
              domainKey: 'orbital_patterns',
              domainSource: 'signal_group',
              isOverlay: false,
              overlayType: 'none',
              rawTotal: 9,
              normalizedValue: 90,
              percentage: 90,
              domainPercentage: 90,
              rank: 1,
            },
            {
              signalId: 'signal-2',
              signalKey: 'eastbound',
              signalTitle: 'Eastbound',
              domainId: 'domain-xyz',
              domainKey: 'orbital_patterns',
              domainSource: 'signal_group',
              isOverlay: false,
              overlayType: 'none',
              rawTotal: 7,
              normalizedValue: 70,
              percentage: 70,
              domainPercentage: 70,
              rank: 2,
            },
            {
              signalId: 'signal-3',
              signalKey: 'southbound',
              signalTitle: 'Southbound',
              domainId: 'domain-xyz',
              domainKey: 'orbital_patterns',
              domainSource: 'signal_group',
              isOverlay: false,
              overlayType: 'none',
              rawTotal: 5,
              normalizedValue: 50,
              percentage: 50,
              domainPercentage: 50,
              rank: 3,
            },
            {
              signalId: 'signal-4',
              signalKey: 'westbound',
              signalTitle: 'Westbound',
              domainId: 'domain-xyz',
              domainKey: 'orbital_patterns',
              domainSource: 'signal_group',
              isOverlay: false,
              overlayType: 'none',
              rawTotal: 3,
              normalizedValue: 30,
              percentage: 30,
              domainPercentage: 30,
              rank: 4,
            },
            {
              signalId: 'signal-5',
              signalKey: 'zenith',
              signalTitle: 'Zenith',
              domainId: 'domain-xyz',
              domainKey: 'orbital_patterns',
              domainSource: 'signal_group',
              isOverlay: false,
              overlayType: 'none',
              rawTotal: 1,
              normalizedValue: 10,
              percentage: 10,
              domainPercentage: 10,
              rank: 5,
            },
          ]),
          signalCount: 5,
          answeredQuestionCount: 1,
          rankedSignalIds: Object.freeze(['signal-1', 'signal-2', 'signal-3', 'signal-4', 'signal-5']),
          interpretation: null,
        },
      ]),
    ),
  );

  assert.equal(rings[0]?.domainKey, 'orbital_patterns');
  assert.equal(rings[0]?.domainLabel, 'Orbital Patterns');
  assert.equal(rings[0]?.signalCount, 5);
  assert.equal(rings[0]?.maxSignalPercent, 90);
  assert.equal(rings[0]?.minSignalPercent, 10);
});

test('display strength helper clamps and scales persisted scores without engine recalculation', () => {
  assert.deepEqual(computeSignalDisplayStrength(0), { displayStrength: 0.2 });
  assert.deepEqual(computeSignalDisplayStrength(50), { displayStrength: 0.6 });
  assert.deepEqual(computeSignalDisplayStrength(100), { displayStrength: 1 });
  assert.deepEqual(computeSignalDisplayStrength(null, { minVisibleFloor: 0.1, maxRange: 0.5 }), {
    displayStrength: 0.1,
  });
  assert.deepEqual(computeSignalDisplayStrength(150, { minVisibleFloor: 0.1, maxRange: 0.5 }), {
    displayStrength: 0.6,
  });
});
