import type {
  DomainId,
  NormalizationDiagnostics,
  NormalizedDomainSummary,
  NormalizedResult,
  NormalizedSignalScore,
  RawDomainScoreSummary,
  RawSignalScore,
  ScoreResult,
  SignalId,
} from '@/lib/engine/types';

type PercentageAllocationItem = {
  id: string;
  key: string;
  orderIndex: number;
  rawTotal: number;
};

type PercentageAllocationResult = {
  percentagesById: Readonly<Record<string, number>>;
  percentageSum: number;
  adjustmentCount: number;
};

type RankedSignalCandidate = {
  signalId: SignalId;
  signalKey: string;
  orderIndex: number;
  percentage: number;
  rawTotal: number;
};

function freezeNumberLookup<TKey extends string>(lookup: Record<TKey, number>): Readonly<Record<TKey, number>> {
  return Object.freeze(lookup);
}

function getGeneratedAt(scoreResult: ScoreResult): string {
  return scoreResult.diagnostics.generatedAt;
}

export function getTotalScoreMass(scoreResult: ScoreResult): number {
  return scoreResult.signalScores.reduce((total, signalScore) => total + signalScore.rawTotal, 0);
}

export function allocateIntegerPercentages(
  items: readonly PercentageAllocationItem[],
  totalRawMass: number,
): PercentageAllocationResult {
  const percentagesById = {} as Record<string, number>;

  if (items.length === 0 || totalRawMass <= 0) {
    for (const item of items) {
      percentagesById[item.id] = 0;
    }

    return {
      percentagesById: freezeNumberLookup(percentagesById),
      percentageSum: 0,
      adjustmentCount: 0,
    };
  }

  const remainders = items.map((item) => {
    const exactPercentage = (item.rawTotal / totalRawMass) * 100;
    const basePercentage = Math.floor(exactPercentage);
    percentagesById[item.id] = basePercentage;

    return {
      id: item.id,
      key: item.key,
      orderIndex: item.orderIndex,
      remainder: exactPercentage - basePercentage,
    };
  });

  let remainingPoints = 100 - Object.values(percentagesById).reduce((total, value) => total + value, 0);

  remainders.sort((left, right) => {
    if (right.remainder !== left.remainder) {
      return right.remainder - left.remainder;
    }

    if (left.orderIndex !== right.orderIndex) {
      return left.orderIndex - right.orderIndex;
    }

    if (left.key !== right.key) {
      return left.key.localeCompare(right.key);
    }

    return left.id.localeCompare(right.id);
  });

  let adjustmentCount = 0;
  for (const remainder of remainders) {
    if (remainingPoints === 0) {
      break;
    }

    percentagesById[remainder.id] += 1;
    remainingPoints -= 1;
    adjustmentCount += 1;
  }

  return {
    percentagesById: freezeNumberLookup(percentagesById),
    percentageSum: Object.values(percentagesById).reduce((total, value) => total + value, 0),
    adjustmentCount,
  };
}

export function rankNormalizedSignals(
  signalScores: readonly RankedSignalCandidate[],
): Readonly<Record<SignalId, number>> {
  const rankedSignals = [...signalScores].sort((left, right) => {
    if (right.percentage !== left.percentage) {
      return right.percentage - left.percentage;
    }

    if (right.rawTotal !== left.rawTotal) {
      return right.rawTotal - left.rawTotal;
    }

    if (left.orderIndex !== right.orderIndex) {
      return left.orderIndex - right.orderIndex;
    }

    if (left.signalKey !== right.signalKey) {
      return left.signalKey.localeCompare(right.signalKey);
    }

    return left.signalId.localeCompare(right.signalId);
  });

  const ranksBySignalId = {} as Record<SignalId, number>;
  for (let index = 0; index < rankedSignals.length; index += 1) {
    ranksBySignalId[rankedSignals[index]!.signalId] = index + 1;
  }

  return freezeNumberLookup(ranksBySignalId);
}

export function buildNormalizedSignalScores(scoreResult: ScoreResult): {
  signalScores: readonly NormalizedSignalScore[];
  globalPercentageSum: number;
  roundingAdjustmentsApplied: number;
} {
  const totalScoreMass = getTotalScoreMass(scoreResult);
  const globalAllocation = allocateIntegerPercentages(
    scoreResult.signalScores.map((signalScore) => ({
      id: signalScore.signalId,
      key: signalScore.signalKey,
      orderIndex: signalScore.orderIndex,
      rawTotal: signalScore.rawTotal,
    })),
    totalScoreMass,
  );

  const domainPercentageBySignalId = {} as Record<SignalId, number>;
  let domainAdjustmentCount = 0;

  for (const domainSummary of scoreResult.domainSummaries) {
    const domainAllocation = allocateIntegerPercentages(
      domainSummary.signalScores.map((signalScore) => ({
        id: signalScore.signalId,
        key: signalScore.signalKey,
        orderIndex: signalScore.orderIndex,
        rawTotal: signalScore.rawTotal,
      })),
      domainSummary.rawTotal,
    );

    domainAdjustmentCount += domainAllocation.adjustmentCount;

    for (const signalScore of domainSummary.signalScores) {
      domainPercentageBySignalId[signalScore.signalId] =
        domainAllocation.percentagesById[signalScore.signalId] ?? 0;
    }
  }

  const ranksBySignalId = rankNormalizedSignals(
    scoreResult.signalScores.map((signalScore) => ({
      signalId: signalScore.signalId,
      signalKey: signalScore.signalKey,
      orderIndex: signalScore.orderIndex,
      percentage: globalAllocation.percentagesById[signalScore.signalId] ?? 0,
      rawTotal: signalScore.rawTotal,
    })),
  );

  const signalScores = scoreResult.signalScores.map((signalScore) => ({
    signalId: signalScore.signalId,
    signalKey: signalScore.signalKey,
    signalTitle: signalScore.signalTitle,
    domainId: signalScore.domainId,
    domainKey: signalScore.domainKey,
    domainSource: signalScore.domainSource,
    isOverlay: signalScore.isOverlay,
    overlayType: signalScore.overlayType,
    rawTotal: signalScore.rawTotal,
    normalizedValue: globalAllocation.percentagesById[signalScore.signalId] ?? 0,
    percentage: globalAllocation.percentagesById[signalScore.signalId] ?? 0,
    domainPercentage: domainPercentageBySignalId[signalScore.signalId] ?? 0,
    rank: ranksBySignalId[signalScore.signalId] ?? 0,
  }));

  return {
    signalScores: Object.freeze(signalScores),
    globalPercentageSum: globalAllocation.percentageSum,
    roundingAdjustmentsApplied: globalAllocation.adjustmentCount + domainAdjustmentCount,
  };
}

export function buildNormalizedDomainSummaries(params: {
  scoreResult: ScoreResult;
  normalizedSignalScores: readonly NormalizedSignalScore[];
}): {
  domainSummaries: readonly NormalizedDomainSummary[];
  domainPercentageSums: Readonly<Record<DomainId, number>>;
  roundingAdjustmentsApplied: number;
} {
  const normalizedSignalById = Object.freeze(
    Object.fromEntries(
      params.normalizedSignalScores.map((signalScore) => [signalScore.signalId, signalScore]),
    ) as Record<SignalId, NormalizedSignalScore>,
  );

  const domainPercentages = allocateIntegerPercentages(
    params.scoreResult.domainSummaries.map((domainSummary) => ({
      id: domainSummary.domainId,
      key: domainSummary.domainKey,
      orderIndex: 0,
      rawTotal: domainSummary.rawTotal,
    })),
    getTotalScoreMass(params.scoreResult),
  );

  const domainPercentageSums = {} as Record<DomainId, number>;
  let domainSignalAdjustmentCount = 0;

  const domainSummaries = params.scoreResult.domainSummaries.map((domainSummary, index) => {
    const signalScores = domainSummary.signalScores.map(
      (signalScore) => normalizedSignalById[signalScore.signalId]!,
    );

    const localAllocation = allocateIntegerPercentages(
      domainSummary.signalScores.map((signalScore) => ({
        id: signalScore.signalId,
        key: signalScore.signalKey,
        orderIndex: signalScore.orderIndex,
        rawTotal: signalScore.rawTotal,
      })),
      domainSummary.rawTotal,
    );

    domainSignalAdjustmentCount += localAllocation.adjustmentCount;
    domainPercentageSums[domainSummary.domainId] = localAllocation.percentageSum;

    const signalScoresWithLocalPercentages = signalScores.map((signalScore) => ({
      ...signalScore,
      domainPercentage: localAllocation.percentagesById[signalScore.signalId] ?? 0,
    }));

    const rankedSignalIds = [...signalScoresWithLocalPercentages]
      .sort((left, right) => {
        if (right.percentage !== left.percentage) {
          return right.percentage - left.percentage;
        }

        if (right.rawTotal !== left.rawTotal) {
          return right.rawTotal - left.rawTotal;
        }

        if (left.rank !== right.rank) {
          return left.rank - right.rank;
        }

        if (left.signalKey !== right.signalKey) {
          return left.signalKey.localeCompare(right.signalKey);
        }

        return left.signalId.localeCompare(right.signalId);
      })
      .map((signalScore) => signalScore.signalId);

    return {
      domainId: domainSummary.domainId,
      domainKey: domainSummary.domainKey,
      domainTitle: domainSummary.domainTitle,
      domainSource: domainSummary.domainSource,
      rawTotal: domainSummary.rawTotal,
      normalizedValue: domainPercentages.percentagesById[domainSummary.domainId] ?? 0,
      percentage: domainPercentages.percentagesById[domainSummary.domainId] ?? 0,
      signalScores: Object.freeze(signalScoresWithLocalPercentages),
      signalCount: domainSummary.signalCount,
      answeredQuestionCount: domainSummary.answeredQuestionCount,
      rankedSignalIds: Object.freeze(rankedSignalIds),
      orderIndex: index,
    };
  });

  const normalizedDomains = domainSummaries.map(({ orderIndex: _orderIndex, ...domainSummary }) => domainSummary);

  return {
    domainSummaries: Object.freeze(normalizedDomains),
    domainPercentageSums: freezeNumberLookup(domainPercentageSums),
    roundingAdjustmentsApplied: domainPercentages.adjustmentCount + domainSignalAdjustmentCount,
  };
}

export function deriveTopSignalId(signalScores: readonly NormalizedSignalScore[]): SignalId | null {
  if (signalScores.length === 0) {
    return null;
  }

  let topSignal = signalScores[0]!;

  for (const signalScore of signalScores.slice(1)) {
    if (signalScore.rank < topSignal.rank) {
      topSignal = signalScore;
    }
  }

  return topSignal.signalId;
}

export function buildNormalizationDiagnostics(params: {
  scoreResult: ScoreResult;
  globalPercentageSum: number;
  domainPercentageSums: Readonly<Record<DomainId, number>>;
  roundingAdjustmentsApplied: number;
}): NormalizationDiagnostics {
  const totalScoreMass = getTotalScoreMass(params.scoreResult);
  const zeroMass = totalScoreMass === 0;
  const zeroScoreSignalCount = params.scoreResult.signalScores.filter((signalScore) => signalScore.rawTotal === 0).length;
  const warnings: string[] = [];

  if (zeroMass) {
    warnings.push('zero_score_mass');
  }

  const hasEmptyDomain = params.scoreResult.domainSummaries.some((domainSummary) => domainSummary.signalCount === 0);
  if (hasEmptyDomain) {
    warnings.push('empty_domains_present');
  }

  return {
    normalizationMethod: 'largest_remainder_integer_percentages',
    totalScoreMass,
    zeroMass,
    globalPercentageSum: params.globalPercentageSum,
    domainPercentageSums: params.domainPercentageSums,
    roundingAdjustmentsApplied: params.roundingAdjustmentsApplied,
    zeroScoreSignalCount,
    warnings: Object.freeze(warnings),
    generatedAt: getGeneratedAt(params.scoreResult),
  };
}
