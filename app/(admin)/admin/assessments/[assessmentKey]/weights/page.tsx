'use client';

import { AdminWeightingAuthoring } from '@/components/admin/admin-weighting-authoring';
import { useAdminAssessmentAuthoring } from '@/components/admin/admin-assessment-authoring-context';
import { EmptyState } from '@/components/shared/user-app-ui';

export default function AdminAssessmentWeightsPage() {
  const assessment = useAdminAssessmentAuthoring();

  if (!assessment.latestDraftVersion) {
    return (
      <EmptyState
        title="No draft version available"
        description="Weight authoring is only available when an editable draft version exists for this assessment."
      />
    );
  }

  return (
    <AdminWeightingAuthoring
      assessmentKey={assessment.assessmentKey}
      assessmentVersionId={assessment.latestDraftVersion.assessmentVersionId}
      availableSignals={assessment.availableSignals}
      questions={assessment.authoredQuestions}
      weightingSummary={assessment.weightingSummary}
    />
  );
}
