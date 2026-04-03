export function canonicalizeSignalPairKey(
  value: string,
): { success: true; signalKeys: readonly [string, string]; canonicalSignalPair: string } | { success: false } {
  const normalizedValue = value.trim();
  const parts = normalizedValue.split('_');

  if (parts.length !== 2) {
    return { success: false };
  }

  const left = parts[0]?.trim() ?? '';
  const right = parts[1]?.trim() ?? '';
  if (!left || !right) {
    return { success: false };
  }

  const orderedSignalKeys = [left, right].sort((a, b) => a.localeCompare(b)) as [string, string];

  return {
    success: true,
    signalKeys: orderedSignalKeys,
    canonicalSignalPair: orderedSignalKeys.join('_'),
  };
}
