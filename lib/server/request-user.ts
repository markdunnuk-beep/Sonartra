import { headers } from 'next/headers';

export type RequestUserContext = {
  userId: string;
  userEmail: string | null;
};

export function resolveUserIdFromHeaders(requestHeaders: Headers): string {
  const userId =
    requestHeaders.get('x-user-id') ??
    process.env.SONARTRA_DEV_USER_ID ??
    null;

  if (!userId) {
    throw new Error('Authenticated user id is required for user app routes');
  }

  return userId;
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
