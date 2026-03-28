import { PageFrame, PageHeader, SurfaceCard } from '@/components/shared/user-app-ui';

export default function UserSettingsPage() {
  return (
    <PageFrame className="space-y-8">
      <PageHeader
        title="Settings"
        description="User-level preferences and account controls will live here as the authenticated app expands."
      />

      <SurfaceCard className="p-6">
        <h2 className="text-lg font-semibold text-white">Settings surface ready</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-white/60">
          The shell is in place so future settings sections can be added without changing the
          authenticated layout.
        </p>
      </SurfaceCard>
    </PageFrame>
  );
}
