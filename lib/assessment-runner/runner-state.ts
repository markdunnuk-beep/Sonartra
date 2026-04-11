export type RunnerState = 'IN_PROGRESS' | 'ANSWERED_AWAITING_SUBMIT' | 'SUBMITTED';
export type RunnerStateAttemptStatus =
  | 'in_progress'
  | 'completed_processing'
  | 'ready'
  | 'error';

type GetRunnerStateParams = {
  answeredCount: number;
  totalQuestions: number;
  attemptStatus: RunnerStateAttemptStatus;
};

export function getRunnerState(params: GetRunnerStateParams): RunnerState {
  const answeredCount = Math.max(0, params.answeredCount);
  const totalQuestions = Math.max(0, params.totalQuestions);

  if (params.attemptStatus !== 'in_progress') {
    return 'SUBMITTED';
  }

  if (totalQuestions > 0 && answeredCount >= totalQuestions) {
    return 'ANSWERED_AWAITING_SUBMIT';
  }

  return 'IN_PROGRESS';
}
