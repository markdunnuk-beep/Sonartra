import { EmptyState, PageFrame, PageHeader } from '@/components/shared/user-app-ui';

export default function AdminOrganisationsPage() {
  return (
    <PageFrame className="space-y-8">
      <PageHeader
        eyebrow="Admin Workspace"
        title="Organisations"
        description="Manage organisations here."
      />

      <EmptyState
        title="Organisations coming soon"
        description="Organisation tools will be added here."
      />
    </PageFrame>
  );
}
