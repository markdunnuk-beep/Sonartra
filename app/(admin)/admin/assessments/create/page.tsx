import { AdminAssessmentCreateForm } from '@/components/admin/admin-assessment-create-form';
import { PageFrame, PageHeader } from '@/components/shared/user-app-ui';

export default function AdminAssessmentCreatePlaceholderPage() {
  return (
    <PageFrame className="space-y-8">
      <PageHeader
        eyebrow="Admin Workspace"
        title="Create assessment"
        description="Create a new assessment record and bootstrap its first draft version so later authoring tasks can attach structure without revisiting catalogue foundations."
      />

      <AdminAssessmentCreateForm />
    </PageFrame>
  );
}
