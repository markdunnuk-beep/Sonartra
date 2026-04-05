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
  exclusions?: readonly HeroPatternCondition[];
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
  changeNote: string;
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

export type WinningPatternSummary = {
  patternKey: string;
  count: number;
  share: number;
};

export type ComparisonMetricRow = {
  label: string;
  round2: number | string;
  round3: number | string;
  final: number | string;
};

export type CuratedComparisonRow = {
  profileKey: string;
  previousWinner: string;
  finalWinner: string;
  changed: boolean;
  judgement: string;
};

export type ExplorationReport = {
  runMode: 'full_combinatorial';
  totalProfilesProcessed: number;
  processedAt: string;
  winningPatternCounts: Readonly<Record<string, number>>;
  topWinningPatterns: readonly WinningPatternSummary[];
  collisionSummary: CollisionSummary;
  deadPatternSummary: DeadPatternSummary;
  coverage: readonly PatternCoverageRow[];
  detailedCuratedExamples: readonly ProcessedProfile[];
  comparison: {
    metrics: readonly ComparisonMetricRow[];
    deadPatternsRound2: readonly string[];
    deadPatternsRound3: readonly string[];
    deadPatternsFinal: readonly string[];
    topWinnersRound2: readonly WinningPatternSummary[];
    topWinnersRound3: readonly WinningPatternSummary[];
    topWinnersFinal: readonly WinningPatternSummary[];
  };
  curatedComparison: readonly CuratedComparisonRow[];
  finalPatternInventory: readonly string[];
  consolidationMap: Readonly<Record<string, readonly string[]>>;
  implementationReadiness: {
    ready: boolean;
    judgement: string;
    strongestPatterns: readonly string[];
    fallbackHeavyRegions: readonly string[];
    remainingWeakSpots: readonly string[];
  };
  changeLog: {
    rules: readonly string[];
    pairTraitWeights: readonly string[];
    patterns: readonly string[];
  };
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
