import type {
  CanonicalResultPayload,
  NormalizedDomainSummary,
  NormalizedResult,
  NormalizedSignalScore,
  ResultDomainSummary,
  ResultDiagnostics,
  ResultMetadata,
  ResultRankedSignal,
  ResultTopSignal,
  ScoreDiagnostics,
} from '@/lib/engine/types';
import { buildDomainInterpretation } from '@/lib/engine/domain-interpretation';
import {
  buildDevelopmentFocus,
  buildOverviewSummary,
  buildStrengths,
  buildWatchouts,
} from '@/lib/engine/result-interpretation';

export type CanonicalResultBuilderInput = NormalizedResult & {
  metadata: ResultMetadata;
  scoringDiagnostics: ScoreDiagnostics;
};

function getTopSignalsInRankOrder(signalScores: readonly NormalizedSignalScore[]): readonly NormalizedSignalScore[] {
  return [...signalScores].sort((left, right) => {
    if (left.rank !== right.rank) {
      return left.rank - right.rank;
    }

    if (right.percentage !== left.percentage) {
      return right.percentage - left.percentage;
    }

    if (right.rawTotal !== left.rawTotal) {
      return right.rawTotal - left.rawTotal;
    }

    if (left.signalKey !== right.signalKey) {
      return left.signalKey.localeCompare(right.signalKey);
    }

    return left.signalId.localeCompare(right.signalId);
  });
}

export function buildTopSignal(normalizedResult: NormalizedResult): ResultTopSignal | null {
  if (!normalizedResult.topSignalId) {
    return null;
  }

  const topSignal = normalizedResult.signalScores.find((signalScore) => signalScore.signalId === normalizedResult.topSignalId);
  if (!topSignal) {
    return null;
  }

  return {
    signalId: topSignal.signalId,
    signalKey: topSignal.signalKey,
    title: topSignal.signalTitle,
    domainId: topSignal.domainId,
    domainKey: topSignal.domainKey,
    normalizedValue: topSignal.normalizedValue,
    rawTotal: topSignal.rawTotal,
    percentage: topSignal.percentage,
    rank: 1,
  };
}

export function buildRankedSignals(normalizedResult: NormalizedResult): readonly ResultRankedSignal[] {
  return Object.freeze(
    getTopSignalsInRankOrder(normalizedResult.signalScores).map((signalScore) => ({
      signalId: signalScore.signalId,
      signalKey: signalScore.signalKey,
      title: signalScore.signalTitle,
      domainId: signalScore.domainId,
      domainKey: signalScore.domainKey,
      normalizedValue: signalScore.normalizedValue,
      rawTotal: signalScore.rawTotal,
      percentage: signalScore.percentage,
      domainPercentage: signalScore.domainPercentage,
      isOverlay: signalScore.isOverlay,
      overlayType: signalScore.overlayType,
      rank: signalScore.rank,
    })),
  );
}

export function buildNormalizedScores(normalizedResult: NormalizedResult): readonly NormalizedSignalScore[] {
  return Object.freeze([...normalizedResult.signalScores]);
}

export function buildDomainSummaries(normalizedResult: NormalizedResult): readonly ResultDomainSummary[] {
  return Object.freeze(
    normalizedResult.domainSummaries.map((domainSummary) => ({
      ...domainSummary,
      signalScores: Object.freeze([...domainSummary.signalScores]),
      rankedSignalIds: Object.freeze([...domainSummary.rankedSignalIds]),
      interpretation: buildDomainInterpretation(domainSummary),
    })),
  );
}

export function buildDiagnostics(params: {
  normalizedResult: NormalizedResult;
  scoringDiagnostics: ScoreDiagnostics;
}): ResultDiagnostics {
  const warnings = Object.freeze(
    Array.from(
      new Set([
        ...params.scoringDiagnostics.warnings,
        ...params.normalizedResult.diagnostics.warnings,
      ]),
    ),
  );

  return {
    readinessStatus: 'processing',
    scoring: params.scoringDiagnostics,
    normalization: params.normalizedResult.diagnostics,
    answeredQuestionCount: params.scoringDiagnostics.answeredQuestions,
    totalQuestionCount: params.scoringDiagnostics.totalQuestions,
    missingQuestionIds: Object.freeze([]),
    topSignalSelectionBasis: 'normalized_rank',
    rankedSignalCount: params.normalizedResult.signalScores.length,
    domainCount: params.normalizedResult.domainSummaries.length,
    zeroMass: params.normalizedResult.diagnostics.zeroMass,
    zeroMassTopSignalFallbackApplied:
      params.normalizedResult.diagnostics.zeroMass && params.normalizedResult.topSignalId !== null,
    warnings,
    generatedAt: params.normalizedResult.diagnostics.generatedAt,
  };
}

export function buildPayload(params: {
  normalizedResult: CanonicalResultBuilderInput;
}): CanonicalResultPayload {
  const topSignal = buildTopSignal(params.normalizedResult);
  const rankedSignals = buildRankedSignals(params.normalizedResult);
  const normalizedScores = buildNormalizedScores(params.normalizedResult);
  const domainSummaries = buildDomainSummaries(params.normalizedResult);

  return Object.freeze({
    metadata: params.normalizedResult.metadata,
    topSignal,
    rankedSignals,
    normalizedScores,
    domainSummaries,
    overviewSummary: buildOverviewSummary(params.normalizedResult),
    strengths: buildStrengths(params.normalizedResult),
    watchouts: buildWatchouts(params.normalizedResult),
    developmentFocus: buildDevelopmentFocus(params.normalizedResult),
    diagnostics: buildDiagnostics({
      normalizedResult: params.normalizedResult,
      scoringDiagnostics: params.normalizedResult.scoringDiagnostics,
    }),
  });
}
