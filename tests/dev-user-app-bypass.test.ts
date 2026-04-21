import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getDevUserAppBypassClerkProfile,
  isDevUserAppBypassEnabled,
} from '@/lib/server/dev-user-app-bypass';
import {
  SINGLE_DOMAIN_QA_RESULT_FIXTURE,
  getSingleDomainQaResultHref,
} from '@/lib/server/single-domain-qa-result-fixture';

test('dev user app bypass only activates outside production when explicitly enabled', () => {
  assert.equal(
    isDevUserAppBypassEnabled({
      NODE_ENV: 'development',
      DEV_USER_BYPASS: 'true',
    }),
    true,
  );

  assert.equal(
    isDevUserAppBypassEnabled({
      NODE_ENV: 'development',
      DEV_USER_BYPASS: 'false',
    }),
    false,
  );

  assert.equal(
    isDevUserAppBypassEnabled({
      NODE_ENV: 'production',
      DEV_USER_BYPASS: 'true',
    }),
    false,
  );
});

test('dev user app bypass exposes a deterministic QA user profile', () => {
  assert.deepEqual(getDevUserAppBypassClerkProfile(), {
    id: 'dev_user_app_bypass',
    firstName: 'QA',
    lastName: 'User',
    primaryEmailAddressId: 'dev_user_app_bypass_email',
    emailAddresses: [
      {
        id: 'dev_user_app_bypass_email',
        emailAddress: 'qa-user@sonartra.local',
      },
    ],
  });
});

test('dev user bypass profile stays aligned with the single-domain QA result fixture user', () => {
  const profile = getDevUserAppBypassClerkProfile();

  assert.equal(profile.id, SINGLE_DOMAIN_QA_RESULT_FIXTURE.clerkUserId);
  assert.equal(profile.emailAddresses[0]?.emailAddress, SINGLE_DOMAIN_QA_RESULT_FIXTURE.email);
  assert.equal(
    getSingleDomainQaResultHref(),
    `/app/results/single-domain/${SINGLE_DOMAIN_QA_RESULT_FIXTURE.resultId}`,
  );
});
