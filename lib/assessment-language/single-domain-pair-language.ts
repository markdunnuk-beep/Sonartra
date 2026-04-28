function compactText(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

export function pairLanguageReferencesPair(params: {
  pairKey: string;
  rowText: string;
}): boolean {
  const [leftSignalKey, rightSignalKey] = params.pairKey.split('_');
  if (!leftSignalKey || !rightSignalKey) {
    return false;
  }

  const normalized = compactText(params.rowText);
  const pairKeyToken = compactText(params.pairKey);
  const reversedPairKeyToken = compactText(`${rightSignalKey}_${leftSignalKey}`);

  if (normalized.includes(pairKeyToken) || normalized.includes(reversedPairKeyToken)) {
    return true;
  }

  return normalized.includes(compactText(leftSignalKey))
    && normalized.includes(compactText(rightSignalKey));
}

export function getPairLanguageReferenceRequirement(pairKey: string): {
  leftSignalKey: string | null;
  rightSignalKey: string | null;
  message: string;
} {
  const [leftSignalKey, rightSignalKey] = pairKey.split('_');

  return {
    leftSignalKey: leftSignalKey ?? null,
    rightSignalKey: rightSignalKey ?? null,
    message: leftSignalKey && rightSignalKey
      ? `${pairKey} must reference ${leftSignalKey} and ${rightSignalKey}, or the active pair key.`
      : `${pairKey} must reference the active pair signals or pair key.`,
  };
}
