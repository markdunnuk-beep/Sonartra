type AssessmentDurationInput = {
  assessmentKey: string;
  estimatedTimeMinutes: number | null;
  questionCount: number | null;
};

function roundDurationMinutes(value: number): number {
  return Math.max(5, Math.round(value / 5) * 5);
}

function deriveEstimatedMinutesFromQuestionCount(questionCount: number | null): number | null {
  if (questionCount === null || questionCount <= 0) {
    return null;
  }

  return Math.max(10, Math.round(questionCount * 0.375));
}

export function resolveAssessmentEstimatedMinutes(input: AssessmentDurationInput): number | null {
  if (input.estimatedTimeMinutes !== null && input.estimatedTimeMinutes > 0) {
    return input.estimatedTimeMinutes;
  }

  const derivedMinutes = deriveEstimatedMinutesFromQuestionCount(input.questionCount);
  if (derivedMinutes !== null) {
    return derivedMinutes;
  }

  if (input.assessmentKey === 'wplp80') {
    return 30;
  }

  return null;
}

export function formatAssessmentEstimatedDuration(input: AssessmentDurationInput): string {
  const estimatedMinutes = resolveAssessmentEstimatedMinutes(input);

  if (estimatedMinutes === null) {
    return 'Guided assessment';
  }

  return `~${roundDurationMinutes(estimatedMinutes)} min`;
}
