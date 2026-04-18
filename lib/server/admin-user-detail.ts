import type { Queryable } from '@/lib/engine/repository-sql';
import { getAssessmentResultHref } from '@/lib/utils/assessment-mode';

export type AdminUserDetailAssignmentViewModel = {
  id: string;
  assessmentLabel: string;
  status: 'not_assigned' | 'assigned' | 'in_progress' | 'completed';
  statusLabel: 'Not assigned' | 'Assigned' | 'In progress' | 'Completed';
  orderIndex: number;
  orderLabel: string;
  assignedAtLabel: string | null;
  startedAtLabel: string | null;
  completedAtLabel: string | null;
  resultHref: string | null;
};

export type AdminUserDetailViewModel = {
  id: string;
  name: string;
  email: string;
  organisationName: string | null;
  userStatus: 'active' | 'invited' | 'disabled';
  userStatusLabel: 'Active' | 'Invited' | 'Disabled';
  role: 'admin' | 'user';
  roleLabel: 'Admin' | 'User';
  createdAtDisplay: string;
  currentStateLabel: string;
  currentAssessmentLabel: string | null;
  nextAssessmentLabel: string | null;
  lastActivityLabel: string;
  assignments: readonly AdminUserDetailAssignmentViewModel[];
};

type AdminUserDetailRow = {
  user_id: string;
  user_name: string | null;
  user_email: string;
  user_status: 'active' | 'invited' | 'disabled';
  user_role: 'admin' | 'user';
  user_created_at: string;
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
  result_id: string | null;
  result_generated_at: string | null;
  result_created_at: string | null;
  assessment_title: string | null;
  assessment_mode: string | null;
};

type AdminUserDetailAssignmentSeed = {
  id: string;
  assessmentLabel: string;
  status: 'not_assigned' | 'assigned' | 'in_progress' | 'completed';
  orderIndex: number;
  assignedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  resultId: string | null;
  assessmentMode: string | null;
  lastActivityAt: string | null;
};

type AdminUserDetailSeed = {
  id: string;
  name: string;
  email: string;
  organisationName: string | null;
  userStatus: 'active' | 'invited' | 'disabled';
  role: 'admin' | 'user';
  createdAt: string;
  assignments: AdminUserDetailAssignmentSeed[];
};

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

function formatDisplayDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatRequiredDisplayDate(value: string): string {
  return formatDisplayDate(value) ?? 'Unknown';
}

function formatLastActivityLabel(value: string | null): string {
  return formatDisplayDate(value) ?? 'No activity yet';
}

function getUserStatusLabel(
  status: AdminUserDetailViewModel['userStatus'],
): AdminUserDetailViewModel['userStatusLabel'] {
  switch (status) {
    case 'active':
      return 'Active';
    case 'invited':
      return 'Invited';
    case 'disabled':
      return 'Disabled';
  }
}

function getRoleLabel(role: AdminUserDetailViewModel['role']): AdminUserDetailViewModel['roleLabel'] {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'user':
      return 'User';
  }
}

function getAssignmentStatusLabel(
  status: AdminUserDetailAssignmentViewModel['status'],
): AdminUserDetailAssignmentViewModel['statusLabel'] {
  switch (status) {
    case 'not_assigned':
      return 'Not assigned';
    case 'assigned':
      return 'Assigned';
    case 'in_progress':
      return 'In progress';
    case 'completed':
      return 'Completed';
  }
}

function compareAssignments(left: AdminUserDetailAssignmentSeed, right: AdminUserDetailAssignmentSeed): number {
  if (left.orderIndex !== right.orderIndex) {
    return left.orderIndex - right.orderIndex;
  }

  return left.id.localeCompare(right.id);
}

function buildCurrentStateLabel(assignments: readonly AdminUserDetailAssignmentSeed[]): string {
  if (assignments.length === 0) {
    return 'No assessments assigned';
  }

  const currentAssignment = assignments.find((assignment) => assignment.status !== 'completed');
  if (currentAssignment) {
    return `${currentAssignment.assessmentLabel} - ${getAssignmentStatusLabel(currentAssignment.status)}`;
  }

  const lastCompletedAssignment = assignments[assignments.length - 1];
  return `${lastCompletedAssignment?.assessmentLabel ?? 'Latest assessment'} - Completed`;
}

function mapAdminUserDetailViewModel(seed: AdminUserDetailSeed): AdminUserDetailViewModel {
  const assignments = [...seed.assignments].sort(compareAssignments);
  const currentAssignment = assignments.find((assignment) => assignment.status !== 'completed') ?? null;
  const nextAssignment =
    currentAssignment
      ? assignments.find((assignment) => assignment.orderIndex > currentAssignment.orderIndex) ?? null
      : null;
  const lastActivityAt = getLatestTimestamp(assignments.map((assignment) => assignment.lastActivityAt));

  return {
    id: seed.id,
    name: seed.name,
    email: seed.email,
    organisationName: seed.organisationName,
    userStatus: seed.userStatus,
    userStatusLabel: getUserStatusLabel(seed.userStatus),
    role: seed.role,
    roleLabel: getRoleLabel(seed.role),
    createdAtDisplay: formatRequiredDisplayDate(seed.createdAt),
    currentStateLabel: buildCurrentStateLabel(assignments),
    currentAssessmentLabel: currentAssignment?.assessmentLabel ?? null,
    nextAssessmentLabel: nextAssignment?.assessmentLabel ?? null,
    lastActivityLabel: formatLastActivityLabel(lastActivityAt),
    assignments: Object.freeze(
      assignments.map((assignment) => ({
        id: assignment.id,
        assessmentLabel: assignment.assessmentLabel,
        status: assignment.status,
        statusLabel: getAssignmentStatusLabel(assignment.status),
        orderIndex: assignment.orderIndex,
        orderLabel: `Step ${assignment.orderIndex + 1}`,
        assignedAtLabel: formatDisplayDate(assignment.assignedAt),
        startedAtLabel: formatDisplayDate(assignment.startedAt),
        completedAtLabel: formatDisplayDate(assignment.completedAt),
        resultHref: assignment.resultId
          ? getAssessmentResultHref(assignment.resultId, assignment.assessmentMode)
          : null,
      })),
    ),
  };
}

export function projectAdminUserDetailViewModel(
  rows: readonly AdminUserDetailRow[],
): AdminUserDetailViewModel | null {
  const firstRow = rows[0];
  if (!firstRow) {
    return null;
  }

  const seed: AdminUserDetailSeed = {
    id: firstRow.user_id,
    name: firstRow.user_name?.trim() || firstRow.user_email,
    email: firstRow.user_email,
    organisationName: null,
    userStatus: firstRow.user_status,
    role: firstRow.user_role,
    createdAt: firstRow.user_created_at,
    assignments: [],
  };

  for (const row of rows) {
    if (!row.assignment_id || !row.assignment_status || row.assignment_order_index === null || !row.assessment_title) {
      continue;
    }

    seed.assignments.push({
      id: row.assignment_id,
      assessmentLabel: row.assessment_title,
      status: row.assignment_status,
      orderIndex: row.assignment_order_index,
      assignedAt: row.assigned_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      resultId: row.result_id,
      assessmentMode: row.assessment_mode,
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

  return mapAdminUserDetailViewModel(seed);
}

async function getAdminUserDetailRows(
  db: Queryable,
  userId: string,
): Promise<readonly AdminUserDetailRow[]> {
  const result = await db.query<AdminUserDetailRow>(
    `
    SELECT
      u.id AS user_id,
      u.name AS user_name,
      u.email AS user_email,
      u.status AS user_status,
      u.role AS user_role,
      u.created_at AS user_created_at,
      u.organisation_id::text AS organisation_id,
      ua.id AS assignment_id,
      ua.status AS assignment_status,
      ua.order_index AS assignment_order_index,
      ua.assigned_at,
      ua.started_at,
      ua.completed_at,
      ua.updated_at AS assignment_updated_at,
      at.last_activity_at AS attempt_last_activity_at,
      at.updated_at AS attempt_updated_at,
      at.created_at AS attempt_created_at,
      r.id AS result_id,
      r.generated_at AS result_generated_at,
      r.created_at AS result_created_at,
      ass.title AS assessment_title,
      COALESCE(av.mode, ass.mode) AS assessment_mode
    FROM users u
    LEFT JOIN user_assessment_assignments ua ON ua.user_id = u.id
    LEFT JOIN assessments ass ON ass.id = ua.assessment_id
    LEFT JOIN assessment_versions av ON av.id = ua.assessment_version_id
    LEFT JOIN attempts at ON at.id = ua.attempt_id
    LEFT JOIN results r ON r.attempt_id = at.id
    WHERE u.id = $1::uuid
    ORDER BY
      ua.order_index ASC NULLS LAST,
      ua.created_at ASC NULLS LAST,
      ua.id ASC NULLS LAST
    `,
    [userId],
  );

  return Object.freeze(result.rows);
}

export async function buildAdminUserDetailViewModel(params: {
  db: Queryable;
  userId: string;
}): Promise<AdminUserDetailViewModel | null> {
  const rows = await getAdminUserDetailRows(params.db, params.userId);
  return projectAdminUserDetailViewModel(rows);
}
