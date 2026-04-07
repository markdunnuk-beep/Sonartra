import type { AssessmentVersionLanguageBundle } from '@/lib/server/assessment-version-language-types';

/**
 * Engine core shared types (Task 6).
 *
 * These types define the single deterministic runtime contract for:
 * - assessment definition loading
 * - runtime assembly
 * - response capture
 * - scoring and normalization
 * - canonical result payload construction
 * - readiness state representation
 */

/* ----------------------------------
 * Primitive aliases
 * ---------------------------------- */

export type AssessmentId = string;
export type AssessmentKey = string;
export type AssessmentVersionId = string;
export type AssessmentVersionTag = string;
export type DomainId = string;
export type DomainKey = string;
export type SignalId = string;
export type SignalKey = string;
export type QuestionId = string;
export type QuestionKey = string;
export type OptionId = string;
export type OptionKey = string;
export type AttemptId = string;
export type AttemptResponseId = string;

export type HeroProfileDomainKey =
  | 'operatingStyle'
  | 'coreDrivers'
  | 'leadershipApproach'
  | 'tensionResponse'
  | 'environmentFit'
  | 'pressureResponse';

export type HeroTraitKey =
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

export type HeroRuleOperator = '>=' | '<=' | '>' | '<' | '===';

/* ----------------------------------
 * Persisted assessment definition model (DB record shape)
 * ---------------------------------- */

export type AssessmentRecord = {
  id: AssessmentId;
  key: AssessmentKey;
  title: string;
  description: string | null;
  estimatedTimeMinutes: number | null;
  createdAt: string;
  updatedAt: string;
};

export type AssessmentVersionStatus = 'draft' | 'published' | 'archived';

export type AssessmentVersionRecord = {
  id: AssessmentVersionId;
  assessmentId: AssessmentId;
  versionTag: AssessmentVersionTag;
  status: AssessmentVersionStatus;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DomainSource = 'question_section' | 'signal_group';

export type DomainRecord = {
  id: DomainId;
  assessmentVersionId: AssessmentVersionId;
  key: DomainKey;
  slug: string;
  title: string;
  description: string | null;
  orderIndex: number;
  source: DomainSource;
  sourceRef: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SignalOverlayType = 'none' | 'decision' | 'role';

export type SignalRecord = {
  id: SignalId;
  assessmentVersionId: AssessmentVersionId;
  domainId: DomainId;
  key: SignalKey;
  slug: string;
  title: string;
  description: string | null;
  orderIndex: number;
  isOverlay: boolean;
  overlayType: SignalOverlayType;
  createdAt: string;
  updatedAt: string;
};

export type QuestionRecord = {
  id: QuestionId;
  assessmentVersionId: AssessmentVersionId;
  domainId: DomainId;
  key: QuestionKey;
  slug: string;
  prompt: string;
  description: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
};

export type OptionRecord = {
  id: OptionId;
  assessmentVersionId: AssessmentVersionId;
  questionId: QuestionId;
  key: OptionKey;
  slug: string;
  label: string;
  description: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
};

export type OptionSignalWeightRecord = {
  id: string;
  assessmentVersionId: AssessmentVersionId;
  optionId: OptionId;
  signalId: SignalId;
  weight: number;
  reverseFlag: boolean;
  sourceWeightKey: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PairTraitWeightRecord = {
  id: string;
  assessmentVersionId: AssessmentVersionId;
  profileDomainKey: HeroProfileDomainKey;
  pairKey: string;
  traitKey: HeroTraitKey;
  weight: number;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
};

export type HeroPatternRuleRecord = {
  id: string;
  assessmentVersionId: AssessmentVersionId;
  patternKey: string;
  priority: number;
  ruleType: 'condition' | 'exclusion';
  traitKey: HeroTraitKey;
  operator: HeroRuleOperator;
  thresholdValue: number;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
};

export type HeroPatternLanguageRecord = {
  id: string;
  assessmentVersionId: AssessmentVersionId;
  patternKey: string;
  headline: string;
  subheadline: string | null;
  summary: string | null;
  narrative: string | null;
  pressureOverlay: string | null;
  environmentOverlay: string | null;
  createdAt: string;
  updatedAt: string;
};

/* ----------------------------------
 * Runtime assembled definition model
 * ---------------------------------- */

export type RuntimeAssessmentDefinition = {
  assessment: AssessmentRecord;
  version: AssessmentVersionRecord;
  assessmentIntro: RuntimeAssessmentIntro | null;
  heroDefinition: RuntimeHeroDefinition | null;
  domains: RuntimeDomain[];
  signals: RuntimeSignal[];
  questions: RuntimeQuestion[];
};

export type RuntimeAssessmentIntro = {
  introTitle: string;
  introSummary: string;
  introHowItWorks: string;
  estimatedTimeOverride: string | null;
  instructions: string | null;
  confidentialityNote: string | null;
};

export type RuntimeLookupById<TKey extends string, TValue> = Readonly<Record<TKey, TValue>>;
export type RuntimeLookupByKey<TKey extends string, TValue> = Readonly<Record<TKey, TValue>>;

export type RuntimeDomain = {
  id: DomainId;
  key: DomainKey;
  title: string;
  description: string | null;
  source: DomainSource;
  orderIndex: number;
};

export type RuntimeSignal = {
  id: SignalId;
  key: SignalKey;
  title: string;
  description: string | null;
  domainId: DomainId;
  orderIndex: number;
  isOverlay: boolean;
  overlayType: SignalOverlayType;
};

export type RuntimeQuestion = {
  id: QuestionId;
  key: QuestionKey;
  prompt: string;
  description: string | null;
  domainId: DomainId;
  orderIndex: number;
  options: RuntimeOption[];
};

export type RuntimeOption = {
  id: OptionId;
  key: OptionKey;
  label: string;
  description: string | null;
  questionId: QuestionId;
  orderIndex: number;
  signalWeights: RuntimeOptionSignalWeight[];
};

export type RuntimeOptionSignalWeight = {
  signalId: SignalId;
  weight: number;
  reverseFlag: boolean;
  sourceWeightKey: string | null;
};

export type RuntimePairTraitWeight = {
  profileDomainKey: HeroProfileDomainKey;
  pairKey: string;
  traitKey: HeroTraitKey;
  weight: number;
  orderIndex: number;
};

export type RuntimeHeroRuleCondition = {
  traitKey: HeroTraitKey;
  operator: HeroRuleOperator;
  value: number;
};

export type RuntimeHeroPatternRule = {
  patternKey: string;
  priority: number;
  conditions: readonly RuntimeHeroRuleCondition[];
  exclusions: readonly RuntimeHeroRuleCondition[];
};

export type RuntimeHeroPatternLanguage = {
  patternKey: string;
  headline: string;
  subheadline: string | null;
  summary: string | null;
  narrative: string | null;
  pressureOverlay: string | null;
  environmentOverlay: string | null;
};

export type RuntimeHeroDefinition = {
  fallbackPatternKey: string;
  pairTraitWeights: readonly RuntimePairTraitWeight[];
  patternRules: readonly RuntimeHeroPatternRule[];
  patternLanguage: readonly RuntimeHeroPatternLanguage[];
};

export type RuntimeExecutionIndexes = {
  domainById: RuntimeLookupById<DomainId, RuntimeDomain>;
  domainByKey: RuntimeLookupByKey<DomainKey, RuntimeDomain>;
  signalById: RuntimeLookupById<SignalId, RuntimeSignal>;
  signalByKey: RuntimeLookupByKey<SignalKey, RuntimeSignal>;
  questionById: RuntimeLookupById<QuestionId, RuntimeQuestion>;
  questionByKey: RuntimeLookupByKey<QuestionKey, RuntimeQuestion>;
  optionById: RuntimeLookupById<OptionId, RuntimeOption>;
  optionsByQuestionId: RuntimeLookupById<QuestionId, readonly RuntimeOption[]>;
};

export type RuntimeExecutionModel = {
  definition: RuntimeAssessmentDefinition;
  indexes: RuntimeExecutionIndexes;
  domains: readonly RuntimeDomain[];
  signals: readonly RuntimeSignal[];
  questions: readonly RuntimeQuestion[];
  options: readonly RuntimeOption[];
};

/* ----------------------------------
 * Response capture model
 * ---------------------------------- */

export type AssessmentAttemptStatus = 'not_started' | 'in_progress' | 'submitted' | 'completed' | 'failed';

export type ResponseValue = {
  selectedOptionId: OptionId;
};

export type RuntimeResponse = {
  responseId: AttemptResponseId;
  attemptId: AttemptId;
  questionId: QuestionId;
  value: ResponseValue;
  updatedAt: string;
};

export type RuntimeResponseSet = {
  attemptId: AttemptId;
  assessmentKey: AssessmentKey;
  versionTag: AssessmentVersionTag;
  status: AssessmentAttemptStatus;
  responsesByQuestionId: Record<QuestionId, RuntimeResponse>;
  submittedAt: string | null;
};

/* ----------------------------------
 * Scoring output model
 * ---------------------------------- */

export type RawSignalScore = {
  signalId: SignalId;
  signalKey: SignalKey;
  signalTitle: string;
  domainId: DomainId;
  domainKey: DomainKey;
  domainSource: DomainSource;
  isOverlay: boolean;
  overlayType: SignalOverlayType;
  orderIndex: number;
  rawTotal: number;
};

export type RawDomainScoreSummary = {
  domainId: DomainId;
  domainKey: DomainKey;
  domainTitle: string;
  domainSource: DomainSource;
  rawTotal: number;
  signalScores: RawSignalScore[];
  signalCount: number;
  answeredQuestionCount: number;
};

export type ScoreDiagnostics = {
  scoringMethod: 'option_signal_weights_only';
  totalQuestions: number;
  answeredQuestions: number;
  unansweredQuestions: number;
  totalResponsesProcessed: number;
  totalWeightsApplied: number;
  totalScoreMass: number;
  zeroScoreSignalCount: number;
  zeroAnswerSubmission: boolean;
  warnings: readonly string[];
  generatedAt: string;
};

export type ScoreResult = {
  signalScores: readonly RawSignalScore[];
  domainSummaries: readonly RawDomainScoreSummary[];
  diagnostics: ScoreDiagnostics;
};

/* ----------------------------------
 * Normalization output model
 * ---------------------------------- */

export type NormalizedSignalScore = {
  signalId: SignalId;
  signalKey: SignalKey;
  signalTitle: string;
  domainId: DomainId;
  domainKey: DomainKey;
  domainSource: DomainSource;
  isOverlay: boolean;
  overlayType: SignalOverlayType;
  rawTotal: number;
  normalizedValue: number;
  percentage: number;
  domainPercentage: number;
  rank: number;
};

export type NormalizedDomainSummary = {
  domainId: DomainId;
  domainKey: DomainKey;
  domainTitle: string;
  domainSource: DomainSource;
  rawTotal: number;
  normalizedValue: number;
  percentage: number;
  signalScores: readonly NormalizedSignalScore[];
  signalCount: number;
  answeredQuestionCount: number;
  rankedSignalIds: readonly SignalId[];
};

export type NormalizationDiagnostics = {
  normalizationMethod: 'largest_remainder_integer_percentages';
  totalScoreMass: number;
  zeroMass: boolean;
  globalPercentageSum: number;
  domainPercentageSums: Readonly<Record<DomainId, number>>;
  roundingAdjustmentsApplied: number;
  zeroScoreSignalCount: number;
  warnings: readonly string[];
  generatedAt: string;
};

export type NormalizedResult = {
  signalScores: readonly NormalizedSignalScore[];
  domainSummaries: readonly NormalizedDomainSummary[];
  topSignalId: SignalId | null;
  diagnostics: NormalizationDiagnostics;
};

export type EngineLanguageBundle = AssessmentVersionLanguageBundle;

export type ResultInterpretationContext = {
  assessmentVersionId: AssessmentVersionId;
  languageBundle: EngineLanguageBundle;
};

/* ----------------------------------
 * Domain interpretation model
 * ---------------------------------- */

export type SignalIntensityBand = 'dominant' | 'strong' | 'moderate' | 'secondary' | 'low';

export type DomainBlendProfile = 'concentrated' | 'layered' | 'balanced';

export type SentenceFragmentCategory =
  | 'core_trait'
  | 'pace_orientation'
  | 'decision_orientation'
  | 'collaboration_orientation'
  | 'tension_pattern'
  | 'environment_preference'
  | 'stress_expression'
  | 'balancing_clause'
  | 'risk_clause'
  | 'supporting_line';

export type DomainInterpretationInput = {
  domainKey: DomainKey;
  primarySignalKey: SignalKey | null;
  primaryPercent: number | null;
  secondarySignalKey: SignalKey | null;
  secondaryPercent: number | null;
  rankedSignals: ReadonlyArray<{
    signalKey: SignalKey;
    percent: number;
  }>;
};

export type DomainInterpretationDiagnostics = {
  strategy: 'pairwise_rule' | 'fragment_fallback' | 'single_signal_fallback' | 'empty_domain';
  ruleKey: string | null;
  primaryBand: SignalIntensityBand | null;
  secondaryBand: SignalIntensityBand | null;
  blendProfile: DomainBlendProfile | null;
  primarySecondaryGap: number | null;
};

export type DomainInterpretationOutput = {
  domainKey: DomainKey;
  primarySignalKey: SignalKey | null;
  primaryPercent: number | null;
  secondarySignalKey: SignalKey | null;
  secondaryPercent: number | null;
  summary: string;
  supportingLine?: string | null;
  tensionClause?: string | null;
  diagnostics?: DomainInterpretationDiagnostics;
};

/* ----------------------------------
 * Canonical result payload model
 * ---------------------------------- */

export type ResultMetadata = {
  assessmentKey: AssessmentKey;
  assessmentTitle: string;
  version: AssessmentVersionTag;
  attemptId: AttemptId;
  completedAt: string | null;
  assessmentDescription?: string | null;
};

export type ResultTopSignal = {
  signalId: SignalId;
  signalKey: SignalKey;
  title: string;
  domainId: DomainId;
  domainKey: DomainKey;
  normalizedValue: number;
  rawTotal: number;
  percentage: number;
  rank: 1;
};

export type ResultRankedSignal = {
  signalId: SignalId;
  signalKey: SignalKey;
  title: string;
  domainId: DomainId;
  domainKey: DomainKey;
  normalizedValue: number;
  rawTotal: number;
  percentage: number;
  domainPercentage: number;
  isOverlay: boolean;
  overlayType: SignalOverlayType;
  rank: number;
};

export type ResultOverviewSummary = {
  headline: string;
  narrative: string | null;
};

export type ResultBulletItem = {
  key: string;
  title: string;
  detail: string;
  signalId?: SignalId;
};

export type ResultDomainSummary = NormalizedDomainSummary & {
  interpretation: DomainInterpretationOutput | null;
};

export type ResultIntro = {
  assessmentDescription: string | null;
};

export type ResultHeroSummary = {
  headline: string | null;
  subheadline: string | null;
  summary: string | null;
  narrative: string | null;
  pressureOverlay: string | null;
  environmentOverlay: string | null;
  primaryPattern: {
    label: string | null;
    signalKey: string | null;
    signalLabel: string | null;
  } | null;
  heroPattern: {
    patternKey: string;
    label: string;
    priority: number | null;
    isFallback: boolean;
  } | null;
  domainPairWinners: ReadonlyArray<{
    profileDomainKey: HeroProfileDomainKey;
    pairKey: string;
    sourceDomainKey: string;
    sourceDomainLabel: string;
    primarySignalKey: string;
    primarySignalLabel: string;
    secondarySignalKey: string;
    secondarySignalLabel: string;
  }>;
  traitTotals: ReadonlyArray<{
    traitKey: HeroTraitKey;
    value: number;
  }>;
  matchedPatterns: ReadonlyArray<{
    patternKey: string;
    priority: number;
  }>;
  domainHighlights: ReadonlyArray<{
    domainKey: string;
    domainLabel: string;
    primarySignalKey: string;
    primarySignalLabel: string;
    summary: string | null;
  }>;
};

export type ResultActionBlockItem = {
  signalKey: string;
  signalLabel: string;
  text: string;
};

export type ResultActionBlocks = {
  strengths: readonly ResultActionBlockItem[];
  watchouts: readonly ResultActionBlockItem[];
  developmentFocus: readonly ResultActionBlockItem[];
};

export type ResultDomainSignal = {
  signalKey: string;
  signalLabel: string;
  score: number;
  withinDomainPercent: number;
  rank: number;
  isPrimary: boolean;
  isSecondary: boolean;
};

export type ResultDomainChapterSignal = {
  signalKey: string;
  signalLabel: string;
  chapterSummary: string | null;
  strength: string | null;
  watchout: string | null;
  development: string | null;
};

export type ResultDomainSignalBalanceItem = {
  signalKey: string;
  signalLabel: string;
  withinDomainPercent: number;
  rank: number;
  isPrimary: boolean;
  isSecondary: boolean;
  chapterSummary: string | null;
};

export type ResultDomainSignalPair = {
  pairKey: string;
  primarySignalKey: string;
  primarySignalLabel: string;
  secondarySignalKey: string;
  secondarySignalLabel: string;
  summary: string | null;
};

export type ResultDomainChapter = {
  domainKey: string;
  domainLabel: string;
  chapterOpening: string | null;
  signalBalance: {
    items: readonly ResultDomainSignalBalanceItem[];
  };
  primarySignal: ResultDomainChapterSignal | null;
  secondarySignal: ResultDomainChapterSignal | null;
  signalPair: ResultDomainSignalPair | null;
  pressureFocus: string | null;
  environmentFocus: string | null;
};

export type ResultDiagnostics = {
  readinessStatus: ResultReadinessStatus;
  scoring: ScoreDiagnostics;
  normalization: NormalizationDiagnostics;
  answeredQuestionCount: number;
  totalQuestionCount: number;
  missingQuestionIds: readonly QuestionId[];
  topSignalSelectionBasis: 'normalized_rank';
  rankedSignalCount: number;
  domainCount: number;
  zeroMass: boolean;
  zeroMassTopSignalFallbackApplied: boolean;
  warnings: readonly string[];
  generatedAt: string;
};

export type CanonicalResultPayload = {
  metadata: ResultMetadata;
  intro: ResultIntro;
  hero: ResultHeroSummary;
  domains: readonly ResultDomainChapter[];
  actions: ResultActionBlocks;
  diagnostics: ResultDiagnostics;
};

/* ----------------------------------
 * Readiness model
 * ---------------------------------- */

export type ResultReadinessStatus = 'processing' | 'ready' | 'failed';

export type ReadinessFailureReason =
  | 'incomplete_responses'
  | 'scoring_incomplete'
  | 'normalization_incomplete'
  | 'payload_incomplete'
  | 'persistence_failed'
  | 'unknown_error';

export type ReadinessCheckSummary = {
  status: ResultReadinessStatus;
  failures: ReadinessFailureReason[];
  checkedAt: string;
};
