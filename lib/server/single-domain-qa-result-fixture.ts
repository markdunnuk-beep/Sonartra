export const SINGLE_DOMAIN_QA_RESULT_FIXTURE = Object.freeze({
  clerkUserId: 'dev_user_app_bypass',
  email: 'qa-user@sonartra.local',
  name: 'QA User',
  preferredAssessmentKey: 'leadership',
  attemptId: 'ef1ed8d4-91b2-4fd2-bdc0-dc78b18b0c01',
  resultId: 'f0df7bf7-4f14-4cb1-9f90-7cb6fa640001',
} as const);

export function isSingleDomainQaFixtureUser(params: {
  clerkUserId: string | null | undefined;
  userEmail: string | null | undefined;
}): boolean {
  return (
    params.clerkUserId === SINGLE_DOMAIN_QA_RESULT_FIXTURE.clerkUserId &&
    params.userEmail === SINGLE_DOMAIN_QA_RESULT_FIXTURE.email
  );
}

export function getSingleDomainQaResultHref(
  resultId: string = SINGLE_DOMAIN_QA_RESULT_FIXTURE.resultId,
): string {
  return `/app/results/single-domain/${resultId}`;
}

export function getSingleDomainQaAdminLanguageHref(
  assessmentKey: string = SINGLE_DOMAIN_QA_RESULT_FIXTURE.preferredAssessmentKey,
): string {
  return `/admin/assessments/single-domain/${assessmentKey}/language`;
}
