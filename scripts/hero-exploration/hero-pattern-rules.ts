import type { HeroPatternRule } from './hero-exploration-types';

export const BASELINE_HERO_PATTERN_RULES: readonly HeroPatternRule[] = [
  {
    patternKey: 'forceful_driver',
    priority: 10,
    conditions: [
      { traitKey: 'assertive', operator: '>=', value: 5 },
      { traitKey: 'paced', operator: '>=', value: 4 },
      { traitKey: 'task_led', operator: '>=', value: 3 },
    ],
  },
  {
    patternKey: 'structured_collaborator',
    priority: 12,
    conditions: [
      { traitKey: 'structured', operator: '>=', value: 4 },
      { traitKey: 'people_led', operator: '>=', value: 4 },
    ],
  },
  {
    patternKey: 'exacting_controller',
    priority: 14,
    conditions: [
      { traitKey: 'exacting', operator: '>=', value: 4 },
      { traitKey: 'assertive', operator: '>=', value: 2 },
      { traitKey: 'structured', operator: '>=', value: 1 },
    ],
  },
  {
    patternKey: 'adaptive_catalyst',
    priority: 16,
    conditions: [
      { traitKey: 'adaptive', operator: '>=', value: 5 },
      { traitKey: 'flexible', operator: '>=', value: 2 },
    ],
  },
  {
    patternKey: 'decisive_orchestrator',
    priority: 18,
    conditions: [
      { traitKey: 'structured', operator: '>=', value: 3 },
      { traitKey: 'assertive', operator: '>=', value: 3 },
      { traitKey: 'task_led', operator: '>=', value: 3 },
    ],
  },
  {
    patternKey: 'relational_catalyst',
    priority: 20,
    conditions: [
      { traitKey: 'people_led', operator: '>=', value: 5 },
      { traitKey: 'paced', operator: '>=', value: 2 },
    ],
  },
  {
    patternKey: 'diplomatic_stabiliser',
    priority: 22,
    conditions: [
      { traitKey: 'receptive', operator: '>=', value: 3 },
      { traitKey: 'stable', operator: '>=', value: 3 },
      { traitKey: 'people_led', operator: '>=', value: 2 },
    ],
  },
  {
    patternKey: 'deliberate_craftsperson',
    priority: 24,
    conditions: [
      { traitKey: 'deliberate', operator: '>=', value: 4 },
      { traitKey: 'structured', operator: '>=', value: 2 },
      { traitKey: 'exacting', operator: '>=', value: 2 },
    ],
  },
  {
    patternKey: 'flexible_mobiliser',
    priority: 26,
    conditions: [
      { traitKey: 'flexible', operator: '>=', value: 4 },
      { traitKey: 'people_led', operator: '>=', value: 3 },
    ],
  },
  {
    patternKey: 'responsive_mediator',
    priority: 28,
    conditions: [
      { traitKey: 'receptive', operator: '>=', value: 3 },
      { traitKey: 'tolerant', operator: '>=', value: 2 },
      { traitKey: 'people_led', operator: '>=', value: 2 },
    ],
  },
  {
    patternKey: 'calm_operator',
    priority: 30,
    conditions: [
      { traitKey: 'stable', operator: '>=', value: 4 },
      { traitKey: 'task_led', operator: '>=', value: 2 },
      { traitKey: 'deliberate', operator: '>=', value: 2 },
    ],
  },
];

export const ROUND2_HERO_PATTERN_RULES: readonly HeroPatternRule[] = [
  {
    patternKey: 'forceful_driver',
    priority: 10,
    conditions: [
      { traitKey: 'assertive', operator: '>=', value: 5 },
      { traitKey: 'paced', operator: '>=', value: 4 },
    ],
  },
  {
    patternKey: 'adaptive_challenger',
    priority: 12,
    conditions: [
      { traitKey: 'adaptive', operator: '>=', value: 4 },
      { traitKey: 'assertive', operator: '>=', value: 4 },
      { traitKey: 'paced', operator: '>=', value: 3 },
    ],
  },
  {
    patternKey: 'exacting_controller',
    priority: 14,
    conditions: [
      { traitKey: 'exacting', operator: '>=', value: 4 },
      { traitKey: 'assertive', operator: '>=', value: 2 },
    ],
  },
  {
    patternKey: 'decisive_orchestrator',
    priority: 16,
    conditions: [
      { traitKey: 'structured', operator: '>=', value: 4 },
      { traitKey: 'task_led', operator: '>=', value: 3 },
      { traitKey: 'assertive', operator: '>=', value: 2 },
    ],
  },
  {
    patternKey: 'delivery_commander',
    priority: 18,
    conditions: [
      { traitKey: 'task_led', operator: '>=', value: 4 },
      { traitKey: 'assertive', operator: '>=', value: 2 },
    ],
  },
  {
    patternKey: 'deliberate_craftsperson',
    priority: 20,
    conditions: [
      { traitKey: 'deliberate', operator: '>=', value: 3 },
      { traitKey: 'structured', operator: '>=', value: 3 },
    ],
  },
  {
    patternKey: 'steady_executor',
    priority: 22,
    conditions: [
      { traitKey: 'task_led', operator: '>=', value: 4 },
      { traitKey: 'stable', operator: '>=', value: 3 },
    ],
  },
  {
    patternKey: 'grounded_planner',
    priority: 24,
    conditions: [
      { traitKey: 'deliberate', operator: '>=', value: 3 },
      { traitKey: 'stable', operator: '>=', value: 3 },
    ],
  },
  {
    patternKey: 'grounded_steward',
    priority: 26,
    conditions: [
      { traitKey: 'people_led', operator: '>=', value: 4 },
      { traitKey: 'stable', operator: '>=', value: 4 },
      { traitKey: 'deliberate', operator: '>=', value: 2 },
    ],
  },
  {
    patternKey: 'structured_collaborator',
    priority: 28,
    conditions: [
      { traitKey: 'structured', operator: '>=', value: 3 },
      { traitKey: 'people_led', operator: '>=', value: 3 },
    ],
  },
  {
    patternKey: 'driving_integrator',
    priority: 30,
    conditions: [
      { traitKey: 'paced', operator: '>=', value: 4 },
      { traitKey: 'people_led', operator: '>=', value: 3 },
    ],
  },
  {
    patternKey: 'relational_catalyst',
    priority: 32,
    conditions: [
      { traitKey: 'people_led', operator: '>=', value: 5 },
      { traitKey: 'paced', operator: '>=', value: 2 },
    ],
  },
  {
    patternKey: 'steady_connector',
    priority: 34,
    conditions: [
      { traitKey: 'people_led', operator: '>=', value: 3 },
      { traitKey: 'stable', operator: '>=', value: 3 },
    ],
  },
  {
    patternKey: 'flexible_mobiliser',
    priority: 36,
    conditions: [
      { traitKey: 'people_led', operator: '>=', value: 4 },
      { traitKey: 'flexible', operator: '>=', value: 2 },
    ],
  },
  {
    patternKey: 'adaptive_catalyst',
    priority: 38,
    conditions: [
      { traitKey: 'adaptive', operator: '>=', value: 4 },
      { traitKey: 'flexible', operator: '>=', value: 2 },
    ],
  },
  {
    patternKey: 'adaptive_orchestrator',
    priority: 40,
    conditions: [
      { traitKey: 'adaptive', operator: '>=', value: 3 },
      { traitKey: 'structured', operator: '>=', value: 3 },
    ],
  },
  {
    patternKey: 'diplomatic_stabiliser',
    priority: 42,
    conditions: [
      { traitKey: 'receptive', operator: '>=', value: 1 },
      { traitKey: 'stable', operator: '>=', value: 3 },
    ],
  },
  {
    patternKey: 'responsive_mediator',
    priority: 44,
    conditions: [
      { traitKey: 'receptive', operator: '>=', value: 1 },
      { traitKey: 'tolerant', operator: '>=', value: 2 },
      { traitKey: 'people_led', operator: '>=', value: 2 },
    ],
  },
];

export const ROUND3_HERO_PATTERN_RULES: readonly HeroPatternRule[] = [
  {
    patternKey: 'forceful_driver',
    priority: 10,
    conditions: [
      { traitKey: 'assertive', operator: '>=', value: 5 },
      { traitKey: 'paced', operator: '>=', value: 4 },
    ],
  },
  {
    patternKey: 'adaptive_challenger',
    priority: 12,
    conditions: [
      { traitKey: 'adaptive', operator: '>=', value: 4 },
      { traitKey: 'assertive', operator: '>=', value: 4 },
      { traitKey: 'paced', operator: '>=', value: 3 },
    ],
    exclusions: [{ traitKey: 'people_led', operator: '>=', value: 4 }],
  },
  {
    patternKey: 'exacting_controller',
    priority: 14,
    conditions: [
      { traitKey: 'exacting', operator: '>=', value: 4 },
      { traitKey: 'assertive', operator: '>=', value: 2 },
    ],
  },
  {
    patternKey: 'decisive_orchestrator',
    priority: 16,
    conditions: [
      { traitKey: 'structured', operator: '>=', value: 3 },
      { traitKey: 'task_led', operator: '>=', value: 3 },
      { traitKey: 'assertive', operator: '>=', value: 2 },
    ],
  },
  {
    patternKey: 'delivery_commander',
    priority: 18,
    conditions: [
      { traitKey: 'task_led', operator: '>=', value: 4 },
      { traitKey: 'assertive', operator: '>=', value: 2 },
    ],
  },
  {
    patternKey: 'deliberate_craftsperson',
    priority: 20,
    conditions: [
      { traitKey: 'deliberate', operator: '>=', value: 3 },
      { traitKey: 'structured', operator: '>=', value: 3 },
    ],
  },
  {
    patternKey: 'steady_executor',
    priority: 22,
    conditions: [
      { traitKey: 'task_led', operator: '>=', value: 4 },
      { traitKey: 'stable', operator: '>=', value: 2 },
    ],
    exclusions: [
      { traitKey: 'assertive', operator: '>=', value: 3 },
      { traitKey: 'people_led', operator: '>=', value: 4 },
    ],
  },
  {
    patternKey: 'grounded_planner',
    priority: 24,
    conditions: [
      { traitKey: 'deliberate', operator: '>=', value: 3 },
      { traitKey: 'stable', operator: '>=', value: 3 },
    ],
    exclusions: [{ traitKey: 'people_led', operator: '>=', value: 5 }],
  },
  {
    patternKey: 'grounded_steward',
    priority: 26,
    conditions: [
      { traitKey: 'people_led', operator: '>=', value: 4 },
      { traitKey: 'stable', operator: '>=', value: 4 },
      { traitKey: 'deliberate', operator: '>=', value: 2 },
    ],
    exclusions: [{ traitKey: 'receptive', operator: '>=', value: 2 }],
  },
  {
    patternKey: 'structured_collaborator',
    priority: 28,
    conditions: [
      { traitKey: 'structured', operator: '>=', value: 3 },
      { traitKey: 'people_led', operator: '>=', value: 3 },
    ],
    exclusions: [{ traitKey: 'adaptive', operator: '>=', value: 4 }],
  },
  {
    patternKey: 'driving_integrator',
    priority: 30,
    conditions: [
      { traitKey: 'paced', operator: '>=', value: 4 },
      { traitKey: 'people_led', operator: '>=', value: 3 },
    ],
    exclusions: [
      { traitKey: 'flexible', operator: '>=', value: 3 },
      { traitKey: 'structured', operator: '>=', value: 4 },
    ],
  },
  {
    patternKey: 'relational_catalyst',
    priority: 32,
    conditions: [
      { traitKey: 'people_led', operator: '>=', value: 5 },
      { traitKey: 'paced', operator: '>=', value: 2 },
    ],
    exclusions: [
      { traitKey: 'flexible', operator: '>=', value: 4 },
      { traitKey: 'paced', operator: '>=', value: 5 },
    ],
  },
  {
    patternKey: 'steady_connector',
    priority: 34,
    conditions: [
      { traitKey: 'people_led', operator: '>=', value: 3 },
      { traitKey: 'stable', operator: '>=', value: 3 },
    ],
    exclusions: [{ traitKey: 'deliberate', operator: '>=', value: 3 }],
  },
  {
    patternKey: 'flexible_mobiliser',
    priority: 36,
    conditions: [
      { traitKey: 'people_led', operator: '>=', value: 4 },
      { traitKey: 'flexible', operator: '>=', value: 2 },
    ],
    exclusions: [{ traitKey: 'paced', operator: '>=', value: 4 }],
  },
  {
    patternKey: 'adaptive_catalyst',
    priority: 38,
    conditions: [
      { traitKey: 'adaptive', operator: '>=', value: 4 },
      { traitKey: 'flexible', operator: '>=', value: 2 },
    ],
    exclusions: [
      { traitKey: 'people_led', operator: '>=', value: 5 },
      { traitKey: 'structured', operator: '>=', value: 3 },
      { traitKey: 'assertive', operator: '>=', value: 4 },
    ],
  },
  {
    patternKey: 'adaptive_orchestrator',
    priority: 40,
    conditions: [
      { traitKey: 'adaptive', operator: '>=', value: 3 },
      { traitKey: 'structured', operator: '>=', value: 2 },
    ],
    exclusions: [
      { traitKey: 'flexible', operator: '>=', value: 3 },
      { traitKey: 'people_led', operator: '>=', value: 4 },
      { traitKey: 'assertive', operator: '>=', value: 3 },
      { traitKey: 'stable', operator: '>=', value: 3 },
    ],
  },
  {
    patternKey: 'diplomatic_stabiliser',
    priority: 42,
    conditions: [
      { traitKey: 'receptive', operator: '>=', value: 1 },
      { traitKey: 'stable', operator: '>=', value: 3 },
    ],
    exclusions: [
      { traitKey: 'people_led', operator: '>=', value: 4 },
      { traitKey: 'tolerant', operator: '>=', value: 2 },
      { traitKey: 'deliberate', operator: '>=', value: 3 },
    ],
  },
  {
    patternKey: 'responsive_mediator',
    priority: 44,
    conditions: [
      { traitKey: 'receptive', operator: '>=', value: 1 },
      { traitKey: 'tolerant', operator: '>=', value: 2 },
      { traitKey: 'people_led', operator: '>=', value: 2 },
    ],
    exclusions: [{ traitKey: 'stable', operator: '>=', value: 4 }],
  },
];

export const FINAL_HERO_PATTERN_RULES: readonly HeroPatternRule[] = [
  {
    patternKey: 'forceful_driver',
    priority: 10,
    conditions: [
      { traitKey: 'assertive', operator: '>=', value: 4 },
      { traitKey: 'paced', operator: '>=', value: 3 },
    ],
  },
  {
    patternKey: 'exacting_controller',
    priority: 12,
    conditions: [
      { traitKey: 'exacting', operator: '>=', value: 4 },
      { traitKey: 'assertive', operator: '>=', value: 2 },
    ],
  },
  {
    patternKey: 'delivery_commander',
    priority: 16,
    conditions: [
      { traitKey: 'task_led', operator: '>=', value: 4 },
      { traitKey: 'assertive', operator: '>=', value: 2 },
    ],
  },
  {
    patternKey: 'deliberate_craftsperson',
    priority: 18,
    conditions: [
      { traitKey: 'deliberate', operator: '>=', value: 3 },
      { traitKey: 'structured', operator: '>=', value: 3 },
    ],
  },
  {
    patternKey: 'grounded_planner',
    priority: 20,
    conditions: [
      { traitKey: 'deliberate', operator: '>=', value: 2 },
      { traitKey: 'stable', operator: '>=', value: 2 },
    ],
    exclusions: [{ traitKey: 'people_led', operator: '>=', value: 3 }],
  },
  {
    patternKey: 'relational_catalyst',
    priority: 22,
    conditions: [
      { traitKey: 'people_led', operator: '>=', value: 4 },
    ],
    exclusions: [
      { traitKey: 'stable', operator: '>=', value: 2 },
      { traitKey: 'assertive', operator: '>=', value: 5 },
    ],
  },
  {
    patternKey: 'adaptive_mobiliser',
    priority: 24,
    conditions: [
      { traitKey: 'adaptive', operator: '>=', value: 3 },
      { traitKey: 'flexible', operator: '>=', value: 1 },
    ],
    exclusions: [
      { traitKey: 'people_led', operator: '>=', value: 4 },
      { traitKey: 'assertive', operator: '>=', value: 4 },
      { traitKey: 'stable', operator: '>=', value: 3 },
      { traitKey: 'exacting', operator: '>=', value: 4 },
    ],
  },
  {
    patternKey: 'steady_steward',
    priority: 26,
    conditions: [
      { traitKey: 'people_led', operator: '>=', value: 3 },
      { traitKey: 'stable', operator: '>=', value: 2 },
    ],
    exclusions: [{ traitKey: 'paced', operator: '>=', value: 4 }],
  },
];

export const HERO_PATTERN_RULES = FINAL_HERO_PATTERN_RULES;
export const HERO_PATTERN_FALLBACK_KEY = 'balanced_operator';

export const FINAL_ACTIVE_PATTERN_KEYS = FINAL_HERO_PATTERN_RULES.map((rule) => rule.patternKey);

export const FINAL_CONSOLIDATION_MAP: Readonly<Record<string, readonly string[]>> = {
  forceful_driver: ['forceful_driver', 'adaptive_challenger'],
  exacting_controller: ['exacting_controller'],
  delivery_commander: ['delivery_commander', 'decisive_orchestrator', 'steady_executor'],
  deliberate_craftsperson: ['deliberate_craftsperson'],
  grounded_planner: ['grounded_planner'],
  relational_catalyst: ['relational_catalyst', 'driving_integrator'],
  adaptive_mobiliser: ['flexible_mobiliser', 'adaptive_catalyst', 'adaptive_orchestrator'],
  steady_steward: ['steady_steward', 'steady_connector', 'diplomatic_stabiliser', 'responsive_mediator', 'grounded_steward', 'structured_collaborator'],
};

export const PATTERN_CHANGE_LOG: Readonly<Record<string, string>> = {
  adaptive_catalyst: 'retired into adaptive_mobiliser for the final consolidation.',
  adaptive_challenger: 'retired into forceful_driver for the 8-pattern MVP so the fast assertive pole remains one clearer Hero lane.',
  adaptive_mobiliser: 'new consolidated adaptive identity merging flexible_mobiliser, adaptive_catalyst, and adaptive_orchestrator into one mobile change-oriented lane, with a broader adaptive threshold to reduce underfit mid-range profiles.',
  adaptive_orchestrator: 'retired into adaptive_mobiliser for the final consolidation.',
  balanced_operator: 'unchanged fallback retained as the final deterministic catch-all.',
  calm_operator: 'legacy baseline pattern retained only for historical comparison.',
  decisive_orchestrator: 'retired into delivery_commander for the 8-pattern MVP so execution control and delivery pressure live in one lane.',
  deliberate_craftsperson: 'retained as the quality-and-method identity because it stayed clean and editorially strong.',
  delivery_commander: 'retained as the direct execution lane, now absorbing decisive_orchestrator and steady_executor for the MVP taxonomy.',
  diplomatic_stabiliser: 'retired into steady_steward for the final consolidation.',
  driving_integrator: 'merged into relational_catalyst to remove a near-neighbour social pace distinction that belonged more in domain chapters than Hero identity.',
  exacting_controller: 'retained unchanged because it was already highly specific, low-collision, and implementation-ready.',
  flexible_mobiliser: 'retired into adaptive_mobiliser for the final consolidation.',
  forceful_driver: 'retained as the clearest high-pace high-assertive Hero lane, now also covering the adaptive challenger edge for MVP.',
  grounded_planner: 'retained as the quiet grounded planning identity for the MVP, holding the deliberate-stable middle that does not need its own delivery or social variant.',
  grounded_steward: 'retired into steady_steward for the final consolidation.',
  relational_catalyst: 'retained as the activating social lane, now broad enough to absorb socially energising profiles even when the pace signal is carried more by people energy than by raw pace points.',
  responsive_mediator: 'retired into steady_steward for the final consolidation.',
  steady_connector: 'retired into steady_steward for the final consolidation.',
  steady_executor: 'retired into delivery_commander for the 8-pattern MVP so execution reliability is handled in one broader delivery lane.',
  steady_steward: 'retained as the broad calm relational lane for the MVP, absorbing connector, mediator, grounded stewardship, and structured collaborator territory.',
  structured_collaborator: 'retired into steady_steward for the 8-pattern MVP so the structured social middle does not compete for its own narrow Hero lane.',
};
