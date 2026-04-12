import { normalizeAssessmentMode, type AssessmentMode } from '@/lib/types/assessment';

export function isSingleDomain(mode?: string | null): mode is 'single_domain' {
  return normalizeAssessmentMode(mode) === 'single_domain';
}

export function isMultiDomain(mode?: string | null): mode is 'multi_domain' {
  return !isSingleDomain(mode);
}

export function getAssessmentResultHref(
  resultId: string,
  mode?: AssessmentMode | string | null,
): string {
  return isSingleDomain(mode)
    ? `/app/results/single-domain/${resultId}`
    : `/app/results/${resultId}`;
}
