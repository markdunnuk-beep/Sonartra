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
      { traitKey: 'stable', operator: '>=', value: 2 },
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

export const HERO_PATTERN_FALLBACK_KEY = 'balanced_operator';

export const PATTERN_CHANGE_LOG: Readonly<Record<string, string>> = {
  adaptive_catalyst: 'tightened with a small exclusion set against strongly social, structured, and highly assertive profiles so it keeps the adaptive-flex lane.',
  adaptive_challenger: 'left active but lightly tightened against strongly social neighbours to keep the force/pace lane clear.',
  adaptive_orchestrator: 'kept active as the adaptive-structured lane, but now excludes strongly social, strongly assertive, and strongly stable profiles to reduce deep overlap stacks.',
  balanced_operator: 'unchanged fallback retained as the final deterministic catch-all.',
  calm_operator: 'retired from the active refined set; its space is covered by steady_executor and grounded_planner.',
  decisive_orchestrator: 'broadened slightly by lowering structured to 3 so more mid-range execution-control profiles avoid fallback.',
  deliberate_craftsperson: 'left broadly available as the structured craft lane after stable exclusions proved too costly to coverage.',
  delivery_commander: 'left in place as the task-led assertive lane; stable exclusion was removed after over-cutting strong delivery profiles.',
  diplomatic_stabiliser: 'kept in the receptive-stable lane, but narrowed away from connector, mediator, and grounded stewardship cases.',
  driving_integrator: 'kept active for high paced + people-led profiles, with only higher-flex and higher-structured exclusions to reduce the worst overlap families.',
  exacting_controller: 'unchanged from round 2 because it was already clean, high-confidence, and low-collision.',
  flexible_mobiliser: 'narrowed with a higher pace exclusion so it captures lower-pace flexible social profiles while giving faster social profiles to pace-led neighbours.',
  forceful_driver: 'left broad so high paced + assertive profiles remain reachable even when they also carry moderate social range.',
  grounded_planner: 'left active with only a stronger people-led exclusion after narrower variants over-cut grounded mid-range coverage.',
  grounded_steward: 'left active but excludes receptive-heavy cases so it stays distinct from diplomacy.',
  relational_catalyst: 'left active but excludes only the highest-flex and highest-pace cases so it reduces overlap without collapsing too much social-pace coverage.',
  responsive_mediator: 'retained as the receptive+tolerant+people mediation lane, with only a higher-stability exclusion to stay out of connector territory.',
  steady_connector: 'narrowed to the social-stable lane with a higher deliberate exclusion so grounded stewardship can keep its own lane.',
  steady_executor: 'still narrowed to the task-stable lane, but stable was lowered to 2 to capture more delivery-grounded mid-range profiles.',
  structured_collaborator: 'narrowed with a higher adaptive exclusion so it keeps the structured-social lane without overlapping adaptive_orchestrator as often.',
};
