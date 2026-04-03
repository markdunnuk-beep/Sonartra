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
  withinDomainPercent: number | null;
  displayStrength: number;
  rankWithinDomain: number | null;
  isTopSignal: boolean;
  isSecondSignal: boolean;
};

export type DomainSignalRingViewModel = {
  domainKey: string;
  domainLabel: string;
  signals: readonly DomainSignalRingEntryViewModel[];
  signalCount: number;
  topSignalKey: string | null;
  maxWithinDomainPercent: number | null;
  minWithinDomainPercent: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getSignalRankingValue(signal: unknown): number | null {
  if (!isRecord(signal)) {
    return null;
  }

  const domainPercentage = signal.domainPercentage;
  if (typeof domainPercentage === 'number' && Number.isFinite(domainPercentage)) {
    return domainPercentage;
  }

  const rawTotal = signal.rawTotal;
  if (typeof rawTotal === 'number' && Number.isFinite(rawTotal)) {
    return rawTotal;
  }

  const normalizedValue = signal.normalizedValue;
  if (typeof normalizedValue === 'number' && Number.isFinite(normalizedValue)) {
    return normalizedValue;
  }

  const percentage = signal.percentage;
  if (typeof percentage === 'number' && Number.isFinite(percentage)) {
    return percentage;
  }

  return null;
}

function getWithinDomainBasisValue(signal: unknown): number {
  if (!isRecord(signal)) {
    return 0;
  }

  const domainPercentage = signal.domainPercentage;
  if (typeof domainPercentage === 'number' && Number.isFinite(domainPercentage) && domainPercentage > 0) {
    return domainPercentage;
  }

  const rawTotal = signal.rawTotal;
  if (typeof rawTotal === 'number' && Number.isFinite(rawTotal) && rawTotal > 0) {
    return rawTotal;
  }

  const normalizedValue = signal.normalizedValue;
  if (typeof normalizedValue === 'number' && Number.isFinite(normalizedValue) && normalizedValue > 0) {
    return normalizedValue;
  }

  const percentage = signal.percentage;
  if (typeof percentage === 'number' && Number.isFinite(percentage) && percentage > 0) {
    return percentage;
  }

  return 0;
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

function rankSignals(signalScores: readonly unknown[]): ReadonlyMap<number, number> {
  const ranked = signalScores
    .map((signal, index) => ({
      index,
      scoreValue: getSignalRankingValue(signal),
    }))
    .filter((signal): signal is { index: number; scoreValue: number } => signal.scoreValue !== null)
    .sort((left, right) => right.scoreValue - left.scoreValue || left.index - right.index);

  return new Map(ranked.map((signal, index) => [signal.index, index + 1]));
}

function normalizeWithinDomainPercents(signalScores: readonly unknown[]): readonly (number | null)[] {
  const basisValues = signalScores.map((signal) => getWithinDomainBasisValue(signal));
  const total = basisValues.reduce((sum, value) => sum + value, 0);

  if (!(total > 0)) {
    return Object.freeze(signalScores.map(() => null));
  }

  const entries = basisValues.map((value, index) => {
    const exactPercent = (value / total) * 100;
    const basePercent = Math.floor(exactPercent);

    return {
      index,
      basePercent,
      remainder: exactPercent - basePercent,
    };
  });

  let remaining = 100 - entries.reduce((sum, entry) => sum + entry.basePercent, 0);
  entries.sort((left, right) => right.remainder - left.remainder || left.index - right.index);

  for (let index = 0; index < entries.length && remaining > 0; index += 1) {
    entries[index]!.basePercent += 1;
    remaining -= 1;
  }

  const normalized = Array<number | null>(signalScores.length).fill(null);
  for (const entry of entries) {
    normalized[entry.index] = entry.basePercent;
  }

  return Object.freeze(normalized);
}

function mapDomainSignalRing(domain: ResultDomainSummary | Record<string, unknown>, domainIndex: number): DomainSignalRingViewModel {
  const signalScores = Array.isArray(domain.signalScores) ? domain.signalScores : [];
  const ranksByIndex = rankSignals(signalScores);
  const withinDomainPercents = normalizeWithinDomainPercents(signalScores);
  const rankedEntries = [...ranksByIndex.entries()].sort((left, right) => left[1] - right[1]);
  const topSignalIndex = rankedEntries[0]?.[0] ?? null;
  const secondSignalIndex = rankedEntries[1]?.[0] ?? null;
  const numericPercents = withinDomainPercents
    .filter((percent): percent is number => percent !== null);

  const signals = signalScores.map((signal, index) => ({
    signalKey: getSignalKey(signal, index),
    signalLabel: getSignalLabel(signal, index),
    withinDomainPercent: withinDomainPercents[index] ?? null,
    displayStrength: computeSignalDisplayStrength(withinDomainPercents[index] ?? null).displayStrength,
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
    signals: Object.freeze(signals),
    signalCount: signals.length,
    topSignalKey: topSignalIndex === null ? null : signals[topSignalIndex]?.signalKey ?? null,
    maxWithinDomainPercent: numericPercents.length > 0 ? Math.max(...numericPercents) : null,
    minWithinDomainPercent: numericPercents.length > 0 ? Math.min(...numericPercents) : null,
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
