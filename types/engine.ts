/**
 * Sonartra canonical engine contracts.
 *
 * Task 2 scope: architecture and deterministic contract definition only.
 * Scoring, normalization, ranking, readiness behavior, and persistence are intentionally
 * not implemented in this file.
 */

export type AssessmentKey = string;
export type AssessmentVersion = string;
export type AssessmentAttemptId = string;
export type AssessmentResultId = string;
export type UserId = string;
export type DomainId = string;
export type SignalId = string;
export type QuestionId = string;
export type OptionId = string;

export enum AssessmentAttemptLifecycleStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  SCORED = 'SCORED',
  RESULT_READY = 'RESULT_READY',
  FAILED = 'FAILED',
}

export enum ExecutionPipelineStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum ResultReadinessStatus {
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
}

export interface AssessmentDefinition {
  assessmentId: string;
  assessmentKey: AssessmentKey;
  version: AssessmentVersion;
  title: string;
  description?: string;
  domains: DomainDefinition[];
  signals: SignalDefinition[];
  questions: QuestionDefinition[];
  optionSignalWeights: OptionSignalWeight[];
  publishedAt?: string;
}

export interface DomainDefinition {
  domainId: DomainId;
  domainKey: string;
  label: string;
  description?: string;
  orderIndex: number;
}

export interface SignalDefinition {
  signalId: SignalId;
  signalKey: string;
  domainId: DomainId;
  label: string;
  description?: string;
  orderIndex: number;
}

export interface QuestionDefinition {
  questionId: QuestionId;
  questionKey: string;
  prompt: string;
  domainId: DomainId;
  orderIndex: number;
  options: OptionDefinition[];
}

export interface OptionDefinition {
  optionId: OptionId;
  optionKey: string;
  questionId: QuestionId;
  label: string;
  orderIndex: number;
}

export interface OptionSignalWeight {
  optionId: OptionId;
  signalId: SignalId;
  weight: number;
}

export interface AssessmentAnswerInput {
  questionId: QuestionId;
  selectedOptionId: OptionId;
  answeredAt: string;
}

export interface AssessmentResponseSet {
  attemptId: AssessmentAttemptId;
  assessmentKey: AssessmentKey;
  version: AssessmentVersion;
  answers: AssessmentAnswerInput[];
  submittedAt: string;
}

export interface RawSignalScore {
  signalId: SignalId;
  rawScore: number;
}

export interface NormalizedSignalScore {
  signalId: SignalId;
  normalizedScore: number;
  percentage: number;
}

export interface RankedSignal {
  signalId: SignalId;
  rank: number;
  normalizedScore: number;
}

export interface DomainSummary {
  domainId: DomainId;
  domainLabel: string;
  averageNormalizedScore: number;
  topSignalId: SignalId;
  summarySentence: string;
}

export interface OverviewSummary {
  headline: string;
  narrative: string;
}

export interface StrengthItem {
  signalId: SignalId;
  title: string;
  detail: string;
}

export interface WatchoutItem {
  signalId: SignalId;
  title: string;
  detail: string;
}

export interface DevelopmentFocusItem {
  signalId: SignalId;
  title: string;
  detail: string;
}

export interface ResultDiagnostics {
  totalQuestions: number;
  answeredQuestions: number;
  missingQuestionIds: QuestionId[];
  scoringVersion: string;
  normalizationVersion: string;
  generatedAt: string;
}

export interface CanonicalResultMetadata {
  resultId: AssessmentResultId;
  attemptId: AssessmentAttemptId;
  userId: UserId;
  assessmentKey: AssessmentKey;
  version: AssessmentVersion;
  generatedAt: string;
  readiness: ResultReadinessStatus;
}

/**
 * Single canonical payload consumed by dashboard, results list, and result detail views.
 */
export interface CanonicalAssessmentResultPayload {
  metadata: CanonicalResultMetadata;
  topSignal: RankedSignal;
  rankedSignals: RankedSignal[];
  normalizedScores: NormalizedSignalScore[];
  domainSummaries: DomainSummary[];
  overviewSummary: OverviewSummary;
  strengths: StrengthItem[];
  watchouts: WatchoutItem[];
  developmentFocus: DevelopmentFocusItem[];
  diagnostics: ResultDiagnostics;
}

export interface AssessmentExecutionContext {
  attemptId: AssessmentAttemptId;
  userId: UserId;
  assessmentKey: AssessmentKey;
  version: AssessmentVersion;
  submittedAt: string;
}

export interface AssessmentExecutionOutput {
  pipelineStatus: ExecutionPipelineStatus;
  readiness: ResultReadinessStatus;
  resultPayload?: CanonicalAssessmentResultPayload;
  failureReason?: string;
}
