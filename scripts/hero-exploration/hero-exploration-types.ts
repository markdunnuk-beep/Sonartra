export type TraitKey =
  | 'paced'
  | 'deliberate'
  | 'people_led'
  | 'task_led'
  | 'structured'
  | 'flexible'
  | 'assertive'
  | 'receptive'
  | 'stable'
  | 'adaptive'
  | 'exacting'
  | 'tolerant';

export type RuleOperator = '>=' | '<=' | '>' | '<' | '===';

export type HeroPatternLanguage = {
  patternKey: string;
  headline: string;
  subheadline: string;
  summary: string;
  narrative: string;
  pressureOverlay: string;
  environmentOverlay: string;
};

export type HeroPatternCondition = {
  traitKey: TraitKey;
  operator: RuleOperator;
  value: number;
};

export type HeroPatternRule = {
  patternKey: string;
  priority: number;
  conditions: readonly HeroPatternCondition[];
};

export type PairTraitWeight = {
  pairKey: string;
  traitKey: TraitKey;
  weight: number;
};

export type SimulatedProfile = {
  profileKey: string;
  domainPairs: {
    operatingStyle: string;
    coreDrivers: string;
    leadershipApproach: string;
    tensionResponse: string;
    environmentFit: string;
    pressureResponse: string;
  };
};

export type DomainKey = keyof SimulatedProfile['domainPairs'];

export type EvaluatedPattern = {
  patternKey: string;
  priority: number;
  matchedConditions: readonly HeroPatternCondition[];
};

export type ProcessedProfile = {
  profileKey: string;
  domainPairs: SimulatedProfile['domainPairs'];
  traitTotals: Readonly<Record<TraitKey, number>>;
  matchedPatterns: readonly EvaluatedPattern[];
  winnerPatternKey: string;
  winnerPriority: number | null;
  winnerConditions: readonly HeroPatternCondition[];
  heroCopy: HeroPatternLanguage;
};

export type PatternCoverageRow = {
  patternKey: string;
  matchCount: number;
  winCount: number;
  winRate: number;
  exampleProfiles: readonly string[];
  examplePairs: readonly string[];
};

export type CollisionSummary = {
  totalProfiles: number;
  singleMatchProfiles: number;
  multiMatchProfiles: number;
  zeroMatchProfiles: number;
  worstCollisionCount: number;
  topCollisionSets: ReadonlyArray<{
    patternKeys: readonly string[];
    count: number;
  }>;
  beatenByHigherPriority: Readonly<Record<string, number>>;
};

export type DeadPatternSummary = {
  neverSelectedAsWinner: readonly string[];
  neverMatched: readonly string[];
  matchedButNeverWin: readonly string[];
  overDominantPatterns: ReadonlyArray<{
    patternKey: string;
    winCount: number;
    winShare: number;
  }>;
};

export type ExplorationReport = {
  runMode: 'full_combinatorial';
  totalProfilesProcessed: number;
  processedAt: string;
  winningPatternCounts: Readonly<Record<string, number>>;
  collisionSummary: CollisionSummary;
  deadPatternSummary: DeadPatternSummary;
  coverage: readonly PatternCoverageRow[];
  detailedCuratedExamples: readonly ProcessedProfile[];
};

export const TRAIT_KEYS: readonly TraitKey[] = [
  'paced',
  'deliberate',
  'people_led',
  'task_led',
  'structured',
  'flexible',
  'assertive',
  'receptive',
  'stable',
  'adaptive',
  'exacting',
  'tolerant',
];
