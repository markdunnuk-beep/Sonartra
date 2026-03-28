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
