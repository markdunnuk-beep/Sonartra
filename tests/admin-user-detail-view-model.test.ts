import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAdminUserDetailViewModel,
  projectAdminUserDetailViewModel,
} from '@/lib/server/admin-user-detail';

test('non-existent admin user detail resolves safely to null', async () => {
  const viewModel = await buildAdminUserDetailViewModel({
    db: {
      async query<T>() {
        return { rows: [] as T[] };
      },
    },
    userId: '00000000-0000-0000-0000-000000000099',
  });

  assert.equal(viewModel, null);
});

test('user with no assignments renders safely with deterministic empty-state labels', () => {
  const viewModel = projectAdminUserDetailViewModel([
    {
      user_id: 'user-1',
      user_name: 'Ada Lovelace',
      user_email: 'ada@example.com',
      user_status: 'active',
      user_role: 'user',
      user_created_at: '2026-04-01T09:00:00.000Z',
      organisation_id: null,
      assignment_id: null,
      assignment_status: null,
      assignment_order_index: null,
      assessment_version_id: null,
      attempt_id: null,
      assigned_at: null,
      started_at: null,
      completed_at: null,
      assignment_updated_at: null,
      attempt_last_activity_at: null,
      attempt_updated_at: null,
      attempt_created_at: null,
      result_id: null,
      result_generated_at: null,
      result_created_at: null,
      assessment_title: null,
      assessment_mode: null,
    },
  ]);

  assert.equal(viewModel?.currentStateLabel, 'No assessments assigned');
  assert.equal(viewModel?.currentAssessmentLabel, null);
  assert.equal(viewModel?.nextAssessmentLabel, null);
  assert.equal(viewModel?.lastActivityLabel, 'No activity yet');
  assert.deepEqual(viewModel?.assignments, []);
});

test('assignment timeline renders in order_index order and derives current and next assessments deterministically', () => {
  const viewModel = projectAdminUserDetailViewModel(
    [
      {
        user_id: 'user-1',
        user_name: 'Grace Hopper',
        user_email: 'grace@example.com',
        user_status: 'active',
        user_role: 'admin',
        user_created_at: '2026-04-01T09:00:00.000Z',
        organisation_id: null,
        assignment_id: 'assignment-2',
        assignment_status: 'assigned',
        assignment_order_index: 1,
        assessment_version_id: 'version-2',
        attempt_id: null,
        assigned_at: '2026-04-02T09:00:00.000Z',
        started_at: null,
        completed_at: null,
        assignment_updated_at: '2026-04-02T09:00:00.000Z',
        attempt_last_activity_at: null,
        attempt_updated_at: null,
        attempt_created_at: null,
        result_id: null,
        result_generated_at: null,
        result_created_at: null,
        assessment_title: 'Leadership Signals',
        assessment_mode: 'multi_domain',
      },
      {
        user_id: 'user-1',
        user_name: 'Grace Hopper',
        user_email: 'grace@example.com',
        user_status: 'active',
        user_role: 'admin',
        user_created_at: '2026-04-01T09:00:00.000Z',
        organisation_id: null,
        assignment_id: 'assignment-1',
        assignment_status: 'completed',
        assignment_order_index: 0,
        assessment_version_id: 'version-1',
        attempt_id: 'attempt-1',
        assigned_at: '2026-04-01T09:00:00.000Z',
        started_at: '2026-04-01T09:05:00.000Z',
        completed_at: '2026-04-01T09:20:00.000Z',
        assignment_updated_at: '2026-04-01T09:20:00.000Z',
        attempt_last_activity_at: '2026-04-01T09:18:00.000Z',
        attempt_updated_at: '2026-04-01T09:20:00.000Z',
        attempt_created_at: '2026-04-01T09:05:00.000Z',
        result_id: 'result-1',
        result_generated_at: '2026-04-01T09:21:00.000Z',
        result_created_at: '2026-04-01T09:21:00.000Z',
        assessment_title: 'Foundations',
        assessment_mode: 'multi_domain',
      },
      {
        user_id: 'user-1',
        user_name: 'Grace Hopper',
        user_email: 'grace@example.com',
        user_status: 'active',
        user_role: 'admin',
        user_created_at: '2026-04-01T09:00:00.000Z',
        organisation_id: null,
        assignment_id: 'assignment-3',
        assignment_status: 'assigned',
        assignment_order_index: 2,
        assessment_version_id: 'version-3',
        attempt_id: null,
        assigned_at: '2026-04-03T09:00:00.000Z',
        started_at: null,
        completed_at: null,
        assignment_updated_at: '2026-04-03T09:00:00.000Z',
        attempt_last_activity_at: null,
        attempt_updated_at: null,
        attempt_created_at: null,
        result_id: null,
        result_generated_at: null,
        result_created_at: null,
        assessment_title: 'Role Focus',
        assessment_mode: 'multi_domain',
      },
    ],
    [
      {
        assessmentId: 'assessment-4',
        assessmentKey: 'execution-style',
        title: 'Execution Style',
        description: null,
        assessmentVersionId: 'version-4',
        versionTag: '1.0.0',
        publishedAt: '2026-04-04T09:00:00.000Z',
        questionCount: 80,
      },
    ],
  );

  assert.deepEqual(
    viewModel?.assignments.map((assignment) => assignment.assessmentLabel),
    ['Foundations', 'Leadership Signals', 'Role Focus'],
  );
  assert.equal(viewModel?.currentAssessmentLabel, 'Leadership Signals');
  assert.equal(viewModel?.nextAssessmentLabel, 'Role Focus');
  assert.equal(viewModel?.currentStateLabel, 'Leadership Signals - Assigned');
  assert.equal(viewModel?.lastActivityLabel, '03 Apr 2026');
  assert.equal(viewModel?.controls.editableSummary, 'Editable queue starts at Step 2.');
  assert.equal(viewModel?.controls.assignments[0]?.eligibilityLabel, 'History locked');
  assert.equal(viewModel?.controls.assignments[0]?.blockedReason, 'Result exists - history locked.');
  assert.equal(viewModel?.controls.assignments[0]?.attemptStateLabel, 'Attempt linked');
  assert.equal(viewModel?.controls.assignments[0]?.resultStateLabel, 'Result linked');
  assert.equal(viewModel?.controls.assignments[1]?.eligibilityLabel, 'Editable');
  assert.equal(viewModel?.controls.assignments[1]?.executionStateLabel, 'Untouched');
  assert.equal(viewModel?.controls.assignments[1]?.attemptStateLabel, 'No attempt');
  assert.equal(viewModel?.controls.assignments[1]?.resultStateLabel, 'No result');
  assert.equal(viewModel?.controls.assignments[2]?.canMoveEarlier, true);
  assert.equal(viewModel?.controls.assignmentOptions[0]?.assessmentVersionId, 'version-4');
});

test('completed assignments resolve canonical result links through assignment to attempt to result path', () => {
  const viewModel = projectAdminUserDetailViewModel([
    {
      user_id: 'user-2',
      user_name: 'Dorothy Vaughan',
      user_email: 'dorothy@example.com',
      user_status: 'disabled',
      user_role: 'user',
      user_created_at: '2026-04-04T09:00:00.000Z',
      organisation_id: null,
      assignment_id: 'assignment-1',
      assignment_status: 'completed',
      assignment_order_index: 0,
      assessment_version_id: 'version-1',
      attempt_id: 'attempt-2',
      assigned_at: '2026-04-04T09:00:00.000Z',
      started_at: '2026-04-04T09:05:00.000Z',
      completed_at: '2026-04-04T09:45:00.000Z',
      assignment_updated_at: '2026-04-04T09:45:00.000Z',
      attempt_last_activity_at: '2026-04-04T09:40:00.000Z',
      attempt_updated_at: '2026-04-04T09:45:00.000Z',
      attempt_created_at: '2026-04-04T09:05:00.000Z',
      result_id: 'result-2',
      result_generated_at: '2026-04-04T09:46:00.000Z',
      result_created_at: '2026-04-04T09:46:00.000Z',
      assessment_title: 'Execution Style',
      assessment_mode: 'single_domain',
    },
  ]);

  assert.equal(viewModel?.userStatus, 'disabled');
  assert.equal(viewModel?.roleLabel, 'User');
  assert.equal(viewModel?.currentAssessmentLabel, null);
  assert.equal(viewModel?.currentStateLabel, 'Execution Style - Completed');
  assert.equal(viewModel?.assignments[0]?.resultHref, '/app/results/single-domain/result-2');
});

test('assignments without attempts or results and missing optional fields do not crash the projection', () => {
  const viewModel = projectAdminUserDetailViewModel([
    {
      user_id: 'user-3',
      user_name: null,
      user_email: 'member@example.com',
      user_status: 'invited',
      user_role: 'user',
      user_created_at: '2026-04-05T09:00:00.000Z',
      organisation_id: null,
      assignment_id: 'assignment-1',
      assignment_status: 'in_progress',
      assignment_order_index: 0,
      assessment_version_id: 'version-1',
      attempt_id: 'attempt-3',
      assigned_at: '2026-04-05T09:00:00.000Z',
      started_at: '2026-04-05T09:05:00.000Z',
      completed_at: null,
      assignment_updated_at: '2026-04-05T09:05:00.000Z',
      attempt_last_activity_at: null,
      attempt_updated_at: null,
      attempt_created_at: null,
      result_id: null,
      result_generated_at: null,
      result_created_at: null,
      assessment_title: 'Blueprint',
      assessment_mode: null,
    },
  ]);

  assert.equal(viewModel?.name, 'member@example.com');
  assert.equal(viewModel?.organisationName, null);
  assert.equal(viewModel?.assignments[0]?.resultHref, null);
  assert.equal(viewModel?.assignments[0]?.completedAtLabel, null);
  assert.equal(viewModel?.currentStateLabel, 'Blueprint - In progress');
});
