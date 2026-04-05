import type { HeroPatternRule } from './hero-exploration-types';

export const HERO_PATTERN_RULES: readonly HeroPatternRule[] = [
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

export const HERO_PATTERN_FALLBACK_KEY = 'balanced_operator';
