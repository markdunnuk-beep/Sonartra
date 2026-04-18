import test from 'node:test';
import assert from 'node:assert/strict';

import { requireAdminRequestUserContextWithDependencies } from '@/lib/server/admin-access';
import {
  AuthenticatedUserRequiredError,
  ClerkUserProfileRequiredError,
  DisabledUserAccessError,
} from '@/lib/server/request-user';

test('admin access redirects to the public home route when request auth context is missing', async () => {
  await assert.rejects(
    () =>
      requireAdminRequestUserContextWithDependencies({
        env: {},
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
        env: {},
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
        env: {},
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

test('admin access redirects to the public home route when Clerk profile resolution fails', async () => {
  await assert.rejects(
    () =>
      requireAdminRequestUserContextWithDependencies({
        env: {},
        async getRequestUserContext() {
          throw new ClerkUserProfileRequiredError();
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
    env: {},
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

test('admin access resolves the deterministic mock admin context when the dev bypass flag is enabled outside production', async () => {
  const result = await requireAdminRequestUserContextWithDependencies({
    env: {
      NODE_ENV: 'development',
      DEV_ADMIN_BYPASS: 'true',
    },
    async getRequestUserContext() {
      throw new Error('unexpected request-user resolution');
    },
    redirect(path: string): never {
      throw new Error(`unexpected redirect to ${path}`);
    },
  });

  assert.deepEqual(result, {
    userId: '00000000-0000-0000-0000-00000000d3v0',
    clerkUserId: 'dev_admin_bypass',
    userEmail: 'dev-admin@sonartra.local',
    userName: 'Dev Admin',
    userRole: 'admin',
    userStatus: 'active',
    isAdmin: true,
  });
});

test('admin access preserves the normal auth path when the bypass flag is absent', async () => {
  let resolved = false;

  const result = await requireAdminRequestUserContextWithDependencies({
    env: {
      NODE_ENV: 'development',
    },
    async getRequestUserContext() {
      resolved = true;
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

  assert.equal(resolved, true);
  assert.equal(result.clerkUserId, 'user_1');
});

test('admin access cannot enable the dev bypass in production', async () => {
  let resolved = false;

  const result = await requireAdminRequestUserContextWithDependencies({
    env: {
      NODE_ENV: 'production',
      DEV_ADMIN_BYPASS: 'true',
    },
    async getRequestUserContext() {
      resolved = true;
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

  assert.equal(resolved, true);
  assert.equal(result.clerkUserId, 'user_1');
});
