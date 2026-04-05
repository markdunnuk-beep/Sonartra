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

export const HERO_PATTERN_RULES: readonly HeroPatternRule[] = [
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
    ],
  },
];

export const HERO_PATTERN_FALLBACK_KEY = 'balanced_operator';

export const PATTERN_CHANGE_LOG: Readonly<Record<string, string>> = {
  adaptive_catalyst: 'unchanged rule thresholds, but reprioritised later to reduce avoidable collisions with more specific patterns.',
  adaptive_challenger: 'new pattern added for high adaptive + assertive + paced profiles that previously collapsed to fallback.',
  adaptive_orchestrator: 'new pattern added for adaptive + structured profiles; the assertive requirement was removed to improve coverage of organised but less overtly forceful profiles.',
  balanced_operator: 'unchanged fallback retained as the final deterministic catch-all.',
  calm_operator: 'removed and replaced by more specific steady_executor and grounded_planner patterns.',
  decisive_orchestrator: 'broadened and tightened around structured task leadership so it catches clearer execution-control profiles.',
  deliberate_craftsperson: 'broadened by removing the exacting requirement and lowering deliberate to 3; it now focuses on deliberate + structured profiles.',
  delivery_commander: 'new pattern added for high task_led + assertive profiles, with the task threshold lowered to capture stronger mid-range execution-drive shapes.',
  diplomatic_stabiliser: 'broadened into a clearer receptive + stable pattern so it covers mid-range steady diplomatic profiles and remains reachable under the current weight table.',
  driving_integrator: 'new pattern added for high paced + people-led profiles.',
  exacting_controller: 'broadened slightly by removing the structured requirement.',
  flexible_mobiliser: 'broadened slightly but reprioritised below more specific social-pace patterns.',
  forceful_driver: 'broadened by removing the task_led requirement so high paced + assertive profiles become reachable.',
  grounded_planner: 'new pattern added for deliberate + stable profiles, with both thresholds lowered to improve mid-range coverage.',
  grounded_steward: 'new pattern added for people-led + stable + deliberate stewardship profiles, with thresholds lowered to keep the pattern viable.',
  relational_catalyst: 're-broadened slightly so clearly social fast-moving profiles do not fall back unnecessarily.',
  responsive_mediator: 'broadened into a reachable receptive + tolerant pattern by lowering receptive to 1.',
  steady_connector: 'new pattern added for people-led + stable mid-range profiles, with lower people-led thresholds for broader coverage.',
  steady_executor: 'new pattern added for high task_led + stable profiles, with the task threshold lowered to catch stronger mid-range delivery shapes.',
  structured_collaborator: 'broadened by lowering the structured threshold from 4 to 3 and the people-led threshold from 4 to 3.',
};
