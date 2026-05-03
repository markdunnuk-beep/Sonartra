import type { LibraryCategory } from './types';

export const LIBRARY_CATEGORIES: readonly LibraryCategory[] = [
  {
    key: 'behavioural-assessments',
    label: 'Behavioural assessments',
    description: 'Foundational explainers on what behavioural assessments measure and how to read them.',
    intro:
      'Behavioural assessment articles explain the difference between observed working patterns and fixed personality labels.',
    assessmentKey: 'wplp80',
    order: 10,
  },
  {
    key: 'leadership-style',
    label: 'Leadership style',
    description: 'Guidance on how people shape direction, judgement, influence, and responsibility.',
    intro:
      'Leadership style articles focus on how leadership behaviour appears in practical working contexts.',
    assessmentKey: 'wplp80',
    order: 20,
  },
  {
    key: 'work-style',
    label: 'Work style',
    description: 'Articles on pace, structure, collaboration, decision habits, and day-to-day execution.',
    intro:
      'Work style articles help readers understand the habits and conditions that shape everyday performance.',
    assessmentKey: 'wplp80',
    order: 30,
  },
  {
    key: 'conflict-style',
    label: 'Conflict style',
    description: 'Clear language for challenge, tension, repair, avoidance, and pressure responses.',
    intro:
      'Conflict style articles explain how people tend to handle tension without turning those patterns into labels.',
    assessmentKey: 'wplp80',
    order: 40,
  },
  {
    key: 'flow-state',
    label: 'Flow state',
    description: 'Explainers on focus, energy, momentum, and the conditions that support deep work.',
    intro:
      'Flow state articles connect behavioural patterns with the conditions that help people do sustained work.',
    assessmentKey: null,
    order: 50,
  },
  {
    key: 'team-dynamics',
    label: 'Team dynamics',
    description: 'Resources on team momentum, friction, working agreements, and shared interpretation.',
    intro:
      'Team dynamics articles show how individual behavioural patterns can support better team conversations.',
    assessmentKey: null,
    order: 60,
  },
  {
    key: 'assessment-guides',
    label: 'Assessment guides',
    description: 'Practical guidance for using assessment reports with care, clarity, and range.',
    intro:
      'Assessment guides help readers use reports as starting points for reflection and action.',
    assessmentKey: 'wplp80',
    order: 70,
  },
] as const;
