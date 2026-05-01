export type AssessmentLifecycleStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed_processing'
  | 'ready'
  | 'error';

export type PersistedAttemptLifecycleStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'SCORED'
  | 'RESULT_READY'
  | 'FAILED';

export type PersistedResultReadinessStatus = 'PROCESSING' | 'READY' | 'FAILED';

export type AssessmentRecordSummary = {
  assessmentId: string;
  assessmentKey: string;
  assessmentVersionId: string;
  versionTag: string;
};

export type AssessmentAttemptRecordSummary = {
  attemptId: string;
  userId: string;
  assessmentId: string;
  assessmentVersionId: string;
  lifecycleStatus: PersistedAttemptLifecycleStatus;
  startedAt: string;
  submittedAt: string | null;
  completedAt: string | null;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
};

export type AssessmentProgressSummary = {
  totalQuestions: number;
  answeredQuestions: number;
  completionPercentage: number;
};

export type AssessmentResultRecordSummary = {
  resultId: string;
  attemptId: string;
  pipelineStatus: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  readinessStatus: PersistedResultReadinessStatus;
  generatedAt: string | null;
  failureReason: string | null;
  hasCanonicalResultPayload: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AssessmentAttemptLifecycleViewModel = {
  attemptId: string | null;
  assessmentId: string;
  assessmentKey: string;
  assessmentVersionId: string;
  versionTag: string;
  status: AssessmentLifecycleStatus;
  startedAt: string | null;
  submittedAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  totalQuestions: number;
  answeredQuestions: number;
  completionPercentage: number;
  latestResultId: string | null;
  latestResultReady: boolean;
  latestResultStatus: PersistedResultReadinessStatus | null;
  lastError: string | null;
};
