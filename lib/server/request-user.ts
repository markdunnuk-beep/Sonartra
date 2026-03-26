import { headers } from 'next/headers';

export async function getRequestUserId(): Promise<string> {
  const requestHeaders = await headers();
  const userId =
    requestHeaders.get('x-user-id') ??
    process.env.SONARTRA_DEV_USER_ID ??
    null;

  if (!userId) {
    throw new Error('Authenticated user id is required for result pages');
  }

  return userId;
}
