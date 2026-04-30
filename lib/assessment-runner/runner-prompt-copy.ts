const TRAILING_PROMPT_PUNCTUATION_PATTERN = /[\s.!?;:]+$/g;

export function normalizePromptText(text: string | null | undefined): string {
  return (text ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(TRAILING_PROMPT_PUNCTUATION_PATTERN, '')
    .toLocaleLowerCase('en-GB');
}

export function getDistinctSecondaryPromptText(params: {
  heading: string | null | undefined;
  secondary: string | null | undefined;
}): string | null {
  const secondary = params.secondary?.trim();

  if (!secondary) {
    return null;
  }

  return normalizePromptText(secondary) === normalizePromptText(params.heading) ? null : secondary;
}
