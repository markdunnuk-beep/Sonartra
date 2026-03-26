import type {
  AssessmentDefinition,
  AssessmentExecutionContext,
  AssessmentExecutionOutput,
  AssessmentResponseSet,
  CanonicalAssessmentResultPayload,
} from '@/types/engine';

export type {
  AssessmentDefinition,
  AssessmentExecutionContext,
  AssessmentExecutionOutput,
  AssessmentResponseSet,
  CanonicalAssessmentResultPayload,
};

/**
 * Canonical engine boundary.
 * Implementations must keep a single execution path and produce one result contract.
 */
export interface AssessmentEngine {
  execute(
    context: AssessmentExecutionContext,
    definition: AssessmentDefinition,
    responseSet: AssessmentResponseSet,
  ): Promise<AssessmentExecutionOutput>;
}
