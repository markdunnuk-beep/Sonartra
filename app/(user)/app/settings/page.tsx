import { EmptyState, PageFrame, PageHeader } from '@/components/shared/user-app-ui';

export default function UserSettingsPage() {
  return (
    <PageFrame className="space-y-8">
      <PageHeader
        title="Settings"
        description="Account and preference controls will appear here as the workspace expands."
      />

      <EmptyState
        title="Settings are coming soon"
        description="Your current access, profile, and notification preferences will be managed from this area."
      />
    </PageFrame>
  );
}
