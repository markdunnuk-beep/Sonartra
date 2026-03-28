import { EmptyState, PageFrame, PageHeader } from '@/components/shared/user-app-ui';

export default function UserSettingsPage() {
  return (
    <PageFrame className="space-y-8">
      <PageHeader
        title="Settings"
        description="User-level preferences and account controls will live here as the authenticated app expands."
      />

      <EmptyState
        title="Settings surface ready"
        description="The shell is in place so future settings sections can be added without changing the authenticated layout."
      />
    </PageFrame>
  );
}
