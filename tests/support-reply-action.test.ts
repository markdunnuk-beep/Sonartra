import test from 'node:test';
import assert from 'node:assert/strict';

import { addSupportReplyActionWithDependencies } from '@/lib/server/support-reply-actions';
import {
  SupportCaseClosedError,
  type SupportCaseDetail,
} from '@/lib/server/support-service';

function createFormData(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

function createSupportCaseDetail(publicReference: string): SupportCaseDetail {
  return {
    publicReference,
    category: 'technical_issue',
    subject: 'Runner problem',
    status: 'waiting_on_sonartra',
    priority: 'normal',
    createdAt: '2026-05-12T10:00:00.000Z',
    updatedAt: '2026-05-12T10:05:00.000Z',
    resolvedAt: null,
    closedAt: null,
    messages: [
      {
        id: 'message-1',
        authorType: 'user',
        body: 'The runner did not submit.',
        isInternalNote: false,
        createdAt: '2026-05-12T10:00:00.000Z',
      },
    ],
  };
}

test('support reply action rejects empty body', async () => {
  const calls: unknown[] = [];

  const state = await addSupportReplyActionWithDependencies(
    createFormData({ caseReference: 'SUP-000001', body: '' }),
    {
      async addCurrentUserSupportMessage(input) {
        calls.push(input);
        return createSupportCaseDetail('SUP-000001');
      },
      revalidatePath() {},
      redirect() {},
    },
  );

  assert.equal(state.ok, false);
  assert.equal(state.formError, 'Review the highlighted field and try again.');
  assert.equal(state.fieldErrors.body, 'Add a reply before sending.');
  assert.deepEqual(calls, []);
});

test('support reply action rejects whitespace-only body', async () => {
  const state = await addSupportReplyActionWithDependencies(
    createFormData({ caseReference: 'SUP-000001', body: '   ' }),
    {
      async addCurrentUserSupportMessage() {
        throw new Error('should not be called');
      },
      revalidatePath() {},
      redirect() {},
    },
  );

  assert.equal(state.ok, false);
  assert.equal(state.fieldErrors.body, 'Add a reply before sending.');
});

test('support reply action sends valid body through service path and refreshes routes', async () => {
  const calls: Array<{ publicReference: string; body: string }> = [];
  const revalidated: string[] = [];
  const redirects: string[] = [];

  await addSupportReplyActionWithDependencies(
    createFormData({
      caseReference: 'sup-000123',
      body: '  I can reproduce this now.  ',
    }),
    {
      async addCurrentUserSupportMessage(input) {
        calls.push(input);
        return createSupportCaseDetail('SUP-000123');
      },
      revalidatePath(path) {
        revalidated.push(path);
      },
      redirect(path) {
        redirects.push(path);
      },
    },
  );

  assert.deepEqual(calls, [
    {
      publicReference: 'SUP-000123',
      body: 'I can reproduce this now.',
    },
  ]);
  assert.deepEqual(revalidated, ['/app/support', '/app/support/SUP-000123']);
  assert.deepEqual(redirects, ['/app/support/SUP-000123']);
});

test('support reply action returns closed-case error from service', async () => {
  const state = await addSupportReplyActionWithDependencies(
    createFormData({
      caseReference: 'SUP-000222',
      body: 'Can this be reopened?',
    }),
    {
      async addCurrentUserSupportMessage() {
        throw new SupportCaseClosedError();
      },
      revalidatePath() {},
      redirect() {},
    },
  );

  assert.equal(state.ok, false);
  assert.equal(
    state.formError,
    'This support request is closed. Create a new request if you need more help.',
  );
});
