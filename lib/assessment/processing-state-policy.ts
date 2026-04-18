export const ASSESSMENT_PROCESSING_POLL_INTERVAL_MS = 1200;
export const ASSESSMENT_PROCESSING_STATUS_RETRY_MS = 1800;
export const ASSESSMENT_PROCESSING_LONG_WAIT_MS = 15000;
export const ASSESSMENT_PROCESSING_STATUS_FAILURE_RETRY_LIMIT = 3;

export function isAssessmentProcessingLongWait(elapsedMs: number): boolean {
  return elapsedMs >= ASSESSMENT_PROCESSING_LONG_WAIT_MS;
}

export function hasAssessmentProcessingStatusCheckFailed(
  consecutiveFailures: number,
): boolean {
  return consecutiveFailures >= ASSESSMENT_PROCESSING_STATUS_FAILURE_RETRY_LIMIT;
}
