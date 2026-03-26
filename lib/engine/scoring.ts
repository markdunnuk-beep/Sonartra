import {
  accumulateRawSignalTotals,
  buildRawDomainSummaries,
  buildRawSignalScores,
  buildScoreDiagnostics,
  resolveResponses,
} from '@/lib/engine/scoring-helpers';
import type { RuntimeExecutionModel, RuntimeResponseSet, ScoreResult } from '@/lib/engine/types';

export { ScoringError } from '@/lib/engine/scoring-helpers';
export type { ScoringErrorCode } from '@/lib/engine/scoring-helpers';

export function scoreAssessmentResponses(params: {
  executionModel: RuntimeExecutionModel;
  responses: RuntimeResponseSet;
}): ScoreResult {
  const resolvedResponses = resolveResponses(params.executionModel, params.responses);
  const accumulator = accumulateRawSignalTotals(params.executionModel, resolvedResponses);
  const signalScores = buildRawSignalScores(params.executionModel, accumulator.signalTotalsById);
  const domainSummaries = buildRawDomainSummaries(
    params.executionModel,
    signalScores,
    accumulator.answeredQuestionIdsByDomainId,
  );
  const diagnostics = buildScoreDiagnostics({
    executionModel: params.executionModel,
    responses: params.responses,
    resolvedResponses,
    signalScores,
    totalWeightsApplied: accumulator.totalWeightsApplied,
    totalScoreMass: accumulator.totalScoreMass,
  });

  return Object.freeze({
    signalScores: Object.freeze(signalScores),
    domainSummaries: Object.freeze(domainSummaries),
    diagnostics,
  });
}
