'use client';

import { AdminAssessmentDeleteGovernance } from '@/components/admin/admin-assessment-delete-governance';
import { AdminAssessmentVersionGovernance } from '@/components/admin/admin-assessment-version-governance';
import { useAdminAssessmentAuthoring } from '@/components/admin/admin-assessment-authoring-context';

export default function AdminAssessmentReviewPage() {
  const assessment = useAdminAssessmentAuthoring();

  return (
    <div className="space-y-8">
      <AdminAssessmentVersionGovernance
        assessmentKey={assessment.assessmentKey}
        draftValidation={assessment.draftValidation}
        latestDraftVersion={assessment.latestDraftVersion}
        publishedVersion={assessment.publishedVersion}
        versions={assessment.versions}
      />

      <AdminAssessmentDeleteGovernance assessmentKey={assessment.assessmentKey} />
    </div>
  );
}
