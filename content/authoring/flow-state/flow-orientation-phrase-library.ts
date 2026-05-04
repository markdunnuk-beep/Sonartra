import type { readerFirstAllowedSignalKeys } from '@/content/authoring/reader-first-schema-manifest';

export type FlowSignalKey = (typeof readerFirstAllowedSignalKeys)[number];

export type FlowSignalPhraseSet = {
  readonly label: string;
  readonly mainRoute: string;
  readonly depth?: string;
  readonly energy?: string;
  readonly momentum?: string;
  readonly reset?: string;
  readonly test?: string;
  readonly support: string;
  readonly deliberate: string;
};

export const flowOrientationSignalPhrases: Record<FlowSignalKey, FlowSignalPhraseSet> = {
  deep_focus: {
    label: 'Deep focus',
    mainRoute: 'focused time with one demanding problem',
    depth: 'focused time with one demanding problem',
    support: 'a way to pause, concentrate, and make the work more substantial',
    deliberate: 'focused time to finish and refine the work',
  },
  creative_movement: {
    label: 'Creative movement',
    mainRoute: 'ideas, expression, and new possibilities',
    energy: 'ideas, expression, and new angles',
    support: 'ideas, expression, and new angles',
    deliberate: 'ideas, expression, and new angles before the work becomes too fixed',
  },
  physical_rhythm: {
    label: 'Physical rhythm',
    mainRoute: 'movement, pace, and a change of physical state',
    momentum: 'movement, pace, and a change of physical state',
    reset: 'movement, pace, and a change of physical state',
    support: 'movement, pace, and a change of physical state',
    deliberate: 'movement, pace, and physical reset',
  },
  social_exchange: {
    label: 'Social exchange',
    mainRoute: 'conversation, feedback, and shared thinking',
    test: 'conversation, feedback, and shared thinking',
    support: 'conversation, feedback, and shared thinking',
    deliberate: 'conversation and feedback before the work becomes too private',
  },
};

export const flowOrientationScoreShapeSummaries = {
  concentrated:
    'One signal is doing most of the work here. {rank_1_label} is the clearest starting point for this result.',
  paired:
    'Your first two signals are close enough to read together. Flow is likely to come from how {rank_1_label} and {rank_2_label} work as a pair.',
  graduated:
    'Each signal steps down clearly from the one before it. The full order matters.',
  balanced:
    'Your scores are close together. Treat the ranking lightly and read this as a flexible flow profile.',
} as const;

export const flowOrientationForbiddenPhrases = [
  'leads the pattern',
  'shapes it',
  'gives it support',
  'least expressed route',
  'stretch route',
  'clear anchor rather than one equal signal among four',
  'private depth',
  'private clarity becomes private certainty',
  'flow gathers',
  'route activates',
  'should be read as',
  'descending pattern',
  'main route into flow',
  'signal configuration',
  'behavioural architecture',
  'expresses',
  'manifests',
] as const;
