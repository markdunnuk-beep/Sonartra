import { LabelPill, PageFrame, PageHeader, SurfaceCard } from '@/components/shared/user-app-ui';

const plannedSettingsAreas = [
  {
    title: 'Account profile',
    description: 'Manage your identity and access details from this workspace area.',
    fieldLabel: 'Profile controls',
    fieldValue: 'Managed by account access',
  },
  {
    title: 'Preferences',
    description:
      'Control workspace defaults and notification choices when those options are available.',
    fieldLabel: 'Preference controls',
    fieldValue: 'Coming later',
  },
  {
    title: 'Assessment history',
    description: 'Review account-level controls connected to completed assessments and reports.',
    fieldLabel: 'History controls',
    fieldValue: 'Report access retained',
  },
] as const;

export default function UserSettingsPage() {
  return (
    <PageFrame className="space-y-8">
      <PageHeader
        title="Settings"
        description="Account and preference controls will appear here as the workspace expands."
      />

      <SurfaceCard accent className="overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.4fr)]">
          <div className="bg-black/12 space-y-4 border-b border-white/10 p-6 lg:border-b-0 lg:border-r lg:p-7">
            <LabelPill>Reserved workspace area</LabelPill>
            <div className="space-y-3">
              <h2 className="text-[1.45rem] font-semibold leading-tight text-[#F5F1EA]">
                Settings are being prepared
              </h2>
              <p className="text-sm leading-7 text-[#D8D0C3]/70">
                This page is intentionally reserved for account and preference controls. It does not
                contain active settings yet.
              </p>
            </div>
          </div>

          <div className="grid gap-3 p-5 lg:p-6">
            {plannedSettingsAreas.map((area) => (
              <div
                key={area.title}
                className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(245,241,234,0.034),rgba(245,241,234,0.014))] px-4 py-4"
              >
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.7fr)] sm:items-start">
                  <div>
                    <h3 className="text-sm font-semibold text-[#F5F1EA]/90">{area.title}</h3>
                    <p className="text-[#D8D0C3]/62 mt-2 text-sm leading-6">{area.description}</p>
                  </div>
                  <div
                    aria-label={`${area.fieldLabel}: ${area.fieldValue}`}
                    className="bg-black/18 rounded-full border border-white/10 px-4 py-2.5"
                  >
                    <p className="text-[#9A9185]/78 text-[11px] font-semibold uppercase leading-none tracking-[0.12em]">
                      {area.fieldLabel}
                    </p>
                    <p className="text-[#F5F1EA]/82 mt-2 truncate text-sm font-medium">
                      {area.fieldValue}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SurfaceCard>
    </PageFrame>
  );
}
