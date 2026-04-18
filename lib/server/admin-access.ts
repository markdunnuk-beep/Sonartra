import { redirect } from 'next/navigation';

import {
  getRequestUserContext,
  isAuthenticatedUserRequiredError,
  isClerkUserProfileRequiredError,
  isDisabledUserAccessError,
  type RequestUserContext,
} from '@/lib/server/request-user';

type RequireAdminUserDependencies = {
  getRequestUserContext(): Promise<RequestUserContext>;
  redirect(path: string): never;
};

export function isAdminUser(requestUser: RequestUserContext): boolean {
  return requestUser.userRole === 'admin';
}

export async function requireAdminUserWithDependencies(
  dependencies: RequireAdminUserDependencies,
): Promise<RequestUserContext> {
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

  if (!isAdminUser(requestUser)) {
    dependencies.redirect('/');
  }

  return requestUser;
}

export async function requireAdminUser(): Promise<RequestUserContext> {
  return requireAdminUserWithDependencies({
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
