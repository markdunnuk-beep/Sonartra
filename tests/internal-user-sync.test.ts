import test from 'node:test';
import assert from 'node:assert/strict';

import {
  disableInternalUserByClerkUserId,
  normalizeClerkUserProfile,
  syncInternalUserFromClerkProfile,
} from '@/lib/server/internal-user-sync';

test('normalizeClerkUserProfile resolves primary email and full name from Clerk fields', () => {
  const result = normalizeClerkUserProfile({
    id: 'user_123',
    first_name: 'Ada',
    last_name: 'Lovelace',
    primary_email_address_id: 'email_123',
    email_addresses: [
      {
        id: 'email_other',
        email_address: 'secondary@example.com',
      },
      {
        id: 'email_123',
        email_address: 'primary@example.com',
      },
    ],
  });

  assert.deepEqual(result, {
    clerkUserId: 'user_123',
    email: 'primary@example.com',
    name: 'Ada Lovelace',
  });
});

test('syncInternalUserFromClerkProfile uses idempotent upsert semantics and preserves app-owned role/status', async () => {
  const queries: Array<{ text: string; params: readonly unknown[] | undefined }> = [];

  const db = {
    async query<T>(text: string, params?: readonly unknown[]) {
      queries.push({ text, params });

      return {
        rows: [
          {
            id: '00000000-0000-0000-0000-000000000123',
            clerk_user_id: 'user_123',
            email: 'ada@example.com',
            name: 'Ada Lovelace',
            organisation_id: null,
            role: 'admin',
            status: 'disabled',
            created_at: '2026-04-17T09:00:00.000Z',
            updated_at: '2026-04-17T10:00:00.000Z',
          },
        ] as T[],
      };
    },
  };

  const result = await syncInternalUserFromClerkProfile(db, {
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
  });

  assert.equal(queries.length, 1);
  assert.match(queries[0]?.text ?? '', /ON CONFLICT \(clerk_user_id\) DO UPDATE/i);
  assert.doesNotMatch(queries[0]?.text ?? '', /SET[\s\S]*role = EXCLUDED\.role/i);
  assert.doesNotMatch(queries[0]?.text ?? '', /SET[\s\S]*status = EXCLUDED\.status/i);
  assert.deepEqual(queries[0]?.params, ['user_123', 'ada@example.com', 'Ada Lovelace']);
  assert.equal(result.role, 'admin');
  assert.equal(result.status, 'disabled');
});

test('disableInternalUserByClerkUserId marks the persisted user disabled without hard deletion', async () => {
  const queries: Array<{ text: string; params: readonly unknown[] | undefined }> = [];

  const db = {
    async query<T>(text: string, params?: readonly unknown[]) {
      queries.push({ text, params });

      return {
        rows: [
          {
            id: '00000000-0000-0000-0000-000000000123',
            clerk_user_id: 'user_123',
            email: 'ada@example.com',
            name: 'Ada Lovelace',
            organisation_id: null,
            role: 'user',
            status: 'disabled',
            created_at: '2026-04-17T09:00:00.000Z',
            updated_at: '2026-04-17T10:00:00.000Z',
          },
        ] as T[],
      };
    },
  };

  const result = await disableInternalUserByClerkUserId(db, 'user_123');

  assert.equal(queries.length, 1);
  assert.match(queries[0]?.text ?? '', /status = 'disabled'/i);
  assert.equal(result.status, 'disabled');
});
