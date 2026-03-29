export const ASSESSMENT_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MAX_ASSESSMENT_KEY_LENGTH = 64;

export function normalizeAssessmentKeyInput(value: string): string {
  return value.trim().toLowerCase();
}

export function deriveAssessmentKeyFromTitle(title: string): string {
  const slug = normalizeAssessmentKeyInput(title)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return slug.slice(0, MAX_ASSESSMENT_KEY_LENGTH).replace(/-+$/g, '');
}

export function syncAssessmentKeyFromTitle(params: {
  title: string;
  currentKey: string;
  hasManualOverride: boolean;
}): string {
  if (params.hasManualOverride) {
    return params.currentKey;
  }

  return deriveAssessmentKeyFromTitle(params.title);
}
