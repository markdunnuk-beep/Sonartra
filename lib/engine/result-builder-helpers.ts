import type {
  CanonicalResultPayload,
  EngineLanguageBundle,
  NormalizedDomainSummary,
  NormalizedResult,
  NormalizedSignalScore,
  ResultInterpretationContext,
  ResultDomainSummary,
  ResultDiagnostics,
  ResultMetadata,
  ResultRankedSignal,
  ResultTopSignal,
  ScoreDiagnostics,
} from '@/lib/engine/types';
import { sortDomainSignalsForDisplay } from '@/lib/engine/domain-signal-ranking';
import { buildDomainInterpretation } from '@/lib/engine/domain-interpretation';
import {
  buildDevelopmentFocus,
  buildOverviewSummary,
  buildStrengths,
  buildWatchouts,
} from '@/lib/engine/result-interpretation';

export type CanonicalResultBuilderInput = NormalizedResult & {
  assessmentVersionId: string;
  metadata: ResultMetadata;
  scoringDiagnostics: ScoreDiagnostics;
  languageBundle: EngineLanguageBundle;
};

export function createResultInterpretationContext(
  input: Pick<CanonicalResultBuilderInput, 'assessmentVersionId' | 'languageBundle'>,
): ResultInterpretationContext {
  return {
    assessmentVersionId: input.assessmentVersionId,
    languageBundle: input.languageBundle,
  };
}

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

function assertDomainSignalOrdering(domainSummary: ResultDomainSummary): void {
  const sortedSignalScores = sortDomainSignalsForDisplay(domainSummary.signalScores);

  for (let index = 0; index < sortedSignalScores.length; index += 1) {
    const persistedSignal = domainSummary.signalScores[index];
    const expectedSignal = sortedSignalScores[index];

    if (!persistedSignal || !expectedSignal) {
      throw new Error(`Domain ${domainSummary.domainKey} has incomplete signal ordering.`);
    }

    if (persistedSignal.signalId !== expectedSignal.signalId) {
      throw new Error(
        `Domain ${domainSummary.domainKey} signalScores are not persisted in canonical descending order.`,
      );
    }
  }

  const primarySignal = domainSummary.signalScores[0] ?? null;
  const secondarySignal = domainSummary.signalScores[1] ?? null;
  const interpretation = domainSummary.interpretation;

  if (!interpretation) {
    return;
  }

  if (interpretation.primarySignalKey !== (primarySignal?.signalKey ?? null)) {
    throw new Error(
      `Domain ${domainSummary.domainKey} interpretation primary signal does not match persisted ordering.`,
    );
  }

  if (interpretation.primaryPercent !== (primarySignal?.domainPercentage ?? null)) {
    throw new Error(
      `Domain ${domainSummary.domainKey} interpretation primary percent does not match persisted ordering.`,
    );
  }

  if (interpretation.secondarySignalKey !== (secondarySignal?.signalKey ?? null)) {
    throw new Error(
      `Domain ${domainSummary.domainKey} interpretation secondary signal does not match persisted ordering.`,
    );
  }

  if (interpretation.secondaryPercent !== (secondarySignal?.domainPercentage ?? null)) {
    throw new Error(
      `Domain ${domainSummary.domainKey} interpretation secondary percent does not match persisted ordering.`,
    );
  }

  if (
    interpretation.primaryPercent !== null &&
    interpretation.secondaryPercent !== null &&
    interpretation.primaryPercent < interpretation.secondaryPercent
  ) {
    throw new Error(
      `Domain ${domainSummary.domainKey} interpretation primary percent cannot be lower than secondary percent.`,
    );
  }
}

export function buildDomainSummaries(
  normalizedResult: NormalizedResult,
  interpretationContext: ResultInterpretationContext,
): readonly ResultDomainSummary[] {
  const domainSummaries = normalizedResult.domainSummaries.map((domainSummary) => {
    const sortedSignalScores = Object.freeze(sortDomainSignalsForDisplay(domainSummary.signalScores));
    const rankedSignalIds = Object.freeze(sortedSignalScores.map((signalScore) => signalScore.signalId));
    const canonicalDomainSummary: NormalizedDomainSummary = {
      ...domainSummary,
      signalScores: sortedSignalScores,
      rankedSignalIds,
    };
    const persistedDomainSummary = {
      ...canonicalDomainSummary,
      interpretation: buildDomainInterpretation(canonicalDomainSummary, interpretationContext),
    } satisfies ResultDomainSummary;

    assertDomainSignalOrdering(persistedDomainSummary);

    return persistedDomainSummary;
  });

  return Object.freeze(domainSummaries);
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
  const interpretationContext = createResultInterpretationContext(params.normalizedResult);
  const domainSummaries = buildDomainSummaries(params.normalizedResult, interpretationContext);

  return Object.freeze({
    metadata: {
      ...params.normalizedResult.metadata,
      assessmentDescription: params.normalizedResult.metadata.assessmentDescription ?? null,
    },
    topSignal,
    rankedSignals,
    normalizedScores,
    domainSummaries,
    overviewSummary: buildOverviewSummary(params.normalizedResult, interpretationContext),
    strengths: buildStrengths(params.normalizedResult, interpretationContext),
    watchouts: buildWatchouts(params.normalizedResult, interpretationContext),
    developmentFocus: buildDevelopmentFocus(params.normalizedResult, interpretationContext),
    diagnostics: buildDiagnostics({
      normalizedResult: params.normalizedResult,
      scoringDiagnostics: params.normalizedResult.scoringDiagnostics,
    }),
  });
}
