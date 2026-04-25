import { buildSingleDomainPairKey } from '@/lib/types/single-domain-runtime';

export type SingleDomainPairKeyParseResult =
  | {
      success: true;
      leftSignalKey: string;
      rightSignalKey: string;
      reversedPairKey: string;
    }
  | { success: false };

export type SingleDomainPairKeyResolution =
  | {
      success: true;
      canonicalPairKey: string;
      inputPairKey: string;
      wasReversed: boolean;
    }
  | { success: false; reason: 'invalid_shape' | 'unresolved_pair' };

export function parseSingleDomainPairKey(value: string): SingleDomainPairKeyParseResult {
  const normalizedValue = value.trim();
  const parts = normalizedValue.split('_');

  if (parts.length !== 2) {
    return { success: false };
  }

  const leftSignalKey = parts[0]?.trim() ?? '';
  const rightSignalKey = parts[1]?.trim() ?? '';
  if (!leftSignalKey || !rightSignalKey) {
    return { success: false };
  }

  return {
    success: true,
    leftSignalKey,
    rightSignalKey,
    reversedPairKey: buildSingleDomainPairKey(rightSignalKey, leftSignalKey),
  };
}

export function buildSingleDomainPairKeyAliasMap(
  pairKeys: readonly string[],
): ReadonlyMap<string, string> {
  const aliases = new Map<string, string>();

  pairKeys.forEach((pairKey) => {
    const parsed = parseSingleDomainPairKey(pairKey);
    if (!parsed.success) {
      return;
    }

    aliases.set(pairKey, pairKey);
    if (!aliases.has(parsed.reversedPairKey)) {
      aliases.set(parsed.reversedPairKey, pairKey);
    }
  });

  return aliases;
}

export function resolveSingleDomainPairKey(
  pairKeys: readonly string[],
  pairKey: string,
): SingleDomainPairKeyResolution {
  const parsed = parseSingleDomainPairKey(pairKey);
  if (!parsed.success) {
    return { success: false, reason: 'invalid_shape' };
  }

  const aliases = buildSingleDomainPairKeyAliasMap(pairKeys);
  const canonicalPairKey = aliases.get(pairKey);
  if (!canonicalPairKey) {
    return { success: false, reason: 'unresolved_pair' };
  }

  return {
    success: true,
    canonicalPairKey,
    inputPairKey: pairKey,
    wasReversed: canonicalPairKey !== pairKey,
  };
}
