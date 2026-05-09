export type RankedPatternAssessmentCompatibilityInput = {
  readonly assessmentKey: string;
  readonly title?: string | null;
  readonly mode?: string | null;
  readonly isActive?: boolean;
};

export function looksLikeLegacyOrTestAssessmentKey(assessmentKey: string): boolean {
  const key = assessmentKey.trim().toLowerCase();
  return key === 'test' || key.includes('test') || key.startsWith('sonartra-');
}

export function isRankedPatternPackageCompatibleAssessment(
  assessment: RankedPatternAssessmentCompatibilityInput,
): boolean {
  const title = assessment.title?.toLowerCase() ?? '';

  if (assessment.isActive === false) {
    return false;
  }

  if (looksLikeLegacyOrTestAssessmentKey(assessment.assessmentKey) || title.includes('legacy') || title.includes('test')) {
    return false;
  }

  return assessment.mode === 'single_domain';
}

