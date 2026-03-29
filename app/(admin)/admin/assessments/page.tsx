import { EmptyState, PageFrame, PageHeader } from '@/components/shared/user-app-ui';

export default function AdminAssessmentsPage() {
  return (
    <PageFrame className="space-y-8">
      <PageHeader
        eyebrow="Admin Workspace"
        title="Assessments"
        description="Assessment inventory and authoring controls will live here next. This stub confirms the protected shell, routing, and navigation state for the assessments module."
      />

      <EmptyState
        title="Assessment authoring surface ready"
        description="Task 26 can now add the assessments dashboard, version visibility, and publishing controls inside the shared admin layout."
      />
    </PageFrame>
  );
}
