import type { DomainKey, PairTraitWeight } from './hero-exploration-types';

type DomainPairSet = {
  domainKey: DomainKey;
  pairKeys: readonly string[];
};

const OPERATING_STYLE_PAIRS: DomainPairSet = {
  domainKey: 'operatingStyle',
  pairKeys: [
    'driver_influencer',
    'driver_operator',
    'driver_analyst',
    'influencer_operator',
    'influencer_analyst',
    'operator_analyst',
  ],
};

const CORE_DRIVER_PAIRS: DomainPairSet = {
  domainKey: 'coreDrivers',
  pairKeys: [
    'achievement_influence',
    'achievement_stability',
    'achievement_mastery',
    'influence_stability',
    'influence_mastery',
    'stability_mastery',
  ],
};

const LEADERSHIP_APPROACH_PAIRS: DomainPairSet = {
  domainKey: 'leadershipApproach',
  pairKeys: [
    'results_vision',
    'results_people',
    'results_process',
    'vision_people',
    'vision_process',
    'people_process',
  ],
};

const TENSION_RESPONSE_PAIRS: DomainPairSet = {
  domainKey: 'tensionResponse',
  pairKeys: [
    'compete_collaborate',
    'compete_compromise',
    'compete_accommodate',
    'collaborate_compromise',
    'collaborate_accommodate',
    'compromise_accommodate',
  ],
};

const ENVIRONMENT_FIT_PAIRS: DomainPairSet = {
  domainKey: 'environmentFit',
  pairKeys: [
    'market_adhocracy',
    'market_clan',
    'market_hierarchy',
    'adhocracy_clan',
    'adhocracy_hierarchy',
    'clan_hierarchy',
  ],
};

const PRESSURE_RESPONSE_PAIRS: DomainPairSet = {
  domainKey: 'pressureResponse',
  pairKeys: [
    'control_scatter',
    'control_avoidance',
    'control_critical',
    'scatter_avoidance',
    'scatter_critical',
    'avoidance_critical',
  ],
};

export const DOMAIN_PAIR_SETS: readonly DomainPairSet[] = [
  OPERATING_STYLE_PAIRS,
  CORE_DRIVER_PAIRS,
  LEADERSHIP_APPROACH_PAIRS,
  TENSION_RESPONSE_PAIRS,
  ENVIRONMENT_FIT_PAIRS,
  PRESSURE_RESPONSE_PAIRS,
];

function definePair(
  pairKey: string,
  primaryTraitKey: PairTraitWeight['traitKey'],
  secondaryTraitKey: PairTraitWeight['traitKey'],
): readonly PairTraitWeight[] {
  return [
    { pairKey, traitKey: primaryTraitKey, weight: 2 },
    { pairKey, traitKey: secondaryTraitKey, weight: 1 },
  ];
}

export const PAIR_TRAIT_WEIGHTS: readonly PairTraitWeight[] = [
  ...definePair('driver_influencer', 'paced', 'assertive'),
  ...definePair('driver_operator', 'task_led', 'stable'),
  ...definePair('driver_analyst', 'paced', 'structured'),
  ...definePair('influencer_operator', 'people_led', 'flexible'),
  ...definePair('influencer_analyst', 'people_led', 'adaptive'),
  ...definePair('operator_analyst', 'deliberate', 'structured'),

  ...definePair('achievement_influence', 'paced', 'people_led'),
  ...definePair('achievement_stability', 'task_led', 'stable'),
  ...definePair('achievement_mastery', 'exacting', 'deliberate'),
  ...definePair('influence_stability', 'people_led', 'stable'),
  ...definePair('influence_mastery', 'adaptive', 'people_led'),
  ...definePair('stability_mastery', 'deliberate', 'exacting'),

  ...definePair('results_vision', 'assertive', 'paced'),
  ...definePair('results_people', 'task_led', 'people_led'),
  ...definePair('results_process', 'structured', 'assertive'),
  ...definePair('vision_people', 'people_led', 'adaptive'),
  ...definePair('vision_process', 'flexible', 'structured'),
  ...definePair('people_process', 'people_led', 'structured'),

  ...definePair('compete_collaborate', 'assertive', 'people_led'),
  ...definePair('compete_compromise', 'assertive', 'adaptive'),
  ...definePair('compete_accommodate', 'assertive', 'receptive'),
  ...definePair('collaborate_compromise', 'people_led', 'tolerant'),
  ...definePair('collaborate_accommodate', 'receptive', 'people_led'),
  ...definePair('compromise_accommodate', 'tolerant', 'flexible'),

  ...definePair('market_adhocracy', 'adaptive', 'paced'),
  ...definePair('market_clan', 'paced', 'people_led'),
  ...definePair('market_hierarchy', 'task_led', 'structured'),
  ...definePair('adhocracy_clan', 'flexible', 'people_led'),
  ...definePair('adhocracy_hierarchy', 'adaptive', 'structured'),
  ...definePair('clan_hierarchy', 'stable', 'people_led'),

  ...definePair('control_scatter', 'adaptive', 'assertive'),
  ...definePair('control_avoidance', 'stable', 'receptive'),
  ...definePair('control_critical', 'exacting', 'assertive'),
  ...definePair('scatter_avoidance', 'flexible', 'adaptive'),
  ...definePair('scatter_critical', 'adaptive', 'exacting'),
  ...definePair('avoidance_critical', 'deliberate', 'receptive'),
];

export const PAIR_TRAIT_WEIGHT_LOOKUP = new Map(
  DOMAIN_PAIR_SETS.flatMap((domainPairSet) =>
    domainPairSet.pairKeys.map((pairKey) => [
      pairKey,
      PAIR_TRAIT_WEIGHTS.filter((entry) => entry.pairKey === pairKey),
    ] as const),
  ),
);
