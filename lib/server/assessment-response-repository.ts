import type {
  AssessmentAnswerInput,
  AssessmentAttemptId,
  AssessmentAttemptLifecycleStatus,
  AssessmentResponseSet,
} from '@/types/engine';

export interface AssessmentResponseRepository {
  getResponseSet(attemptId: AssessmentAttemptId): Promise<AssessmentResponseSet | null>;
  saveAnswer(attemptId: AssessmentAttemptId, answer: AssessmentAnswerInput): Promise<void>;
  markAttemptStatus(attemptId: AssessmentAttemptId, status: AssessmentAttemptLifecycleStatus): Promise<void>;
}
