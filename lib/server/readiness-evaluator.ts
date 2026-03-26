import type {
  AssessmentDefinition,
  AssessmentResponseSet,
  CanonicalAssessmentResultPayload,
  ResultReadinessStatus,
} from '@/types/engine';

export interface ReadinessEvaluator {
  evaluate(input: {
    definition: AssessmentDefinition;
    responseSet: AssessmentResponseSet;
    payload: CanonicalAssessmentResultPayload;
  }): Promise<ResultReadinessStatus>;
}
