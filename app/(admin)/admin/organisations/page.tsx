import { EmptyState, PageFrame, PageHeader } from '@/components/shared/user-app-ui';

export default function AdminOrganisationsPage() {
  return (
    <PageFrame className="space-y-8">
      <PageHeader
        eyebrow="Admin Workspace"
        title="Organisations"
        description="Organisation-level administration will be added here once the assessment authoring surfaces are in place. The route is protected and integrated into the shared shell."
      />

      <EmptyState
        title="Organisation management surface ready"
        description="Future work can add organisation assignment and operational controls here without changing the admin route foundation."
      />
    </PageFrame>
  );
}
