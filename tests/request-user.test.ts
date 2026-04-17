import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AuthenticatedUserRequiredError,
  DisabledUserAccessError,
  requireCurrentUserWithDependencies,
} from '@/lib/server/request-user';

test('requireCurrentUser resolves a persisted internal user from Clerk auth and profile data', async () => {
  const result = await requireCurrentUserWithDependencies({
    async auth() {
      return { userId: 'user_123' };
    },
    async currentUser() {
      return {
        id: 'user_123',
        firstName: 'Ada',
        lastName: 'Lovelace',
        primaryEmailAddressId: 'email_123',
        emailAddresses: [
          {
            id: 'email_123',
            emailAddress: 'ada@example.com',
          },
        ],
      };
    },
    async syncInternalUserFromClerkProfile() {
      return {
        id: '00000000-0000-0000-0000-000000000123',
        clerkUserId: 'user_123',
        email: 'ada@example.com',
        name: 'Ada Lovelace',
        organisationId: null,
        role: 'user',
        status: 'active',
        createdAt: '2026-04-17T09:00:00.000Z',
        updatedAt: '2026-04-17T09:00:00.000Z',
      };
    },
  });

  assert.deepEqual(result, {
    userId: '00000000-0000-0000-0000-000000000123',
    clerkUserId: 'user_123',
    userEmail: 'ada@example.com',
    userName: 'Ada Lovelace',
    userRole: 'user',
    userStatus: 'active',
    isAdmin: false,
  });
});

test('requireCurrentUser fails closed when no authenticated Clerk user exists', async () => {
  await assert.rejects(
    () =>
      requireCurrentUserWithDependencies({
        async auth() {
          return { userId: null };
        },
        async currentUser() {
          return null;
        },
        async syncInternalUserFromClerkProfile() {
          throw new Error('unexpected sync');
        },
      }),
    AuthenticatedUserRequiredError,
  );
});

test('requireCurrentUser rejects disabled internal users after sync resolution', async () => {
  await assert.rejects(
    () =>
      requireCurrentUserWithDependencies({
        async auth() {
          return { userId: 'user_123' };
        },
        async currentUser() {
          return {
            id: 'user_123',
            primaryEmailAddressId: 'email_123',
            emailAddresses: [
              {
                id: 'email_123',
                emailAddress: 'ada@example.com',
              },
            ],
          };
        },
        async syncInternalUserFromClerkProfile() {
          return {
            id: '00000000-0000-0000-0000-000000000123',
            clerkUserId: 'user_123',
            email: 'ada@example.com',
            name: 'Ada Lovelace',
            organisationId: null,
            role: 'user',
            status: 'disabled',
            createdAt: '2026-04-17T09:00:00.000Z',
            updatedAt: '2026-04-17T09:00:00.000Z',
          };
        },
      }),
    DisabledUserAccessError,
  );
});
