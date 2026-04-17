import { createHash } from 'node:crypto';

import type { Queryable } from '@/lib/engine/repository-sql';

export type InternalUserRole = 'admin' | 'user';
export type InternalUserStatus = 'active' | 'invited' | 'disabled';

export type InternalUserRecord = {
  id: string;
  clerkUserId: string;
  email: string;
  name: string | null;
  organisationId: string | null;
  role: InternalUserRole;
  status: InternalUserStatus;
  createdAt: string;
  updatedAt: string;
};

type InternalUserRow = {
  id: string;
  clerk_user_id: string;
  email: string;
  name: string | null;
  organisation_id: string | null;
  role: InternalUserRole;
  status: InternalUserStatus;
  created_at: string;
  updated_at: string;
};

type ClerkEmailAddressLike = {
  id: string;
  emailAddress?: string | null;
  email_address?: string | null;
};

export type ClerkUserProfileLike = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  primaryEmailAddressId?: string | null;
  primary_email_address_id?: string | null;
  emailAddresses?: readonly ClerkEmailAddressLike[];
  email_addresses?: readonly ClerkEmailAddressLike[];
};

type NormalizedClerkUserProfile = {
  clerkUserId: string;
  email: string;
  name: string | null;
};

function mapInternalUserRow(row: InternalUserRow): InternalUserRecord {
  return {
    id: row.id,
    clerkUserId: row.clerk_user_id,
    email: row.email,
    name: row.name,
    organisationId: row.organisation_id,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildPlaceholderEmail(clerkUserId: string): string {
  const hash = createHash('sha256').update(clerkUserId).digest('hex');
  return `clerk-missing+${hash}@placeholder.invalid`;
}

function getClerkEmailAddresses(
  clerkUser: ClerkUserProfileLike,
): readonly ClerkEmailAddressLike[] {
  return clerkUser.emailAddresses ?? clerkUser.email_addresses ?? [];
}

function getClerkPrimaryEmailAddressId(clerkUser: ClerkUserProfileLike): string | null {
  return clerkUser.primaryEmailAddressId ?? clerkUser.primary_email_address_id ?? null;
}

function getClerkEmailAddressValue(emailAddress: ClerkEmailAddressLike): string | null {
  return emailAddress.emailAddress ?? emailAddress.email_address ?? null;
}

function getClerkPrimaryEmail(clerkUser: ClerkUserProfileLike): string | null {
  const primaryEmailAddressId = getClerkPrimaryEmailAddressId(clerkUser);
  const emailAddresses = getClerkEmailAddresses(clerkUser);

  if (primaryEmailAddressId) {
    const primary = emailAddresses.find((emailAddress) => emailAddress.id === primaryEmailAddressId);
    const primaryEmail = primary ? getClerkEmailAddressValue(primary) : null;
    if (primaryEmail) {
      return primaryEmail;
    }
  }

  for (const emailAddress of emailAddresses) {
    const value = getClerkEmailAddressValue(emailAddress);
    if (value) {
      return value;
    }
  }

  return null;
}

function buildClerkDisplayName(clerkUser: ClerkUserProfileLike): string | null {
  const fullName = clerkUser.fullName ?? clerkUser.full_name ?? null;
  if (fullName && fullName.trim().length > 0) {
    return fullName.trim();
  }

  const firstName = clerkUser.firstName ?? clerkUser.first_name ?? null;
  const lastName = clerkUser.lastName ?? clerkUser.last_name ?? null;
  const composedName = [firstName, lastName].filter(Boolean).join(' ').trim();

  return composedName.length > 0 ? composedName : null;
}

export function normalizeClerkUserProfile(
  clerkUser: ClerkUserProfileLike,
): NormalizedClerkUserProfile {
  const email = getClerkPrimaryEmail(clerkUser) ?? buildPlaceholderEmail(clerkUser.id);

  return {
    clerkUserId: clerkUser.id,
    email,
    name: buildClerkDisplayName(clerkUser),
  };
}

export async function getInternalUserByClerkUserId(
  db: Queryable,
  clerkUserId: string,
): Promise<InternalUserRecord | null> {
  const result = await db.query<InternalUserRow>(
    `
    SELECT
      id,
      clerk_user_id,
      email,
      name,
      organisation_id,
      role,
      status,
      created_at,
      updated_at
    FROM users
    WHERE clerk_user_id = $1
    `,
    [clerkUserId],
  );

  const row = result.rows[0];
  return row ? mapInternalUserRow(row) : null;
}

export async function syncInternalUserFromClerkProfile(
  db: Queryable,
  clerkUser: ClerkUserProfileLike,
): Promise<InternalUserRecord> {
  const normalizedUser = normalizeClerkUserProfile(clerkUser);

  const result = await db.query<InternalUserRow>(
    `
    INSERT INTO users (
      clerk_user_id,
      email,
      name,
      role,
      status
    )
    VALUES ($1, $2, $3, 'user', 'active')
    ON CONFLICT (clerk_user_id) DO UPDATE
    SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      updated_at = NOW()
    RETURNING
      id,
      clerk_user_id,
      email,
      name,
      organisation_id,
      role,
      status,
      created_at,
      updated_at
    `,
    [normalizedUser.clerkUserId, normalizedUser.email, normalizedUser.name],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error('Internal user upsert did not return a row');
  }

  return mapInternalUserRow(row);
}

export async function disableInternalUserByClerkUserId(
  db: Queryable,
  clerkUserId: string,
): Promise<InternalUserRecord> {
  const result = await db.query<InternalUserRow>(
    `
    INSERT INTO users (
      clerk_user_id,
      email,
      name,
      role,
      status
    )
    VALUES ($1, $2, NULL, 'user', 'disabled')
    ON CONFLICT (clerk_user_id) DO UPDATE
    SET
      status = 'disabled',
      updated_at = NOW()
    RETURNING
      id,
      clerk_user_id,
      email,
      name,
      organisation_id,
      role,
      status,
      created_at,
      updated_at
    `,
    [clerkUserId, buildPlaceholderEmail(clerkUserId)],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error('Internal user disable operation did not return a row');
  }

  return mapInternalUserRow(row);
}
