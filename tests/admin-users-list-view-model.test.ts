import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAdminUsersListPageViewModel,
  parseAdminUsersListFilters,
  projectAdminUsersListViewModel,
} from '@/lib/server/admin-users-list';
import { ADMIN_USERS_COMPLETED_RESULT_FIXTURE } from '@/lib/server/admin-users-completed-result-fixture';

test('invalid admin users filter params fail safely to canonical defaults', () => {
  const filters = parseAdminUsersListFilters({
    q: [' Ada '],
    status: 'unexpected',
    progress: 'bad',
  });

  assert.deepEqual(filters, {
    query: 'Ada',
    status: 'all',
    progress: 'all',
  });
});

test('users with no assignments render safely as not started with no activity', () => {
  const viewModel = projectAdminUsersListViewModel({
    filters: { query: '', status: 'all', progress: 'all' },
    rows: [
      {
        user_id: 'user-1',
        user_name: 'Ada Lovelace',
        user_email: 'ada@example.com',
        user_status: 'active',
        organisation_id: null,
        assignment_id: null,
        assignment_status: null,
        assignment_order_index: null,
        assigned_at: null,
        started_at: null,
        completed_at: null,
        assignment_updated_at: null,
        attempt_last_activity_at: null,
        attempt_updated_at: null,
        attempt_created_at: null,
        result_generated_at: null,
        result_created_at: null,
        assessment_title: null,
      },
    ],
  });

  assert.equal(viewModel.totalUsers, 1);
  assert.equal(viewModel.items[0]?.progressState, 'not_started');
  assert.equal(viewModel.items[0]?.currentAssessmentLabel, null);
  assert.equal(viewModel.items[0]?.nextAssessmentLabel, null);
  assert.equal(viewModel.items[0]?.lastActivityLabel, 'No activity yet');
});

test('current assessment derives from the lowest non-completed order index and next assessment follows deterministically', () => {
  const viewModel = projectAdminUsersListViewModel({
    filters: { query: '', status: 'all', progress: 'all' },
    rows: [
      {
        user_id: 'user-1',
        user_name: 'Grace Hopper',
        user_email: 'grace@example.com',
        user_status: 'active',
        organisation_id: null,
        assignment_id: 'assignment-1',
        assignment_status: 'completed',
        assignment_order_index: 0,
        assigned_at: '2026-04-01T09:00:00.000Z',
        started_at: '2026-04-01T09:05:00.000Z',
        completed_at: '2026-04-01T09:20:00.000Z',
        assignment_updated_at: '2026-04-01T09:20:00.000Z',
        attempt_last_activity_at: '2026-04-01T09:18:00.000Z',
        attempt_updated_at: '2026-04-01T09:20:00.000Z',
        attempt_created_at: '2026-04-01T09:05:00.000Z',
        result_generated_at: '2026-04-01T09:21:00.000Z',
        result_created_at: '2026-04-01T09:21:00.000Z',
        assessment_title: 'Foundations',
      },
      {
        user_id: 'user-1',
        user_name: 'Grace Hopper',
        user_email: 'grace@example.com',
        user_status: 'active',
        organisation_id: null,
        assignment_id: 'assignment-2',
        assignment_status: 'assigned',
        assignment_order_index: 1,
        assigned_at: '2026-04-02T09:00:00.000Z',
        started_at: null,
        completed_at: null,
        assignment_updated_at: '2026-04-02T09:00:00.000Z',
        attempt_last_activity_at: null,
        attempt_updated_at: null,
        attempt_created_at: null,
        result_generated_at: null,
        result_created_at: null,
        assessment_title: 'Leadership Signals',
      },
      {
        user_id: 'user-1',
        user_name: 'Grace Hopper',
        user_email: 'grace@example.com',
        user_status: 'active',
        organisation_id: null,
        assignment_id: 'assignment-3',
        assignment_status: 'assigned',
        assignment_order_index: 2,
        assigned_at: '2026-04-03T09:00:00.000Z',
        started_at: null,
        completed_at: null,
        assignment_updated_at: '2026-04-03T09:00:00.000Z',
        attempt_last_activity_at: null,
        attempt_updated_at: null,
        attempt_created_at: null,
        result_generated_at: null,
        result_created_at: null,
        assessment_title: 'Role Focus',
      },
    ],
  });

  assert.equal(viewModel.items[0]?.currentAssessmentLabel, 'Leadership Signals');
  assert.equal(viewModel.items[0]?.nextAssessmentLabel, 'Role Focus');
  assert.equal(viewModel.items[0]?.progressState, 'not_started');
  assert.equal(viewModel.items[0]?.lastActivityLabel, '03 Apr 2026');
});

test('in-progress and completed states derive from canonical assignment sequencing', () => {
  const inProgressViewModel = projectAdminUsersListViewModel({
    filters: { query: '', status: 'all', progress: 'all' },
    rows: [
      {
        user_id: 'user-1',
        user_name: 'Margaret Hamilton',
        user_email: 'margaret@example.com',
        user_status: 'active',
        organisation_id: null,
        assignment_id: 'assignment-1',
        assignment_status: 'in_progress',
        assignment_order_index: 0,
        assigned_at: '2026-04-02T09:00:00.000Z',
        started_at: '2026-04-02T09:05:00.000Z',
        completed_at: null,
        assignment_updated_at: '2026-04-02T10:00:00.000Z',
        attempt_last_activity_at: '2026-04-02T10:30:00.000Z',
        attempt_updated_at: '2026-04-02T10:30:00.000Z',
        attempt_created_at: '2026-04-02T09:05:00.000Z',
        result_generated_at: null,
        result_created_at: null,
        assessment_title: 'Core Signals',
      },
    ],
  });

  assert.equal(inProgressViewModel.items[0]?.progressState, 'in_progress');

  const completedViewModel = projectAdminUsersListViewModel({
    filters: { query: '', status: 'all', progress: 'all' },
    rows: [
      {
        user_id: 'user-2',
        user_name: 'Dorothy Vaughan',
        user_email: 'dorothy@example.com',
        user_status: 'disabled',
        organisation_id: null,
        assignment_id: 'assignment-1',
        assignment_status: 'completed',
        assignment_order_index: 0,
        assigned_at: '2026-04-04T09:00:00.000Z',
        started_at: '2026-04-04T09:05:00.000Z',
        completed_at: '2026-04-04T09:45:00.000Z',
        assignment_updated_at: '2026-04-04T09:45:00.000Z',
        attempt_last_activity_at: '2026-04-04T09:40:00.000Z',
        attempt_updated_at: '2026-04-04T09:45:00.000Z',
        attempt_created_at: '2026-04-04T09:05:00.000Z',
        result_generated_at: '2026-04-04T09:46:00.000Z',
        result_created_at: '2026-04-04T09:46:00.000Z',
        assessment_title: 'Execution Style',
      },
    ],
  });

  assert.equal(completedViewModel.items[0]?.progressState, 'completed');
  assert.equal(completedViewModel.items[0]?.currentAssessmentLabel, null);
  assert.equal(completedViewModel.items[0]?.userStatus, 'disabled');
});

test('completed-result QA fixture remains visible in the admin users list as a completed record', () => {
  const viewModel = projectAdminUsersListViewModel({
    filters: { query: '', status: 'all', progress: 'all' },
    rows: [
      {
        user_id: ADMIN_USERS_COMPLETED_RESULT_FIXTURE.userId,
        user_name: ADMIN_USERS_COMPLETED_RESULT_FIXTURE.name,
        user_email: ADMIN_USERS_COMPLETED_RESULT_FIXTURE.email,
        user_status: 'active',
        organisation_id: null,
        assignment_id: ADMIN_USERS_COMPLETED_RESULT_FIXTURE.assignmentId,
        assignment_status: 'completed',
        assignment_order_index: 0,
        assigned_at: ADMIN_USERS_COMPLETED_RESULT_FIXTURE.assignedAt,
        started_at: ADMIN_USERS_COMPLETED_RESULT_FIXTURE.startedAt,
        completed_at: ADMIN_USERS_COMPLETED_RESULT_FIXTURE.completedAt,
        assignment_updated_at: ADMIN_USERS_COMPLETED_RESULT_FIXTURE.completedAt,
        attempt_last_activity_at: ADMIN_USERS_COMPLETED_RESULT_FIXTURE.completedAt,
        attempt_updated_at: ADMIN_USERS_COMPLETED_RESULT_FIXTURE.completedAt,
        attempt_created_at: ADMIN_USERS_COMPLETED_RESULT_FIXTURE.startedAt,
        result_generated_at: ADMIN_USERS_COMPLETED_RESULT_FIXTURE.completedAt,
        result_created_at: ADMIN_USERS_COMPLETED_RESULT_FIXTURE.completedAt,
        assessment_title: 'WPLP-80',
      },
    ],
  });

  assert.equal(viewModel.filteredUsers, 1);
  assert.equal(viewModel.items[0]?.email, ADMIN_USERS_COMPLETED_RESULT_FIXTURE.email);
  assert.equal(viewModel.items[0]?.progressState, 'completed');
  assert.equal(viewModel.items[0]?.currentAssessmentLabel, null);
  assert.equal(viewModel.items[0]?.nextAssessmentLabel, null);
});

test('search filters by name and email', () => {
  const rows = [
    {
      user_id: 'user-1',
      user_name: 'Ada Lovelace',
      user_email: 'ada@example.com',
      user_status: 'active',
      organisation_id: null,
      assignment_id: null,
      assignment_status: null,
      assignment_order_index: null,
      assigned_at: null,
      started_at: null,
      completed_at: null,
      assignment_updated_at: null,
      attempt_last_activity_at: null,
      attempt_updated_at: null,
      attempt_created_at: null,
      result_generated_at: null,
      result_created_at: null,
      assessment_title: null,
    },
    {
      user_id: 'user-2',
      user_name: 'Grace Hopper',
      user_email: 'grace@example.com',
      user_status: 'active',
      organisation_id: null,
      assignment_id: null,
      assignment_status: null,
      assignment_order_index: null,
      assigned_at: null,
      started_at: null,
      completed_at: null,
      assignment_updated_at: null,
      attempt_last_activity_at: null,
      attempt_updated_at: null,
      attempt_created_at: null,
      result_generated_at: null,
      result_created_at: null,
      assessment_title: null,
    },
  ] as const;

  const byName = projectAdminUsersListViewModel({
    rows,
    filters: { query: 'grace', status: 'all', progress: 'all' },
  });
  const byEmail = projectAdminUsersListViewModel({
    rows,
    filters: { query: 'ada@', status: 'all', progress: 'all' },
  });

  assert.equal(byName.filteredUsers, 1);
  assert.equal(byName.items[0]?.email, 'grace@example.com');
  assert.equal(byEmail.filteredUsers, 1);
  assert.equal(byEmail.items[0]?.name, 'Ada Lovelace');
});

test('buildAdminUsersListPageViewModel relies on canonical db rows only and returns filtered results', async () => {
  let queryCount = 0;

  const viewModel = await buildAdminUsersListPageViewModel({
    db: {
      async query<T>() {
        queryCount += 1;

        return {
          rows: [
            {
              user_id: 'user-1',
              user_name: 'Ada Lovelace',
              user_email: 'ada@example.com',
              user_status: 'active',
              organisation_id: null,
              assignment_id: null,
              assignment_status: null,
              assignment_order_index: null,
              assigned_at: null,
              started_at: null,
              completed_at: null,
              assignment_updated_at: null,
              attempt_last_activity_at: null,
              attempt_updated_at: null,
              attempt_created_at: null,
              result_generated_at: null,
              result_created_at: null,
              assessment_title: null,
            },
          ] as T[],
        };
      },
    },
    searchParams: { status: 'active' },
  });

  assert.equal(queryCount, 1);
  assert.equal(viewModel.filteredUsers, 1);
  assert.equal(viewModel.items[0]?.detailHref, '/admin/users/user-1');
});
