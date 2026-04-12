export type AssessmentMode = 'multi_domain' | 'single_domain';

export function normalizeAssessmentMode(mode?: string | null): AssessmentMode {
  return mode === 'single_domain' ? 'single_domain' : 'multi_domain';
}
