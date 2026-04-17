import test from 'node:test';
import assert from 'node:assert/strict';

import { requireAdminRequestUserContextWithDependencies } from '@/lib/server/admin-access';
import {
  AuthenticatedUserRequiredError,
  DisabledUserAccessError,
} from '@/lib/server/request-user';

test('admin access redirects to the public home route when request auth context is missing', async () => {
  await assert.rejects(
    () =>
      requireAdminRequestUserContextWithDependencies({
        async getRequestUserContext() {
          throw new AuthenticatedUserRequiredError();
        },
        redirect(path: string): never {
          throw new Error(`REDIRECT:${path}`);
        },
      }),
    /REDIRECT:\//,
  );
});

test('admin access redirects to the public home route when the signed-in user is not an approved admin', async () => {
  await assert.rejects(
    () =>
      requireAdminRequestUserContextWithDependencies({
        async getRequestUserContext() {
          return {
            userId: '00000000-0000-0000-0000-000000000001',
            clerkUserId: 'user_1',
            userEmail: 'member@example.com',
            userName: 'Member User',
            userRole: 'user',
            userStatus: 'active',
            isAdmin: false,
          };
        },
        redirect(path: string): never {
          throw new Error(`REDIRECT:${path}`);
        },
      }),
    /REDIRECT:\//,
  );
});

test('admin access redirects disabled users to the public home route', async () => {
  await assert.rejects(
    () =>
      requireAdminRequestUserContextWithDependencies({
        async getRequestUserContext() {
          throw new DisabledUserAccessError();
        },
        redirect(path: string): never {
          throw new Error(`REDIRECT:${path}`);
        },
      }),
    /REDIRECT:\//,
  );
});

test('admin access returns the request context for persisted admin users', async () => {
  const result = await requireAdminRequestUserContextWithDependencies({
    async getRequestUserContext() {
      return {
        userId: '00000000-0000-0000-0000-000000000001',
        clerkUserId: 'user_1',
        userEmail: 'admin@example.com',
        userName: 'Admin User',
        userRole: 'admin',
        userStatus: 'active',
        isAdmin: true,
      };
    },
    redirect(path: string): never {
      throw new Error(`unexpected redirect to ${path}`);
    },
  });

  assert.deepEqual(result, {
    userId: '00000000-0000-0000-0000-000000000001',
    clerkUserId: 'user_1',
    userEmail: 'admin@example.com',
    userName: 'Admin User',
    userRole: 'admin',
    userStatus: 'active',
    isAdmin: true,
  });
});
