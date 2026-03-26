import {
  buildNormalizationDiagnostics,
  buildNormalizedDomainSummaries,
  buildNormalizedSignalScores,
  deriveTopSignalId,
} from '@/lib/engine/normalization-helpers';
import type { NormalizedResult, ScoreResult } from '@/lib/engine/types';

export function normalizeScoreResult(params: {
  scoreResult: ScoreResult;
}): NormalizedResult {
  const signalNormalization = buildNormalizedSignalScores(params.scoreResult);
  const domainNormalization = buildNormalizedDomainSummaries({
    scoreResult: params.scoreResult,
    normalizedSignalScores: signalNormalization.signalScores,
  });
  const diagnostics = buildNormalizationDiagnostics({
    scoreResult: params.scoreResult,
    globalPercentageSum: signalNormalization.globalPercentageSum,
    domainPercentageSums: domainNormalization.domainPercentageSums,
    roundingAdjustmentsApplied:
      signalNormalization.roundingAdjustmentsApplied + domainNormalization.roundingAdjustmentsApplied,
  });

  return Object.freeze({
    signalScores: signalNormalization.signalScores,
    domainSummaries: domainNormalization.domainSummaries,
    topSignalId: deriveTopSignalId(signalNormalization.signalScores),
    diagnostics,
  });
}
