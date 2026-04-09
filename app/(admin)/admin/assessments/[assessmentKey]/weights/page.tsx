'use client';

import { AdminWeightingAuthoring } from '@/components/admin/admin-weighting-authoring';
import { AdminPublishedNoDraftStageState } from '@/components/admin/admin-assessment-draft-state';
import { useAdminAssessmentAuthoring } from '@/components/admin/admin-assessment-authoring-context';
import { EmptyState } from '@/components/shared/user-app-ui';

export default function AdminAssessmentWeightsPage() {
  const assessment = useAdminAssessmentAuthoring();

  if (!assessment.latestDraftVersion) {
    if (assessment.builderMode === 'published_no_draft') {
      return (
        <AdminPublishedNoDraftStageState
          assessmentKey={assessment.assessmentKey}
          description="You are browsing the published scoring model. Create a draft version to edit response scoring for the next release."
          publishedVersionTag={assessment.publishedVersion?.versionTag ?? null}
          title="Response scoring is currently read-only"
        />
      );
    }

    return (
      <EmptyState
        title="No draft version available"
        description="Create a draft to set response scoring."
      />
    );
  }

  return (
    <AdminWeightingAuthoring
      assessmentKey={assessment.assessmentKey}
      assessmentVersionId={assessment.latestDraftVersion.assessmentVersionId}
      isEditableAssessmentVersion={Boolean(assessment.latestDraftVersion)}
      availableSignals={assessment.availableSignals}
      questions={assessment.authoredQuestions}
      weightingSummary={assessment.weightingSummary}
    />
  );
}
