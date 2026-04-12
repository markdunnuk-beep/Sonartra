import type { Queryable } from '@/lib/engine/repository-sql';
import type { AdminAssessmentDetailViewModel } from '@/lib/server/admin-assessment-detail';
import { getAdminAssessmentDetailByKey } from '@/lib/server/admin-assessment-detail';
import { isSingleDomain } from '@/lib/utils/assessment-mode';

export async function getSingleDomainBuilderAssessment(
  db: Queryable,
  assessmentKey: string,
): Promise<{
  assessment: AdminAssessmentDetailViewModel | null;
  redirectTo: string | null;
}> {
  const assessment = await getAdminAssessmentDetailByKey(db, assessmentKey);

  if (!assessment) {
    return {
      assessment: null,
      redirectTo: null,
    };
  }

  if (!isSingleDomain(assessment.mode)) {
    return {
      assessment: null,
      redirectTo: `/admin/assessments/${assessmentKey}/overview`,
    };
  }

  return {
    assessment,
    redirectTo: null,
  };
}
