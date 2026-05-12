import Link from 'next/link';

import {
  ButtonLink,
  LabelPill,
  PageFrame,
  PageHeader,
  SectionHeader,
  SurfaceCard,
} from '@/components/shared/user-app-ui';
import { listAdminSupportCases, type AdminSupportCaseSummary } from '@/lib/server/support-service';
import {
  ADMIN_SUPPORT_STATUS_OPTIONS,
  SUPPORT_PRIORITY_OPTIONS,
  formatAdminSupportStatus,
  formatSupportCategory,
  formatSupportDate,
  formatSupportPriority,
  parseSupportCategoryFilter,
  parseSupportPriorityFilter,
  parseSupportStatusFilter,
} from '@/lib/support/support-display';
import { SUPPORT_REQUEST_CATEGORY_OPTIONS } from '@/lib/support/support-request-action-state';

type AdminSupportPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function isNextNavigationControlError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof (error as { digest?: unknown }).digest === 'string' &&
    ((error as { digest: string }).digest.startsWith('NEXT_REDIRECT') ||
      (error as { digest: string }).digest.startsWith('NEXT_NOT_FOUND'))
  );
}

function truncatePreview(value: string | null): string {
  if (!value) {
    return 'No public messages yet.';
  }

  return value.length > 150 ? `${value.slice(0, 147)}...` : value;
}

function buildResetHref(): string {
  return '/admin/support';
}

function buildAdminCaseHref(publicReference: string): string {
  return `/admin/support/${publicReference}`;
}

function FilterSelect({
  id,
  label,
  name,
  options,
  value,
}: Readonly<{
  id: string;
  label: string;
  name: string;
  options: readonly { value: string; label: string }[];
  value?: string;
}>) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-white/74" htmlFor={id}>
        {label}
      </label>
      <select
        className="sonartra-focus-ring min-h-11 w-full rounded-xl border border-white/10 bg-[rgb(11,18,33)] px-3 text-sm text-white outline-none transition focus:border-white/16"
        defaultValue={value ?? ''}
        id={id}
        name={name}
      >
        <option value="">All {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function QueuePill({
  children,
  tone = 'neutral',
}: Readonly<{
  children: string;
  tone?: 'neutral' | 'active' | 'urgent';
}>) {
  const toneClass =
    tone === 'active'
      ? 'border-[#32D6B0]/22 bg-[#32D6B0]/[0.08] text-[#DFFCF4]'
      : tone === 'urgent'
        ? 'border-[rgba(255,184,107,0.24)] bg-[rgba(255,184,107,0.1)] text-[rgba(255,229,192,0.92)]'
        : 'border-white/10 bg-white/[0.04] text-white/68';

  return <LabelPill className={toneClass}>{children}</LabelPill>;
}

function getPriorityTone(priority: AdminSupportCaseSummary['priority']): 'neutral' | 'active' | 'urgent' {
  return priority === 'high' || priority === 'urgent' ? 'urgent' : 'neutral';
}

function SupportQueueTable({ cases }: Readonly<{ cases: readonly AdminSupportCaseSummary[] }>) {
  return (
    <SurfaceCard className="hidden overflow-hidden p-0 xl:block">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-white/[0.03] text-left">
            <tr className="text-xs uppercase tracking-[0.2em] text-white/42">
              <th className="px-5 py-4 font-medium">Case</th>
              <th className="px-5 py-4 font-medium">User</th>
              <th className="px-5 py-4 font-medium">Category</th>
              <th className="px-5 py-4 font-medium">Status</th>
              <th className="px-5 py-4 font-medium">Priority</th>
              <th className="px-5 py-4 font-medium">Created</th>
              <th className="px-5 py-4 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((supportCase) => (
              <tr className="border-t border-white/6" key={supportCase.publicReference}>
                <td className="max-w-[24rem] px-5 py-4 align-top">
                  <div className="space-y-2">
                    <Link
                      className="sonartra-focus-ring inline-block rounded text-xs font-semibold uppercase tracking-[0.16em] text-white/48 transition hover:text-white"
                      href={buildAdminCaseHref(supportCase.publicReference)}
                    >
                      {supportCase.publicReference}
                    </Link>
                    <Link
                      className="sonartra-focus-ring block rounded text-sm font-medium text-white transition hover:text-[#DFFCF4]"
                      href={buildAdminCaseHref(supportCase.publicReference)}
                    >
                      {supportCase.subject}
                    </Link>
                    <p className="line-clamp-2 text-sm leading-6 text-white/56">
                      {truncatePreview(supportCase.latestMessagePreview)}
                    </p>
                  </div>
                </td>
                <td className="px-5 py-4 align-top">
                  <p className="text-sm font-medium text-white [overflow-wrap:anywhere]">
                    {supportCase.userName ?? supportCase.userEmail}
                  </p>
                  {supportCase.userName ? (
                    <p className="mt-1 text-sm text-white/52 [overflow-wrap:anywhere]">
                      {supportCase.userEmail}
                    </p>
                  ) : null}
                </td>
                <td className="px-5 py-4 align-top text-sm text-white/68">
                  {formatSupportCategory(supportCase.category)}
                </td>
                <td className="px-5 py-4 align-top">
                  <QueuePill tone={supportCase.status === 'open' ? 'active' : 'neutral'}>
                    {formatAdminSupportStatus(supportCase.status)}
                  </QueuePill>
                </td>
                <td className="px-5 py-4 align-top">
                  <QueuePill tone={getPriorityTone(supportCase.priority)}>
                    {formatSupportPriority(supportCase.priority)}
                  </QueuePill>
                </td>
                <td className="px-5 py-4 align-top text-sm text-white/62">
                  {formatSupportDate(supportCase.createdAt)}
                </td>
                <td className="px-5 py-4 align-top text-sm text-white/62">
                  {formatSupportDate(supportCase.updatedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SurfaceCard>
  );
}

function SupportQueueCards({ cases }: Readonly<{ cases: readonly AdminSupportCaseSummary[] }>) {
  return (
    <div className="grid gap-4 xl:hidden">
      {cases.map((supportCase) => (
        <SurfaceCard className="p-5" key={supportCase.publicReference}>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                className="sonartra-focus-ring rounded-full"
                href={buildAdminCaseHref(supportCase.publicReference)}
              >
                <QueuePill>{supportCase.publicReference}</QueuePill>
              </Link>
              <QueuePill tone={supportCase.status === 'open' ? 'active' : 'neutral'}>
                {formatAdminSupportStatus(supportCase.status)}
              </QueuePill>
              <QueuePill tone={getPriorityTone(supportCase.priority)}>
                {formatSupportPriority(supportCase.priority)}
              </QueuePill>
            </div>
            <div>
              <Link
                className="sonartra-focus-ring block rounded text-xl font-semibold leading-tight text-white transition hover:text-[#DFFCF4]"
                href={buildAdminCaseHref(supportCase.publicReference)}
              >
                {supportCase.subject}
              </Link>
              <p className="mt-2 text-sm leading-7 text-white/58">
                {truncatePreview(supportCase.latestMessagePreview)}
              </p>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-white/38">User</dt>
                <dd className="mt-1 text-white/76 [overflow-wrap:anywhere]">
                  {supportCase.userName ?? supportCase.userEmail}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-white/38">Category</dt>
                <dd className="mt-1 text-white/76">
                  {formatSupportCategory(supportCase.category)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-white/38">Created</dt>
                <dd className="mt-1 text-white/76">{formatSupportDate(supportCase.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-white/38">Updated</dt>
                <dd className="mt-1 text-white/76">{formatSupportDate(supportCase.updatedAt)}</dd>
              </div>
            </dl>
          </div>
        </SurfaceCard>
      ))}
    </div>
  );
}

function SupportQueueEmpty() {
  return (
    <SurfaceCard muted dashed className="p-6" role="status">
      <h2 className="text-xl font-semibold text-white">No support cases yet</h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-white/58">
        New customer requests will appear here.
      </p>
    </SurfaceCard>
  );
}

function SupportQueueError() {
  return (
    <SurfaceCard
      className="rounded-[1.5rem] border border-[rgba(255,157,157,0.22)] bg-[rgba(255,157,157,0.07)] p-6"
      role="alert"
    >
      <h2 className="text-xl font-semibold text-[#FFE1E1]">Support cases could not be loaded</h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-[#FFD5D5]/78">
        Refresh the queue and try again. No technical error details are shown here.
      </p>
    </SurfaceCard>
  );
}

export default async function AdminSupportPage({ searchParams }: AdminSupportPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const status = parseSupportStatusFilter(resolvedSearchParams.status);
  const category = parseSupportCategoryFilter(resolvedSearchParams.category);
  const priority = parseSupportPriorityFilter(resolvedSearchParams.priority);

  let cases: readonly AdminSupportCaseSummary[] = [];
  let failed = false;

  try {
    cases = await listAdminSupportCases({ status, category, priority });
  } catch (error) {
    if (isNextNavigationControlError(error)) {
      throw error;
    }

    failed = true;
  }

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Support Admin"
        title="Support queue"
        description="Review native Sonartra support cases across users. Detailed case actions are handled in the next support task."
      />

      <section className="sonartra-section">
        <SectionHeader
          eyebrow="Filters"
          title="Queue controls"
          description="Filter support cases by lifecycle state, category, and priority."
        />
        <SurfaceCard className="p-5">
          <form action="/admin/support" className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
            <FilterSelect
              id="admin-support-status"
              label="Statuses"
              name="status"
              options={ADMIN_SUPPORT_STATUS_OPTIONS}
              value={status}
            />
            <FilterSelect
              id="admin-support-category"
              label="Categories"
              name="category"
              options={SUPPORT_REQUEST_CATEGORY_OPTIONS}
              value={category}
            />
            <FilterSelect
              id="admin-support-priority"
              label="Priorities"
              name="priority"
              options={SUPPORT_PRIORITY_OPTIONS}
              value={priority}
            />
            <div className="flex items-end">
              <button
                className="sonartra-button sonartra-button-primary sonartra-focus-ring w-full"
                type="submit"
              >
                Apply
              </button>
            </div>
            <div className="flex items-end">
              <ButtonLink className="w-full justify-center" href={buildResetHref()}>
                Reset
              </ButtonLink>
            </div>
          </form>
        </SurfaceCard>
      </section>

      <section className="sonartra-section">
        <SectionHeader
          eyebrow="Queue"
          title="All support cases"
          description="Scan customer requests without entering the admin reply workflow."
        />

        {failed ? (
          <SupportQueueError />
        ) : cases.length > 0 ? (
          <>
            <SupportQueueTable cases={cases} />
            <SupportQueueCards cases={cases} />
          </>
        ) : (
          <SupportQueueEmpty />
        )}
      </section>
    </PageFrame>
  );
}
