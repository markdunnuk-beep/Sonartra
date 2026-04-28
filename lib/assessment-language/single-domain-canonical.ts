import { buildSingleDomainPairKey } from '@/lib/types/single-domain-runtime';

export const LEADERSHIP_CANONICAL_SIGNAL_KEYS = Object.freeze([
  'results',
  'process',
  'vision',
  'people',
] as const);

export const LEADERSHIP_CANONICAL_PAIR_KEYS = Object.freeze([
  'results_process',
  'results_vision',
  'results_people',
  'process_vision',
  'process_people',
  'vision_people',
] as const);

export const DRIVER_CLAIM_ROLES = Object.freeze([
  'primary_driver',
  'secondary_driver',
  'supporting_context',
  'range_limitation',
] as const);

export type DriverClaimRole = (typeof DRIVER_CLAIM_ROLES)[number];

export type ExpectedDriverClaimTuple = {
  domainKey: string;
  pairKey: string;
  signalKey: string;
  driverRole: DriverClaimRole;
};

function supportsRangeLimitationTuples(signalCount: number): boolean {
  return signalCount >= 4;
}

export function hasLeadershipCanonicalSignalSet(signalKeys: readonly string[]): boolean {
  return signalKeys.length === LEADERSHIP_CANONICAL_SIGNAL_KEYS.length
    && LEADERSHIP_CANONICAL_SIGNAL_KEYS.every((signalKey) => signalKeys.includes(signalKey));
}

export function getSingleDomainCanonicalPairKeys(signalKeys: readonly string[]): readonly string[] {
  if (hasLeadershipCanonicalSignalSet(signalKeys)) {
    return LEADERSHIP_CANONICAL_PAIR_KEYS;
  }

  const pairKeys: string[] = [];

  for (let leftIndex = 0; leftIndex < signalKeys.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < signalKeys.length; rightIndex += 1) {
      const left = signalKeys[leftIndex];
      const right = signalKeys[rightIndex];
      if (!left || !right) {
        continue;
      }

      pairKeys.push(buildSingleDomainPairKey(left, right));
    }
  }

  return Object.freeze(pairKeys);
}

export function getExpectedDriverClaimTuples(params: {
  domainKey: string;
  signalKeys: readonly string[];
  pairKeys?: readonly string[];
}): readonly ExpectedDriverClaimTuple[] {
  const pairKeys = params.pairKeys ?? getSingleDomainCanonicalPairKeys(params.signalKeys);
  const includeRangeLimitation = supportsRangeLimitationTuples(params.signalKeys.length);

  return Object.freeze(pairKeys.flatMap((pairKey) => {
    const [leftSignalKey, rightSignalKey] = pairKey.split('_');
    if (!leftSignalKey || !rightSignalKey) {
      return [];
    }

    const remainingSignals = params.signalKeys.filter(
      (signalKey) => signalKey !== leftSignalKey && signalKey !== rightSignalKey,
    );

    const pairSignals = [leftSignalKey, rightSignalKey];
    const primarySecondaryTuples = pairSignals.flatMap((signalKey) => ([
      {
        domainKey: params.domainKey,
        pairKey,
        signalKey,
        driverRole: 'primary_driver' as const,
      },
      {
        domainKey: params.domainKey,
        pairKey,
        signalKey,
        driverRole: 'secondary_driver' as const,
      },
    ]));
    const supportingTuples = remainingSignals.map((signalKey) => ({
      domainKey: params.domainKey,
      pairKey,
      signalKey,
      driverRole: 'supporting_context' as const,
    }));
    const rangeLimitationTuples = includeRangeLimitation
      ? remainingSignals.map((signalKey) => ({
          domainKey: params.domainKey,
          pairKey,
          signalKey,
          driverRole: 'range_limitation' as const,
        }))
      : [];

    return [
      ...primarySecondaryTuples,
      ...supportingTuples,
      ...rangeLimitationTuples,
    ];
  }));
}
