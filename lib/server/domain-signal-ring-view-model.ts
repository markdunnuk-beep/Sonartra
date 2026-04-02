import type { ResultDomainSummary } from '@/lib/engine/types';

type DomainSummarySource = {
  domainSummaries?: readonly unknown[];
} | null | undefined;

export type DomainSignalRingDisplayStrength = {
  displayStrength: number;
};

export type DomainSignalRingEntryViewModel = {
  signalKey: string;
  signalLabel: string;
  scorePercent: number | null;
  displayStrength: number;
  rankWithinDomain: number | null;
  isTopSignal: boolean;
  isSecondSignal: boolean;
};

export type DomainSignalRingViewModel = {
  domainKey: string;
  domainLabel: string;
  domainSummary: string | null;
  signals: readonly DomainSignalRingEntryViewModel[];
  signalCount: number;
  topSignalKey: string | null;
  maxSignalPercent: number | null;
  minSignalPercent: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getDisplayPercent(signal: unknown): number | null {
  if (!isRecord(signal)) {
    return null;
  }

  const percentage = signal.percentage;
  if (typeof percentage === 'number' && Number.isFinite(percentage)) {
    return percentage;
  }

  const normalizedValue = signal.normalizedValue;
  if (typeof normalizedValue === 'number' && Number.isFinite(normalizedValue)) {
    return normalizedValue;
  }

  return null;
}

function getSignalKey(signal: unknown, index: number): string {
  if (!isRecord(signal) || typeof signal.signalKey !== 'string' || signal.signalKey.length === 0) {
    return `signal-${index + 1}`;
  }

  return signal.signalKey;
}

function getSignalLabel(signal: unknown, index: number): string {
  if (isRecord(signal)) {
    if (typeof signal.signalTitle === 'string' && signal.signalTitle.length > 0) {
      return signal.signalTitle;
    }

    if (typeof signal.title === 'string' && signal.title.length > 0) {
      return signal.title;
    }
  }

  return `Signal ${index + 1}`;
}

function getDomainSummaryText(domain: unknown): string | null {
  if (!isRecord(domain) || !isRecord(domain.interpretation)) {
    return null;
  }

  return typeof domain.interpretation.summary === 'string' && domain.interpretation.summary.length > 0
    ? domain.interpretation.summary
    : null;
}

function rankSignals(signalScores: readonly unknown[]): ReadonlyMap<number, number> {
  const ranked = signalScores
    .map((signal, index) => ({
      index,
      scorePercent: getDisplayPercent(signal),
    }))
    .filter((signal): signal is { index: number; scorePercent: number } => signal.scorePercent !== null)
    .sort((left, right) => right.scorePercent - left.scorePercent || left.index - right.index);

  return new Map(ranked.map((signal, index) => [signal.index, index + 1]));
}

function mapDomainSignalRing(domain: ResultDomainSummary | Record<string, unknown>, domainIndex: number): DomainSignalRingViewModel {
  const signalScores = Array.isArray(domain.signalScores) ? domain.signalScores : [];
  const ranksByIndex = rankSignals(signalScores);
  const rankedEntries = [...ranksByIndex.entries()].sort((left, right) => left[1] - right[1]);
  const topSignalIndex = rankedEntries[0]?.[0] ?? null;
  const secondSignalIndex = rankedEntries[1]?.[0] ?? null;
  const numericPercents = signalScores
    .map((signal) => getDisplayPercent(signal))
    .filter((percent): percent is number => percent !== null);

  const signals = signalScores.map((signal, index) => ({
    signalKey: getSignalKey(signal, index),
    signalLabel: getSignalLabel(signal, index),
    scorePercent: getDisplayPercent(signal),
    displayStrength: computeSignalDisplayStrength(getDisplayPercent(signal)).displayStrength,
    rankWithinDomain: ranksByIndex.get(index) ?? null,
    isTopSignal: index === topSignalIndex,
    isSecondSignal: index === secondSignalIndex,
  }));

  return {
    domainKey:
      typeof domain.domainKey === 'string' && domain.domainKey.length > 0
        ? domain.domainKey
        : `domain-${domainIndex + 1}`,
    domainLabel:
      typeof domain.domainTitle === 'string' && domain.domainTitle.length > 0
        ? domain.domainTitle
        : `Domain ${domainIndex + 1}`,
    domainSummary: getDomainSummaryText(domain),
    signals: Object.freeze(signals),
    signalCount: signals.length,
    topSignalKey: topSignalIndex === null ? null : signals[topSignalIndex]?.signalKey ?? null,
    maxSignalPercent: numericPercents.length > 0 ? Math.max(...numericPercents) : null,
    minSignalPercent: numericPercents.length > 0 ? Math.min(...numericPercents) : null,
  };
}

export function buildDomainSignalRingViewModel(
  payload: DomainSummarySource,
): readonly DomainSignalRingViewModel[] {
  if (!payload || !Array.isArray(payload.domainSummaries)) {
    return Object.freeze([]);
  }

  const rings = payload.domainSummaries
    .filter((domain): domain is ResultDomainSummary | Record<string, unknown> => isRecord(domain))
    .map((domain, index) => mapDomainSignalRing(domain, index));

  return Object.freeze(rings);
}

export function computeSignalDisplayStrength(
  scorePercent: number | null | undefined,
  options?: {
    minVisibleFloor?: number;
    maxRange?: number;
  },
): DomainSignalRingDisplayStrength {
  const minVisibleFloor = options?.minVisibleFloor ?? 0.2;
  const maxRange = options?.maxRange ?? 0.8;

  if (typeof scorePercent !== "number" || !Number.isFinite(scorePercent)) {
    return { displayStrength: minVisibleFloor };
  }

  const clampedPercent = Math.min(100, Math.max(0, scorePercent));
  const displayStrength = minVisibleFloor + (clampedPercent / 100) * maxRange;

  return {
    displayStrength: Number(displayStrength.toFixed(4)),
  };
}
