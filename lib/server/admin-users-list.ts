import type { Queryable } from '@/lib/engine/repository-sql';

export type AdminUsersProgressState = 'not_started' | 'in_progress' | 'completed';
export type AdminUsersStatusFilter = 'all' | 'active' | 'invited' | 'disabled';
export type AdminUsersProgressFilter = 'all' | AdminUsersProgressState;

export type AdminUsersListFilters = {
  query: string;
  status: AdminUsersStatusFilter;
  progress: AdminUsersProgressFilter;
};

export type AdminUsersListSearchParams = Record<string, string | string[] | undefined>;

export type AdminUsersListItemViewModel = {
  id: string;
  name: string;
  email: string;
  organisationName: string | null;
  userStatus: 'active' | 'invited' | 'disabled';
  userStatusLabel: 'Active' | 'Invited' | 'Disabled';
  currentAssessmentLabel: string | null;
  progressState: AdminUsersProgressState;
  progressStateLabel: 'Not started' | 'In progress' | 'Completed';
  lastActivityAt: string | null;
  lastActivityLabel: string;
  nextAssessmentLabel: string | null;
  detailHref: string;
};

export type AdminUsersListPageViewModel = {
  filters: AdminUsersListFilters;
  totalUsers: number;
  filteredUsers: number;
  hasUsers: boolean;
  hasOrganisationColumn: boolean;
  items: readonly AdminUsersListItemViewModel[];
};

type AdminUsersListRow = {
  user_id: string;
  user_name: string | null;
  user_email: string;
  user_status: 'active' | 'invited' | 'disabled';
  organisation_id: string | null;
  assignment_id: string | null;
  assignment_status: 'not_assigned' | 'assigned' | 'in_progress' | 'completed' | null;
  assignment_order_index: number | null;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  assignment_updated_at: string | null;
  attempt_last_activity_at: string | null;
  attempt_updated_at: string | null;
  attempt_created_at: string | null;
  result_generated_at: string | null;
  result_created_at: string | null;
  assessment_title: string | null;
};

type AdminUserAssignmentProjection = {
  assignmentId: string;
  status: 'not_assigned' | 'assigned' | 'in_progress' | 'completed';
  orderIndex: number;
  assessmentTitle: string;
  lastActivityAt: string | null;
};

type AdminUserProjectionSeed = {
  id: string;
  name: string;
  email: string;
  organisationName: string | null;
  userStatus: 'active' | 'invited' | 'disabled';
  assignments: AdminUserAssignmentProjection[];
};

function normalizeText(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' ? raw.trim() : '';
}

function isStatusFilter(value: string): value is AdminUsersStatusFilter {
  return value === 'all' || value === 'active' || value === 'invited' || value === 'disabled';
}

function isProgressFilter(value: string): value is AdminUsersProgressFilter {
  return value === 'all' || value === 'not_started' || value === 'in_progress' || value === 'completed';
}

export function parseAdminUsersListFilters(
  searchParams: AdminUsersListSearchParams | undefined,
): AdminUsersListFilters {
  const query = normalizeText(searchParams?.q);
  const rawStatus = normalizeText(searchParams?.status).toLowerCase();
  const rawProgress = normalizeText(searchParams?.progress).toLowerCase();

  return {
    query,
    status: isStatusFilter(rawStatus) ? rawStatus : 'all',
    progress: isProgressFilter(rawProgress) ? rawProgress : 'all',
  };
}

function toTimestamp(value: string | null): number {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function getLatestTimestamp(values: Array<string | null>): string | null {
  let latest: string | null = null;

  for (const value of values) {
    if (!value) {
      continue;
    }

    if (!latest || toTimestamp(value) > toTimestamp(latest)) {
      latest = value;
    }
  }

  return latest;
}

function formatLastActivityLabel(value: string | null): string {
  if (!value) {
    return 'No activity yet';
  }

  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getUserStatusLabel(
  status: AdminUsersListItemViewModel['userStatus'],
): AdminUsersListItemViewModel['userStatusLabel'] {
  switch (status) {
    case 'active':
      return 'Active';
    case 'invited':
      return 'Invited';
    case 'disabled':
      return 'Disabled';
  }
}

function getProgressStateLabel(
  progressState: AdminUsersProgressState,
): AdminUsersListItemViewModel['progressStateLabel'] {
  switch (progressState) {
    case 'not_started':
      return 'Not started';
    case 'in_progress':
      return 'In progress';
    case 'completed':
      return 'Completed';
  }
}

function compareAssignments(left: AdminUserAssignmentProjection, right: AdminUserAssignmentProjection): number {
  if (left.orderIndex !== right.orderIndex) {
    return left.orderIndex - right.orderIndex;
  }

  return left.assignmentId.localeCompare(right.assignmentId);
}

function compareUsers(left: AdminUsersListItemViewModel, right: AdminUsersListItemViewModel): number {
  const nameComparison = left.name.localeCompare(right.name, 'en', { sensitivity: 'base' });
  if (nameComparison !== 0) {
    return nameComparison;
  }

  return left.email.localeCompare(right.email, 'en', { sensitivity: 'base' });
}

function mapProgressState(
  assignments: readonly AdminUserAssignmentProjection[],
  currentAssignment: AdminUserAssignmentProjection | null,
): AdminUsersProgressState {
  if (assignments.length === 0) {
    return 'not_started';
  }

  if (!currentAssignment) {
    return 'completed';
  }

  return currentAssignment.status === 'in_progress' ? 'in_progress' : 'not_started';
}

function matchesQuery(item: AdminUsersListItemViewModel, query: string): boolean {
  if (query.length === 0) {
    return true;
  }

  const normalizedQuery = query.toLocaleLowerCase();
  return (
    item.name.toLocaleLowerCase().includes(normalizedQuery) ||
    item.email.toLocaleLowerCase().includes(normalizedQuery)
  );
}

function matchesFilters(
  item: AdminUsersListItemViewModel,
  filters: AdminUsersListFilters,
): boolean {
  if (!matchesQuery(item, filters.query)) {
    return false;
  }

  if (filters.status !== 'all' && item.userStatus !== filters.status) {
    return false;
  }

  if (filters.progress !== 'all' && item.progressState !== filters.progress) {
    return false;
  }

  return true;
}

function mapAdminUsersListItem(seed: AdminUserProjectionSeed): AdminUsersListItemViewModel {
  const assignments = [...seed.assignments].sort(compareAssignments);
  const currentAssignment = assignments.find((assignment) => assignment.status !== 'completed') ?? null;
  const nextAssessment =
    currentAssignment
      ? assignments.find((assignment) => assignment.orderIndex > currentAssignment.orderIndex) ?? null
      : null;
  const progressState = mapProgressState(assignments, currentAssignment);
  const lastActivityAt = getLatestTimestamp(assignments.map((assignment) => assignment.lastActivityAt));

  return {
    id: seed.id,
    name: seed.name,
    email: seed.email,
    organisationName: seed.organisationName,
    userStatus: seed.userStatus,
    userStatusLabel: getUserStatusLabel(seed.userStatus),
    currentAssessmentLabel: currentAssignment?.assessmentTitle ?? null,
    progressState,
    progressStateLabel: getProgressStateLabel(progressState),
    lastActivityAt,
    lastActivityLabel: formatLastActivityLabel(lastActivityAt),
    nextAssessmentLabel: nextAssessment?.assessmentTitle ?? null,
    detailHref: `/admin/users/${seed.id}`,
  };
}

export function projectAdminUsersListViewModel(params: {
  rows: readonly AdminUsersListRow[];
  filters: AdminUsersListFilters;
}): AdminUsersListPageViewModel {
  const groupedUsers = new Map<string, AdminUserProjectionSeed>();

  for (const row of params.rows) {
    const existing =
      groupedUsers.get(row.user_id) ??
      {
        id: row.user_id,
        name: row.user_name?.trim() || row.user_email,
        email: row.user_email,
        organisationName: null,
        userStatus: row.user_status,
        assignments: [],
      };

    if (row.assignment_id && row.assignment_status && row.assignment_order_index !== null && row.assessment_title) {
      existing.assignments.push({
        assignmentId: row.assignment_id,
        status: row.assignment_status,
        orderIndex: row.assignment_order_index,
        assessmentTitle: row.assessment_title,
        lastActivityAt: getLatestTimestamp([
          row.completed_at,
          row.result_generated_at,
          row.result_created_at,
          row.attempt_last_activity_at,
          row.started_at,
          row.assigned_at,
          row.attempt_updated_at,
          row.attempt_created_at,
          row.assignment_updated_at,
        ]),
      });
    }

    groupedUsers.set(row.user_id, existing);
  }

  const allItems = Array.from(groupedUsers.values()).map(mapAdminUsersListItem).sort(compareUsers);
  const filteredItems = allItems.filter((item) => matchesFilters(item, params.filters));
  const hasOrganisationColumn = filteredItems.some((item) => item.organisationName !== null);

  return {
    filters: params.filters,
    totalUsers: allItems.length,
    filteredUsers: filteredItems.length,
    hasUsers: allItems.length > 0,
    hasOrganisationColumn,
    items: Object.freeze(filteredItems),
  };
}

async function listAdminUsersListRows(db: Queryable): Promise<readonly AdminUsersListRow[]> {
  const result = await db.query<AdminUsersListRow>(
    `
    SELECT
      u.id AS user_id,
      u.name AS user_name,
      u.email AS user_email,
      u.status AS user_status,
      u.organisation_id::text AS organisation_id,
      ua.id AS assignment_id,
      ua.status AS assignment_status,
      ua.order_index AS assignment_order_index,
      ua.assigned_at,
      ua.started_at,
      ua.completed_at,
      ua.updated_at AS assignment_updated_at,
      a.last_activity_at AS attempt_last_activity_at,
      a.updated_at AS attempt_updated_at,
      a.created_at AS attempt_created_at,
      r.generated_at AS result_generated_at,
      r.created_at AS result_created_at,
      ass.title AS assessment_title
    FROM users u
    LEFT JOIN user_assessment_assignments ua ON ua.user_id = u.id
    LEFT JOIN assessments ass ON ass.id = ua.assessment_id
    LEFT JOIN attempts a ON a.id = ua.attempt_id
    LEFT JOIN results r ON r.attempt_id = a.id
    ORDER BY
      COALESCE(NULLIF(TRIM(u.name), ''), u.email) ASC,
      u.email ASC,
      ua.order_index ASC NULLS LAST,
      ua.created_at ASC NULLS LAST,
      ua.id ASC NULLS LAST
    `,
  );

  return Object.freeze(result.rows);
}

export async function buildAdminUsersListPageViewModel(params: {
  db: Queryable;
  searchParams?: AdminUsersListSearchParams;
}): Promise<AdminUsersListPageViewModel> {
  const filters = parseAdminUsersListFilters(params.searchParams);
  const rows = await listAdminUsersListRows(params.db);

  return projectAdminUsersListViewModel({
    rows,
    filters,
  });
}
