import { redirect } from 'next/navigation';

import {
  getRequestUserContext,
  isAuthenticatedUserRequiredError,
  isClerkUserProfileRequiredError,
  isDisabledUserAccessError,
  type RequestUserContext,
} from '@/lib/server/request-user';

type RequireUserAppDependencies = {
  getRequestUserContext(): Promise<RequestUserContext>;
  redirect(path: string): never;
};

export async function requireUserAppRequestUserContextWithDependencies(
  dependencies: RequireUserAppDependencies,
): Promise<RequestUserContext> {
  try {
    return await dependencies.getRequestUserContext();
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
}

export async function requireUserAppRequestUserContext(): Promise<RequestUserContext> {
  return requireUserAppRequestUserContextWithDependencies({
    getRequestUserContext,
    redirect,
  });
}
