'use client';

import { AdminAssessmentDeleteGovernance } from '@/components/admin/admin-assessment-delete-governance';
import { AdminAssessmentVersionGovernance } from '@/components/admin/admin-assessment-version-governance';
import { useAdminAssessmentAuthoring } from '@/components/admin/admin-assessment-authoring-context';
import { SectionHeader } from '@/components/shared/user-app-ui';

export default function AdminAssessmentReviewPage() {
  const assessment = useAdminAssessmentAuthoring();

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Review"
        title="Review"
        description="Validate the draft, publish it, manage versions, and handle destructive actions."
      />

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
