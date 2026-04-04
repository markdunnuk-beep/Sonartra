import type { RuntimeAssessmentIntro } from '@/lib/engine/types';
import type { AssessmentLifecycleStatus } from '@/lib/server/assessment-attempt-lifecycle-types';
import type { AssessmentCompletionServiceResult } from '@/lib/server/assessment-completion-types';

export type AssessmentRunnerOptionViewModel = {
  optionId: string;
  optionKey: string;
  label: string | null;
  text: string;
  orderIndex: number;
};

export type AssessmentRunnerQuestionViewModel = {
  questionId: string;
  questionKey: string;
  prompt: string;
  domainTitle: string;
  orderIndex: number;
  selectedOptionId: string | null;
  options: readonly AssessmentRunnerOptionViewModel[];
};

export type AssessmentRunnerStatus =
  | 'in_progress'
  | 'completed_processing'
  | 'ready'
  | 'error';

export type AssessmentRunnerViewModel = {
  attemptId: string;
  assessmentId: string;
  assessmentKey: string;
  assessmentTitle: string;
  assessmentDescription: string | null;
  assessmentIntro: RuntimeAssessmentIntro | null;
  assessmentVersionId: string;
  versionTag: string;
  status: AssessmentRunnerStatus;
  totalQuestions: number;
  answeredQuestions: number;
  completionPercentage: number;
  latestReadyResultId: string | null;
  lastError: string | null;
  questions: readonly AssessmentRunnerQuestionViewModel[];
};

export type AssessmentRunnerEntryResolution =
  | {
      kind: 'runner';
      assessmentKey: string;
      attemptId: string;
      href: string;
    }
  | {
      kind: 'result';
      assessmentKey: string;
      resultId: string | null;
      href: string;
    }
  | {
      kind: 'workspace';
      assessmentKey: string;
      href: string;
    };

export type SaveAssessmentResponseResult = {
  attemptId: string;
  questionId: string;
  selectedOptionId: string;
  answeredQuestions: number;
  totalQuestions: number;
  completionPercentage: number;
};

export type AssessmentRunnerSubmitResult =
  | {
      kind: 'ready';
      href: string;
      completion: AssessmentCompletionServiceResult;
    }
  | {
      kind: 'processing';
      href: string;
      completion: AssessmentCompletionServiceResult;
    }
  | {
      kind: 'error';
      href: string;
      completion: AssessmentCompletionServiceResult;
    };

export class AssessmentRunnerNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssessmentRunnerNotFoundError';
  }
}

export class AssessmentRunnerForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssessmentRunnerForbiddenError';
  }
}

export class AssessmentRunnerStateError extends Error {
  readonly lifecycleStatus: AssessmentLifecycleStatus | null;

  constructor(message: string, lifecycleStatus: AssessmentLifecycleStatus | null = null) {
    super(message);
    this.name = 'AssessmentRunnerStateError';
    this.lifecycleStatus = lifecycleStatus;
  }
}

export class AssessmentRunnerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssessmentRunnerValidationError';
  }
}
