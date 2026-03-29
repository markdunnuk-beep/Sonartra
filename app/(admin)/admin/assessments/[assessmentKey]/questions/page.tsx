'use client';

import { AdminQuestionOptionAuthoring } from '@/components/admin/admin-question-option-authoring';
import { useAdminAssessmentAuthoring } from '@/components/admin/admin-assessment-authoring-context';
import { EmptyState } from '@/components/shared/user-app-ui';

export default function AdminAssessmentQuestionsPage() {
  const assessment = useAdminAssessmentAuthoring();

  if (!assessment.latestDraftVersion) {
    return (
      <EmptyState
        title="No draft version available"
        description="Create a draft to add questions."
      />
    );
  }

  return (
    <AdminQuestionOptionAuthoring
      assessmentKey={assessment.assessmentKey}
      assessmentVersionId={assessment.latestDraftVersion.assessmentVersionId}
      domains={assessment.questionDomains}
      mode="questions"
      questions={assessment.authoredQuestions}
    />
  );
}
