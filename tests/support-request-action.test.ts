import test from 'node:test';
import assert from 'node:assert/strict';

import { createSupportRequestActionWithDependencies } from '@/lib/server/support-request-actions';
import type {
  SupportCaseDetail,
  SupportCategory,
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
    status: 'open',
    priority: 'normal',
    createdAt: '2026-05-12T10:00:00.000Z',
    updatedAt: '2026-05-12T10:00:00.000Z',
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

test('support request action rejects missing required fields', async () => {
  const calls: unknown[] = [];

  const state = await createSupportRequestActionWithDependencies(
    createFormData({ category: '', subject: '   ', description: '' }),
    {
      async createSupportCase(input) {
        calls.push(input);
        return createSupportCaseDetail('SUP-000001');
      },
      revalidatePath() {},
    },
  );

  assert.equal(state.ok, false);
  assert.equal(state.formError, 'Review the highlighted fields and try again.');
  assert.equal(state.fieldErrors.category, 'Choose a support category.');
  assert.equal(state.fieldErrors.subject, 'Add a short subject.');
  assert.equal(state.fieldErrors.description, 'Describe what you need help with.');
  assert.deepEqual(calls, []);
});

test('support request action rejects invalid category', async () => {
  const state = await createSupportRequestActionWithDependencies(
    createFormData({
      category: 'zendesk_escalation',
      subject: 'Help',
      description: 'I need help.',
    }),
    {
      async createSupportCase() {
        throw new Error('should not be called');
      },
      revalidatePath() {},
    },
  );

  assert.equal(state.ok, false);
  assert.equal(state.fieldErrors.category, 'Choose a valid support category.');
});

test('support request action trims input and calls create support service path', async () => {
  const calls: Array<{
    category: SupportCategory;
    subject: string;
    body: string;
  }> = [];
  const revalidated: string[] = [];

  const state = await createSupportRequestActionWithDependencies(
    createFormData({
      category: 'technical_issue',
      subject: '  Runner problem  ',
      description: '  The runner did not submit.  ',
    }),
    {
      async createSupportCase(input) {
        calls.push(input);
        return createSupportCaseDetail('SUP-000123');
      },
      revalidatePath(path) {
        revalidated.push(path);
      },
    },
  );

  assert.equal(state.ok, true);
  assert.equal(state.publicReference, 'SUP-000123');
  assert.equal(state.message, 'Support request SUP-000123 created.');
  assert.deepEqual(calls, [
    {
      category: 'technical_issue',
      subject: 'Runner problem',
      body: 'The runner did not submit.',
    },
  ]);
  assert.deepEqual(revalidated, ['/app/support']);
});

test('support request action preserves values after service failure', async () => {
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    const state = await createSupportRequestActionWithDependencies(
      createFormData({
        category: 'general_question',
        subject: 'Question',
        description: 'Can you help?',
      }),
      {
        async createSupportCase() {
          throw new Error('database unavailable');
        },
        revalidatePath() {},
      },
    );

    assert.equal(state.ok, false);
    assert.equal(
      state.formError,
      'The support request could not be created. Try again, or contact Sonartra directly if the issue continues.',
    );
    assert.deepEqual(state.values, {
      category: 'general_question',
      subject: 'Question',
      description: 'Can you help?',
    });
  } finally {
    console.error = originalConsoleError;
  }
});
