import type { Queryable } from '@/lib/engine/repository-sql';
import { getDbPool } from '@/lib/server/db';
import { requireAdminUser } from '@/lib/server/admin-access';
import {
  requireCurrentUser,
  type RequestUserContext,
} from '@/lib/server/request-user';

export const SUPPORT_CATEGORIES = [
  'technical_issue',
  'account_support',
  'billing_access',
  'feedback',
  'general_question',
] as const;

export const SUPPORT_STATUSES = [
  'open',
  'waiting_on_sonartra',
  'waiting_on_user',
  'resolved',
  'closed',
] as const;

export const SUPPORT_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];
export type SupportPriority = (typeof SUPPORT_PRIORITIES)[number];
export type SupportMessageAuthorType = 'user' | 'admin' | 'system';

export type SupportCaseFilters = {
  status?: SupportStatus;
  category?: SupportCategory;
  priority?: SupportPriority;
};

export type SupportCaseSummary = {
  publicReference: string;
  category: SupportCategory;
  subject: string;
  status: SupportStatus;
  priority: SupportPriority;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  latestMessagePreview: string | null;
};

export type SupportCaseMessage = {
  id: string;
  authorType: SupportMessageAuthorType;
  body: string;
  isInternalNote: boolean;
  createdAt: string;
};

export type SupportCaseDetail = {
  publicReference: string;
  category: SupportCategory;
  subject: string;
  status: SupportStatus;
  priority: SupportPriority;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  messages: readonly SupportCaseMessage[];
};

export type AdminSupportCaseSummary = SupportCaseSummary & {
  internalId: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  assignedAdminId: string | null;
};

export type AdminSupportCaseDetail = SupportCaseDetail & {
  internalId: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  assignedAdminId: string | null;
};

export type CreateSupportCaseInput = {
  category: SupportCategory | string;
  subject: string;
  body: string;
};

export type AddSupportMessageInput = {
  publicReference: string;
  body: string;
};

export type UpdateSupportCaseStatusInput = {
  publicReference: string;
  status: SupportStatus | string;
};

export type UpdateSupportCasePriorityInput = {
  publicReference: string;
  priority: SupportPriority | string;
};

export class SupportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupportValidationError';
  }
}

export class SupportCaseNotFoundError extends Error {
  constructor() {
    super('Support case was not found');
    this.name = 'SupportCaseNotFoundError';
  }
}

export class SupportCaseClosedError extends Error {
  constructor() {
    super('Closed support cases cannot receive user replies');
    this.name = 'SupportCaseClosedError';
  }
}

type SupportCaseRow = {
  id: string;
  public_reference: string;
  user_id: string;
  user_email?: string | null;
  user_name?: string | null;
  category: SupportCategory;
  subject: string;
  status: SupportStatus;
  priority: SupportPriority;
  assigned_admin_id: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  latest_message_preview?: string | null;
};

type SupportMessageRow = {
  id: string;
  author_type: SupportMessageAuthorType;
  body: string;
  is_internal_note: boolean;
  created_at: string;
};

type CreatedSupportCaseRow = SupportCaseRow & {
  message_id: string;
  message_author_type: SupportMessageAuthorType;
  message_body: string;
  message_is_internal_note: boolean;
  message_created_at: string;
};

export type SupportServiceDependencies = {
  db: Queryable;
  requireCurrentUser(): Promise<RequestUserContext>;
  requireAdminUser(): Promise<RequestUserContext>;
};

function isSupportCategory(value: string): value is SupportCategory {
  return SUPPORT_CATEGORIES.includes(value as SupportCategory);
}

function isSupportStatus(value: string): value is SupportStatus {
  return SUPPORT_STATUSES.includes(value as SupportStatus);
}

function isSupportPriority(value: string): value is SupportPriority {
  return SUPPORT_PRIORITIES.includes(value as SupportPriority);
}

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new SupportValidationError(`${fieldName} is required`);
  }

  return normalized;
}

function normalizePublicReference(value: string): string {
  const normalized = normalizeRequiredText(value, 'publicReference').toUpperCase();

  if (!/^SUP-[0-9]{6,}$/.test(normalized)) {
    throw new SupportValidationError('publicReference is invalid');
  }

  return normalized;
}

function normalizeCategory(value: string): SupportCategory {
  if (!isSupportCategory(value)) {
    throw new SupportValidationError('category is invalid');
  }

  return value;
}

function normalizeStatus(value: string): SupportStatus {
  if (!isSupportStatus(value)) {
    throw new SupportValidationError('status is invalid');
  }

  return value;
}

function normalizePriority(value: string): SupportPriority {
  if (!isSupportPriority(value)) {
    throw new SupportValidationError('priority is invalid');
  }

  return value;
}

function buildFilterClause(filters: SupportCaseFilters | undefined, startIndex: number): {
  clause: string;
  values: string[];
} {
  const conditions: string[] = [];
  const values: string[] = [];

  if (filters?.status) {
    conditions.push(`sc.status = $${startIndex + values.length}`);
    values.push(normalizeStatus(filters.status));
  }

  if (filters?.category) {
    conditions.push(`sc.category = $${startIndex + values.length}`);
    values.push(normalizeCategory(filters.category));
  }

  if (filters?.priority) {
    conditions.push(`sc.priority = $${startIndex + values.length}`);
    values.push(normalizePriority(filters.priority));
  }

  return {
    clause: conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '',
    values,
  };
}

function mapCaseSummary(row: SupportCaseRow): SupportCaseSummary {
  return {
    publicReference: row.public_reference,
    category: row.category,
    subject: row.subject,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    closedAt: row.closed_at,
    latestMessagePreview: row.latest_message_preview ?? null,
  };
}

function mapAdminCaseSummary(row: SupportCaseRow): AdminSupportCaseSummary {
  return {
    ...mapCaseSummary(row),
    internalId: row.id,
    userId: row.user_id,
    userEmail: row.user_email ?? '',
    userName: row.user_name ?? null,
    assignedAdminId: row.assigned_admin_id,
  };
}

function mapMessage(row: SupportMessageRow): SupportCaseMessage {
  return {
    id: row.id,
    authorType: row.author_type,
    body: row.body,
    isInternalNote: row.is_internal_note,
    createdAt: row.created_at,
  };
}

function mapCaseDetail(params: {
  row: SupportCaseRow;
  messages: readonly SupportMessageRow[];
}): SupportCaseDetail {
  return {
    publicReference: params.row.public_reference,
    category: params.row.category,
    subject: params.row.subject,
    status: params.row.status,
    priority: params.row.priority,
    createdAt: params.row.created_at,
    updatedAt: params.row.updated_at,
    resolvedAt: params.row.resolved_at,
    closedAt: params.row.closed_at,
    messages: Object.freeze(params.messages.map(mapMessage)),
  };
}

function mapAdminCaseDetail(params: {
  row: SupportCaseRow;
  messages: readonly SupportMessageRow[];
}): AdminSupportCaseDetail {
  return {
    ...mapCaseDetail(params),
    internalId: params.row.id,
    userId: params.row.user_id,
    userEmail: params.row.user_email ?? '',
    userName: params.row.user_name ?? null,
    assignedAdminId: params.row.assigned_admin_id,
  };
}

async function loadUserCaseRow(params: {
  db: Queryable;
  userId: string;
  publicReference: string;
}): Promise<SupportCaseRow | null> {
  const result = await params.db.query<SupportCaseRow>(
    `
    SELECT
      sc.id,
      sc.public_reference,
      sc.user_id,
      sc.category,
      sc.subject,
      sc.status,
      sc.priority,
      sc.assigned_admin_id,
      sc.created_at,
      sc.updated_at,
      sc.resolved_at,
      sc.closed_at
    FROM support_cases sc
    WHERE sc.public_reference = $1
      AND sc.user_id = $2
    `,
    [params.publicReference, params.userId],
  );

  return result.rows[0] ?? null;
}

async function loadAdminCaseRow(params: {
  db: Queryable;
  publicReference: string;
}): Promise<SupportCaseRow | null> {
  const result = await params.db.query<SupportCaseRow>(
    `
    SELECT
      sc.id,
      sc.public_reference,
      sc.user_id,
      u.email AS user_email,
      u.name AS user_name,
      sc.category,
      sc.subject,
      sc.status,
      sc.priority,
      sc.assigned_admin_id,
      sc.created_at,
      sc.updated_at,
      sc.resolved_at,
      sc.closed_at
    FROM support_cases sc
    INNER JOIN users u ON u.id = sc.user_id
    WHERE sc.public_reference = $1
    `,
    [params.publicReference],
  );

  return result.rows[0] ?? null;
}

async function loadMessages(params: {
  db: Queryable;
  caseId: string;
  includeInternalNotes: boolean;
}): Promise<readonly SupportMessageRow[]> {
  const internalNoteClause = params.includeInternalNotes ? '' : 'AND is_internal_note = FALSE';
  const result = await params.db.query<SupportMessageRow>(
    `
    SELECT
      id,
      author_type,
      body,
      is_internal_note,
      created_at
    FROM support_messages
    WHERE case_id = $1
      ${internalNoteClause}
    ORDER BY created_at ASC, id ASC
    `,
    [params.caseId],
  );

  return result.rows;
}

export function createSupportService(deps: SupportServiceDependencies) {
  async function listCurrentUserSupportCases(
    filters?: SupportCaseFilters,
  ): Promise<readonly SupportCaseSummary[]> {
    const user = await deps.requireCurrentUser();
    const filter = buildFilterClause(filters, 2);

    const result = await deps.db.query<SupportCaseRow>(
      `
      SELECT
        sc.id,
        sc.public_reference,
        sc.user_id,
        sc.category,
        sc.subject,
        sc.status,
        sc.priority,
        sc.assigned_admin_id,
        sc.created_at,
        sc.updated_at,
        sc.resolved_at,
        sc.closed_at,
        latest_message.body AS latest_message_preview
      FROM support_cases sc
      LEFT JOIN LATERAL (
        SELECT sm.body
        FROM support_messages sm
        WHERE sm.case_id = sc.id
          AND sm.is_internal_note = FALSE
        ORDER BY sm.created_at DESC, sm.id DESC
        LIMIT 1
      ) latest_message ON TRUE
      WHERE sc.user_id = $1
        ${filter.clause}
      ORDER BY sc.updated_at DESC, sc.created_at DESC, sc.id DESC
      `,
      [user.userId, ...filter.values],
    );

    return Object.freeze(result.rows.map(mapCaseSummary));
  }

  async function getCurrentUserSupportCase(
    publicReference: string,
  ): Promise<SupportCaseDetail | null> {
    const user = await deps.requireCurrentUser();
    const normalizedReference = normalizePublicReference(publicReference);
    const row = await loadUserCaseRow({
      db: deps.db,
      userId: user.userId,
      publicReference: normalizedReference,
    });

    if (!row) {
      return null;
    }

    const messages = await loadMessages({
      db: deps.db,
      caseId: row.id,
      includeInternalNotes: false,
    });

    return mapCaseDetail({ row, messages });
  }

  async function createSupportCase(
    input: CreateSupportCaseInput,
  ): Promise<SupportCaseDetail> {
    const user = await deps.requireCurrentUser();
    const category = normalizeCategory(input.category);
    const subject = normalizeRequiredText(input.subject, 'subject');
    const body = normalizeRequiredText(input.body, 'body');

    const result = await deps.db.query<CreatedSupportCaseRow>(
      `
      WITH inserted_case AS (
        INSERT INTO support_cases (
          user_id,
          category,
          subject,
          initial_message_snapshot
        )
        VALUES ($1, $2, $3, $4)
        RETURNING
          id,
          public_reference,
          user_id,
          category,
          subject,
          status,
          priority,
          assigned_admin_id,
          created_at,
          updated_at,
          resolved_at,
          closed_at
      ),
      inserted_message AS (
        INSERT INTO support_messages (
          case_id,
          author_user_id,
          author_type,
          body,
          is_internal_note
        )
        SELECT id, $1, 'user', $4, FALSE
        FROM inserted_case
        RETURNING
          id,
          author_type,
          body,
          is_internal_note,
          created_at
      ),
      inserted_event AS (
        INSERT INTO support_case_events (
          case_id,
          actor_user_id,
          event_type,
          to_value
        )
        SELECT id, $1, 'case_created', 'open'
        FROM inserted_case
        RETURNING id
      )
      SELECT
        ic.id,
        ic.public_reference,
        ic.user_id,
        ic.category,
        ic.subject,
        ic.status,
        ic.priority,
        ic.assigned_admin_id,
        ic.created_at,
        ic.updated_at,
        ic.resolved_at,
        ic.closed_at,
        im.id AS message_id,
        im.author_type AS message_author_type,
        im.body AS message_body,
        im.is_internal_note AS message_is_internal_note,
        im.created_at AS message_created_at
      FROM inserted_case ic
      CROSS JOIN inserted_message im
      `,
      [user.userId, category, subject, body],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Support case creation failed');
    }

    return mapCaseDetail({
      row,
      messages: [
        {
          id: row.message_id,
          author_type: row.message_author_type,
          body: row.message_body,
          is_internal_note: row.message_is_internal_note,
          created_at: row.message_created_at,
        },
      ],
    });
  }

  async function addCurrentUserSupportMessage(
    input: AddSupportMessageInput,
  ): Promise<SupportCaseDetail> {
    const user = await deps.requireCurrentUser();
    const publicReference = normalizePublicReference(input.publicReference);
    const body = normalizeRequiredText(input.body, 'body');
    const currentCase = await loadUserCaseRow({
      db: deps.db,
      userId: user.userId,
      publicReference,
    });

    if (!currentCase) {
      throw new SupportCaseNotFoundError();
    }

    if (currentCase.status === 'closed') {
      throw new SupportCaseClosedError();
    }

    const nextStatus =
      currentCase.status === 'waiting_on_user'
        ? 'waiting_on_sonartra'
        : currentCase.status;

    await deps.db.query(
      `
      WITH updated_case AS (
        UPDATE support_cases
        SET
          status = $3,
          updated_at = NOW()
        WHERE id = $1
        RETURNING id
      ),
      inserted_message AS (
        INSERT INTO support_messages (
          case_id,
          author_user_id,
          author_type,
          body,
          is_internal_note
        )
        SELECT id, $2, 'user', $4, FALSE
        FROM updated_case
        RETURNING id
      )
      INSERT INTO support_case_events (
        case_id,
        actor_user_id,
        event_type,
        from_value,
        to_value
      )
      SELECT id, $2, 'user_replied', $5, $3
      FROM updated_case
      `,
      [currentCase.id, user.userId, nextStatus, body, currentCase.status],
    );

    const updated = await getCurrentUserSupportCase(publicReference);
    if (!updated) {
      throw new SupportCaseNotFoundError();
    }

    return updated;
  }

  async function listAdminSupportCases(
    filters?: SupportCaseFilters,
  ): Promise<readonly AdminSupportCaseSummary[]> {
    await deps.requireAdminUser();
    const filter = buildFilterClause(filters, 1);

    const result = await deps.db.query<SupportCaseRow>(
      `
      SELECT
        sc.id,
        sc.public_reference,
        sc.user_id,
        u.email AS user_email,
        u.name AS user_name,
        sc.category,
        sc.subject,
        sc.status,
        sc.priority,
        sc.assigned_admin_id,
        sc.created_at,
        sc.updated_at,
        sc.resolved_at,
        sc.closed_at,
        latest_message.body AS latest_message_preview
      FROM support_cases sc
      INNER JOIN users u ON u.id = sc.user_id
      LEFT JOIN LATERAL (
        SELECT sm.body
        FROM support_messages sm
        WHERE sm.case_id = sc.id
          AND sm.is_internal_note = FALSE
        ORDER BY sm.created_at DESC, sm.id DESC
        LIMIT 1
      ) latest_message ON TRUE
      WHERE TRUE
        ${filter.clause}
      ORDER BY sc.updated_at DESC, sc.created_at DESC, sc.id DESC
      `,
      filter.values,
    );

    return Object.freeze(result.rows.map(mapAdminCaseSummary));
  }

  async function getAdminSupportCase(
    publicReference: string,
  ): Promise<AdminSupportCaseDetail | null> {
    await deps.requireAdminUser();
    const normalizedReference = normalizePublicReference(publicReference);
    const row = await loadAdminCaseRow({
      db: deps.db,
      publicReference: normalizedReference,
    });

    if (!row) {
      return null;
    }

    const messages = await loadMessages({
      db: deps.db,
      caseId: row.id,
      includeInternalNotes: true,
    });

    return mapAdminCaseDetail({ row, messages });
  }

  async function addAdminSupportReply(
    input: AddSupportMessageInput,
  ): Promise<AdminSupportCaseDetail> {
    const admin = await deps.requireAdminUser();
    const publicReference = normalizePublicReference(input.publicReference);
    const body = normalizeRequiredText(input.body, 'body');
    const currentCase = await loadAdminCaseRow({
      db: deps.db,
      publicReference,
    });

    if (!currentCase) {
      throw new SupportCaseNotFoundError();
    }

    const nextStatus =
      currentCase.status === 'resolved' || currentCase.status === 'closed'
        ? currentCase.status
        : 'waiting_on_user';

    await deps.db.query(
      `
      WITH updated_case AS (
        UPDATE support_cases
        SET
          status = $3,
          updated_at = NOW()
        WHERE id = $1
        RETURNING id
      ),
      inserted_message AS (
        INSERT INTO support_messages (
          case_id,
          author_user_id,
          author_type,
          body,
          is_internal_note
        )
        SELECT id, $2, 'admin', $4, FALSE
        FROM updated_case
        RETURNING id
      )
      INSERT INTO support_case_events (
        case_id,
        actor_user_id,
        event_type,
        from_value,
        to_value
      )
      SELECT id, $2, 'admin_replied', $5, $3
      FROM updated_case
      `,
      [currentCase.id, admin.userId, nextStatus, body, currentCase.status],
    );

    const updated = await getAdminSupportCase(publicReference);
    if (!updated) {
      throw new SupportCaseNotFoundError();
    }

    return updated;
  }

  async function addAdminInternalNote(
    input: AddSupportMessageInput,
  ): Promise<AdminSupportCaseDetail> {
    const admin = await deps.requireAdminUser();
    const publicReference = normalizePublicReference(input.publicReference);
    const body = normalizeRequiredText(input.body, 'body');
    const currentCase = await loadAdminCaseRow({
      db: deps.db,
      publicReference,
    });

    if (!currentCase) {
      throw new SupportCaseNotFoundError();
    }

    await deps.db.query(
      `
      WITH inserted_message AS (
        INSERT INTO support_messages (
          case_id,
          author_user_id,
          author_type,
          body,
          is_internal_note
        )
        VALUES ($1, $2, 'admin', $3, TRUE)
        RETURNING case_id
      ),
      updated_case AS (
        UPDATE support_cases
        SET updated_at = NOW()
        WHERE id = $1
        RETURNING id
      )
      INSERT INTO support_case_events (
        case_id,
        actor_user_id,
        event_type
      )
      SELECT case_id, $2, 'internal_note_added'
      FROM inserted_message
      `,
      [currentCase.id, admin.userId, body],
    );

    const updated = await getAdminSupportCase(publicReference);
    if (!updated) {
      throw new SupportCaseNotFoundError();
    }

    return updated;
  }

  async function updateAdminSupportCaseStatus(
    input: UpdateSupportCaseStatusInput,
  ): Promise<AdminSupportCaseDetail> {
    const admin = await deps.requireAdminUser();
    const publicReference = normalizePublicReference(input.publicReference);
    const status = normalizeStatus(input.status);
    const currentCase = await loadAdminCaseRow({
      db: deps.db,
      publicReference,
    });

    if (!currentCase) {
      throw new SupportCaseNotFoundError();
    }

    // Timestamps are set the first time a case reaches resolved/closed and then preserved.
    await deps.db.query(
      `
      WITH updated_case AS (
        UPDATE support_cases
        SET
          status = $2,
          updated_at = NOW(),
          resolved_at = CASE
            WHEN $2 = 'resolved' AND resolved_at IS NULL THEN NOW()
            ELSE resolved_at
          END,
          closed_at = CASE
            WHEN $2 = 'closed' AND closed_at IS NULL THEN NOW()
            ELSE closed_at
          END
        WHERE id = $1
        RETURNING id
      )
      INSERT INTO support_case_events (
        case_id,
        actor_user_id,
        event_type,
        from_value,
        to_value
      )
      SELECT id, $3, 'status_changed', $4, $2
      FROM updated_case
      `,
      [currentCase.id, status, admin.userId, currentCase.status],
    );

    const updated = await getAdminSupportCase(publicReference);
    if (!updated) {
      throw new SupportCaseNotFoundError();
    }

    return updated;
  }

  async function updateAdminSupportCasePriority(
    input: UpdateSupportCasePriorityInput,
  ): Promise<AdminSupportCaseDetail> {
    const admin = await deps.requireAdminUser();
    const publicReference = normalizePublicReference(input.publicReference);
    const priority = normalizePriority(input.priority);
    const currentCase = await loadAdminCaseRow({
      db: deps.db,
      publicReference,
    });

    if (!currentCase) {
      throw new SupportCaseNotFoundError();
    }

    await deps.db.query(
      `
      WITH updated_case AS (
        UPDATE support_cases
        SET
          priority = $2,
          updated_at = NOW()
        WHERE id = $1
        RETURNING id
      )
      INSERT INTO support_case_events (
        case_id,
        actor_user_id,
        event_type,
        from_value,
        to_value
      )
      SELECT id, $3, 'priority_changed', $4, $2
      FROM updated_case
      `,
      [currentCase.id, priority, admin.userId, currentCase.priority],
    );

    const updated = await getAdminSupportCase(publicReference);
    if (!updated) {
      throw new SupportCaseNotFoundError();
    }

    return updated;
  }

  return {
    listCurrentUserSupportCases,
    getCurrentUserSupportCase,
    createSupportCase,
    addCurrentUserSupportMessage,
    listAdminSupportCases,
    getAdminSupportCase,
    addAdminSupportReply,
    addAdminInternalNote,
    updateAdminSupportCaseStatus,
    updateAdminSupportCasePriority,
  };
}

function createDefaultSupportService() {
  return createSupportService({
    db: getDbPool(),
    requireCurrentUser,
    requireAdminUser,
  });
}

export async function listCurrentUserSupportCases(
  filters?: SupportCaseFilters,
): Promise<readonly SupportCaseSummary[]> {
  return createDefaultSupportService().listCurrentUserSupportCases(filters);
}

export async function getCurrentUserSupportCase(
  publicReference: string,
): Promise<SupportCaseDetail | null> {
  return createDefaultSupportService().getCurrentUserSupportCase(publicReference);
}

export async function createSupportCase(
  input: CreateSupportCaseInput,
): Promise<SupportCaseDetail> {
  return createDefaultSupportService().createSupportCase(input);
}

export async function addCurrentUserSupportMessage(
  input: AddSupportMessageInput,
): Promise<SupportCaseDetail> {
  return createDefaultSupportService().addCurrentUserSupportMessage(input);
}

export async function listAdminSupportCases(
  filters?: SupportCaseFilters,
): Promise<readonly AdminSupportCaseSummary[]> {
  return createDefaultSupportService().listAdminSupportCases(filters);
}

export async function getAdminSupportCase(
  publicReference: string,
): Promise<AdminSupportCaseDetail | null> {
  return createDefaultSupportService().getAdminSupportCase(publicReference);
}

export async function addAdminSupportReply(
  input: AddSupportMessageInput,
): Promise<AdminSupportCaseDetail> {
  return createDefaultSupportService().addAdminSupportReply(input);
}

export async function addAdminInternalNote(
  input: AddSupportMessageInput,
): Promise<AdminSupportCaseDetail> {
  return createDefaultSupportService().addAdminInternalNote(input);
}

export async function updateAdminSupportCaseStatus(
  input: UpdateSupportCaseStatusInput,
): Promise<AdminSupportCaseDetail> {
  return createDefaultSupportService().updateAdminSupportCaseStatus(input);
}

export async function updateAdminSupportCasePriority(
  input: UpdateSupportCasePriorityInput,
): Promise<AdminSupportCaseDetail> {
  return createDefaultSupportService().updateAdminSupportCasePriority(input);
}
