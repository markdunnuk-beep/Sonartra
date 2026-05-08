import type { AssessmentMode } from '@/lib/types/assessment';

const KNOWN_ASSESSMENT_MODES = new Set<AssessmentMode>(['multi_domain', 'single_domain']);

export class UnsupportedAssessmentModeError extends Error {
  readonly mode: string;

  constructor(mode: string) {
    super(`Unsupported assessment mode "${mode}". Expected "multi_domain" or "single_domain".`);
    this.name = 'UnsupportedAssessmentModeError';
    this.mode = mode;
  }
}

export function resolveAssessmentMode(mode?: string | null): AssessmentMode {
  const normalized = typeof mode === 'string' ? mode.trim() : '';
  if (normalized.length === 0) {
    return 'multi_domain';
  }

  if (KNOWN_ASSESSMENT_MODES.has(normalized as AssessmentMode)) {
    return normalized as AssessmentMode;
  }

  throw new UnsupportedAssessmentModeError(normalized);
}

export function getAssessmentModeLabel(mode?: string | null): 'Multi-Domain' | 'Single-Domain' {
  return resolveAssessmentMode(mode) === 'single_domain' ? 'Single-Domain' : 'Multi-Domain';
}

export function isSingleDomain(mode?: string | null): mode is 'single_domain' {
  return resolveAssessmentMode(mode) === 'single_domain';
}

export function isMultiDomain(mode?: string | null): mode is 'multi_domain' {
  return resolveAssessmentMode(mode) === 'multi_domain';
}

export function getAssessmentResultHref(
  resultId: string,
  mode?: AssessmentMode | string | null,
): string {
  return resolveAssessmentMode(mode) === 'single_domain'
    ? `/app/results/single-domain/${resultId}`
    : `/app/results/${resultId}`;
}
