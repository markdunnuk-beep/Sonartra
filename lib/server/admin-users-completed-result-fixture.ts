export const ADMIN_USERS_COMPLETED_RESULT_FIXTURE = Object.freeze({
  userId: '4f4f4ab3-b6fb-4cff-a9fa-d0fd7ef11b11',
  clerkUserId: 'qa_completed_user_fixture',
  email: 'qa-completed-user@sonartra.local',
  name: 'QA Completed User',
  role: 'user' as const,
  status: 'active' as const,
  assignmentId: '66c43fd0-0f20-4ed3-a4e0-05c7ba4f2c44',
  attemptId: '5f7cc4c3-b1e2-4804-a2c0-2c0d8eb4ea66',
  resultId: '79f4773e-1fd4-44ad-8605-7f85a7c20e77',
  assessmentKey: 'wplp80',
  assignedAt: '2026-04-10T09:00:00.000Z',
  startedAt: '2026-04-10T09:05:00.000Z',
  completedAt: '2026-04-10T09:25:00.000Z',
} as const);

export type AdminUsersCompletedResultFixture =
  typeof ADMIN_USERS_COMPLETED_RESULT_FIXTURE;
