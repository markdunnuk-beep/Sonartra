export type AssessmentMode = 'multi_domain' | 'single_domain';

export function normalizeAssessmentMode(mode?: string | null): AssessmentMode {
  const normalized = typeof mode === 'string' ? mode.trim() : '';
  if (normalized.length === 0) {
    return 'multi_domain';
  }

  if (normalized === 'single_domain' || normalized === 'multi_domain') {
    return normalized;
  }

  throw new Error(`Unsupported assessment mode "${normalized}".`);
}
