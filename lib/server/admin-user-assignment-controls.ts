'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  type AdminAssignmentCreateFormState,
  type AdminAssignmentCreateValues,
  type AdminAssignmentMutationState,
  initialAdminAssignmentMutationState,
  validateAdminAssignmentCreateValues,
} from '@/lib/admin/admin-user-assignment-controls';
import { requireAdminUser } from '@/lib/server/admin-access';
import { getDbPool } from '@/lib/server/db';

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

type TransactionClient = Queryable & {
  release(): void;
};

type DbPoolLike = {
  connect(): Promise<TransactionClient>;
};

type AssignmentControlsDependencies = {
  getDbPool(): DbPoolLike;
  revalidatePath(path: string): void;
  redirect(path: string): never;
  requireAdminUser(): Promise<unknown>;
};

type StoredAssignment = {
  id: string;
  user_id: string;
  assessment_id: string;
  assessment_version_id: string;
  status: 'not_assigned' | 'assigned' | 'in_progress' | 'completed';
  order_index: number;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  attempt_id: string | null;
  result_id: string | null;
};

type PublishedVersionRecord = {
  assessment_id: string;
  assessment_version_id: string;
};

type UserRecord = {
  id: string;
};

type ReorderDirection = 'up' | 'down';

const TEMP_ORDER_OFFSET = 1000000;
const CREATE_ASSIGNMENT_GENERIC_ERROR =
  'The assignment could not be created. Review the selection and try again.';
const MUTATION_GENERIC_ERROR =
  'The assignment change could not be completed. Review the record and try again.';

class AssignmentMutationError extends Error {
  readonly code:
    | 'USER_NOT_FOUND'
    | 'ASSESSMENT_VERSION_NOT_PUBLISHED'
    | 'DUPLICATE_ASSIGNMENT_VERSION'
    | 'INVALID_TARGET_ORDER'
    | 'ASSIGNMENT_NOT_FOUND'
    | 'ASSIGNMENT_NOT_EDITABLE'
    | 'INVALID_REORDER_DIRECTION';

  constructor(
    code:
      | 'USER_NOT_FOUND'
      | 'ASSESSMENT_VERSION_NOT_PUBLISHED'
      | 'DUPLICATE_ASSIGNMENT_VERSION'
      | 'INVALID_TARGET_ORDER'
      | 'ASSIGNMENT_NOT_FOUND'
      | 'ASSIGNMENT_NOT_EDITABLE'
      | 'INVALID_REORDER_DIRECTION',
  ) {
    super(code);
    this.name = 'AssignmentMutationError';
    this.code = code;
  }
}

function normalizeFormValue(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseOrderIndex(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  return Number(value);
}

function isEditableAssignment(assignment: StoredAssignment): boolean {
  return (
    assignment.status === 'assigned' &&
    assignment.attempt_id === null &&
    assignment.started_at === null &&
    assignment.completed_at === null &&
    assignment.result_id === null
  );
}

function getEditableStartIndex(assignments: readonly StoredAssignment[]): number {
  let lastLockedIndex = -1;

  assignments.forEach((assignment, index) => {
    if (!isEditableAssignment(assignment)) {
      lastLockedIndex = index;
    }
  });

  return Math.max(lastLockedIndex + 1, 0);
}

async function assertUserExists(db: Queryable, userId: string): Promise<void> {
  const result = await db.query<UserRecord>(
    `
    SELECT id
    FROM users
    WHERE id = $1::uuid
    `,
    [userId],
  );

  if (!result.rows[0]) {
    throw new AssignmentMutationError('USER_NOT_FOUND');
  }
}

async function loadUserAssignmentsForUpdate(
  db: Queryable,
  userId: string,
): Promise<readonly StoredAssignment[]> {
  const result = await db.query<StoredAssignment>(
    `
    SELECT
      ua.id::text AS id,
      ua.user_id::text AS user_id,
      ua.assessment_id::text AS assessment_id,
      ua.assessment_version_id::text AS assessment_version_id,
      ua.status,
      ua.order_index,
      ua.assigned_at,
      ua.started_at,
      ua.completed_at,
      ua.attempt_id::text AS attempt_id,
      r.id::text AS result_id
    FROM user_assessment_assignments ua
    LEFT JOIN results r ON r.attempt_id = ua.attempt_id
    WHERE ua.user_id = $1::uuid
    ORDER BY ua.order_index ASC, ua.id ASC
    FOR UPDATE
    `,
    [userId],
  );

  return Object.freeze(result.rows);
}

async function loadPublishedVersion(
  db: Queryable,
  assessmentId: string,
  assessmentVersionId: string,
): Promise<PublishedVersionRecord> {
  const result = await db.query<PublishedVersionRecord>(
    `
    SELECT
      a.id::text AS assessment_id,
      av.id::text AS assessment_version_id
    FROM assessments a
    INNER JOIN assessment_versions av ON av.assessment_id = a.id
    WHERE a.id = $1::uuid
      AND av.id = $2::uuid
      AND av.lifecycle_status = 'PUBLISHED'
    `,
    [assessmentId, assessmentVersionId],
  );

  const record = result.rows[0];
  if (!record) {
    throw new AssignmentMutationError('ASSESSMENT_VERSION_NOT_PUBLISHED');
  }

  return record;
}

async function moveUserAssignmentsToTemporaryRange(
  db: Queryable,
  userId: string,
): Promise<void> {
  await db.query(
    `
    UPDATE user_assessment_assignments
    SET
      order_index = order_index + $2,
      updated_at = NOW()
    WHERE user_id = $1::uuid
    `,
    [userId, TEMP_ORDER_OFFSET],
  );
}

async function applyFinalOrderIndexes(
  db: Queryable,
  orderedAssignmentIds: readonly string[],
): Promise<void> {
  for (let index = 0; index < orderedAssignmentIds.length; index += 1) {
    await db.query(
      `
      UPDATE user_assessment_assignments
      SET
        order_index = $2,
        updated_at = NOW()
      WHERE id = $1::uuid
      `,
      [orderedAssignmentIds[index], index],
    );
  }
}

export async function createAdminUserAssignmentRecord(params: {
  db: Queryable;
  userId: string;
  assessmentId: string;
  assessmentVersionId: string;
  targetOrderIndex: number;
}): Promise<void> {
  await assertUserExists(params.db, params.userId);
  await loadPublishedVersion(params.db, params.assessmentId, params.assessmentVersionId);

  const assignments = await loadUserAssignmentsForUpdate(params.db, params.userId);
  const editableStartIndex = getEditableStartIndex(assignments);

  if (
    params.targetOrderIndex < editableStartIndex ||
    params.targetOrderIndex > assignments.length
  ) {
    throw new AssignmentMutationError('INVALID_TARGET_ORDER');
  }

  if (
    assignments.some(
      (assignment) => assignment.assessment_version_id === params.assessmentVersionId,
    )
  ) {
    throw new AssignmentMutationError('DUPLICATE_ASSIGNMENT_VERSION');
  }

  await moveUserAssignmentsToTemporaryRange(params.db, params.userId);

  const insertResult = await params.db.query<{ id: string }>(
    `
    INSERT INTO user_assessment_assignments (
      user_id,
      assessment_id,
      assessment_version_id,
      status,
      order_index,
      assigned_at
    )
    VALUES ($1::uuid, $2::uuid, $3::uuid, 'assigned', $4, NOW())
    RETURNING id::text AS id
    `,
    [
      params.userId,
      params.assessmentId,
      params.assessmentVersionId,
      TEMP_ORDER_OFFSET * 2,
    ],
  );

  const insertedId = insertResult.rows[0]?.id;
  if (!insertedId) {
    throw new Error('ASSIGNMENT_INSERT_FAILED');
  }

  const orderedIds = assignments.map((assignment) => assignment.id);
  orderedIds.splice(params.targetOrderIndex, 0, insertedId);
  await applyFinalOrderIndexes(params.db, orderedIds);
}

export async function reorderAdminUserAssignmentRecord(params: {
  db: Queryable;
  userId: string;
  assignmentId: string;
  direction: ReorderDirection;
}): Promise<void> {
  const assignments = await loadUserAssignmentsForUpdate(params.db, params.userId);
  const assignmentIndex = assignments.findIndex((assignment) => assignment.id === params.assignmentId);

  if (assignmentIndex < 0) {
    throw new AssignmentMutationError('ASSIGNMENT_NOT_FOUND');
  }

  const editableStartIndex = getEditableStartIndex(assignments);
  const assignment = assignments[assignmentIndex];

  if (!assignment || !isEditableAssignment(assignment) || assignmentIndex < editableStartIndex) {
    throw new AssignmentMutationError('ASSIGNMENT_NOT_EDITABLE');
  }

  const targetIndex =
    params.direction === 'up'
      ? assignmentIndex - 1
      : params.direction === 'down'
        ? assignmentIndex + 1
        : -1;

  if (
    targetIndex < editableStartIndex ||
    targetIndex >= assignments.length ||
    !isEditableAssignment(assignments[targetIndex] as StoredAssignment)
  ) {
    throw new AssignmentMutationError('INVALID_REORDER_DIRECTION');
  }

  const orderedIds = assignments.map((item) => item.id);
  const [movedId] = orderedIds.splice(assignmentIndex, 1);
  orderedIds.splice(targetIndex, 0, movedId as string);

  await moveUserAssignmentsToTemporaryRange(params.db, params.userId);
  await applyFinalOrderIndexes(params.db, orderedIds);
}

export async function removeAdminUserAssignmentRecord(params: {
  db: Queryable;
  userId: string;
  assignmentId: string;
}): Promise<void> {
  const assignments = await loadUserAssignmentsForUpdate(params.db, params.userId);
  const assignmentIndex = assignments.findIndex((assignment) => assignment.id === params.assignmentId);

  if (assignmentIndex < 0) {
    throw new AssignmentMutationError('ASSIGNMENT_NOT_FOUND');
  }

  const editableStartIndex = getEditableStartIndex(assignments);
  const assignment = assignments[assignmentIndex];

  if (!assignment || !isEditableAssignment(assignment) || assignmentIndex < editableStartIndex) {
    throw new AssignmentMutationError('ASSIGNMENT_NOT_EDITABLE');
  }

  await params.db.query(
    `
    DELETE FROM user_assessment_assignments
    WHERE id = $1::uuid
      AND user_id = $2::uuid
    `,
    [params.assignmentId, params.userId],
  );

  const orderedIds = assignments
    .filter((item) => item.id !== params.assignmentId)
    .map((item) => item.id);

  if (orderedIds.length === 0) {
    return;
  }

  await moveUserAssignmentsToTemporaryRange(params.db, params.userId);
  await applyFinalOrderIndexes(params.db, orderedIds);
}

function toCreateErrorState(
  values: AdminAssignmentCreateValues,
  code: AssignmentMutationError['code'] | null,
): AdminAssignmentCreateFormState {
  if (code === 'ASSESSMENT_VERSION_NOT_PUBLISHED') {
    return {
      formError: 'Select a published assessment version before assigning it.',
      fieldErrors: {},
      values,
    };
  }

  if (code === 'DUPLICATE_ASSIGNMENT_VERSION') {
    return {
      formError: 'This published assessment version is already in the user sequence.',
      fieldErrors: {},
      values,
    };
  }

  if (code === 'INVALID_TARGET_ORDER') {
    return {
      formError: 'New assignments can only be inserted inside the editable suffix of the sequence.',
      fieldErrors: {},
      values,
    };
  }

  if (code === 'USER_NOT_FOUND') {
    return {
      formError: 'The selected user record could not be found.',
      fieldErrors: {},
      values,
    };
  }

  return {
    formError: CREATE_ASSIGNMENT_GENERIC_ERROR,
    fieldErrors: {},
    values,
  };
}

function toMutationErrorState(
  code: AssignmentMutationError['code'] | null,
): AdminAssignmentMutationState {
  if (code === 'ASSIGNMENT_NOT_EDITABLE') {
    return {
      formError: 'Only untouched assigned rows in the editable suffix can be changed.',
    };
  }

  if (code === 'INVALID_REORDER_DIRECTION') {
    return {
      formError: 'That move would cross the fixed historical sequence.',
    };
  }

  if (code === 'ASSIGNMENT_NOT_FOUND') {
    return {
      formError: 'The selected assignment record could not be found.',
    };
  }

  return {
    formError: MUTATION_GENERIC_ERROR,
  };
}

function logAssignmentMutationFailure(scope: string, error: unknown, metadata: Record<string, unknown>): void {
  console.error(`[admin-user-assignment-controls] ${scope} failed`, {
    ...metadata,
    message: error instanceof Error ? error.message : String(error),
  });
}

async function runAssignmentMutation<T>(params: {
  dependencies: AssignmentControlsDependencies;
  mutate(db: TransactionClient): Promise<T>;
}): Promise<T> {
  await params.dependencies.requireAdminUser();

  const client = await params.dependencies.getDbPool().connect();

  try {
    await client.query('BEGIN');
    const result = await params.mutate(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

function revalidateAdminUserPaths(
  dependencies: AssignmentControlsDependencies,
  userId: string,
): void {
  dependencies.revalidatePath('/admin/users');
  dependencies.revalidatePath(`/admin/users/${userId}`);
}

export async function createAdminUserAssignmentAction(
  previousState: AdminAssignmentCreateFormState,
  formData: FormData,
): Promise<AdminAssignmentCreateFormState> {
  return createAdminUserAssignmentActionWithDependencies(previousState, formData);
}

export async function createAdminUserAssignmentActionWithDependencies(
  _previousState: AdminAssignmentCreateFormState,
  formData: FormData,
  dependencies: AssignmentControlsDependencies = {
    getDbPool,
    revalidatePath,
    redirect,
    requireAdminUser,
  },
): Promise<AdminAssignmentCreateFormState> {
  const values: AdminAssignmentCreateValues = {
    userId: normalizeFormValue(formData.get('userId')),
    assessmentId: normalizeFormValue(formData.get('assessmentId')),
    assessmentVersionId: normalizeFormValue(formData.get('assessmentVersionId')),
    targetOrderIndex: normalizeFormValue(formData.get('targetOrderIndex')),
  };

  const validation = validateAdminAssignmentCreateValues(values);
  if (Object.keys(validation.fieldErrors).length > 0) {
    return validation;
  }

  const parsedTargetOrderIndex = parseOrderIndex(values.targetOrderIndex);
  if (parsedTargetOrderIndex === null) {
    return {
      formError: null,
      fieldErrors: {
        targetOrderIndex: 'Sequence position must be a whole number.',
      },
      values,
    };
  }

  try {
    await runAssignmentMutation({
      dependencies,
      async mutate(db) {
        await createAdminUserAssignmentRecord({
          db,
          userId: values.userId,
          assessmentId: values.assessmentId,
          assessmentVersionId: values.assessmentVersionId,
          targetOrderIndex: parsedTargetOrderIndex,
        });
      },
    });
  } catch (error) {
    const code = error instanceof AssignmentMutationError ? error.code : null;

    logAssignmentMutationFailure('create', error, {
      userId: values.userId,
      assessmentId: values.assessmentId,
      assessmentVersionId: values.assessmentVersionId,
      targetOrderIndex: values.targetOrderIndex,
    });

    return toCreateErrorState(values, code);
  }

  revalidateAdminUserPaths(dependencies, values.userId);
  dependencies.redirect(`/admin/users/${values.userId}`);
}

export async function reorderAdminUserAssignmentAction(
  previousState: AdminAssignmentMutationState,
  formData: FormData,
): Promise<AdminAssignmentMutationState> {
  return reorderAdminUserAssignmentActionWithDependencies(previousState, formData);
}

export async function reorderAdminUserAssignmentActionWithDependencies(
  _previousState: AdminAssignmentMutationState,
  formData: FormData,
  dependencies: AssignmentControlsDependencies = {
    getDbPool,
    revalidatePath,
    redirect,
    requireAdminUser,
  },
): Promise<AdminAssignmentMutationState> {
  const userId = normalizeFormValue(formData.get('userId'));
  const assignmentId = normalizeFormValue(formData.get('assignmentId'));
  const direction = normalizeFormValue(formData.get('direction')) as ReorderDirection;

  try {
    await runAssignmentMutation({
      dependencies,
      async mutate(db) {
        await reorderAdminUserAssignmentRecord({
          db,
          userId,
          assignmentId,
          direction,
        });
      },
    });
  } catch (error) {
    const code = error instanceof AssignmentMutationError ? error.code : null;

    logAssignmentMutationFailure('reorder', error, {
      userId,
      assignmentId,
      direction,
    });

    return toMutationErrorState(code);
  }

  revalidateAdminUserPaths(dependencies, userId);
  dependencies.redirect(`/admin/users/${userId}`);
}

export async function removeAdminUserAssignmentAction(
  previousState: AdminAssignmentMutationState,
  formData: FormData,
): Promise<AdminAssignmentMutationState> {
  return removeAdminUserAssignmentActionWithDependencies(previousState, formData);
}

export async function removeAdminUserAssignmentActionWithDependencies(
  _previousState: AdminAssignmentMutationState = initialAdminAssignmentMutationState,
  formData: FormData,
  dependencies: AssignmentControlsDependencies = {
    getDbPool,
    revalidatePath,
    redirect,
    requireAdminUser,
  },
): Promise<AdminAssignmentMutationState> {
  const userId = normalizeFormValue(formData.get('userId'));
  const assignmentId = normalizeFormValue(formData.get('assignmentId'));

  try {
    await runAssignmentMutation({
      dependencies,
      async mutate(db) {
        await removeAdminUserAssignmentRecord({
          db,
          userId,
          assignmentId,
        });
      },
    });
  } catch (error) {
    const code = error instanceof AssignmentMutationError ? error.code : null;

    logAssignmentMutationFailure('remove', error, {
      userId,
      assignmentId,
    });

    return toMutationErrorState(code);
  }

  revalidateAdminUserPaths(dependencies, userId);
  dependencies.redirect(`/admin/users/${userId}`);
}
