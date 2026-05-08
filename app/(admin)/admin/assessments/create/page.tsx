import { AdminAssessmentCreateForm } from '@/components/admin/admin-assessment-create-form';
import { PageFrame, PageHeader } from '@/components/shared/user-app-ui';

export default function AdminAssessmentCreatePlaceholderPage() {
  return (
    <PageFrame className="space-y-8">
      <PageHeader
        eyebrow="Admin Workspace"
        title="Legacy multi-domain assessment"
        description="Archived creation path for historical maintenance. New active builds should use the ranked-pattern package workflow."
      />

      <AdminAssessmentCreateForm />
    </PageFrame>
  );
}
