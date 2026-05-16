import type { AssessmentMode } from '@/lib/types/assessment';
import { resolveAssessmentMode } from '@/lib/utils/assessment-mode';

export function getAssessmentBuilderBasePath(
  assessmentKey: string,
  mode?: AssessmentMode | string | null,
): string {
  return resolveAssessmentMode(mode) === 'single_domain'
    ? `/admin/assessments/ranked-pattern/${assessmentKey}/workflow`
    : `/admin/assessments/${assessmentKey}`;
}

export function getAssessmentBuilderStepPath(
  assessmentKey: string,
  stepSlug: string,
  mode?: AssessmentMode | string | null,
): string {
  const basePath = getAssessmentBuilderBasePath(assessmentKey, mode);
  return basePath.includes('/ranked-pattern/') ? basePath : `${basePath}/${stepSlug}`;
}
