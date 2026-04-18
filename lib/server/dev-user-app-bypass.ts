import type { ClerkUserProfileLike } from '@/lib/server/internal-user-sync';

export type DevUserAppBypassEnvironment = {
  NODE_ENV?: string;
  DEV_USER_BYPASS?: string;
};

const DEV_USER_APP_BYPASS_CLERK_PROFILE: ClerkUserProfileLike = {
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
};

export function isDevUserAppBypassEnabled(
  env: DevUserAppBypassEnvironment = process.env,
): boolean {
  return env.NODE_ENV !== 'production' && env.DEV_USER_BYPASS === 'true';
}

export function getDevUserAppBypassClerkProfile(): ClerkUserProfileLike {
  return DEV_USER_APP_BYPASS_CLERK_PROFILE;
}
