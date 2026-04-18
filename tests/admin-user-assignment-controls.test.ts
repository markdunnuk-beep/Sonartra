import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createAdminUserAssignmentActionWithDependencies,
  createAdminUserAssignmentRecord,
  removeAdminUserAssignmentRecord,
  reorderAdminUserAssignmentRecord,
} from '@/lib/server/admin-user-assignment-controls';
import { projectAdminUserDetailViewModel } from '@/lib/server/admin-user-detail';
import { initialAdminAssignmentCreateFormState } from '@/lib/admin/admin-user-assignment-controls';

type StoredAssignment = {
  id: string;
  userId: string;
  assessmentId: string;
  assessmentVersionId: string;
  status: 'assigned' | 'in_progress' | 'completed';
  orderIndex: number;
  assignedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  attemptId: string | null;
  resultId: string | null;
};

type FakeState = {
  users: { id: string }[];
  publishedVersions: { assessmentId: string; assessmentVersionId: string }[];
  assignments: StoredAssignment[];
};

function cloneState(state: FakeState): FakeState {
  return {
    users: state.users.map((user) => ({ ...user })),
    publishedVersions: state.publishedVersions.map((version) => ({ ...version })),
    assignments: state.assignments.map((assignment) => ({ ...assignment })),
  };
}

function createFakeDb(initialState: FakeState) {
  const state = cloneState(initialState);
  let snapshot: FakeState | null = null;
  let nextId = 100;

  const client = {
    async query<T>(sql: string, params: readonly unknown[] = []) {
      const text = sql.replace(/\s+/g, ' ').trim();

      if (text === 'BEGIN') {
        snapshot = cloneState(state);
        return { rows: [] as T[] };
      }

      if (text === 'COMMIT') {
        snapshot = null;
        return { rows: [] as T[] };
      }

      if (text === 'ROLLBACK') {
        if (snapshot) {
          state.users = snapshot.users;
          state.publishedVersions = snapshot.publishedVersions;
          state.assignments = snapshot.assignments;
        }

        snapshot = null;
        return { rows: [] as T[] };
      }

      if (text.includes('SELECT id FROM users')) {
        const user = state.users.find((item) => item.id === params[0]);
        return { rows: (user ? ([{ id: user.id }] as unknown as T[]) : ([] as T[])) };
      }

      if (
        text.includes('FROM assessments a INNER JOIN assessment_versions av ON av.assessment_id = a.id') &&
        text.includes("av.lifecycle_status = 'PUBLISHED'")
      ) {
        const record = state.publishedVersions.find(
          (item) => item.assessmentId === params[0] && item.assessmentVersionId === params[1],
        );

        return {
          rows: (record
            ? ([{ assessment_id: record.assessmentId, assessment_version_id: record.assessmentVersionId }] as unknown as T[])
            : ([] as T[])),
        };
      }

      if (
        text.includes('FROM user_assessment_assignments ua') &&
        text.includes('LEFT JOIN results r ON r.attempt_id = ua.attempt_id')
      ) {
        const rows = state.assignments
          .filter((assignment) => assignment.userId === params[0])
          .sort((left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id))
          .map((assignment) => ({
            id: assignment.id,
            user_id: assignment.userId,
            assessment_id: assignment.assessmentId,
            assessment_version_id: assignment.assessmentVersionId,
            status: assignment.status,
            order_index: assignment.orderIndex,
            assigned_at: assignment.assignedAt,
            started_at: assignment.startedAt,
            completed_at: assignment.completedAt,
            attempt_id: assignment.attemptId,
            result_id: assignment.resultId,
          }));

        return { rows: rows as unknown as T[] };
      }

      if (text.includes('SET order_index = order_index + $2')) {
        const userId = params[0] as string;
        const offset = Number(params[1]);

        state.assignments = state.assignments.map((assignment) =>
          assignment.userId === userId
            ? { ...assignment, orderIndex: assignment.orderIndex + offset }
            : assignment,
        );

        return { rows: [] as T[] };
      }

      if (text.includes('INSERT INTO user_assessment_assignments')) {
        const inserted = {
          id: `assignment-${nextId}`,
          userId: params[0] as string,
          assessmentId: params[1] as string,
          assessmentVersionId: params[2] as string,
          status: 'assigned' as const,
          orderIndex: Number(params[3]),
          assignedAt: '2026-04-18T09:00:00.000Z',
          startedAt: null,
          completedAt: null,
          attemptId: null,
          resultId: null,
        };

        nextId += 1;
        state.assignments.push(inserted);
        return { rows: ([{ id: inserted.id }] as unknown) as T[] };
      }

      if (text.includes('SET order_index = $2') && text.includes('WHERE id = $1::uuid')) {
        const assignmentId = params[0] as string;
        const orderIndex = Number(params[1]);

        state.assignments = state.assignments.map((assignment) =>
          assignment.id === assignmentId ? { ...assignment, orderIndex } : assignment,
        );

        return { rows: [] as T[] };
      }

      if (text.includes('DELETE FROM user_assessment_assignments')) {
        const assignmentId = params[0] as string;
        const userId = params[1] as string;
        state.assignments = state.assignments.filter(
          (assignment) => !(assignment.id === assignmentId && assignment.userId === userId),
        );
        return { rows: [] as T[] };
      }

      throw new Error(`Unhandled SQL: ${text}`);
    },
    release() {},
  };

  return {
    client,
    state,
  };
}

function buildDetailRows(state: FakeState) {
  const titles = new Map<string, string>([
    ['assessment-1', 'Foundations'],
    ['assessment-2', 'Leadership Signals'],
    ['assessment-3', 'Role Focus'],
    ['assessment-4', 'Execution Style'],
  ]);

  return state.assignments
    .sort((left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id))
    .map((assignment) => ({
      user_id: assignment.userId,
      user_name: 'Grace Hopper',
      user_email: 'grace@example.com',
      user_status: 'active' as const,
      user_role: 'admin' as const,
      user_created_at: '2026-04-01T09:00:00.000Z',
      organisation_id: null,
      assignment_id: assignment.id,
      assignment_status: assignment.status,
      assignment_order_index: assignment.orderIndex,
      assessment_version_id: assignment.assessmentVersionId,
      attempt_id: assignment.attemptId,
      assigned_at: assignment.assignedAt,
      started_at: assignment.startedAt,
      completed_at: assignment.completedAt,
      assignment_updated_at: assignment.completedAt ?? assignment.startedAt ?? assignment.assignedAt,
      attempt_last_activity_at: assignment.completedAt ?? assignment.startedAt,
      attempt_updated_at: assignment.completedAt ?? assignment.startedAt,
      attempt_created_at: assignment.startedAt,
      result_id: assignment.resultId,
      result_generated_at: assignment.completedAt,
      result_created_at: assignment.completedAt,
      assessment_title: titles.get(assignment.assessmentId) ?? assignment.assessmentId,
      assessment_mode: 'multi_domain',
    }));
}

test('admin can add a valid assignment and normalize order deterministically', async () => {
  const fake = createFakeDb({
    users: [{ id: 'user-1' }],
    publishedVersions: [
      { assessmentId: 'assessment-3', assessmentVersionId: 'version-3' },
    ],
    assignments: [
      {
        id: 'assignment-1',
        userId: 'user-1',
        assessmentId: 'assessment-1',
        assessmentVersionId: 'version-1',
        status: 'completed',
        orderIndex: 0,
        assignedAt: '2026-04-01T09:00:00.000Z',
        startedAt: '2026-04-01T09:05:00.000Z',
        completedAt: '2026-04-01T09:20:00.000Z',
        attemptId: 'attempt-1',
        resultId: 'result-1',
      },
      {
        id: 'assignment-2',
        userId: 'user-1',
        assessmentId: 'assessment-2',
        assessmentVersionId: 'version-2',
        status: 'assigned',
        orderIndex: 1,
        assignedAt: '2026-04-02T09:00:00.000Z',
        startedAt: null,
        completedAt: null,
        attemptId: null,
        resultId: null,
      },
    ],
  });

  await createAdminUserAssignmentRecord({
    db: fake.client,
    userId: 'user-1',
    assessmentId: 'assessment-3',
    assessmentVersionId: 'version-3',
    targetOrderIndex: 1,
  });

  assert.deepEqual(
    fake.state.assignments
      .sort((left, right) => left.orderIndex - right.orderIndex)
      .map((assignment) => [assignment.assessmentVersionId, assignment.orderIndex]),
    [
      ['version-1', 0],
      ['version-3', 1],
      ['version-2', 2],
    ],
  );
});

test('invalid assignment input is rejected safely before touching persistence', async () => {
  let connectCalls = 0;
  const formData = new FormData();
  formData.set('userId', 'user-1');
  formData.set('assessmentId', 'assessment-1');
  formData.set('assessmentVersionId', 'version-1');
  formData.set('targetOrderIndex', 'bad');

  const result = await createAdminUserAssignmentActionWithDependencies(
    initialAdminAssignmentCreateFormState,
    formData,
    {
      requireAdminUser: async () => undefined,
      getDbPool() {
        connectCalls += 1;
        throw new Error('should not connect');
      },
      revalidatePath() {},
      redirect() {
        throw new Error('should not redirect');
      },
    },
  );

  assert.equal(connectCalls, 0);
  assert.equal(result.fieldErrors.targetOrderIndex, 'Sequence position must be a whole number.');
});

test('order normalization and reordering work within the editable suffix only', async () => {
  const fake = createFakeDb({
    users: [{ id: 'user-1' }],
    publishedVersions: [],
    assignments: [
      {
        id: 'assignment-1',
        userId: 'user-1',
        assessmentId: 'assessment-1',
        assessmentVersionId: 'version-1',
        status: 'completed',
        orderIndex: 0,
        assignedAt: '2026-04-01T09:00:00.000Z',
        startedAt: '2026-04-01T09:05:00.000Z',
        completedAt: '2026-04-01T09:20:00.000Z',
        attemptId: 'attempt-1',
        resultId: 'result-1',
      },
      {
        id: 'assignment-2',
        userId: 'user-1',
        assessmentId: 'assessment-2',
        assessmentVersionId: 'version-2',
        status: 'assigned',
        orderIndex: 1,
        assignedAt: '2026-04-02T09:00:00.000Z',
        startedAt: null,
        completedAt: null,
        attemptId: null,
        resultId: null,
      },
      {
        id: 'assignment-3',
        userId: 'user-1',
        assessmentId: 'assessment-3',
        assessmentVersionId: 'version-3',
        status: 'assigned',
        orderIndex: 2,
        assignedAt: '2026-04-03T09:00:00.000Z',
        startedAt: null,
        completedAt: null,
        attemptId: null,
        resultId: null,
      },
    ],
  });

  await reorderAdminUserAssignmentRecord({
    db: fake.client,
    userId: 'user-1',
    assignmentId: 'assignment-3',
    direction: 'up',
  });

  assert.deepEqual(
    fake.state.assignments
      .sort((left, right) => left.orderIndex - right.orderIndex)
      .map((assignment) => assignment.id),
    ['assignment-1', 'assignment-3', 'assignment-2'],
  );
});

test('non-admin cannot perform assignment mutations', async () => {
  let connectCalls = 0;
  const formData = new FormData();
  formData.set('userId', 'user-1');
  formData.set('assessmentId', 'assessment-3');
  formData.set('assessmentVersionId', 'version-3');
  formData.set('targetOrderIndex', '1');

  const result = await createAdminUserAssignmentActionWithDependencies(
    initialAdminAssignmentCreateFormState,
    formData,
    {
      requireAdminUser: async () => {
        throw new Error('UNAUTHORIZED');
      },
      getDbPool() {
        connectCalls += 1;
        throw new Error('should not connect');
      },
      revalidatePath() {},
      redirect() {
        throw new Error('should not redirect');
      },
    },
  );

  assert.equal(connectCalls, 0);
  assert.equal(
    result.formError,
    'The assignment could not be created. Review the selection and try again.',
  );
});

test('started or completed assignments cannot be removed unsafely', async () => {
  const fake = createFakeDb({
    users: [{ id: 'user-1' }],
    publishedVersions: [],
    assignments: [
      {
        id: 'assignment-1',
        userId: 'user-1',
        assessmentId: 'assessment-1',
        assessmentVersionId: 'version-1',
        status: 'completed',
        orderIndex: 0,
        assignedAt: '2026-04-01T09:00:00.000Z',
        startedAt: '2026-04-01T09:05:00.000Z',
        completedAt: '2026-04-01T09:20:00.000Z',
        attemptId: 'attempt-1',
        resultId: 'result-1',
      },
    ],
  });

  await assert.rejects(
    () =>
      removeAdminUserAssignmentRecord({
        db: fake.client,
        userId: 'user-1',
        assignmentId: 'assignment-1',
      }),
    /ASSIGNMENT_NOT_EDITABLE/,
  );
});

test('removal of safe unstarted assignments works and preserves order', async () => {
  const fake = createFakeDb({
    users: [{ id: 'user-1' }],
    publishedVersions: [],
    assignments: [
      {
        id: 'assignment-1',
        userId: 'user-1',
        assessmentId: 'assessment-1',
        assessmentVersionId: 'version-1',
        status: 'completed',
        orderIndex: 0,
        assignedAt: '2026-04-01T09:00:00.000Z',
        startedAt: '2026-04-01T09:05:00.000Z',
        completedAt: '2026-04-01T09:20:00.000Z',
        attemptId: 'attempt-1',
        resultId: 'result-1',
      },
      {
        id: 'assignment-2',
        userId: 'user-1',
        assessmentId: 'assessment-2',
        assessmentVersionId: 'version-2',
        status: 'assigned',
        orderIndex: 1,
        assignedAt: '2026-04-02T09:00:00.000Z',
        startedAt: null,
        completedAt: null,
        attemptId: null,
        resultId: null,
      },
      {
        id: 'assignment-3',
        userId: 'user-1',
        assessmentId: 'assessment-3',
        assessmentVersionId: 'version-3',
        status: 'assigned',
        orderIndex: 2,
        assignedAt: '2026-04-03T09:00:00.000Z',
        startedAt: null,
        completedAt: null,
        attemptId: null,
        resultId: null,
      },
    ],
  });

  await removeAdminUserAssignmentRecord({
    db: fake.client,
    userId: 'user-1',
    assignmentId: 'assignment-2',
  });

  assert.deepEqual(
    fake.state.assignments
      .sort((left, right) => left.orderIndex - right.orderIndex)
      .map((assignment) => [assignment.id, assignment.orderIndex]),
    [
      ['assignment-1', 0],
      ['assignment-3', 1],
    ],
  );
});

test('completed canonical result linkage and current-next derivation stay intact after safe mutations', async () => {
  const fake = createFakeDb({
    users: [{ id: 'user-1' }],
    publishedVersions: [
      { assessmentId: 'assessment-4', assessmentVersionId: 'version-4' },
    ],
    assignments: [
      {
        id: 'assignment-1',
        userId: 'user-1',
        assessmentId: 'assessment-1',
        assessmentVersionId: 'version-1',
        status: 'completed',
        orderIndex: 0,
        assignedAt: '2026-04-01T09:00:00.000Z',
        startedAt: '2026-04-01T09:05:00.000Z',
        completedAt: '2026-04-01T09:20:00.000Z',
        attemptId: 'attempt-1',
        resultId: 'result-1',
      },
      {
        id: 'assignment-2',
        userId: 'user-1',
        assessmentId: 'assessment-2',
        assessmentVersionId: 'version-2',
        status: 'assigned',
        orderIndex: 1,
        assignedAt: '2026-04-02T09:00:00.000Z',
        startedAt: null,
        completedAt: null,
        attemptId: null,
        resultId: null,
      },
      {
        id: 'assignment-3',
        userId: 'user-1',
        assessmentId: 'assessment-3',
        assessmentVersionId: 'version-3',
        status: 'assigned',
        orderIndex: 2,
        assignedAt: '2026-04-03T09:00:00.000Z',
        startedAt: null,
        completedAt: null,
        attemptId: null,
        resultId: null,
      },
    ],
  });

  await createAdminUserAssignmentRecord({
    db: fake.client,
    userId: 'user-1',
    assessmentId: 'assessment-4',
    assessmentVersionId: 'version-4',
    targetOrderIndex: 1,
  });

  const viewModel = projectAdminUserDetailViewModel(buildDetailRows(fake.state));

  assert.equal(viewModel?.assignments[0]?.resultHref, '/app/results/result-1');
  assert.equal(viewModel?.currentAssessmentLabel, 'Execution Style');
  assert.equal(viewModel?.nextAssessmentLabel, 'Leadership Signals');
});
