import type { Queryable } from '@/lib/engine/repository-sql';
import {
  listRunnerQuestions,
  loadPersistedResponsesForRunner,
} from '@/lib/server/assessment-runner-queries';

export type VoiceQuestionOptionPayload = {
  optionId: string;
  label: string | null;
  text: string;
};

export type VoiceQuestionPayload = {
  questionId: string;
  questionNumber: number;
  prompt: string;
  options: readonly VoiceQuestionOptionPayload[];
  selectedOptionId: string | null;
};

export type VoiceQuestionDeliveryPayload = {
  questions: readonly VoiceQuestionPayload[];
  totalQuestionCount: number;
  answeredQuestionCount: number;
  currentQuestionIndex: number | null;
  currentQuestionNumber: number | null;
  currentQuestion: VoiceQuestionPayload | null;
  allQuestionsAnswered: boolean;
};

export type VoiceQuestionDeliveryService = {
  getQuestionDelivery(params: {
    assessmentVersionId: string;
    attemptId: string;
  }): Promise<VoiceQuestionDeliveryPayload>;
};

function mapVoiceQuestions(
  questions: Awaited<ReturnType<typeof listRunnerQuestions>>,
  responses: ReadonlyMap<string, string>,
): readonly VoiceQuestionPayload[] {
  return Object.freeze(
    questions.map((question, index) => ({
      questionId: question.questionId,
      questionNumber: index + 1,
      prompt: question.prompt,
      selectedOptionId: responses.get(question.questionId) ?? null,
      options: Object.freeze(
        question.options.map((option) => ({
          optionId: option.optionId,
          label: option.label,
          text: option.text,
        })),
      ),
    })),
  );
}

export function createVoiceQuestionDeliveryService(params: {
  db: Queryable;
}): VoiceQuestionDeliveryService {
  const { db } = params;

  return {
    async getQuestionDelivery(input) {
      const [questions, responses] = await Promise.all([
        listRunnerQuestions(db, input.assessmentVersionId),
        loadPersistedResponsesForRunner(db, input.attemptId),
      ]);

      const mappedQuestions = mapVoiceQuestions(questions, responses);
      const currentQuestionIndex = mappedQuestions.findIndex(
        (question) => question.selectedOptionId === null,
      );
      const normalizedCurrentQuestionIndex =
        currentQuestionIndex >= 0 ? currentQuestionIndex : null;
      const currentQuestion =
        normalizedCurrentQuestionIndex === null
          ? null
          : mappedQuestions[normalizedCurrentQuestionIndex] ?? null;
      const answeredQuestionCount = mappedQuestions.reduce(
        (count, question) => count + (question.selectedOptionId ? 1 : 0),
        0,
      );

      return {
        questions: mappedQuestions,
        totalQuestionCount: mappedQuestions.length,
        answeredQuestionCount,
        currentQuestionIndex: normalizedCurrentQuestionIndex,
        currentQuestionNumber: currentQuestion?.questionNumber ?? null,
        currentQuestion,
        allQuestionsAnswered:
          mappedQuestions.length > 0 && answeredQuestionCount === mappedQuestions.length,
      };
    },
  };
}
