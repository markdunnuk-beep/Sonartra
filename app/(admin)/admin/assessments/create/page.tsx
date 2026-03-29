import { EmptyState, PageFrame, PageHeader } from '@/components/shared/user-app-ui';

export default function AdminAssessmentCreatePlaceholderPage() {
  return (
    <PageFrame className="space-y-8">
      <PageHeader
        eyebrow="Admin Workspace"
        title="Create assessment"
        description="This route is reserved for the assessment creation flow in Task 27. The catalogue CTA is wired here so the admin dashboard can expose the next step now."
      />

      <EmptyState
        title="Creation flow not implemented yet"
        description="Task 27 can build the creation workflow on top of this protected admin route without changing the assessments dashboard."
      />
    </PageFrame>
  );
}
