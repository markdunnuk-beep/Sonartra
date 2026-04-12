import { AdminAssessmentCreateFormContent } from '@/components/admin/admin-assessment-create-form';
import { PageFrame, PageHeader } from '@/components/shared/user-app-ui';

export default function SingleDomainAssessmentCreatePage() {
  return (
    <PageFrame className="space-y-8">
      <PageHeader
        eyebrow="Admin Workspace"
        title="Create single-domain assessment"
        description="Create a one-domain assessment draft that can later support questions, responses, weightings, and language datasets."
      />

      <AdminAssessmentCreateFormContent
        mode="single_domain"
        submitLabel="Create single-domain assessment"
        heading="Create a single-domain assessment and start a draft."
        introDescription="Start the single-domain builder with one domain only, then extend it with variable signals, questions, responses, weightings, and richer language datasets."
        resultDescription="This creates a single-domain assessment and its first draft, version `1.0.0`."
        resultSupport="Use this path when the assessment should stay in one domain while still supporting full authoring and review later."
      />
    </PageFrame>
  );
}
