import { headers } from 'next/headers';

export type RequestUserContext = {
  userId: string;
  userEmail: string | null;
};

const MISSING_REQUEST_USER_ID_ERROR = 'Authenticated user id is required for user app routes';

export function resolveUserIdFromHeaders(requestHeaders: Headers): string {
  const userId =
    requestHeaders.get('x-user-id') ??
    process.env.SONARTRA_DEV_USER_ID ??
    null;

  if (!userId) {
    throw new Error(MISSING_REQUEST_USER_ID_ERROR);
  }

  return userId;
}

export function isMissingRequestUserError(error: unknown): boolean {
  return error instanceof Error && error.message === MISSING_REQUEST_USER_ID_ERROR;
}

export function resolveUserEmailFromHeaders(requestHeaders: Headers): string | null {
  return requestHeaders.get('x-user-email') ?? process.env.SONARTRA_DEV_USER_EMAIL ?? null;
}

export async function getRequestUserId(): Promise<string> {
  const requestHeaders = await headers();
  return resolveUserIdFromHeaders(requestHeaders);
}

export async function getRequestUserContext(): Promise<RequestUserContext> {
  const requestHeaders = await headers();

  return {
    userId: resolveUserIdFromHeaders(requestHeaders),
    userEmail: resolveUserEmailFromHeaders(requestHeaders),
  };
}
