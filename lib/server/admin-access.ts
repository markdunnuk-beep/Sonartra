import { redirect } from 'next/navigation';

import {
  getRequestUserContext,
  isMissingRequestUserError,
  type RequestUserContext,
} from '@/lib/server/request-user';

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function getApprovedAdminEmails(): readonly string[] {
  const source = process.env.SONARTRA_ADMIN_EMAILS ?? '';

  return source
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizeEmail);
}

export function isApprovedAdminEmail(email: string | null): boolean {
  if (!email) {
    return false;
  }

  return getApprovedAdminEmails().includes(normalizeEmail(email));
}

type RequireAdminRequestUserContextDependencies = {
  getRequestUserContext(): Promise<RequestUserContext>;
  redirect(path: string): never;
};

export async function requireAdminRequestUserContextWithDependencies(
  dependencies: RequireAdminRequestUserContextDependencies,
): Promise<RequestUserContext> {
  let requestUser: RequestUserContext;

  try {
    requestUser = await dependencies.getRequestUserContext();
  } catch (error) {
    if (isMissingRequestUserError(error)) {
      dependencies.redirect('/');
    }

    throw error;
  }

  if (!isApprovedAdminEmail(requestUser.userEmail)) {
    dependencies.redirect('/');
  }

  return requestUser;
}

export async function requireAdminRequestUserContext(): Promise<RequestUserContext> {
  return requireAdminRequestUserContextWithDependencies({
    getRequestUserContext,
    redirect,
  });
}
