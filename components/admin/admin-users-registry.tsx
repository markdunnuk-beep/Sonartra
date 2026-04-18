import Link from 'next/link';

import {
  ButtonLink,
  EmptyState,
  LabelPill,
  PageFrame,
  SectionHeader,
  SurfaceCard,
  cn,
} from '@/components/shared/user-app-ui';
import type {
  AdminUsersListFilters,
  AdminUsersListItemViewModel,
  AdminUsersListPageViewModel,
} from '@/lib/server/admin-users-list';

function getUserStatusPillClass(status: AdminUsersListItemViewModel['userStatus']): string {
  switch (status) {
    case 'active':
      return 'border-[rgba(116,209,177,0.22)] bg-[rgba(116,209,177,0.1)] text-[rgba(214,246,233,0.86)]';
    case 'invited':
      return 'border-[rgba(142,162,255,0.25)] bg-[rgba(142,162,255,0.12)] text-[rgba(228,234,255,0.9)]';
    case 'disabled':
      return 'border-[rgba(255,132,132,0.24)] bg-[rgba(255,132,132,0.1)] text-[rgba(255,225,225,0.88)]';
  }
}

function getProgressPillClass(progress: AdminUsersListItemViewModel['progressState']): string {
  switch (progress) {
    case 'completed':
      return 'border-[rgba(116,209,177,0.22)] bg-[rgba(116,209,177,0.1)] text-[rgba(214,246,233,0.86)]';
    case 'in_progress':
      return 'border-[rgba(255,184,107,0.22)] bg-[rgba(255,184,107,0.11)] text-[rgba(255,227,187,0.9)]';
    case 'not_started':
      return 'border-white/10 bg-white/[0.045] text-white/68';
  }
}

function buildUsersResetHref(): string {
  return '/admin/users';
}

function buildFilterHref(params: {
  filters: AdminUsersListFilters;
  overrides?: Partial<AdminUsersListFilters>;
}): string {
  const merged = { ...params.filters, ...params.overrides };
  const search = new URLSearchParams();

  if (merged.query.length > 0) {
    search.set('q', merged.query);
  }

  if (merged.status !== 'all') {
    search.set('status', merged.status);
  }

  if (merged.progress !== 'all') {
    search.set('progress', merged.progress);
  }

  const query = search.toString();
  return query.length > 0 ? `/admin/users?${query}` : '/admin/users';
}

function FilterChip({
  active,
  href,
  label,
}: {
  active: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      className={cn(
        'sonartra-focus-ring inline-flex min-h-10 items-center rounded-full border px-3 py-2 text-sm transition duration-200',
        active
          ? 'border-white/16 bg-white/[0.08] text-white'
          : 'border-white/10 bg-white/[0.03] text-white/64 hover:border-white/14 hover:bg-white/[0.06] hover:text-white',
      )}
      href={href}
    >
      {label}
    </Link>
  );
}

function UsersToolbar({ filters }: { filters: AdminUsersListFilters }) {
  return (
    <SurfaceCard className="p-5">
      <form action="/admin/users" className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto]">
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/74" htmlFor="admin-users-search">
            Search
          </label>
          <input
            className="sonartra-focus-ring min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none transition placeholder:text-white/34 focus:border-white/16 focus:bg-white/[0.05]"
            defaultValue={filters.query}
            id="admin-users-search"
            name="q"
            placeholder="Search by name or email"
            type="search"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-white/74" htmlFor="admin-users-status">
            User status
          </label>
          <select
            className="sonartra-focus-ring min-h-11 w-full rounded-xl border border-white/10 bg-[rgb(11,18,33)] px-3 text-sm text-white outline-none transition focus:border-white/16"
            defaultValue={filters.status}
            id="admin-users-status"
            name="status"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="invited">Invited</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-white/74" htmlFor="admin-users-progress">
            Progress
          </label>
          <select
            className="sonartra-focus-ring min-h-11 w-full rounded-xl border border-white/10 bg-[rgb(11,18,33)] px-3 text-sm text-white outline-none transition focus:border-white/16"
            defaultValue={filters.progress}
            id="admin-users-progress"
            name="progress"
          >
            <option value="all">All states</option>
            <option value="not_started">Not started</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="flex items-end gap-3">
          <button
            className="sonartra-button sonartra-button-primary sonartra-focus-ring"
            type="submit"
          >
            Apply
          </button>
          <ButtonLink href={buildUsersResetHref()}>Reset</ButtonLink>
        </div>
      </form>
    </SurfaceCard>
  );
}

function UsersTable({
  hasOrganisationColumn,
  items,
}: {
  hasOrganisationColumn: boolean;
  items: readonly AdminUsersListItemViewModel[];
}) {
  return (
    <SurfaceCard className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-white/[0.03] text-left">
            <tr className="text-xs uppercase tracking-[0.2em] text-white/42">
              <th className="px-5 py-4 font-medium">User</th>
              <th className="px-5 py-4 font-medium">Status</th>
              {hasOrganisationColumn ? <th className="px-5 py-4 font-medium">Organisation</th> : null}
              <th className="px-5 py-4 font-medium">Current assessment</th>
              <th className="px-5 py-4 font-medium">Progress</th>
              <th className="px-5 py-4 font-medium">Last activity</th>
              <th className="px-5 py-4 font-medium">Next assessment</th>
              <th className="px-5 py-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr className="border-t border-white/6" key={item.id}>
                <td className="px-5 py-4 align-top">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white">{item.name}</p>
                    <p className="text-sm text-white/56">{item.email}</p>
                  </div>
                </td>
                <td className="px-5 py-4 align-top">
                  <LabelPill className={getUserStatusPillClass(item.userStatus)}>
                    {item.userStatusLabel}
                  </LabelPill>
                </td>
                {hasOrganisationColumn ? (
                  <td className="px-5 py-4 align-top text-sm text-white/62">
                    {item.organisationName ?? 'Not set'}
                  </td>
                ) : null}
                <td className="px-5 py-4 align-top text-sm text-white/72">
                  {item.currentAssessmentLabel ?? 'No assignment yet'}
                </td>
                <td className="px-5 py-4 align-top">
                  <LabelPill className={getProgressPillClass(item.progressState)}>
                    {item.progressStateLabel}
                  </LabelPill>
                </td>
                <td className="px-5 py-4 align-top text-sm text-white/62">{item.lastActivityLabel}</td>
                <td className="px-5 py-4 align-top text-sm text-white/62">
                  {item.nextAssessmentLabel ?? 'None queued'}
                </td>
                <td className="px-5 py-4 align-top text-right">
                  <Link
                    className="text-sm font-medium text-white/72 transition hover:text-white"
                    href={item.detailHref}
                  >
                    View user
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SurfaceCard>
  );
}

export function AdminUsersRegistry({ viewModel }: { viewModel: AdminUsersListPageViewModel }) {
  return (
    <PageFrame>
      <SurfaceCard accent className="overflow-hidden p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="max-w-3xl text-[2rem] font-semibold tracking-[-0.03em] text-white lg:text-[2.35rem]">
              Users
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-white/66">
              Registered internal users with current assessment state and latest activity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-white/52">
            <span>{viewModel.filteredUsers} shown</span>
            <span className="text-white/24">•</span>
            <span>{viewModel.totalUsers} total</span>
          </div>
        </div>
      </SurfaceCard>

      <section className="sonartra-section">
        <SectionHeader
          eyebrow="Registry"
          title="Operational user registry"
          description="Search and filter the current user base."
        />

        <UsersToolbar filters={viewModel.filters} />

        <div className="flex flex-wrap gap-2 pt-4">
          <FilterChip
            active={viewModel.filters.status === 'all'}
            href={buildFilterHref({ filters: viewModel.filters, overrides: { status: 'all' } })}
            label="All statuses"
          />
          <FilterChip
            active={viewModel.filters.status === 'active'}
            href={buildFilterHref({ filters: viewModel.filters, overrides: { status: 'active' } })}
            label="Active"
          />
          <FilterChip
            active={viewModel.filters.status === 'invited'}
            href={buildFilterHref({ filters: viewModel.filters, overrides: { status: 'invited' } })}
            label="Invited"
          />
          <FilterChip
            active={viewModel.filters.status === 'disabled'}
            href={buildFilterHref({ filters: viewModel.filters, overrides: { status: 'disabled' } })}
            label="Disabled"
          />
          <FilterChip
            active={viewModel.filters.progress === 'all'}
            href={buildFilterHref({ filters: viewModel.filters, overrides: { progress: 'all' } })}
            label="All states"
          />
          <FilterChip
            active={viewModel.filters.progress === 'not_started'}
            href={buildFilterHref({ filters: viewModel.filters, overrides: { progress: 'not_started' } })}
            label="Not started"
          />
          <FilterChip
            active={viewModel.filters.progress === 'in_progress'}
            href={buildFilterHref({ filters: viewModel.filters, overrides: { progress: 'in_progress' } })}
            label="In progress"
          />
          <FilterChip
            active={viewModel.filters.progress === 'completed'}
            href={buildFilterHref({ filters: viewModel.filters, overrides: { progress: 'completed' } })}
            label="Completed"
          />
        </div>
      </section>

      <section className="sonartra-section">
        <SectionHeader
          eyebrow="Users"
          title="Current assessment position"
          description="Derived from the deterministic assignment timeline."
        />

        {!viewModel.hasUsers ? (
          <EmptyState
            title="No registered users yet"
            description="Internal users will appear here once the app has resolved authenticated identities."
          />
        ) : viewModel.items.length === 0 ? (
          <EmptyState
            title="No users match the current filters"
            description="Try a broader search or reset the filters."
            action={<ButtonLink href={buildUsersResetHref()}>Reset filters</ButtonLink>}
          />
        ) : (
          <UsersTable
            hasOrganisationColumn={viewModel.hasOrganisationColumn}
            items={viewModel.items}
          />
        )}
      </section>
    </PageFrame>
  );
}
