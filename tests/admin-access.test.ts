import test from 'node:test';
import assert from 'node:assert/strict';

import { requireAdminRequestUserContextWithDependencies } from '@/lib/server/admin-access';

test('admin access redirects to the public home route when request auth context is missing', async () => {
  await assert.rejects(
    () =>
      requireAdminRequestUserContextWithDependencies({
        async getRequestUserContext() {
          throw new Error('Authenticated user id is required for user app routes');
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
            userId: 'user-1',
            userEmail: 'member@example.com',
          };
        },
        redirect(path: string): never {
          throw new Error(`REDIRECT:${path}`);
        },
      }),
    /REDIRECT:\//,
  );
});

test('admin access returns the request context for approved admin email addresses', async () => {
  const originalAdminEmails = process.env.SONARTRA_ADMIN_EMAILS;
  process.env.SONARTRA_ADMIN_EMAILS = 'admin@example.com';

  try {
    const result = await requireAdminRequestUserContextWithDependencies({
      async getRequestUserContext() {
        return {
          userId: 'user-1',
          userEmail: 'Admin@Example.com',
        };
      },
      redirect(path: string): never {
        throw new Error(`unexpected redirect to ${path}`);
      },
    });

    assert.deepEqual(result, {
      userId: 'user-1',
      userEmail: 'Admin@Example.com',
    });
  } finally {
    if (originalAdminEmails === undefined) {
      delete process.env.SONARTRA_ADMIN_EMAILS;
    } else {
      process.env.SONARTRA_ADMIN_EMAILS = originalAdminEmails;
    }
  }
});
