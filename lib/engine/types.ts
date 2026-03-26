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

/* ----------------------------------
 * Runtime assembled definition model
 * ---------------------------------- */

export type RuntimeAssessmentDefinition = {
  assessment: AssessmentRecord;
  version: AssessmentVersionRecord;
  domains: RuntimeDomain[];
  signals: RuntimeSignal[];
  questions: RuntimeQuestion[];
};

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
  rawTotal: number;
};

export type RawDomainScoreSummary = {
  domainId: DomainId;
  domainKey: DomainKey;
  rawTotal: number;
  signalCount: number;
};

export type ScoreDiagnostics = {
  scoringMethod: 'option_signal_weights_only';
  processedResponseCount: number;
  ignoredResponseCount: number;
  generatedAt: string;
};

export type ScoreResult = {
  signalScores: RawSignalScore[];
  domainSummaries?: RawDomainScoreSummary[];
  diagnostics: ScoreDiagnostics;
};

/* ----------------------------------
 * Normalization output model
 * ---------------------------------- */

export type NormalizedSignalScore = {
  signalId: SignalId;
  signalKey: SignalKey;
  rawTotal: number;
  normalizedValue: number;
  percentage: number;
  rank: number;
};

export type NormalizedDomainSummary = {
  domainId: DomainId;
  domainKey: DomainKey;
  averageNormalizedValue: number;
  averagePercentage: number;
  rankedSignalIds: SignalId[];
};

export type NormalizationDiagnostics = {
  normalizationMethod: string;
  zeroSafeApplied: boolean;
  generatedAt: string;
};

export type NormalizedResult = {
  signalScores: NormalizedSignalScore[];
  domainSummaries: NormalizedDomainSummary[];
  topSignalId: SignalId | null;
  diagnostics: NormalizationDiagnostics;
};

/* ----------------------------------
 * Canonical result payload model
 * ---------------------------------- */

export type ResultMetadata = {
  assessmentKey: AssessmentKey;
  version: AssessmentVersionTag;
  attemptId: AttemptId;
};

export type ResultTopSignal = {
  signalId: SignalId;
  signalKey: SignalKey;
  title: string;
  normalizedValue: number;
  percentage: number;
  rank: 1;
};

export type ResultRankedSignal = {
  signalId: SignalId;
  signalKey: SignalKey;
  title: string;
  normalizedValue: number;
  percentage: number;
  rank: number;
};

export type ResultOverviewSummary = {
  headline: string;
  narrative: string;
};

export type ResultBulletItem = {
  key: string;
  title: string;
  detail: string;
  signalId?: SignalId;
};

export type ResultDiagnostics = {
  readinessStatus: ResultReadinessStatus;
  scoring: ScoreDiagnostics;
  normalization: NormalizationDiagnostics;
  answeredQuestionCount: number;
  totalQuestionCount: number;
  missingQuestionIds: QuestionId[];
  generatedAt: string;
};

export type CanonicalResultPayload = {
  metadata: ResultMetadata;
  topSignal: ResultTopSignal | null;
  rankedSignals: ResultRankedSignal[];
  normalizedScores: NormalizedSignalScore[];
  domainSummaries: NormalizedDomainSummary[];
  overviewSummary: ResultOverviewSummary;
  strengths: ResultBulletItem[];
  watchouts: ResultBulletItem[];
  developmentFocus: ResultBulletItem[];
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
