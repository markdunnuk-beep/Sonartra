import type {
  CanonicalResultPayload,
  NormalizedDomainSummary,
  NormalizedResult,
  NormalizedSignalScore,
  ResultBulletItem,
  ResultDiagnostics,
  ResultMetadata,
  ResultOverviewSummary,
  ResultRankedSignal,
  ResultTopSignal,
  ScoreDiagnostics,
} from '@/lib/engine/types';

export type CanonicalResultBuilderInput = NormalizedResult & {
  metadata: ResultMetadata;
  scoringDiagnostics: ScoreDiagnostics;
};

const CONCENTRATED_TOP_SIGNAL_THRESHOLD = 45;
const BALANCED_TOP_TWO_GAP_THRESHOLD = 8;
const BALANCED_TOP_SIGNAL_THRESHOLD = 40;
const MAX_BULLET_COUNT = 3;

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

function getTopDomain(domainSummaries: readonly NormalizedDomainSummary[]): NormalizedDomainSummary | null {
  if (domainSummaries.length === 0) {
    return null;
  }

  const rankedDomains = [...domainSummaries].sort((left, right) => {
    if (right.percentage !== left.percentage) {
      return right.percentage - left.percentage;
    }

    if (right.rawTotal !== left.rawTotal) {
      return right.rawTotal - left.rawTotal;
    }

    if (left.domainKey !== right.domainKey) {
      return left.domainKey.localeCompare(right.domainKey);
    }

    return left.domainId.localeCompare(right.domainId);
  });

  return rankedDomains[0] ?? null;
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

export function buildDomainSummaries(normalizedResult: NormalizedResult): readonly NormalizedDomainSummary[] {
  return Object.freeze(
    normalizedResult.domainSummaries.map((domainSummary) => ({
      ...domainSummary,
      signalScores: Object.freeze([...domainSummary.signalScores]),
      rankedSignalIds: Object.freeze([...domainSummary.rankedSignalIds]),
    })),
  );
}

function classifyDistribution(signalScores: readonly NormalizedSignalScore[]): 'concentrated' | 'balanced' | 'mixed' {
  const rankedSignals = getTopSignalsInRankOrder(signalScores);
  const first = rankedSignals[0];
  const second = rankedSignals[1];

  if (!first) {
    return 'mixed';
  }

  if (first.percentage >= CONCENTRATED_TOP_SIGNAL_THRESHOLD) {
    return 'concentrated';
  }

  if (
    second &&
    first.percentage <= BALANCED_TOP_SIGNAL_THRESHOLD &&
    Math.abs(first.percentage - second.percentage) <= BALANCED_TOP_TWO_GAP_THRESHOLD
  ) {
    return 'balanced';
  }

  return 'mixed';
}

export function buildOverviewSummary(normalizedResult: NormalizedResult): ResultOverviewSummary {
  const topSignal = buildTopSignal(normalizedResult);
  const topDomain = getTopDomain(normalizedResult.domainSummaries);
  const distribution = classifyDistribution(normalizedResult.signalScores);

  const headline = topSignal
    ? `${topSignal.title} leads the current pattern`
    : 'No leading signal available';

  const topDomainTitle = topDomain?.domainTitle ?? 'No dominant domain';
  const narrative = topSignal
    ? `${distribution} profile with ${topSignal.title} leading and ${topDomainTitle} holding the strongest domain share.`
    : `${distribution} profile with no signal activity recorded.`;

  return {
    headline,
    narrative,
  };
}

function makeBulletItem(params: {
  key: string;
  title: string;
  detail: string;
  signalId?: string;
}): ResultBulletItem {
  return {
    key: params.key,
    title: params.title,
    detail: params.detail,
    signalId: params.signalId,
  };
}

export function buildStrengths(normalizedResult: NormalizedResult): readonly ResultBulletItem[] {
  const rankedSignals = getTopSignalsInRankOrder(normalizedResult.signalScores);

  return Object.freeze(
    rankedSignals.slice(0, MAX_BULLET_COUNT).map((signalScore) =>
      makeBulletItem({
        key: `strength_${signalScore.signalKey}`,
        title: signalScore.signalTitle,
        detail: `${signalScore.signalTitle} is one of the strongest patterns at ${signalScore.percentage}% of the overall profile.`,
        signalId: signalScore.signalId,
      }),
    ),
  );
}

export function buildWatchouts(normalizedResult: NormalizedResult): readonly ResultBulletItem[] {
  const rankedSignals = getTopSignalsInRankOrder(normalizedResult.signalScores);
  const topSignal = rankedSignals[0];
  const thirdSignal = rankedSignals[2];
  const bullets: ResultBulletItem[] = [];

  if (topSignal && topSignal.percentage >= CONCENTRATED_TOP_SIGNAL_THRESHOLD) {
    bullets.push(
      makeBulletItem({
        key: `watchout_concentration_${topSignal.signalKey}`,
        title: 'Concentration Risk',
        detail: `${topSignal.signalTitle} carries a large share of the profile, which may narrow the range used across different situations.`,
        signalId: topSignal.signalId,
      }),
    );
  }

  if (topSignal && thirdSignal && topSignal.percentage - thirdSignal.percentage >= 20) {
    bullets.push(
      makeBulletItem({
        key: `watchout_dropoff_${topSignal.signalKey}`,
        title: 'Sharp Drop-Off',
        detail: `The gap between ${topSignal.signalTitle} and lower-ranked signals is pronounced, suggesting some styles may be used much less often.`,
        signalId: topSignal.signalId,
      }),
    );
  }

  if (bullets.length === 0 && rankedSignals[rankedSignals.length - 1]) {
    const lowestSignal = rankedSignals[rankedSignals.length - 1]!;
    bullets.push(
      makeBulletItem({
        key: `watchout_range_${lowestSignal.signalKey}`,
        title: 'Limited Range',
        detail: `${lowestSignal.signalTitle} appears less frequently in the current profile, which may reduce flexibility when that style is needed.`,
        signalId: lowestSignal.signalId,
      }),
    );
  }

  return Object.freeze(bullets.slice(0, MAX_BULLET_COUNT));
}

export function buildDevelopmentFocus(normalizedResult: NormalizedResult): readonly ResultBulletItem[] {
  const rankedSignals = getTopSignalsInRankOrder(normalizedResult.signalScores);
  const lowestSignals = [...rankedSignals].reverse().slice(0, MAX_BULLET_COUNT).reverse();

  return Object.freeze(
    lowestSignals.map((signalScore) =>
      makeBulletItem({
        key: `development_${signalScore.signalKey}`,
        title: signalScore.signalTitle,
        detail: `Consider building more range in ${signalScore.signalTitle} so this style is available when the situation calls for it.`,
        signalId: signalScore.signalId,
      }),
    ),
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
