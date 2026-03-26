import type {
  AssessmentExecutionContext,
  AssessmentExecutionOutput,
  AssessmentResponseSet,
} from '@/types/engine';

export interface AssessmentExecutionOrchestrator {
  execute(context: AssessmentExecutionContext, responseSet: AssessmentResponseSet): Promise<AssessmentExecutionOutput>;
}
