function cleanWhitespace(value: string): string {
  return value
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();
}

export function preserveAuthoredText(value: string): string {
  return value;
}

export function toSentenceCaseSafe(value: string): string {
  const cleaned = cleanWhitespace(value.replace(/[_-]+/g, ' '));

  if (!cleaned) {
    return cleaned;
  }

  return `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}`;
}

export function toTitleCaseForLabel(value: string): string {
  return cleanWhitespace(value.replace(/[_-]+/g, ' '))
    .split(' ')
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ');
}

