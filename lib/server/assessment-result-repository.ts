import type {
  AssessmentAttemptId,
  CanonicalAssessmentResultPayload,
  ResultReadinessStatus,
} from '@/types/engine';

export interface AssessmentResultRepository {
  saveResult(payload: CanonicalAssessmentResultPayload): Promise<void>;
  markResultReadiness(attemptId: AssessmentAttemptId, readiness: ResultReadinessStatus): Promise<void>;
  getResultByAttemptId(attemptId: AssessmentAttemptId): Promise<CanonicalAssessmentResultPayload | null>;
}
