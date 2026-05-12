import Link from 'next/link';

import {
  LabelPill,
  PageFrame,
  SectionHeader,
  SurfaceCard,
} from '@/components/shared/user-app-ui';
import { SupportRequestForm } from '@/components/user/support-request-form';
import { listCurrentUserSupportCases, type SupportCaseSummary } from '@/lib/server/support-service';
import {
  SUPPORT_PRIORITY_OPTIONS,
  SUPPORT_STATUS_OPTIONS,
  formatSupportCategory,
  formatSupportDate,
  formatSupportPriority,
  formatSupportStatus,
  parseSupportPriorityFilter,
  parseSupportStatusFilter,
} from '@/lib/support/support-display';
import { SUPPORT_REQUEST_CATEGORY_OPTIONS } from '@/lib/support/support-request-action-state';

type SupportPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function truncatePreview(value: string | null): string {
  if (!value) {
    return 'No public messages yet.';
  }

  return value.length > 150 ? `${value.slice(0, 147)}...` : value;
}

function FilterSelect({
  label,
  name,
  value,
  options,
}: Readonly<{
  label: string;
  name: string;
  value?: string;
  options: readonly { value: string; label: string }[];
}>) {
  return (
    <label className="min-w-0">
      <span className="sr-only">{label}</span>
      <select
        className="sonartra-focus-ring h-12 w-full rounded-[1rem] border border-white/10 bg-black/16 px-4 text-sm font-medium text-[#D8D0C3]/82 outline-none hover:border-white/14 sm:w-auto"
        defaultValue={value ?? ''}
        name={name}
      >
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CaseMeta({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#9A9185]/72">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-[#F5F1EA]">{value}</p>
    </div>
  );
}

function CaseList({ cases }: Readonly<{ cases: readonly SupportCaseSummary[] }>) {
  return (
    <div className="divide-y divide-white/10">
      {cases.map((supportCase) => (
        <Link
          className="sonartra-focus-ring group block px-5 py-5 transition hover:bg-white/[0.035] sm:px-6"
          href={`/app/support/${supportCase.publicReference}`}
          key={supportCase.publicReference}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <LabelPill>{supportCase.publicReference}</LabelPill>
                <span className="rounded-full border border-[#32D6B0]/20 bg-[#32D6B0]/[0.08] px-3 py-1 text-xs font-semibold text-[#DFFCF4]">
                  {formatSupportStatus(supportCase.status)}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-[#D8D0C3]/78">
                  {formatSupportPriority(supportCase.priority)}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold leading-tight text-[#F5F1EA] group-hover:text-white">
                  {supportCase.subject}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-[#D8D0C3]/70">
                  {truncatePreview(supportCase.latestMessagePreview)}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:min-w-[26rem]">
              <CaseMeta label="Category" value={formatSupportCategory(supportCase.category)} />
              <CaseMeta label="Created" value={formatSupportDate(supportCase.createdAt)} />
              <CaseMeta label="Updated" value={formatSupportDate(supportCase.updatedAt)} />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function EmptyCases() {
  return (
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
          <SupportRequestForm triggerVariant="secondary" />
        </div>
      </div>
    </div>
  );
}

function CasesUnavailable() {
  return (
    <div className="p-5 sm:p-8">
      <div
        className="rounded-[1.5rem] border border-[rgba(255,157,157,0.22)] bg-[rgba(255,157,157,0.07)] px-5 py-6"
        role="alert"
      >
        <h2 className="text-xl font-semibold text-[#FFE1E1]">Support cases could not be loaded</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-[#FFD5D5]/78">
          Try refreshing this page. If the problem continues, create a new request or contact
          Sonartra directly.
        </p>
      </div>
    </div>
  );
}

export default async function UserSupportPage({ searchParams }: SupportPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const statusFilter = parseSupportStatusFilter(resolvedSearchParams.status);
  const priorityFilter = parseSupportPriorityFilter(resolvedSearchParams.priority);

  let cases: readonly SupportCaseSummary[] = [];
  let casesLoadFailed = false;

  try {
    cases = await listCurrentUserSupportCases({
      status: statusFilter,
      priority: priorityFilter,
    });
  } catch {
    casesLoadFailed = true;
  }

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
                support. This area collects support requests and case updates in one place.
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
              <SupportRequestForm />
              <p className="text-xs font-medium leading-6 text-[#9A9185]/84">
                Create a support case for a technical issue, account question, billing access,
                product feedback, or general question.
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
            description="Review your support requests and open a case to read the public message thread."
          />
          <div className="shrink-0">
            <SupportRequestForm triggerVariant="secondary" />
          </div>
        </div>

        <SurfaceCard className="overflow-hidden p-0">
          <form
            action="/app/support"
            className="grid gap-3 border-b border-white/10 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
          >
            <div className="min-w-0">
              <label className="sr-only" htmlFor="support-case-search">
                Search support cases
              </label>
              <input
                aria-label="Search support cases. Search will be added in a later support task."
                className="h-12 w-full rounded-[1rem] border border-white/10 bg-black/16 px-4 text-sm text-[#F5F1EA] outline-none placeholder:text-[#9A9185]/70 disabled:cursor-not-allowed disabled:opacity-80"
                disabled
                id="support-case-search"
                placeholder="Search support cases..."
                type="search"
              />
            </div>
            <FilterSelect
              label="All statuses"
              name="status"
              options={SUPPORT_STATUS_OPTIONS}
              value={statusFilter}
            />
            <FilterSelect
              label="All priorities"
              name="priority"
              options={SUPPORT_PRIORITY_OPTIONS}
              value={priorityFilter}
            />
            <button
              className="sonartra-button sonartra-button-secondary sonartra-focus-ring h-12"
              type="submit"
            >
              Apply filters
            </button>
          </form>

          {casesLoadFailed ? <CasesUnavailable /> : cases.length > 0 ? <CaseList cases={cases} /> : <EmptyCases />}
        </SurfaceCard>
      </section>

      <section className="sonartra-section">
        <SectionHeader
          eyebrow="Lifecycle"
          title="Status model"
          description="These labels describe the support case lifecycle."
        />
        <div aria-label="Support case status model" className="flex flex-wrap gap-2">
          {SUPPORT_STATUS_OPTIONS.map((status) => (
            <LabelPill key={status.value}>{status.label}</LabelPill>
          ))}
        </div>
      </section>

      <section className="sonartra-section">
        <SectionHeader
          eyebrow="Request categories"
          title="Start with the right context"
          description="Choose the closest category when creating a support request."
        />

        <div aria-label="Support category cards" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {SUPPORT_REQUEST_CATEGORY_OPTIONS.map((category) => (
            <SurfaceCard
              key={category.value}
              className="flex min-h-full flex-col gap-5 p-5"
              data-support-option={category.label}
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
                  {category.label}
                </h2>
                <p className="text-sm leading-7 text-[#D8D0C3]/70">{category.helper}</p>
              </div>
              <div className="mt-auto border-t border-white/10 pt-4">
                <SupportRequestForm
                  initialCategory={category.value}
                  triggerLabel={`Prepare ${category.label.toLowerCase()}`}
                  triggerVariant="secondary"
                />
              </div>
            </SurfaceCard>
          ))}
        </div>
      </section>
    </PageFrame>
  );
}
