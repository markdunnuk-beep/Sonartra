import type {
  QuestionId,
  RawDomainScoreSummary,
  RawSignalScore,
  RuntimeExecutionModel,
  RuntimeOption,
  RuntimeResponse,
  RuntimeResponseSet,
  ScoreDiagnostics,
} from '@/lib/engine/types';

export type ScoringErrorCode =
  | 'unknown_response_question'
  | 'invalid_response_option'
  | 'ambiguous_response_question';

export class ScoringError extends Error {
  readonly code: ScoringErrorCode;

  constructor(code: ScoringErrorCode, message: string) {
    super(message);
    this.name = 'ScoringError';
    this.code = code;
  }
}

export type ResolvedResponse = {
  response: RuntimeResponse;
  option: RuntimeOption;
};

export type ScoreAccumulator = {
  signalTotalsById: Readonly<Record<string, number>>;
  totalWeightsApplied: number;
  totalScoreMass: number;
  answeredQuestionIds: ReadonlySet<QuestionId>;
  answeredQuestionIdsByDomainId: Readonly<Record<string, ReadonlySet<QuestionId>>>;
};

function addQuestionIdToDomain(
  domainQuestionIds: Map<string, Set<QuestionId>>,
  domainId: string,
  questionId: QuestionId,
): void {
  const questionIds = domainQuestionIds.get(domainId);
  if (questionIds) {
    questionIds.add(questionId);
    return;
  }

  domainQuestionIds.set(domainId, new Set([questionId]));
}

function getDeterministicGeneratedAt(
  executionModel: RuntimeExecutionModel,
  responses: RuntimeResponseSet,
): string {
  if (responses.submittedAt) {
    return responses.submittedAt;
  }

  const responseValues = Object.values(responses.responsesByQuestionId);
  if (responseValues.length === 0) {
    return executionModel.definition.version.updatedAt;
  }

  let latestTimestamp = responseValues[0]!.updatedAt;
  for (const response of responseValues) {
    if (response.updatedAt > latestTimestamp) {
      latestTimestamp = response.updatedAt;
    }
  }

  return latestTimestamp;
}

export function resolveResponses(
  executionModel: RuntimeExecutionModel,
  responses: RuntimeResponseSet,
): readonly ResolvedResponse[] {
  const resolvedResponses: ResolvedResponse[] = [];

  for (const [questionId, response] of Object.entries(responses.responsesByQuestionId)) {
    const question = executionModel.indexes.questionById[questionId];
    if (!question) {
      throw new ScoringError(
        'unknown_response_question',
        `Response references unknown question ${questionId}`,
      );
    }

    if (response.questionId !== questionId) {
      throw new ScoringError(
        'ambiguous_response_question',
        `Response map key ${questionId} does not match response question ${response.questionId}`,
      );
    }

    const questionOptions = executionModel.indexes.optionsByQuestionId[questionId] ?? [];
    const option = questionOptions.find(
      (candidate) => candidate.id === response.value.selectedOptionId,
    );

    if (!option) {
      throw new ScoringError(
        'invalid_response_option',
        `Response for question ${questionId} references invalid option ${response.value.selectedOptionId}`,
      );
    }

    resolvedResponses.push({ response, option });
  }

  return Object.freeze(resolvedResponses);
}

export function accumulateRawSignalTotals(
  executionModel: RuntimeExecutionModel,
  resolvedResponses: readonly ResolvedResponse[],
): ScoreAccumulator {
  const signalTotalsById = {} as Record<string, number>;
  const answeredQuestionIds = new Set<QuestionId>();
  const answeredQuestionIdsByDomainId = new Map<string, Set<QuestionId>>();

  for (const signal of executionModel.signals) {
    signalTotalsById[signal.id] = 0;
  }

  let totalWeightsApplied = 0;
  let totalScoreMass = 0;

  for (const { response, option } of resolvedResponses) {
    answeredQuestionIds.add(response.questionId);

    const question = executionModel.indexes.questionById[response.questionId]!;
    addQuestionIdToDomain(answeredQuestionIdsByDomainId, question.domainId, response.questionId);

    for (const weight of option.signalWeights) {
      signalTotalsById[weight.signalId] += weight.weight;
      totalWeightsApplied += 1;
      totalScoreMass += weight.weight;

      const signal = executionModel.indexes.signalById[weight.signalId]!;
      addQuestionIdToDomain(answeredQuestionIdsByDomainId, signal.domainId, response.questionId);
    }
  }

  const frozenAnsweredByDomainId = {} as Record<string, ReadonlySet<QuestionId>>;
  for (const domain of executionModel.domains) {
    frozenAnsweredByDomainId[domain.id] = Object.freeze(
      new Set(answeredQuestionIdsByDomainId.get(domain.id) ?? []),
    );
  }

  return {
    signalTotalsById: Object.freeze(signalTotalsById),
    totalWeightsApplied,
    totalScoreMass,
    answeredQuestionIds: Object.freeze(new Set(answeredQuestionIds)),
    answeredQuestionIdsByDomainId: Object.freeze(frozenAnsweredByDomainId),
  };
}

export function buildRawSignalScores(
  executionModel: RuntimeExecutionModel,
  signalTotalsById: Readonly<Record<string, number>>,
): RawSignalScore[] {
  return executionModel.signals.map((signal) => {
    const domain = executionModel.indexes.domainById[signal.domainId]!;

    return {
      signalId: signal.id,
      signalKey: signal.key,
      signalTitle: signal.title,
      domainId: domain.id,
      domainKey: domain.key,
      domainSource: domain.source,
      isOverlay: signal.isOverlay,
      overlayType: signal.overlayType,
      orderIndex: signal.orderIndex,
      rawTotal: signalTotalsById[signal.id] ?? 0,
    };
  });
}

export function buildRawDomainSummaries(
  executionModel: RuntimeExecutionModel,
  signalScores: readonly RawSignalScore[],
  answeredQuestionIdsByDomainId: Readonly<Record<string, ReadonlySet<QuestionId>>>,
): RawDomainScoreSummary[] {
  return executionModel.domains.map((domain) => {
    const domainSignalScores = signalScores.filter((signalScore) => signalScore.domainId === domain.id);
    const rawTotal = domainSignalScores.reduce((total, signalScore) => total + signalScore.rawTotal, 0);
    const answeredQuestionIds = answeredQuestionIdsByDomainId[domain.id] ?? new Set<QuestionId>();

    return {
      domainId: domain.id,
      domainKey: domain.key,
      domainTitle: domain.title,
      domainSource: domain.source,
      rawTotal,
      signalScores: domainSignalScores,
      signalCount: domainSignalScores.length,
      answeredQuestionCount: answeredQuestionIds.size,
    };
  });
}

export function buildScoreDiagnostics(params: {
  executionModel: RuntimeExecutionModel;
  responses: RuntimeResponseSet;
  resolvedResponses: readonly ResolvedResponse[];
  signalScores: readonly RawSignalScore[];
  totalWeightsApplied: number;
  totalScoreMass: number;
}): ScoreDiagnostics {
  const totalQuestions = params.executionModel.questions.length;
  const answeredQuestions = params.resolvedResponses.length;
  const unansweredQuestions = totalQuestions - answeredQuestions;
  const zeroScoreSignalCount = params.signalScores.filter((signalScore) => signalScore.rawTotal === 0).length;
  const zeroAnswerSubmission = answeredQuestions === 0;
  const warnings: string[] = [];

  if (unansweredQuestions > 0) {
    warnings.push('incomplete_response_set');
  }

  if (zeroAnswerSubmission) {
    warnings.push('no_answers_submitted');
  }

  return {
    scoringMethod: 'option_signal_weights_only',
    totalQuestions,
    answeredQuestions,
    unansweredQuestions,
    totalResponsesProcessed: answeredQuestions,
    totalWeightsApplied: params.totalWeightsApplied,
    totalScoreMass: params.totalScoreMass,
    zeroScoreSignalCount,
    zeroAnswerSubmission,
    warnings: Object.freeze(warnings),
    generatedAt: getDeterministicGeneratedAt(params.executionModel, params.responses),
  };
}
