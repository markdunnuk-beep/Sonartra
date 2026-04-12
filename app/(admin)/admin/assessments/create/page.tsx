import { AdminAssessmentCreateForm } from '@/components/admin/admin-assessment-create-form';
import { PageFrame, PageHeader } from '@/components/shared/user-app-ui';

export default function AdminAssessmentCreatePlaceholderPage() {
  return (
    <PageFrame className="space-y-8">
      <PageHeader
        eyebrow="Admin Workspace"
        title="Create multi-domain assessment"
        description="Create a new multi-domain assessment and start with a draft."
      />

      <AdminAssessmentCreateForm />
    </PageFrame>
  );
}
