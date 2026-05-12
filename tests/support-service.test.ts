import test from 'node:test';
import assert from 'node:assert/strict';

import type { Queryable } from '@/lib/engine/repository-sql';
import {
  createSupportService,
  SupportCaseClosedError,
  type SupportCategory,
  type SupportPriority,
  type SupportStatus,
} from '@/lib/server/support-service';
import type { RequestUserContext } from '@/lib/server/request-user';

type UserSeed = {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'user';
};

type CaseSeed = {
  id: string;
  public_reference: string;
  user_id: string;
  category: SupportCategory;
  subject: string;
  status: SupportStatus;
  priority: SupportPriority;
  assigned_admin_id: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  initial_message_snapshot: string;
};

type MessageSeed = {
  id: string;
  case_id: string;
  author_user_id: string | null;
  author_type: 'user' | 'admin' | 'system';
  body: string;
  is_internal_note: boolean;
  created_at: string;
};

function createRequestUser(seed: UserSeed): RequestUserContext {
  return {
    userId: seed.id,
    clerkUserId: `clerk-${seed.id}`,
    userEmail: seed.email,
    userName: seed.name,
    userRole: seed.role,
    userStatus: 'active',
    isAdmin: seed.role === 'admin',
  };
}

function timestamp(index: number): string {
  return `2026-05-12T10:${String(index).padStart(2, '0')}:00.000Z`;
}

function createSupportDb(initial?: {
  users?: UserSeed[];
  cases?: CaseSeed[];
  messages?: MessageSeed[];
}): Queryable & {
  cases: CaseSeed[];
  messages: MessageSeed[];
  events: Array<{
    case_id: string;
    actor_user_id: string | null;
    event_type: string;
    from_value: string | null;
    to_value: string | null;
  }>;
} {
  const users = initial?.users ?? [
    { id: 'user-1', email: 'user1@example.com', name: 'User One', role: 'user' },
    { id: 'user-2', email: 'user2@example.com', name: 'User Two', role: 'user' },
    { id: 'admin-1', email: 'admin@example.com', name: 'Admin One', role: 'admin' },
  ];
  const cases = [...(initial?.cases ?? [])];
  const messages = [...(initial?.messages ?? [])];
  const events: Array<{
    case_id: string;
    actor_user_id: string | null;
    event_type: string;
    from_value: string | null;
    to_value: string | null;
  }> = [];

  function toCaseRow(supportCase: CaseSeed) {
    const user = users.find((entry) => entry.id === supportCase.user_id);
    return {
      ...supportCase,
      user_email: user?.email ?? null,
      user_name: user?.name ?? null,
      latest_message_preview:
        [...messages]
          .filter((message) => message.case_id === supportCase.id && !message.is_internal_note)
          .sort((left, right) => right.created_at.localeCompare(left.created_at))[0]?.body ?? null,
    };
  }

  function filterCasesByParams(rows: CaseSeed[], params: readonly unknown[], offset: number): CaseSeed[] {
    let filtered = rows;
    for (const param of params.slice(offset)) {
      if (param === 'open' || param === 'waiting_on_sonartra' || param === 'waiting_on_user' || param === 'resolved' || param === 'closed') {
        filtered = filtered.filter((row) => row.status === param);
      }
      if (param === 'technical_issue' || param === 'account_support' || param === 'billing_access' || param === 'feedback' || param === 'general_question') {
        filtered = filtered.filter((row) => row.category === param);
      }
      if (param === 'low' || param === 'normal' || param === 'high' || param === 'urgent') {
        filtered = filtered.filter((row) => row.priority === param);
      }
    }
    return filtered;
  }

  const db = {
    cases,
    messages,
    events,
    async query<T>(text: string, params: unknown[] = []) {
      if (text.includes('LEFT JOIN LATERAL') && text.includes('WHERE sc.user_id = $1')) {
        const userId = String(params[0]);
        return {
          rows: filterCasesByParams(
            cases.filter((supportCase) => supportCase.user_id === userId),
            params,
            1,
          )
            .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
            .map(toCaseRow) as T[],
        };
      }

      if (text.includes('LEFT JOIN LATERAL') && text.includes('WHERE TRUE')) {
        return {
          rows: filterCasesByParams(cases, params, 0)
            .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
            .map(toCaseRow) as T[],
        };
      }

      if (text.includes('INNER JOIN users u ON u.id = sc.user_id') && text.includes('WHERE sc.public_reference = $1')) {
        const publicReference = String(params[0]);
        const supportCase = cases.find((row) => row.public_reference === publicReference);
        return { rows: supportCase ? ([toCaseRow(supportCase)] as T[]) : [] };
      }

      if (text.includes('WHERE sc.public_reference = $1') && text.includes('AND sc.user_id = $2')) {
        const [publicReference, userId] = params.map(String);
        const supportCase = cases.find(
          (row) => row.public_reference === publicReference && row.user_id === userId,
        );
        return { rows: supportCase ? ([toCaseRow(supportCase)] as T[]) : [] };
      }

      if (text.includes('FROM support_messages') && text.includes('WHERE case_id = $1')) {
        const caseId = String(params[0]);
        const includeInternalNotes = !text.includes('AND is_internal_note = FALSE');
        return {
          rows: messages
            .filter((message) => message.case_id === caseId)
            .filter((message) => includeInternalNotes || !message.is_internal_note)
            .sort((left, right) => left.created_at.localeCompare(right.created_at))
            .map((message) => ({
              id: message.id,
              author_type: message.author_type,
              body: message.body,
              is_internal_note: message.is_internal_note,
              created_at: message.created_at,
            })) as T[],
        };
      }

      if (text.includes('WITH inserted_case AS')) {
        const [userId, category, subject, body] = params.map(String);
        const caseNumber = cases.length + 1;
        const supportCase: CaseSeed = {
          id: `case-${caseNumber}`,
          public_reference: `SUP-${String(caseNumber).padStart(6, '0')}`,
          user_id: userId,
          category: category as SupportCategory,
          subject,
          status: 'open',
          priority: 'normal',
          assigned_admin_id: null,
          created_at: timestamp(caseNumber),
          updated_at: timestamp(caseNumber),
          resolved_at: null,
          closed_at: null,
          initial_message_snapshot: body,
        };
        const message: MessageSeed = {
          id: `message-${messages.length + 1}`,
          case_id: supportCase.id,
          author_user_id: userId,
          author_type: 'user',
          body,
          is_internal_note: false,
          created_at: timestamp(caseNumber),
        };
        cases.push(supportCase);
        messages.push(message);
        events.push({
          case_id: supportCase.id,
          actor_user_id: userId,
          event_type: 'case_created',
          from_value: null,
          to_value: 'open',
        });
        return {
          rows: [
            {
              ...toCaseRow(supportCase),
              message_id: message.id,
              message_author_type: message.author_type,
              message_body: message.body,
              message_is_internal_note: message.is_internal_note,
              message_created_at: message.created_at,
            },
          ] as T[],
        };
      }

      if (text.includes("'user_replied'")) {
        const [caseId, userId, nextStatus, body, fromStatus] = params.map(String);
        const supportCase = cases.find((row) => row.id === caseId);
        if (supportCase) {
          supportCase.status = nextStatus as SupportStatus;
          supportCase.updated_at = timestamp(messages.length + 1);
          messages.push({
            id: `message-${messages.length + 1}`,
            case_id: caseId,
            author_user_id: userId,
            author_type: 'user',
            body,
            is_internal_note: false,
            created_at: supportCase.updated_at,
          });
          events.push({
            case_id: caseId,
            actor_user_id: userId,
            event_type: 'user_replied',
            from_value: fromStatus,
            to_value: nextStatus,
          });
        }
        return { rows: [] as T[] };
      }

      if (text.includes("'admin_replied'")) {
        const [caseId, adminId, nextStatus, body, fromStatus] = params.map(String);
        const supportCase = cases.find((row) => row.id === caseId);
        if (supportCase) {
          supportCase.status = nextStatus as SupportStatus;
          supportCase.updated_at = timestamp(messages.length + 1);
          messages.push({
            id: `message-${messages.length + 1}`,
            case_id: caseId,
            author_user_id: adminId,
            author_type: 'admin',
            body,
            is_internal_note: false,
            created_at: supportCase.updated_at,
          });
          events.push({
            case_id: caseId,
            actor_user_id: adminId,
            event_type: 'admin_replied',
            from_value: fromStatus,
            to_value: nextStatus,
          });
        }
        return { rows: [] as T[] };
      }

      if (text.includes("'internal_note_added'")) {
        const [caseId, adminId, body] = params.map(String);
        const supportCase = cases.find((row) => row.id === caseId);
        if (supportCase) {
          supportCase.updated_at = timestamp(messages.length + 1);
          messages.push({
            id: `message-${messages.length + 1}`,
            case_id: caseId,
            author_user_id: adminId,
            author_type: 'admin',
            body,
            is_internal_note: true,
            created_at: supportCase.updated_at,
          });
          events.push({
            case_id: caseId,
            actor_user_id: adminId,
            event_type: 'internal_note_added',
            from_value: null,
            to_value: null,
          });
        }
        return { rows: [] as T[] };
      }

      if (text.includes("'status_changed'")) {
        const [caseId, status, adminId, fromStatus] = params.map(String);
        const supportCase = cases.find((row) => row.id === caseId);
        if (supportCase) {
          supportCase.status = status as SupportStatus;
          supportCase.updated_at = timestamp(messages.length + 1);
          if (status === 'resolved' && !supportCase.resolved_at) {
            supportCase.resolved_at = supportCase.updated_at;
          }
          if (status === 'closed' && !supportCase.closed_at) {
            supportCase.closed_at = supportCase.updated_at;
          }
          events.push({
            case_id: caseId,
            actor_user_id: adminId,
            event_type: 'status_changed',
            from_value: fromStatus,
            to_value: status,
          });
        }
        return { rows: [] as T[] };
      }

      if (text.includes("'priority_changed'")) {
        const [caseId, priority, adminId, fromPriority] = params.map(String);
        const supportCase = cases.find((row) => row.id === caseId);
        if (supportCase) {
          supportCase.priority = priority as SupportPriority;
          supportCase.updated_at = timestamp(messages.length + 1);
          events.push({
            case_id: caseId,
            actor_user_id: adminId,
            event_type: 'priority_changed',
            from_value: fromPriority,
            to_value: priority,
          });
        }
        return { rows: [] as T[] };
      }

      throw new Error(`Unhandled query in support-service test fake: ${text}`);
    },
  };

  return db;
}

function createSeedDb() {
  return createSupportDb({
    cases: [
      {
        id: 'case-1',
        public_reference: 'SUP-000001',
        user_id: 'user-1',
        category: 'technical_issue',
        subject: 'Cannot open report',
        status: 'waiting_on_user',
        priority: 'normal',
        assigned_admin_id: null,
        created_at: timestamp(1),
        updated_at: timestamp(3),
        resolved_at: null,
        closed_at: null,
        initial_message_snapshot: 'Initial issue',
      },
      {
        id: 'case-2',
        public_reference: 'SUP-000002',
        user_id: 'user-2',
        category: 'billing_access',
        subject: 'Billing access',
        status: 'open',
        priority: 'high',
        assigned_admin_id: null,
        created_at: timestamp(2),
        updated_at: timestamp(2),
        resolved_at: null,
        closed_at: null,
        initial_message_snapshot: 'Billing question',
      },
      {
        id: 'case-3',
        public_reference: 'SUP-000003',
        user_id: 'user-1',
        category: 'general_question',
        subject: 'Closed case',
        status: 'closed',
        priority: 'low',
        assigned_admin_id: null,
        created_at: timestamp(1),
        updated_at: timestamp(4),
        resolved_at: null,
        closed_at: timestamp(4),
        initial_message_snapshot: 'Closed',
      },
    ],
    messages: [
      {
        id: 'message-1',
        case_id: 'case-1',
        author_user_id: 'user-1',
        author_type: 'user',
        body: 'Initial issue',
        is_internal_note: false,
        created_at: timestamp(1),
      },
      {
        id: 'message-2',
        case_id: 'case-1',
        author_user_id: 'admin-1',
        author_type: 'admin',
        body: 'Private triage',
        is_internal_note: true,
        created_at: timestamp(2),
      },
      {
        id: 'message-3',
        case_id: 'case-2',
        author_user_id: 'user-2',
        author_type: 'user',
        body: 'Billing question',
        is_internal_note: false,
        created_at: timestamp(2),
      },
    ],
  });
}

test('user can list only their own support cases', async () => {
  const db = createSeedDb();
  const service = createSupportService({
    db,
    requireCurrentUser: async () =>
      createRequestUser({ id: 'user-1', email: 'user1@example.com', name: 'User One', role: 'user' }),
    requireAdminUser: async () =>
      createRequestUser({ id: 'admin-1', email: 'admin@example.com', name: 'Admin One', role: 'admin' }),
  });

  const cases = await service.listCurrentUserSupportCases();

  assert.deepEqual(cases.map((supportCase) => supportCase.publicReference), ['SUP-000003', 'SUP-000001']);
  assert.ok(cases.every((supportCase) => supportCase.publicReference !== 'SUP-000002'));
});

test('user case detail excludes internal notes', async () => {
  const db = createSeedDb();
  const service = createSupportService({
    db,
    requireCurrentUser: async () =>
      createRequestUser({ id: 'user-1', email: 'user1@example.com', name: 'User One', role: 'user' }),
    requireAdminUser: async () =>
      createRequestUser({ id: 'admin-1', email: 'admin@example.com', name: 'Admin One', role: 'admin' }),
  });

  const detail = await service.getCurrentUserSupportCase('SUP-000001');

  assert.equal(detail?.publicReference, 'SUP-000001');
  assert.deepEqual(detail?.messages.map((message) => message.body), ['Initial issue']);
  assert.ok(detail?.messages.every((message) => !message.isInternalNote));
});

test('create case creates a case, initial message, and event', async () => {
  const db = createSupportDb();
  const service = createSupportService({
    db,
    requireCurrentUser: async () =>
      createRequestUser({ id: 'user-1', email: 'user1@example.com', name: 'User One', role: 'user' }),
    requireAdminUser: async () =>
      createRequestUser({ id: 'admin-1', email: 'admin@example.com', name: 'Admin One', role: 'admin' }),
  });

  const detail = await service.createSupportCase({
    category: 'technical_issue',
    subject: 'Runner problem',
    body: 'The page did not submit.',
  });

  assert.equal(detail.publicReference, 'SUP-000001');
  assert.equal(detail.status, 'open');
  assert.equal(detail.priority, 'normal');
  assert.deepEqual(detail.messages.map((message) => message.body), ['The page did not submit.']);
  assert.equal(db.cases.length, 1);
  assert.equal(db.messages.length, 1);
  assert.equal(db.events[0]?.event_type, 'case_created');
});

test('user cannot reply to a closed case', async () => {
  const db = createSeedDb();
  const service = createSupportService({
    db,
    requireCurrentUser: async () =>
      createRequestUser({ id: 'user-1', email: 'user1@example.com', name: 'User One', role: 'user' }),
    requireAdminUser: async () =>
      createRequestUser({ id: 'admin-1', email: 'admin@example.com', name: 'Admin One', role: 'admin' }),
  });

  await assert.rejects(
    () =>
      service.addCurrentUserSupportMessage({
        publicReference: 'SUP-000003',
        body: 'Can I reopen this?',
      }),
    SupportCaseClosedError,
  );
});

test('user reply moves waiting_on_user cases back to waiting_on_sonartra', async () => {
  const db = createSeedDb();
  const service = createSupportService({
    db,
    requireCurrentUser: async () =>
      createRequestUser({ id: 'user-1', email: 'user1@example.com', name: 'User One', role: 'user' }),
    requireAdminUser: async () =>
      createRequestUser({ id: 'admin-1', email: 'admin@example.com', name: 'Admin One', role: 'admin' }),
  });

  const detail = await service.addCurrentUserSupportMessage({
    publicReference: 'SUP-000001',
    body: 'Here is more context.',
  });

  assert.equal(detail.status, 'waiting_on_sonartra');
  assert.deepEqual(detail.messages.map((message) => message.body), ['Initial issue', 'Here is more context.']);
  assert.equal(db.events.at(-1)?.event_type, 'user_replied');
});

test('admin can list cases and see user metadata', async () => {
  const db = createSeedDb();
  const service = createSupportService({
    db,
    requireCurrentUser: async () =>
      createRequestUser({ id: 'user-1', email: 'user1@example.com', name: 'User One', role: 'user' }),
    requireAdminUser: async () =>
      createRequestUser({ id: 'admin-1', email: 'admin@example.com', name: 'Admin One', role: 'admin' }),
  });

  const cases = await service.listAdminSupportCases({ priority: 'high' });

  assert.deepEqual(cases.map((supportCase) => supportCase.publicReference), ['SUP-000002']);
  assert.equal(cases[0]?.userEmail, 'user2@example.com');
});

test('admin can add public replies and internal notes', async () => {
  const db = createSeedDb();
  const service = createSupportService({
    db,
    requireCurrentUser: async () =>
      createRequestUser({ id: 'user-1', email: 'user1@example.com', name: 'User One', role: 'user' }),
    requireAdminUser: async () =>
      createRequestUser({ id: 'admin-1', email: 'admin@example.com', name: 'Admin One', role: 'admin' }),
  });

  const withReply = await service.addAdminSupportReply({
    publicReference: 'SUP-000001',
    body: 'Please try again.',
  });
  assert.equal(withReply.status, 'waiting_on_user');
  assert.ok(withReply.messages.some((message) => message.body === 'Please try again.' && !message.isInternalNote));

  const withNote = await service.addAdminInternalNote({
    publicReference: 'SUP-000001',
    body: 'Escalated after repro.',
  });
  assert.ok(withNote.messages.some((message) => message.body === 'Escalated after repro.' && message.isInternalNote));

  const userDetail = await service.getCurrentUserSupportCase('SUP-000001');
  assert.ok(!userDetail?.messages.some((message) => message.body === 'Escalated after repro.'));
});

test('admin can update status and priority', async () => {
  const db = createSeedDb();
  const service = createSupportService({
    db,
    requireCurrentUser: async () =>
      createRequestUser({ id: 'user-1', email: 'user1@example.com', name: 'User One', role: 'user' }),
    requireAdminUser: async () =>
      createRequestUser({ id: 'admin-1', email: 'admin@example.com', name: 'Admin One', role: 'admin' }),
  });

  const resolved = await service.updateAdminSupportCaseStatus({
    publicReference: 'SUP-000001',
    status: 'resolved',
  });
  assert.equal(resolved.status, 'resolved');
  assert.ok(resolved.resolvedAt);

  const urgent = await service.updateAdminSupportCasePriority({
    publicReference: 'SUP-000001',
    priority: 'urgent',
  });
  assert.equal(urgent.priority, 'urgent');
  assert.equal(db.events.at(-1)?.event_type, 'priority_changed');
});
