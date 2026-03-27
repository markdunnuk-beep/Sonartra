import { headers } from 'next/headers';

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

export async function getRequestUserId(): Promise<string> {
  const requestHeaders = await headers();
  return resolveUserIdFromHeaders(requestHeaders);
}
