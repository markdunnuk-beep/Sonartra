type RunnerQuestionResumeState = {
  selectedOptionId: string | null;
};

type AssessmentIntroGateState = {
  answeredQuestions: number;
  assessmentIntro: object | null;
};

export function getResumeQuestionIndex(
  questions: readonly RunnerQuestionResumeState[],
): number {
  if (questions.length === 0) {
    return 0;
  }

  const firstUnansweredIndex = questions.findIndex(
    (question) => question.selectedOptionId === null,
  );

  if (firstUnansweredIndex >= 0) {
    return firstUnansweredIndex;
  }

  return questions.length - 1;
}

export function shouldShowAssessmentIntro(
  state: AssessmentIntroGateState,
): boolean {
  return state.answeredQuestions === 0 && state.assessmentIntro !== null;
}
