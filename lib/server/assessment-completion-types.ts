import type { CanonicalResultPayload, RuntimeResponseSet } from '@/lib/engine/types';
import type {
  AssessmentAttemptRecordSummary,
  AssessmentLifecycleStatus,
  AssessmentResultRecordSummary,
  AssessmentRecordSummary,
} from '@/lib/server/assessment-attempt-lifecycle-types';

export type AssessmentCompletionResultStatus = 'processing' | 'ready' | 'failed';

export type AssessmentCompletionAttemptSummary = AssessmentAttemptRecordSummary &
  AssessmentRecordSummary;

export type AssessmentCompletionPersistedResponse = {
  responseId: string;
  attemptId: string;
  questionId: string;
  selectedOptionId: string;
  respondedAt: string;
  updatedAt: string;
};

export type AssessmentCompletionServiceResult = {
  success: boolean;
  attemptId: string;
  resultId: string | null;
  lifecycleStatus: AssessmentLifecycleStatus;
  resultStatus: AssessmentCompletionResultStatus;
  hasResult: boolean;
  payloadReady: boolean;
  alreadyCompleted: boolean;
  error: string | null;
};

export type AssessmentCompletionExecuteEngine = (params: {
  repository: {
    getPublishedAssessmentDefinitionByKey(assessmentKey: string): Promise<unknown>;
    getAssessmentDefinitionByVersion(params: {
      assessmentVersionId?: string;
      assessmentKey?: string;
      version?: string;
    }): Promise<unknown>;
  };
  assessmentKey?: string;
  versionKey?: string;
  responses: RuntimeResponseSet;
}) => Promise<CanonicalResultPayload>;

export class AssessmentCompletionNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssessmentCompletionNotFoundError';
  }
}

export class AssessmentCompletionForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssessmentCompletionForbiddenError';
  }
}

export class AssessmentCompletionStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssessmentCompletionStateError';
  }
}

export class AssessmentCompletionPersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssessmentCompletionPersistenceError';
  }
}
