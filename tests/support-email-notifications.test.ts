import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addAdminInternalNoteActionWithDependencies,
  addAdminSupportReplyActionWithDependencies,
  updateAdminSupportPriorityActionWithDependencies,
  updateAdminSupportStatusActionWithDependencies,
} from '@/lib/server/support-admin-actions';
import {
  sendSupportCaseCreatedUserEmailWithDependencies,
  sendSupportEmailWithDependencies,
  type SupportEmailSendRequest,
} from '@/lib/server/support-email-notifications';
import { createSupportRequestActionWithDependencies } from '@/lib/server/support-request-actions';
import { addSupportReplyActionWithDependencies } from '@/lib/server/support-reply-actions';
import type {
  AdminSupportCaseDetail,
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
    messages: [],
  };
}

function createAdminSupportCaseDetail(
  publicReference: string,
  overrides: Partial<AdminSupportCaseDetail> = {},
): AdminSupportCaseDetail {
  return {
    ...createSupportCaseDetail(publicReference),
    internalId: 'support-case-1',
    userId: 'user-1',
    userEmail: 'user@example.com',
    userName: 'User One',
    assignedAdminId: null,
    status: 'waiting_on_sonartra',
    ...overrides,
  };
}

function createEmailResult() {
  return {
    ok: true as const,
    skipped: false as const,
  };
}

function createAdminDependencies(overrides: Partial<{
  addAdminSupportReply(input: { publicReference: string; body: string }): Promise<AdminSupportCaseDetail>;
  addAdminInternalNote(input: { publicReference: string; body: string }): Promise<AdminSupportCaseDetail>;
  updateAdminSupportCaseStatus(input: { publicReference: string; status: AdminSupportCaseDetail['status'] }): Promise<AdminSupportCaseDetail>;
  updateAdminSupportCasePriority(input: { publicReference: string; priority: AdminSupportCaseDetail['priority'] }): Promise<AdminSupportCaseDetail>;
  sendSupportAdminReplyUserEmail(input: { supportCase: AdminSupportCaseDetail; messagePreview: string }): Promise<ReturnType<typeof createEmailResult>>;
  sendSupportCaseStatusChangedUserEmail(input: { supportCase: AdminSupportCaseDetail; status: AdminSupportCaseDetail['status'] }): Promise<ReturnType<typeof createEmailResult>>;
  revalidatePath(path: string): void;
  redirect(path: string): never | void;
}> = {}) {
  return {
    async addAdminSupportReply() {
      throw new Error('addAdminSupportReply should not be called');
    },
    async addAdminInternalNote() {
      throw new Error('addAdminInternalNote should not be called');
    },
    async updateAdminSupportCaseStatus() {
      throw new Error('updateAdminSupportCaseStatus should not be called');
    },
    async updateAdminSupportCasePriority() {
      throw new Error('updateAdminSupportCasePriority should not be called');
    },
    revalidatePath() {},
    redirect() {},
    ...overrides,
  };
}

test('support email helper sends through Resend without exposing the API key in content', async () => {
  const requests: Array<{
    url: string;
    init: RequestInit;
  }> = [];
  const secret = 're_test_secret_value';

  const result = await sendSupportEmailWithDependencies(
    {
      to: 'user@example.com',
      subject: 'Subject',
      text: 'Please open your support request in Sonartra to reply.',
      html: '<p>Please open your support request in Sonartra to reply.</p>',
    },
    {
      env: {
        RESEND_API_KEY: secret,
        SUPPORT_EMAIL_FROM: 'Sonartra Support <support@mail.sonartra.com>',
        APP_BASE_URL: 'http://localhost:3000',
      },
      async fetch(url, init) {
        requests.push({ url: String(url), init: init ?? {} });
        return new Response('{}', { status: 200 });
      },
      logger: {
        error() {},
        warn() {},
      },
    },
  );

  assert.equal(result.ok, true);
  assert.equal(requests.length, 1);
  assert.equal(requests[0]?.url, 'https://api.resend.com/emails');
  assert.equal((requests[0]?.init.headers as Record<string, string>).Authorization, `Bearer ${secret}`);
  assert.doesNotMatch(String(requests[0]?.init.body), new RegExp(secret));
});

test('support email helper skips safely when config is missing', async () => {
  const warnings: string[] = [];
  const result = await sendSupportEmailWithDependencies(
    {
      to: 'user@example.com',
      subject: 'Subject',
      text: 'Body',
      html: '<p>Body</p>',
    },
    {
      env: {
        SUPPORT_EMAIL_FROM: 'Sonartra Support <support@mail.sonartra.com>',
        APP_BASE_URL: 'http://localhost:3000',
      },
      async fetch() {
        throw new Error('fetch should not be called');
      },
      logger: {
        error() {},
        warn(_message, reason) {
          warnings.push(String(reason));
        },
      },
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'missing_resend_api_key');
  assert.deepEqual(warnings, ['missing_resend_api_key']);
});

test('case created email uses APP_BASE_URL, public reference, and Sonartra reply instruction', async () => {
  const sent: SupportEmailSendRequest[] = [];

  await sendSupportCaseCreatedUserEmailWithDependencies(
    {
      supportCase: createSupportCaseDetail('SUP-000123'),
      userEmail: 'user@example.com',
      messagePreview: 'The runner did not submit.',
    },
    {
      env: {
        RESEND_API_KEY: 're_test_secret_value',
        SUPPORT_EMAIL_FROM: 'Sonartra Support <support@mail.sonartra.com>',
        APP_BASE_URL: 'http://localhost:3000',
      },
      async fetch(_url, init) {
        const body = JSON.parse(String(init?.body));
        sent.push({
          to: body.to[0],
          subject: body.subject,
          text: body.text,
          html: body.html,
        });
        return new Response('{}', { status: 200 });
      },
      logger: {
        error() {},
        warn() {},
      },
    },
  );

  assert.equal(sent[0]?.to, 'user@example.com');
  assert.match(sent[0]?.text ?? '', /SUP-000123/);
  assert.match(sent[0]?.text ?? '', /http:\/\/localhost:3000\/app\/support\/SUP-000123/);
  assert.match(sent[0]?.text ?? '', /Please open your support request in Sonartra to reply\./);
});

test('case creation sends user and admin notifications after successful create only', async () => {
  const notifications: string[] = [];
  const createCalls: Array<{ category: SupportCategory; subject: string; body: string }> = [];

  const success = await createSupportRequestActionWithDependencies(
    createFormData({
      category: 'technical_issue',
      subject: 'Runner problem',
      description: 'The runner did not submit.',
    }),
    {
      async createSupportCase(input) {
        createCalls.push(input);
        return createSupportCaseDetail('SUP-000123');
      },
      async getCurrentUserEmail() {
        return 'user@example.com';
      },
      async sendSupportCaseCreatedUserEmail(input) {
        notifications.push(`user:${input.userEmail}:${input.supportCase.publicReference}`);
        return createEmailResult();
      },
      async sendSupportCaseCreatedAdminEmail(input) {
        notifications.push(`admin:${input.supportCase.publicReference}:${input.messagePreview}`);
        return createEmailResult();
      },
      revalidatePath() {},
    },
  );

  const invalid = await createSupportRequestActionWithDependencies(
    createFormData({ category: '', subject: '', description: '' }),
    {
      async createSupportCase() {
        throw new Error('should not be called');
      },
      async sendSupportCaseCreatedUserEmail() {
        throw new Error('should not be called');
      },
      async sendSupportCaseCreatedAdminEmail() {
        throw new Error('should not be called');
      },
      revalidatePath() {},
    },
  );

  assert.equal(success.ok, true);
  assert.equal(createCalls.length, 1);
  assert.deepEqual(notifications, [
    'user:user@example.com:SUP-000123',
    'admin:SUP-000123:The runner did not submit.',
  ]);
  assert.equal(invalid.ok, false);
});

test('provider failure does not fail a successful case creation action', async () => {
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    const state = await createSupportRequestActionWithDependencies(
      createFormData({
        category: 'technical_issue',
        subject: 'Runner problem',
        description: 'The runner did not submit.',
      }),
      {
        async createSupportCase() {
          return createSupportCaseDetail('SUP-000123');
        },
        async getCurrentUserEmail() {
          return 'user@example.com';
        },
        async sendSupportCaseCreatedUserEmail() {
          throw new Error('provider unavailable');
        },
        async sendSupportCaseCreatedAdminEmail() {
          return { ok: false, skipped: false, reason: 'provider_unavailable' };
        },
        revalidatePath() {},
      },
    );

    assert.equal(state.ok, true);
    assert.equal(state.publicReference, 'SUP-000123');
  } finally {
    console.error = originalConsoleError;
  }
});

test('user reply sends admin notification after successful reply only', async () => {
  const notifications: string[] = [];
  await addSupportReplyActionWithDependencies(
    createFormData({ caseReference: 'SUP-000123', body: '  Here is more detail. ' }),
    {
      async addCurrentUserSupportMessage(input) {
        return {
          ...createSupportCaseDetail(input.publicReference),
          status: 'waiting_on_sonartra',
        };
      },
      async sendSupportUserReplyAdminEmail(input) {
        notifications.push(`${input.supportCase.publicReference}:${input.messagePreview}`);
        return createEmailResult();
      },
      revalidatePath() {},
      redirect() {},
    },
  );

  const invalid = await addSupportReplyActionWithDependencies(
    createFormData({ caseReference: 'SUP-000123', body: ' ' }),
    {
      async addCurrentUserSupportMessage() {
        throw new Error('should not be called');
      },
      async sendSupportUserReplyAdminEmail() {
        throw new Error('should not be called');
      },
      revalidatePath() {},
      redirect() {},
    },
  );

  assert.deepEqual(notifications, ['SUP-000123:Here is more detail.']);
  assert.equal(invalid.ok, false);
});

test('admin public reply sends user notification and internal note sends no email', async () => {
  const notifications: string[] = [];

  await addAdminSupportReplyActionWithDependencies(
    createFormData({ caseReference: 'SUP-000123', body: '  We are checking this. ' }),
    createAdminDependencies({
      async addAdminSupportReply(input) {
        return createAdminSupportCaseDetail(input.publicReference);
      },
      async sendSupportAdminReplyUserEmail(input) {
        notifications.push(`${input.supportCase.userEmail}:${input.messagePreview}`);
        return createEmailResult();
      },
    }),
  );

  await addAdminInternalNoteActionWithDependencies(
    createFormData({ caseReference: 'SUP-000123', body: '  Private context. ' }),
    createAdminDependencies({
      async addAdminInternalNote(input) {
        return createAdminSupportCaseDetail(input.publicReference);
      },
      async sendSupportAdminReplyUserEmail() {
        throw new Error('should not be called');
      },
    }),
  );

  assert.deepEqual(notifications, ['user@example.com:We are checking this.']);
});

test('resolved and closed status updates send user notifications, priority update sends none', async () => {
  const statusNotifications: string[] = [];

  await updateAdminSupportStatusActionWithDependencies(
    createFormData({ caseReference: 'SUP-000123', status: 'resolved' }),
    createAdminDependencies({
      async updateAdminSupportCaseStatus(input) {
        return createAdminSupportCaseDetail(input.publicReference, { status: input.status });
      },
      async sendSupportCaseStatusChangedUserEmail(input) {
        statusNotifications.push(`${input.supportCase.publicReference}:${input.status}`);
        return createEmailResult();
      },
    }),
  );

  await updateAdminSupportStatusActionWithDependencies(
    createFormData({ caseReference: 'SUP-000123', status: 'closed' }),
    createAdminDependencies({
      async updateAdminSupportCaseStatus(input) {
        return createAdminSupportCaseDetail(input.publicReference, { status: input.status });
      },
      async sendSupportCaseStatusChangedUserEmail(input) {
        statusNotifications.push(`${input.supportCase.publicReference}:${input.status}`);
        return createEmailResult();
      },
    }),
  );

  await updateAdminSupportStatusActionWithDependencies(
    createFormData({ caseReference: 'SUP-000123', status: 'waiting_on_user' }),
    createAdminDependencies({
      async updateAdminSupportCaseStatus(input) {
        return createAdminSupportCaseDetail(input.publicReference, { status: input.status });
      },
      async sendSupportCaseStatusChangedUserEmail() {
        throw new Error('should not be called');
      },
    }),
  );

  await updateAdminSupportPriorityActionWithDependencies(
    createFormData({ caseReference: 'SUP-000123', priority: 'urgent' }),
    createAdminDependencies({
      async updateAdminSupportCasePriority(input) {
        return createAdminSupportCaseDetail(input.publicReference, { priority: input.priority });
      },
      async sendSupportCaseStatusChangedUserEmail() {
        throw new Error('should not be called');
      },
    }),
  );

  assert.deepEqual(statusNotifications, ['SUP-000123:resolved', 'SUP-000123:closed']);
});
