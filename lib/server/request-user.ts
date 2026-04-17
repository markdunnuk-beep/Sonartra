import { auth, currentUser } from '@clerk/nextjs/server';

import { getDbPool } from '@/lib/server/db';
import {
  syncInternalUserFromClerkProfile,
  type ClerkUserProfileLike,
  type InternalUserRecord,
} from '@/lib/server/internal-user-sync';

export type RequestUserRole = InternalUserRecord['role'];
export type RequestUserStatus = InternalUserRecord['status'];

export type RequestUserContext = {
  userId: string;
  clerkUserId: string;
  userEmail: string;
  userName: string | null;
  userRole: RequestUserRole;
  userStatus: RequestUserStatus;
  isAdmin: boolean;
};

export class AuthenticatedUserRequiredError extends Error {
  constructor() {
    super('Authenticated Clerk user is required for server-side user resolution');
    this.name = 'AuthenticatedUserRequiredError';
  }
}

export class ClerkUserProfileRequiredError extends Error {
  constructor() {
    super('Authenticated Clerk profile is required for internal user synchronisation');
    this.name = 'ClerkUserProfileRequiredError';
  }
}

export class DisabledUserAccessError extends Error {
  constructor() {
    super('Disabled users cannot access authenticated app routes');
    this.name = 'DisabledUserAccessError';
  }
}

type ClerkAuthState = {
  userId: string | null;
};

type RequireCurrentUserDependencies = {
  auth(): Promise<ClerkAuthState>;
  currentUser(): Promise<ClerkUserProfileLike | null>;
  syncInternalUserFromClerkProfile(
    clerkUser: ClerkUserProfileLike,
  ): Promise<InternalUserRecord>;
};

function mapRequestUserContext(user: InternalUserRecord): RequestUserContext {
  return {
    userId: user.id,
    clerkUserId: user.clerkUserId,
    userEmail: user.email,
    userName: user.name,
    userRole: user.role,
    userStatus: user.status,
    isAdmin: user.role === 'admin',
  };
}

export function isAuthenticatedUserRequiredError(error: unknown): boolean {
  return error instanceof AuthenticatedUserRequiredError;
}

export function isDisabledUserAccessError(error: unknown): boolean {
  return error instanceof DisabledUserAccessError;
}

export async function requireCurrentUserWithDependencies(
  dependencies: RequireCurrentUserDependencies,
): Promise<RequestUserContext> {
  const authState = await dependencies.auth();

  if (!authState.userId) {
    throw new AuthenticatedUserRequiredError();
  }

  const clerkUser = await dependencies.currentUser();
  if (!clerkUser || clerkUser.id !== authState.userId) {
    throw new ClerkUserProfileRequiredError();
  }

  const internalUser = await dependencies.syncInternalUserFromClerkProfile(clerkUser);

  if (internalUser.status === 'disabled') {
    throw new DisabledUserAccessError();
  }

  return mapRequestUserContext(internalUser);
}

export async function requireCurrentUser(): Promise<RequestUserContext> {
  return requireCurrentUserWithDependencies({
    auth,
    currentUser,
    syncInternalUserFromClerkProfile: (clerkUser) =>
      syncInternalUserFromClerkProfile(getDbPool(), clerkUser),
  });
}

export async function getRequestUserId(): Promise<string> {
  const requestUser = await requireCurrentUser();
  return requestUser.userId;
}

export async function getRequestUserContext(): Promise<RequestUserContext> {
  return requireCurrentUser();
}
