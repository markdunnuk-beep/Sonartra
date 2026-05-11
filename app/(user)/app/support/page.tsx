import {
  LabelPill,
  PageFrame,
  SectionHeader,
  SurfaceCard,
} from '@/components/shared/user-app-ui';

const supportCategories = [
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

const supportStatuses = ['Open', 'Waiting on Sonartra', 'Waiting on you', 'Resolved'] as const;

function DisabledAction({
  children,
  primary = false,
}: Readonly<{
  children: string;
  primary?: boolean;
}>) {
  return (
    <button
      aria-label={`${children}. Request creation is being prepared.`}
      className={[
        'sonartra-button cursor-not-allowed opacity-75',
        primary ? 'sonartra-button-primary' : 'sonartra-button-secondary',
      ].join(' ')}
      disabled
      type="button"
    >
      {children}
    </button>
  );
}

export default function UserSupportPage() {
  return (
    <PageFrame>
      <SurfaceCard accent className="overflow-hidden p-0">
        <header className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.36fr)]">
          <div className="space-y-5 p-6 sm:p-8 lg:p-10">
            <p className="sonartra-page-eyebrow">Support cases</p>
            <div className="space-y-4">
              <h1 className="sonartra-page-title">Support</h1>
              <p className="max-w-3xl text-base leading-8 text-[#D8D0C3]/76">
                Get help with technical issues, account questions, billing, or general Sonartra
                support. This area will collect support requests and case updates in one place.
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-6 border-t border-white/10 bg-black/16 p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
            <div className="space-y-4">
              <p className="sonartra-page-eyebrow">Request support</p>
              <p className="text-2xl font-semibold leading-tight text-[#F5F1EA]">
                Create a request, track the case, and keep support context organised.
              </p>
            </div>
            <div className="space-y-3">
              <DisabledAction primary>Create support request</DisabledAction>
              <p className="text-xs font-medium leading-6 text-[#9A9185]/84">
                Request creation is being prepared. No support records are created from this
                shell yet.
              </p>
            </div>
          </div>
        </header>
      </SurfaceCard>

      <section className="sonartra-section">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader
            eyebrow="Cases"
            title="Your support cases"
            description="Search, filter, and review support requests from this operational cases view once request handling is enabled."
          />
          <div className="shrink-0">
            <DisabledAction>Create support request</DisabledAction>
          </div>
        </div>

        <SurfaceCard className="overflow-hidden p-0">
          <div className="grid gap-3 border-b border-white/10 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
            <div className="min-w-0">
              <label className="sr-only" htmlFor="support-case-search">
                Search support cases
              </label>
              <input
                aria-label="Search support cases"
                className="h-12 w-full rounded-[1rem] border border-white/10 bg-black/16 px-4 text-sm text-[#F5F1EA] outline-none placeholder:text-[#9A9185]/70 disabled:cursor-not-allowed disabled:opacity-80"
                disabled
                id="support-case-search"
                placeholder="Search support cases..."
                type="search"
              />
            </div>
            <button
              aria-label="Filter support cases by status. Filters are being prepared."
              className="h-12 rounded-[1rem] border border-white/10 bg-white/[0.035] px-4 text-sm font-medium text-[#D8D0C3]/82 disabled:cursor-not-allowed disabled:opacity-80"
              disabled
              type="button"
            >
              All statuses
            </button>
            <button
              aria-label="Filter support cases by priority. Filters are being prepared."
              className="h-12 rounded-[1rem] border border-white/10 bg-white/[0.035] px-4 text-sm font-medium text-[#D8D0C3]/82 disabled:cursor-not-allowed disabled:opacity-80"
              disabled
              type="button"
            >
              All priorities
            </button>
          </div>

          <div className="p-5 sm:p-8">
            <div
              className="flex min-h-[18rem] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-white/12 bg-black/12 px-5 py-10 text-center"
              role="status"
            >
              <span
                aria-hidden="true"
                className="mb-5 flex h-12 w-12 items-center justify-center rounded-[1rem] border border-[#32D6B0]/18 bg-[#32D6B0]/[0.08] text-[#32D6B0]"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M6.5 7.5h11M6.5 12h7M6.5 16.5h4.5M4.75 4.75h14.5v14.5H4.75z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.6"
                  />
                </svg>
              </span>
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#F5F1EA]">
                No support cases
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-[#D8D0C3]/72">
                Create a support request when you need help with a technical issue, account
                question, billing, or general support.
              </p>
              <div className="mt-6">
                <DisabledAction>Create support request</DisabledAction>
              </div>
            </div>
          </div>
        </SurfaceCard>
      </section>

      <section className="sonartra-section">
        <SectionHeader
          eyebrow="Future lifecycle"
          title="Status model"
          description="These labels describe the future support case lifecycle only. They are not connected to saved data yet."
        />
        <div aria-label="Support case status model" className="flex flex-wrap gap-2">
          {supportStatuses.map((status) => (
            <LabelPill key={status}>{status}</LabelPill>
          ))}
        </div>
      </section>

      <section className="sonartra-section">
        <SectionHeader
          eyebrow="Request categories"
          title="Start with the right context"
          description="These categories will help route future support requests without starting a live request flow yet."
        />

        <div aria-label="Support category cards" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {supportCategories.map((category) => (
            <SurfaceCard
              key={category.title}
              className="flex min-h-full flex-col gap-5 p-5"
              data-support-option={category.title}
            >
              <div className="flex items-center justify-between gap-3">
                <LabelPill>Category</LabelPill>
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full bg-[#32D6B0]/70 shadow-[0_0_18px_rgba(50,214,176,0.2)]"
                />
              </div>
              <div className="space-y-3">
                <h2 className="text-[1.25rem] font-semibold leading-tight text-[#F5F1EA]">
                  {category.title}
                </h2>
                <p className="text-sm leading-7 text-[#D8D0C3]/70">{category.description}</p>
              </div>
              <div className="mt-auto border-t border-white/10 pt-4">
                <button
                  aria-label={`${category.title}. Request category entry is being prepared.`}
                  className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9A9185]/80 disabled:cursor-not-allowed"
                  disabled
                  type="button"
                >
                  Prepare request
                </button>
              </div>
            </SurfaceCard>
          ))}
        </div>
      </section>
    </PageFrame>
  );
}
