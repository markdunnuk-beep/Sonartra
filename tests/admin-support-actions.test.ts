import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  addAdminInternalNoteActionWithDependencies,
  addAdminSupportReplyActionWithDependencies,
  updateAdminSupportPriorityActionWithDependencies,
  updateAdminSupportStatusActionWithDependencies,
} from '@/lib/server/support-admin-actions';
import type { AdminSupportCaseDetail } from '@/lib/server/support-service';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

function createFormData(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

function createAdminSupportCaseDetail(
  publicReference: string,
  overrides: Partial<AdminSupportCaseDetail> = {},
): AdminSupportCaseDetail {
  return {
    publicReference,
    internalId: 'support-case-1',
    userId: 'user-1',
    userEmail: 'qa-user@sonartra.local',
    userName: 'QA User',
    assignedAdminId: null,
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
      {
        id: 'message-2',
        authorType: 'admin',
        body: 'Check linked workspace state.',
        isInternalNote: true,
        createdAt: '2026-05-12T10:03:00.000Z',
      },
    ],
    ...overrides,
  };
}

function createDependencies(overrides: Partial<{
  addAdminSupportReply(input: { publicReference: string; body: string }): Promise<AdminSupportCaseDetail>;
  addAdminInternalNote(input: { publicReference: string; body: string }): Promise<AdminSupportCaseDetail>;
  updateAdminSupportCaseStatus(input: { publicReference: string; status: AdminSupportCaseDetail['status'] }): Promise<AdminSupportCaseDetail>;
  updateAdminSupportCasePriority(input: { publicReference: string; priority: AdminSupportCaseDetail['priority'] }): Promise<AdminSupportCaseDetail>;
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

test('admin support detail route renders case metadata, controls, and full thread', () => {
  const detailSource = readSource('app/(admin)/admin/support/[caseReference]/page.tsx');
  const formSource = readSource('components/admin/support-case-action-forms.tsx');
  const layoutSource = readSource('app/(admin)/layout.tsx');

  assert.match(detailSource, /getAdminSupportCase/);
  assert.match(detailSource, /caseReference/);
  assert.match(detailSource, /notFound\(\)/);
  assert.match(detailSource, /Back to support queue/);
  assert.match(detailSource, /supportCase\.publicReference/);
  assert.match(detailSource, /supportCase\.subject/);
  assert.match(detailSource, /supportCase\.userEmail/);
  assert.match(detailSource, /formatSupportCategory/);
  assert.match(detailSource, /formatAdminSupportStatus/);
  assert.match(detailSource, /formatSupportPriority/);
  assert.match(detailSource, /supportCase\.resolvedAt/);
  assert.match(detailSource, /supportCase\.closedAt/);
  assert.match(detailSource, /Admin support case message thread/);
  assert.match(detailSource, /Internal note/);
  assert.match(detailSource, /Admin only/);
  assert.match(detailSource, /AdminSupportReplyForm/);
  assert.match(detailSource, /AdminSupportInternalNoteForm/);
  assert.match(detailSource, /AdminSupportStatusForm/);
  assert.match(detailSource, /AdminSupportPriorityForm/);
  assert.match(formSource, /Send public reply/);
  assert.match(formSource, /Save internal note/);
  assert.match(formSource, /Update status/);
  assert.match(formSource, /Update priority/);
  assert.match(layoutSource, /requireAdminRequestUserContext/);

  assert.doesNotMatch(detailSource, /sendEmail|smtp|resend|postmark|zendesk|intercom|freshdesk|MCP|SLA/i);
  assert.doesNotMatch(detailSource, /canonical_result_payload|optionSignalWeights|scoreAssessment|normalizeScores/);
});

test('admin public reply action validates empty body', async () => {
  const state = await addAdminSupportReplyActionWithDependencies(
    createFormData({ caseReference: 'SUP-000001', body: '   ' }),
    createDependencies(),
  );

  assert.equal(state.ok, false);
  assert.equal(state.formError, 'Review the highlighted field and try again.');
  assert.equal(state.fieldErrors.body, 'Add a message before saving.');
});

test('admin public reply action calls service and refreshes admin routes', async () => {
  const calls: Array<{ publicReference: string; body: string }> = [];
  const revalidated: string[] = [];
  const redirects: string[] = [];

  await addAdminSupportReplyActionWithDependencies(
    createFormData({ caseReference: 'sup-000001', body: '  We are checking this now. ' }),
    createDependencies({
      async addAdminSupportReply(input) {
        calls.push(input);
        return createAdminSupportCaseDetail('SUP-000001');
      },
      revalidatePath(path) {
        revalidated.push(path);
      },
      redirect(path) {
        redirects.push(path);
      },
    }),
  );

  assert.deepEqual(calls, [
    {
      publicReference: 'SUP-000001',
      body: 'We are checking this now.',
    },
  ]);
  assert.deepEqual(revalidated, ['/admin/support', '/admin/support/SUP-000001']);
  assert.deepEqual(redirects, ['/admin/support/SUP-000001']);
});

test('admin internal note action validates and calls service', async () => {
  const emptyState = await addAdminInternalNoteActionWithDependencies(
    createFormData({ caseReference: 'SUP-000001', body: '' }),
    createDependencies(),
  );
  assert.equal(emptyState.fieldErrors.body, 'Add a message before saving.');

  const calls: Array<{ publicReference: string; body: string }> = [];
  await addAdminInternalNoteActionWithDependencies(
    createFormData({ caseReference: 'SUP-000001', body: '  Admin-only context. ' }),
    createDependencies({
      async addAdminInternalNote(input) {
        calls.push(input);
        return createAdminSupportCaseDetail('SUP-000001');
      },
    }),
  );

  assert.deepEqual(calls, [
    {
      publicReference: 'SUP-000001',
      body: 'Admin-only context.',
    },
  ]);
});

test('admin status and priority actions validate controlled values', async () => {
  const invalidStatus = await updateAdminSupportStatusActionWithDependencies(
    createFormData({ caseReference: 'SUP-000001', status: 'not_a_status' }),
    createDependencies(),
  );
  assert.equal(invalidStatus.fieldErrors.status, 'Choose a valid status.');

  const invalidPriority = await updateAdminSupportPriorityActionWithDependencies(
    createFormData({ caseReference: 'SUP-000001', priority: 'not_a_priority' }),
    createDependencies(),
  );
  assert.equal(invalidPriority.fieldErrors.priority, 'Choose a valid priority.');
});

test('admin status and priority actions call services for valid values', async () => {
  const statusCalls: Array<{ publicReference: string; status: AdminSupportCaseDetail['status'] }> = [];
  const priorityCalls: Array<{ publicReference: string; priority: AdminSupportCaseDetail['priority'] }> = [];

  await updateAdminSupportStatusActionWithDependencies(
    createFormData({ caseReference: 'SUP-000001', status: 'resolved' }),
    createDependencies({
      async updateAdminSupportCaseStatus(input) {
        statusCalls.push(input);
        return createAdminSupportCaseDetail('SUP-000001', { status: 'resolved' });
      },
    }),
  );

  await updateAdminSupportPriorityActionWithDependencies(
    createFormData({ caseReference: 'SUP-000001', priority: 'urgent' }),
    createDependencies({
      async updateAdminSupportCasePriority(input) {
        priorityCalls.push(input);
        return createAdminSupportCaseDetail('SUP-000001', { priority: 'urgent' });
      },
    }),
  );

  assert.deepEqual(statusCalls, [{ publicReference: 'SUP-000001', status: 'resolved' }]);
  assert.deepEqual(priorityCalls, [{ publicReference: 'SUP-000001', priority: 'urgent' }]);
});
