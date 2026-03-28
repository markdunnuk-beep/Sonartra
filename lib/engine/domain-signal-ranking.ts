import type { NormalizedSignalScore } from '@/lib/engine/types';

export function compareDomainSignalsForDisplay(
  left: NormalizedSignalScore,
  right: NormalizedSignalScore,
): number {
  if (right.domainPercentage !== left.domainPercentage) {
    return right.domainPercentage - left.domainPercentage;
  }

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
}

export function sortDomainSignalsForDisplay(
  signalScores: readonly NormalizedSignalScore[],
): readonly NormalizedSignalScore[] {
  return [...signalScores].sort(compareDomainSignalsForDisplay);
}
