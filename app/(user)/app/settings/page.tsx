import {
  LabelPill,
  PageFrame,
  PageHeader,
  SurfaceCard,
} from '@/components/shared/user-app-ui';

const plannedSettingsAreas = [
  {
    title: 'Account profile',
    description: 'Manage your identity and access details from this workspace area.',
  },
  {
    title: 'Preferences',
    description: 'Control workspace defaults and notification choices when those options are available.',
  },
  {
    title: 'Assessment history',
    description: 'Review account-level controls connected to completed assessments and reports.',
  },
] as const;

export default function UserSettingsPage() {
  return (
    <PageFrame className="space-y-8">
      <PageHeader
        title="Settings"
        description="Account and preference controls will appear here as the workspace expands."
      />

      <SurfaceCard className="overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.4fr)]">
          <div className="border-white/8 space-y-4 border-b bg-white/[0.018] p-6 lg:border-b-0 lg:border-r lg:p-7">
            <LabelPill>Reserved workspace area</LabelPill>
            <div className="space-y-3">
              <h2 className="text-[1.45rem] font-semibold tracking-[-0.025em] text-white">
                Settings are being prepared
              </h2>
              <p className="text-sm leading-7 text-white/64">
                This page is intentionally reserved for account and preference controls. It does not contain active settings yet.
              </p>
            </div>
          </div>

          <div className="grid gap-3 p-5 lg:p-6">
            {plannedSettingsAreas.map((area) => (
              <div
                key={area.title}
                className="rounded-[1rem] border border-white/8 bg-black/10 px-4 py-4"
              >
                <h3 className="text-sm font-semibold text-white/90">{area.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/56">{area.description}</p>
              </div>
            ))}
          </div>
        </div>
      </SurfaceCard>
    </PageFrame>
  );
}
