export const ASSESSMENT_COMPLETION_SAFE_ERROR_MESSAGE =
  'We could not generate your result yet. Your responses are saved. Please try again or contact support.';

const SUPPORT_SAFE_STATUS_MESSAGES = new Map<string, string>([
  ['assessment_in_progress', 'This assessment is still open in the runner. Return to the assessment to continue from the saved attempt.'],
  ['unauthorized', 'Please sign in again to continue.'],
  ['forbidden', 'You do not have access to complete this assessment.'],
]);

export function getAssessmentCompletionSafeErrorMessage(code?: string | null): string {
  if (!code) {
    return ASSESSMENT_COMPLETION_SAFE_ERROR_MESSAGE;
  }

  return SUPPORT_SAFE_STATUS_MESSAGES.get(code) ?? ASSESSMENT_COMPLETION_SAFE_ERROR_MESSAGE;
}
