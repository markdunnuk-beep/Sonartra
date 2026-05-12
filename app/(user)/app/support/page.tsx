import Link from 'next/link';

import {
  LabelPill,
  PageFrame,
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
    <div className="p-5 sm:p-6">
      <div
        className="flex min-h-[15rem] flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-white/12 bg-black/12 px-5 py-8 text-center"
        role="status"
      >
        <span
          aria-hidden="true"
          className="mb-4 flex h-11 w-11 items-center justify-center rounded-[0.9rem] border border-[#32D6B0]/18 bg-[#32D6B0]/[0.08] text-[#32D6B0]"
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
          No support cases yet
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-7 text-[#D8D0C3]/72">
          Create a request when you need help with your account, access, billing, or a technical
          issue.
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
    <div className="p-5 sm:p-6">
      <div
        className="rounded-[1.25rem] border border-[rgba(255,157,157,0.22)] bg-[rgba(255,157,157,0.07)] px-5 py-5"
        role="alert"
      >
        <h2 className="text-xl font-semibold text-[#FFE1E1]">Support cases could not be loaded</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-[#FFD5D5]/78">
          Refresh the page and try again. If the problem continues, create a new request or
          contact Sonartra directly.
        </p>
      </div>
    </div>
  );
}

export default async function UserSupportPage({ searchParams }: SupportPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const statusFilter = parseSupportStatusFilter(resolvedSearchParams.status);
  const priorityFilter = parseSupportPriorityFilter(resolvedSearchParams.priority);
  const hasActiveFilters = Boolean(statusFilter || priorityFilter);

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
      <SurfaceCard accent className="p-6 sm:p-8">
        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-y-4">
            <p className="sonartra-page-eyebrow">Support</p>
            <div className="space-y-3">
              <h1 className="sonartra-page-title">Support</h1>
              <p className="text-base leading-8 text-[#D8D0C3]/76">
                Create and track support requests for your Sonartra account.
              </p>
            </div>
          </div>
          <SupportRequestForm />
        </header>
      </SurfaceCard>

      <section className="sonartra-section !mt-6">
        <SurfaceCard className="overflow-hidden p-0">
          <div className="border-b border-white/10 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="sonartra-page-eyebrow">Cases</p>
                <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#F5F1EA]">
                  Your support cases
                </h2>
                <p className="max-w-2xl text-sm leading-7 text-[#D8D0C3]/72">
                  Track open requests and read support replies.
                </p>
              </div>
              {cases.length > 0 || hasActiveFilters ? (
                <form
                  action="/app/support"
                  className="grid gap-3 sm:grid-cols-[minmax(11rem,1fr)_minmax(11rem,1fr)_auto]"
                >
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
              ) : null}
            </div>
          </div>

          {casesLoadFailed ? <CasesUnavailable /> : cases.length > 0 ? <CaseList cases={cases} /> : <EmptyCases />}
        </SurfaceCard>
      </section>
    </PageFrame>
  );
}
