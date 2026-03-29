'use client';

import { AdminQuestionOptionAuthoring } from '@/components/admin/admin-question-option-authoring';
import { useAdminAssessmentAuthoring } from '@/components/admin/admin-assessment-authoring-context';
import { EmptyState } from '@/components/shared/user-app-ui';

export default function AdminAssessmentResponsesPage() {
  const assessment = useAdminAssessmentAuthoring();

  if (!assessment.latestDraftVersion) {
    return (
      <EmptyState
        title="No draft version available"
        description="Response authoring is only available when an editable draft version exists for this assessment."
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
