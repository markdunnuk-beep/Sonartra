import { sortDomainSignalsForDisplay } from '@/lib/engine/domain-signal-ranking';
import type {
  HeroProfileDomainKey,
  HeroTraitKey,
  ResultDomainSummary,
  RuntimeHeroDefinition,
} from '@/lib/engine/types';

const HERO_SOURCE_DOMAIN_KEYS: Readonly<Record<HeroProfileDomainKey, string>> = Object.freeze({
  operatingStyle: 'signal_style',
  coreDrivers: 'signal_mot',
  leadershipApproach: 'signal_lead',
  tensionResponse: 'signal_conflict',
  environmentFit: 'signal_culture',
  pressureResponse: 'signal_stress',
});

const HERO_TRAIT_KEYS: readonly HeroTraitKey[] = Object.freeze([
  'paced',
  'deliberate',
  'people_led',
  'task_led',
  'structured',
  'flexible',
  'assertive',
  'receptive',
  'stable',
  'adaptive',
  'exacting',
  'tolerant',
]);

const HERO_SIGNAL_TOKEN_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  conflict_avoid: 'avoid',
  stress_criticality: 'critical',
});

type HeroMatchedPattern = {
  patternKey: string;
  priority: number;
};

export type HeroDomainPairWinner = {
  profileDomainKey: HeroProfileDomainKey;
  pairKey: string;
  sourceDomainKey: string;
  sourceDomainLabel: string;
  primarySignalKey: string;
  primarySignalLabel: string;
  secondarySignalKey: string;
  secondarySignalLabel: string;
};

export type HeroEvaluationResult = {
  headline: string;
  subheadline: string | null;
  summary: string | null;
  narrative: string | null;
  pressureOverlay: string | null;
  environmentOverlay: string | null;
  patternKey: string;
  priority: number | null;
  isFallback: boolean;
  matchedPatterns: readonly HeroMatchedPattern[];
  traitTotals: Readonly<Record<HeroTraitKey, number>>;
  domainPairWinners: readonly HeroDomainPairWinner[];
};

function createEmptyTraitTotals(): Record<HeroTraitKey, number> {
  return Object.fromEntries(HERO_TRAIT_KEYS.map((traitKey) => [traitKey, 0])) as Record<HeroTraitKey, number>;
}

function titleizePatternKey(patternKey: string): string {
  return patternKey
    .split('_')
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function getSignalLookupToken(signalKey: string): string {
  return HERO_SIGNAL_TOKEN_ALIASES[signalKey]
    ?? signalKey.split('_').filter((segment) => segment.length > 0).at(-1)
    ?? signalKey;
}

function canonicalizePairKey(left: string, right: string): string {
  return [left.trim(), right.trim()].sort((first, second) => first.localeCompare(second)).join('_');
}

function evaluateCondition(traitTotal: number, operator: string, value: number): boolean {
  switch (operator) {
    case '>=':
      return traitTotal >= value;
    case '<=':
      return traitTotal <= value;
    case '>':
      return traitTotal > value;
    case '<':
      return traitTotal < value;
    case '===':
      return traitTotal === value;
    default:
      return false;
  }
}

export function evaluateHeroPattern(params: {
  heroDefinition: RuntimeHeroDefinition;
  domainSummaries: readonly ResultDomainSummary[];
}): HeroEvaluationResult {
  const pairWeightsByKey = new Map<string, readonly RuntimeHeroDefinition['pairTraitWeights'][number][]>();

  for (const pairWeight of params.heroDefinition.pairTraitWeights) {
    const lookupKey = `${pairWeight.profileDomainKey}:${pairWeight.pairKey}`;
    const existing = pairWeightsByKey.get(lookupKey) ?? [];
    pairWeightsByKey.set(lookupKey, [...existing, pairWeight]);
  }

  const domainPairWinners = (Object.entries(HERO_SOURCE_DOMAIN_KEYS) as Array<[HeroProfileDomainKey, string]>).map(
    ([profileDomainKey, sourceDomainKey]) => {
      const domainSummary = params.domainSummaries.find((entry) => entry.domainKey === sourceDomainKey);
      if (!domainSummary) {
        throw new Error(`Hero domain ${sourceDomainKey} is missing from the normalized result.`);
      }

      const rankedSignals = sortDomainSignalsForDisplay(domainSummary.signalScores);
      const primarySignal = rankedSignals[0];
      const secondarySignal = rankedSignals[1];

      if (!primarySignal || !secondarySignal) {
        throw new Error(`Hero domain ${sourceDomainKey} requires two ranked signals.`);
      }

      return {
        profileDomainKey,
        pairKey: canonicalizePairKey(
          getSignalLookupToken(primarySignal.signalKey),
          getSignalLookupToken(secondarySignal.signalKey),
        ),
        sourceDomainKey,
        sourceDomainLabel: domainSummary.domainTitle,
        primarySignalKey: primarySignal.signalKey,
        primarySignalLabel: primarySignal.signalTitle,
        secondarySignalKey: secondarySignal.signalKey,
        secondarySignalLabel: secondarySignal.signalTitle,
      } satisfies HeroDomainPairWinner;
    },
  );

  const traitTotals = createEmptyTraitTotals();

  for (const winner of domainPairWinners) {
    const weights = pairWeightsByKey.get(`${winner.profileDomainKey}:${winner.pairKey}`);
    if (!weights || weights.length === 0) {
      throw new Error(
        `Hero pair trait weights are missing for ${winner.profileDomainKey}:${winner.pairKey}.`,
      );
    }

    for (const weight of weights) {
      traitTotals[weight.traitKey] += weight.weight;
    }
  }

  const matchedPatterns = params.heroDefinition.patternRules
    .filter((rule) =>
      rule.conditions.every((condition) =>
        evaluateCondition(traitTotals[condition.traitKey], condition.operator, condition.value),
      ) &&
      rule.exclusions.every((condition) =>
        !evaluateCondition(traitTotals[condition.traitKey], condition.operator, condition.value),
      ),
    )
    .map((rule) => ({
      patternKey: rule.patternKey,
      priority: rule.priority,
    }))
    .sort((left, right) => left.priority - right.priority || left.patternKey.localeCompare(right.patternKey));

  const winningPattern = matchedPatterns[0] ?? {
    patternKey: params.heroDefinition.fallbackPatternKey,
    priority: null,
  };

  const language = params.heroDefinition.patternLanguage.find(
    (entry) => entry.patternKey === winningPattern.patternKey,
  );
  if (!language) {
    throw new Error(`Hero pattern language is missing for ${winningPattern.patternKey}.`);
  }

  return {
    headline: language.headline,
    subheadline: language.subheadline,
    summary: language.summary,
    narrative: language.narrative,
    pressureOverlay: language.pressureOverlay,
    environmentOverlay: language.environmentOverlay,
    patternKey: winningPattern.patternKey,
    priority: winningPattern.priority,
    isFallback: winningPattern.patternKey === params.heroDefinition.fallbackPatternKey,
    matchedPatterns: Object.freeze(matchedPatterns),
    traitTotals: Object.freeze({ ...traitTotals }),
    domainPairWinners: Object.freeze(domainPairWinners),
  };
}

export function getHeroPatternLabel(patternKey: string): string {
  return titleizePatternKey(patternKey);
}
