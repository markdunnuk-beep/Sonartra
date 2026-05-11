import {
  EmptyState,
  LabelPill,
  PageFrame,
  SectionHeader,
  SurfaceCard,
} from '@/components/shared/user-app-ui';

const supportOptions = [
  {
    title: 'Technical issue',
    description: 'Help for sign-in problems, page errors, assessment access, or unexpected app behaviour.',
  },
  {
    title: 'Account support',
    description: 'Guidance for profile details, access questions, settings, and authenticated account use.',
  },
  {
    title: 'Billing or access',
    description: 'Support for plan access, billing questions, payment context, or account-level availability.',
  },
  {
    title: 'General question',
    description: 'A place for broader Sonartra questions that do not fit a technical or account category.',
  },
] as const;

export default function UserSupportPage() {
  return (
    <PageFrame>
      <SurfaceCard accent className="overflow-hidden p-0">
        <header className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,0.34fr)]">
          <div className="space-y-5 p-6 sm:p-8 lg:p-10">
            <p className="sonartra-page-eyebrow">Help desk</p>
            <div className="space-y-4">
              <h1 className="sonartra-page-title">Support</h1>
              <p className="max-w-3xl text-base leading-8 text-[#D8D0C3]/76">
                Get help with technical issues, account questions, billing, or general
                Sonartra support.
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 bg-black/16 p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
            <p className="sonartra-page-eyebrow">Support shell</p>
            <p className="mt-4 text-2xl font-semibold leading-tight text-[#F5F1EA]">
              A calm route for help, access questions, and product support as the support
              desk comes online.
            </p>
          </div>
        </header>
      </SurfaceCard>

      <section className="sonartra-section">
        <SectionHeader
          eyebrow="Support options"
          title="How we can help"
          description="These support areas define the first support desk structure without starting a persisted request flow yet."
        />

        <div aria-label="Support option cards" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {supportOptions.map((option) => (
            <SurfaceCard
              key={option.title}
              className="flex min-h-full flex-col gap-5 p-5"
              data-support-option={option.title}
            >
              <div className="flex items-center justify-between gap-3">
                <LabelPill>Support area</LabelPill>
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full bg-[#32D6B0]/70 shadow-[0_0_18px_rgba(50,214,176,0.2)]"
                />
              </div>
              <div className="space-y-3">
                <h2 className="text-[1.25rem] font-semibold leading-tight text-[#F5F1EA]">
                  {option.title}
                </h2>
                <p className="text-sm leading-7 text-[#D8D0C3]/70">{option.description}</p>
              </div>
              <p className="mt-auto border-t border-white/10 pt-4 text-xs font-medium uppercase tracking-[0.12em] text-[#9A9185]/76">
                Support desk being prepared
              </p>
            </SurfaceCard>
          ))}
        </div>
      </section>

      <EmptyState
        title="The support desk is being prepared"
        description="This authenticated support area will provide a clearer path for technical issues, account help, billing questions, and general Sonartra support. It does not create support records or change your assessment data yet."
      />
    </PageFrame>
  );
}
