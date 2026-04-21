import { redirect } from 'next/navigation';

import {
  getDevAdminBypassRequestUser,
  isDevAdminBypassEnabled,
  type DevAdminBypassEnvironment,
} from '@/lib/server/dev-admin-bypass';
import { isDevUserAppBypassEnabled } from '@/lib/server/dev-user-app-bypass';
import {
  getRequestUserContext,
  isAuthenticatedUserRequiredError,
  isClerkUserProfileRequiredError,
  isDisabledUserAccessError,
  type RequestUserContext,
} from '@/lib/server/request-user';
import { isSingleDomainQaFixtureUser } from '@/lib/server/single-domain-qa-result-fixture';

type RequireAdminUserDependencies = {
  env: DevAdminBypassEnvironment & {
    DEV_USER_BYPASS?: string;
  };
  getRequestUserContext(): Promise<RequestUserContext>;
  redirect(path: string): never;
};

export function isAdminUser(requestUser: RequestUserContext): boolean {
  return requestUser.userRole === 'admin';
}

function canElevateDevQaUserToAdmin(params: {
  env: RequireAdminUserDependencies['env'];
  requestUser: RequestUserContext;
}): boolean {
  return (
    isDevUserAppBypassEnabled(params.env) &&
    isSingleDomainQaFixtureUser({
      clerkUserId: params.requestUser.clerkUserId,
      userEmail: params.requestUser.userEmail,
    }) &&
    params.requestUser.userStatus === 'active'
  );
}

function elevateRequestUserToAdmin(requestUser: RequestUserContext): RequestUserContext {
  return {
    ...requestUser,
    userRole: 'admin',
    isAdmin: true,
  };
}

export async function requireAdminUserWithDependencies(
  dependencies: RequireAdminUserDependencies,
): Promise<RequestUserContext> {
  if (isDevAdminBypassEnabled(dependencies.env)) {
    return getDevAdminBypassRequestUser();
  }

  let requestUser: RequestUserContext;

  try {
    requestUser = await dependencies.getRequestUserContext();
  } catch (error) {
    if (
      isAuthenticatedUserRequiredError(error) ||
      isClerkUserProfileRequiredError(error) ||
      isDisabledUserAccessError(error)
    ) {
      dependencies.redirect('/');
    }

    throw error;
  }

  if (
    canElevateDevQaUserToAdmin({
      env: dependencies.env,
      requestUser,
    })
  ) {
    return elevateRequestUserToAdmin(requestUser);
  }

  if (!isAdminUser(requestUser)) {
    dependencies.redirect('/');
  }

  return requestUser;
}

export async function requireAdminUser(): Promise<RequestUserContext> {
  return requireAdminUserWithDependencies({
    env: process.env,
    getRequestUserContext,
    redirect,
  });
}

export async function requireAdminRequestUserContext(): Promise<RequestUserContext> {
  return requireAdminUser();
}

export async function requireAdminRequestUserContextWithDependencies(
  dependencies: RequireAdminUserDependencies,
): Promise<RequestUserContext> {
  return requireAdminUserWithDependencies(dependencies);
}
