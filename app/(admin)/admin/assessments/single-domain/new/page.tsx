import { AdminAssessmentCreateFormContent } from '@/components/admin/admin-assessment-create-form';
import { PageFrame, PageHeader } from '@/components/shared/user-app-ui';

export default function SingleDomainAssessmentCreatePage() {
  return (
    <PageFrame className="space-y-8">
      <PageHeader
        eyebrow="Admin Workspace"
        title="Legacy single-domain shell"
        description="Archived one-domain CRUD creation path for transitional maintenance. New active builds should use the ranked-pattern package workflow."
      />

      <AdminAssessmentCreateFormContent
        mode="single_domain"
        submitLabel="Create single-domain assessment"
        heading="Create a legacy single-domain assessment shell."
        introDescription="Start the archived one-domain builder only for records that still need the historical questions, responses, weightings, and language dataset surfaces."
        resultDescription="This creates a single-domain assessment and its first draft, version `1.0.0`."
        resultSupport="Do not use this path to bypass ranked-pattern package import, publish audit, or explicit publish."
        showIntroCard={false}
      />
    </PageFrame>
  );
}
