import { redirect } from 'next/navigation';

import { getRequestUserContext, type RequestUserContext } from '@/lib/server/request-user';

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

export async function requireAdminRequestUserContext(): Promise<RequestUserContext> {
  const requestUser = await getRequestUserContext();

  if (!isApprovedAdminEmail(requestUser.userEmail)) {
    redirect('/app/workspace');
  }

  return requestUser;
}
