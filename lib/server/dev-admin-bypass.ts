import type { RequestUserContext } from '@/lib/server/request-user';

export type DevAdminBypassEnvironment = {
  NODE_ENV?: string;
  DEV_ADMIN_BYPASS?: string;
};

const DEV_ADMIN_BYPASS_REQUEST_USER: RequestUserContext = {
  userId: '00000000-0000-0000-0000-00000000d3v0',
  clerkUserId: 'dev_admin_bypass',
  userEmail: 'dev-admin@sonartra.local',
  userName: 'Dev Admin',
  userRole: 'admin',
  userStatus: 'active',
  isAdmin: true,
};

export function isDevAdminBypassEnabled(
  env: DevAdminBypassEnvironment = process.env,
): boolean {
  return env.NODE_ENV !== 'production' && env.DEV_ADMIN_BYPASS === 'true';
}

export function getDevAdminBypassRequestUser(): RequestUserContext {
  return DEV_ADMIN_BYPASS_REQUEST_USER;
}
