'use client';

import { AdminQuestionOptionAuthoring } from '@/components/admin/admin-question-option-authoring';
import { AdminPublishedNoDraftStageState } from '@/components/admin/admin-assessment-draft-state';
import { useAdminAssessmentAuthoring } from '@/components/admin/admin-assessment-authoring-context';
import { EmptyState } from '@/components/shared/user-app-ui';

export default function AdminAssessmentResponsesPage() {
  const assessment = useAdminAssessmentAuthoring();

  if (!assessment.latestDraftVersion) {
    if (assessment.builderMode === 'published_no_draft') {
      return (
        <AdminPublishedNoDraftStageState
          assessmentKey={assessment.assessmentKey}
          description="You are browsing the published response model. Create a draft version to edit response options for the next release."
          publishedVersionTag={assessment.publishedVersion?.versionTag ?? null}
          title="Response options are currently read-only"
        />
      );
    }

    return (
      <EmptyState
        title="No draft version available"
        description="Create a draft to set response options."
      />
    );
  }

  return (
    <AdminQuestionOptionAuthoring
      assessmentKey={assessment.assessmentKey}
      assessmentVersionId={assessment.latestDraftVersion.assessmentVersionId}
      domains={assessment.questionDomains}
      mode="responses"
      questions={assessment.authoredQuestions}
    />
  );
}
