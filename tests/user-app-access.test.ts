import test from 'node:test';
import assert from 'node:assert/strict';

import { DisabledUserAccessError, ClerkUserProfileRequiredError } from '@/lib/server/request-user';
import { requireUserAppRequestUserContextWithDependencies } from '@/lib/server/user-app-access';

test('user app access returns the request context for an active persisted user', async () => {
  const result = await requireUserAppRequestUserContextWithDependencies({
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
      throw new Error(`unexpected redirect to ${path}`);
    },
  });

  assert.equal(result.userEmail, 'member@example.com');
  assert.equal(result.userStatus, 'active');
});

test('user app access redirects to the public home route when Clerk profile resolution fails', async () => {
  await assert.rejects(
    () =>
      requireUserAppRequestUserContextWithDependencies({
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

test('user app access redirects disabled users to the public home route', async () => {
  await assert.rejects(
    () =>
      requireUserAppRequestUserContextWithDependencies({
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
