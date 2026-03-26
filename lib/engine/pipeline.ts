import type {
  AssessmentDefinition,
  AssessmentExecutionContext,
  AssessmentResponseSet,
  CanonicalAssessmentResultPayload,
  DomainSummary,
  ExecutionPipelineStatus,
  NormalizedSignalScore,
  RankedSignal,
  RawSignalScore,
  ResultReadinessStatus,
} from '@/types/engine';

export interface ScoringStage {
  computeRawScores(
    definition: AssessmentDefinition,
    responseSet: AssessmentResponseSet,
  ): Promise<RawSignalScore[]>;
}

export interface NormalizationStage {
  normalize(rawScores: RawSignalScore[]): Promise<NormalizedSignalScore[]>;
}

export interface RankingStage {
  rank(normalizedScores: NormalizedSignalScore[]): Promise<RankedSignal[]>;
}

export interface ResultBuilderStage {
  buildPayload(input: {
    context: AssessmentExecutionContext;
    definition: AssessmentDefinition;
    responseSet: AssessmentResponseSet;
    rankedSignals: RankedSignal[];
    normalizedScores: NormalizedSignalScore[];
    domainSummaries: DomainSummary[];
  }): Promise<CanonicalAssessmentResultPayload>;
}

export interface ReadinessEvaluationStage {
  evaluate(input: {
    responseSet: AssessmentResponseSet;
    payload: CanonicalAssessmentResultPayload;
  }): Promise<ResultReadinessStatus>;
}

export interface PipelineStageStatus {
  stage: 'SCORING' | 'NORMALIZATION' | 'RANKING' | 'RESULT_BUILDING' | 'READINESS';
  status: ExecutionPipelineStatus;
  detail?: string;
}
