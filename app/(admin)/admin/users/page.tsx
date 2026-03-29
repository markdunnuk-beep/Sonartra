import { EmptyState, PageFrame, PageHeader } from '@/components/shared/user-app-ui';

export default function AdminUsersPage() {
  return (
    <PageFrame className="space-y-8">
      <PageHeader
        eyebrow="Admin Workspace"
        title="Users"
        description="User administration, access controls, and later role management will be surfaced here. This stub validates the route wiring and shared admin shell."
      />

      <EmptyState
        title="User administration surface ready"
        description="Task sequencing can now layer operational user controls onto this page without revisiting the admin foundation."
      />
    </PageFrame>
  );
}
