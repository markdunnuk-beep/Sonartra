'use server';

import { revalidatePath } from 'next/cache';

import {
  emptyAdminAuthoringFormValues,
  initialAdminAuthoringFormState,
  type AdminAuthoringFormState,
  type AdminAuthoringFormValues,
  validateAdminAuthoringValues,
} from '@/lib/admin/admin-domain-signal-authoring';
import { getDbPool } from '@/lib/server/db';
import { slugifyDomainKey } from '@/lib/utils/domain-key';
import { slugifySignalKey } from '@/lib/utils/signal-key';
import { generateDomainKey, generateSignalKey } from '@/lib/utils/key-generator';

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

type ActionContext = {
  assessmentKey: string;
  assessmentVersionId: string;
  domainId?: string;
  signalId?: string;
};

export type InlineDomainLabelUpdateResult =
  | {
      ok: true;
      record: {
        domainId: string;
        label: string;
        domainKey: string;
      };
    }
  | {
      ok: false;
      error: string;
    };

export type InlineSignalLabelUpdateResult =
  | {
      ok: true;
      record: {
        signalId: string;
        label: string;
        signalKey: string;
      };
    }
  | {
      ok: false;
      error: string;
    };

export type InlineDomainKeyRegenerateResult =
  | {
      ok: true;
      record: {
        domainId: string;
        domainKey: string;
      };
    }
  | {
      ok: false;
      error: string;
    };

export type InlineSignalKeyRegenerateResult =
  | {
      ok: true;
      record: {
        signalId: string;
        signalKey: string;
      };
    }
  | {
      ok: false;
      error: string;
    };

type DomainScopeRow = {
  id: string;
  domain_key: string;
  label: string;
};

type SignalScopeRow = {
  id: string;
  signal_key: string;
  label: string;
  domain_id: string;
  domain_key: string;
};

type ChildSignalScopeRow = {
  id: string;
  label: string;
};

function normalizeFormValue(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function authoringPath(assessmentKey: string): string {
  return `/admin/assessments/${assessmentKey}`;
}

function normalizeInlineText(value: string): string {
  return value.trim();
}

async function getNextDomainOrderIndex(
  db: Queryable,
  assessmentVersionId: string,
): Promise<number> {
  const result = await db.query<{ next_order_index: string | number }>(
    `
    SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order_index
    FROM domains
    WHERE assessment_version_id = $1
      AND domain_type = 'SIGNAL_GROUP'
    `,
    [assessmentVersionId],
  );

  return Number(result.rows[0]?.next_order_index ?? 0);
}

async function getNextSignalOrderIndex(
  db: Queryable,
  assessmentVersionId: string,
  domainId: string,
): Promise<number> {
  const result = await db.query<{ next_order_index: string | number }>(
    `
    SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order_index
    FROM signals
    WHERE assessment_version_id = $1
      AND domain_id = $2
    `,
    [assessmentVersionId, domainId],
  );

  return Number(result.rows[0]?.next_order_index ?? 0);
}

async function getDomainKey(params: {
  db: Queryable;
  assessmentVersionId: string;
  domainId: string;
}): Promise<string | null> {
  const result = await params.db.query<{ domain_key: string }>(
    `
    SELECT domain_key
    FROM domains
    WHERE id = $1
      AND assessment_version_id = $2
      AND domain_type = 'SIGNAL_GROUP'
    `,
    [params.domainId, params.assessmentVersionId],
  );

  return result.rows[0]?.domain_key ?? null;
}

async function getDomainScope(params: {
  db: Queryable;
  assessmentVersionId: string;
  domainId: string;
}): Promise<DomainScopeRow | null> {
  const result = await params.db.query<DomainScopeRow>(
    `
    SELECT id, domain_key, label
    FROM domains
    WHERE id = $1
      AND assessment_version_id = $2
      AND domain_type = 'SIGNAL_GROUP'
    `,
    [params.domainId, params.assessmentVersionId],
  );

  return result.rows[0] ?? null;
}

async function getSignalScope(params: {
  db: Queryable;
  assessmentVersionId: string;
  signalId: string;
}): Promise<SignalScopeRow | null> {
  const result = await params.db.query<SignalScopeRow>(
    `
    SELECT
      s.id,
      s.signal_key,
      s.label,
      d.id AS domain_id,
      d.domain_key
    FROM signals s
    INNER JOIN domains d
      ON d.id = s.domain_id
      AND d.assessment_version_id = s.assessment_version_id
    WHERE s.id = $1
      AND s.assessment_version_id = $2
    `,
    [params.signalId, params.assessmentVersionId],
  );

  return result.rows[0] ?? null;
}

async function getSignalsForDomain(params: {
  db: Queryable;
  assessmentVersionId: string;
  domainId: string;
}): Promise<readonly ChildSignalScopeRow[]> {
  const result = await params.db.query<ChildSignalScopeRow>(
    `
    SELECT id, label
    FROM signals
    WHERE assessment_version_id = $1
      AND domain_id = $2
    ORDER BY order_index ASC, id ASC
    `,
    [params.assessmentVersionId, params.domainId],
  );

  return result.rows;
}

async function domainExists(params: {
  db: Queryable;
  assessmentVersionId: string;
  domainId: string;
}): Promise<boolean> {
  const result = await params.db.query<{ id: string }>(
    `
    SELECT id
    FROM domains
    WHERE id = $1
      AND assessment_version_id = $2
      AND domain_type = 'SIGNAL_GROUP'
    `,
    [params.domainId, params.assessmentVersionId],
  );

  return result.rows.length > 0;
}

async function duplicateDomainKeyExists(params: {
  db: Queryable;
  assessmentVersionId: string;
  domainKey: string;
  excludedDomainId?: string;
}): Promise<boolean> {
  const result = await params.db.query<{ id: string }>(
    `
    SELECT id
    FROM domains
    WHERE assessment_version_id = $1
      AND domain_type = 'SIGNAL_GROUP'
      AND domain_key = $2
      AND ($3::uuid IS NULL OR id <> $3::uuid)
    `,
    [params.assessmentVersionId, params.domainKey, params.excludedDomainId ?? null],
  );

  return result.rows.length > 0;
}

async function duplicateSignalKeyExists(params: {
  db: Queryable;
  assessmentVersionId: string;
  signalKey: string;
  excludedSignalId?: string;
}): Promise<boolean> {
  const result = await params.db.query<{ id: string }>(
    `
    SELECT id
    FROM signals
    WHERE assessment_version_id = $1
      AND signal_key = $2
      AND ($3::uuid IS NULL OR id <> $3::uuid)
    `,
    [params.assessmentVersionId, params.signalKey, params.excludedSignalId ?? null],
  );

  return result.rows.length > 0;
}

async function signalExists(params: {
  db: Queryable;
  assessmentVersionId: string;
  domainId: string;
  signalId: string;
}): Promise<boolean> {
  const result = await params.db.query<{ id: string }>(
    `
    SELECT id
    FROM signals
    WHERE id = $1
      AND assessment_version_id = $2
      AND domain_id = $3
    `,
    [params.signalId, params.assessmentVersionId, params.domainId],
  );

  return result.rows.length > 0;
}

export async function createDomainRecord(params: {
  db: Queryable;
  assessmentVersionId: string;
  values: AdminAuthoringFormValues;
}): Promise<void> {
  const domainKey = slugifyDomainKey(params.values.key || params.values.label);
  if (!domainKey) {
    throw new Error('DOMAIN_KEY_INVALID');
  }

  if (
    await duplicateDomainKeyExists({
      db: params.db,
      assessmentVersionId: params.assessmentVersionId,
      domainKey,
    })
  ) {
    throw new Error('DOMAIN_KEY_EXISTS');
  }

  const orderIndex = await getNextDomainOrderIndex(params.db, params.assessmentVersionId);

  await params.db.query(
    `
    INSERT INTO domains (
      assessment_version_id,
      domain_key,
      label,
      description,
      domain_type,
      order_index
    )
    VALUES ($1, $2, $3, $4, 'SIGNAL_GROUP', $5)
    `,
    [
      params.assessmentVersionId,
      domainKey,
      params.values.label,
      params.values.description || null,
      orderIndex,
    ],
  );
}

export async function updateDomainRecord(params: {
  db: Queryable;
  assessmentVersionId: string;
  domainId: string;
  values: AdminAuthoringFormValues;
}): Promise<void> {
  const domainKey = slugifyDomainKey(params.values.key);
  if (!domainKey) {
    throw new Error('DOMAIN_KEY_INVALID');
  }

  const exists = await domainExists({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    domainId: params.domainId,
  });
  if (!exists) {
    throw new Error('DOMAIN_NOT_FOUND');
  }

  if (
    await duplicateDomainKeyExists({
      db: params.db,
      assessmentVersionId: params.assessmentVersionId,
      domainKey,
      excludedDomainId: params.domainId,
    })
  ) {
    throw new Error('DOMAIN_KEY_EXISTS');
  }

  await params.db.query(
    `
    UPDATE domains
    SET
      domain_key = $3,
      label = $4,
      description = $5,
      updated_at = NOW()
    WHERE id = $1
      AND assessment_version_id = $2
      AND domain_type = 'SIGNAL_GROUP'
    `,
    [
      params.domainId,
      params.assessmentVersionId,
      domainKey,
      params.values.label,
      params.values.description || null,
    ],
  );
}

export async function updateDomainLabel(params: {
  db: Queryable;
  assessmentVersionId: string;
  domainId: string;
  label: string;
}): Promise<{ domainId: string; label: string; domainKey: string }> {
  const label = normalizeInlineText(params.label);

  if (!params.assessmentVersionId || !params.domainId) {
    throw new Error('DOMAIN_NOT_FOUND');
  }

  if (!label) {
    throw new Error('DOMAIN_LABEL_REQUIRED');
  }

  const result = await params.db.query<{ id: string; label: string; domain_key: string }>(
    `
    UPDATE domains
    SET
      label = $3,
      updated_at = NOW()
    WHERE id = $1
      AND assessment_version_id = $2
      AND domain_type = 'SIGNAL_GROUP'
    RETURNING id, label, domain_key
    `,
    [params.domainId, params.assessmentVersionId, label],
  );

  const updatedDomain = result.rows[0];
  if (!updatedDomain) {
    throw new Error('DOMAIN_NOT_FOUND');
  }

  return {
    domainId: updatedDomain.id,
    label: updatedDomain.label,
    domainKey: updatedDomain.domain_key,
  };
}

export async function regenerateDomainKey(params: {
  db: Queryable;
  assessmentVersionId: string;
  domainId: string;
}): Promise<{ domainId: string; domainKey: string }> {
  const domain = await getDomainScope({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    domainId: params.domainId,
  });
  if (!domain) {
    throw new Error('DOMAIN_NOT_FOUND');
  }

  const regeneratedDomainKey = generateDomainKey(domain.label);
  if (!regeneratedDomainKey) {
    throw new Error('DOMAIN_KEY_INVALID');
  }

  if (
    regeneratedDomainKey !== domain.domain_key &&
    (await duplicateDomainKeyExists({
      db: params.db,
      assessmentVersionId: params.assessmentVersionId,
      domainKey: regeneratedDomainKey,
      excludedDomainId: domain.id,
    }))
  ) {
    throw new Error('DOMAIN_KEY_EXISTS');
  }

  const childSignals = await getSignalsForDomain({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    domainId: domain.id,
  });
  const nextSignalKeys = childSignals.map((signal) => ({
    signalId: signal.id,
    signalKey: generateSignalKey(regeneratedDomainKey, signal.label),
  }));

  if (nextSignalKeys.some((signal) => !signal.signalKey)) {
    throw new Error('SIGNAL_KEY_INVALID');
  }

  const localSignalKeySet = new Set<string>();
  for (const signal of nextSignalKeys) {
    if (localSignalKeySet.has(signal.signalKey)) {
      throw new Error('SIGNAL_KEY_EXISTS');
    }
    localSignalKeySet.add(signal.signalKey);

    if (
      await duplicateSignalKeyExists({
        db: params.db,
        assessmentVersionId: params.assessmentVersionId,
        signalKey: signal.signalKey,
        excludedSignalId: signal.signalId,
      })
    ) {
      throw new Error('SIGNAL_KEY_EXISTS');
    }
  }

  if (regeneratedDomainKey !== domain.domain_key) {
    await params.db.query(
      `
      UPDATE domains
      SET
        domain_key = $3,
        updated_at = NOW()
      WHERE id = $1
        AND assessment_version_id = $2
        AND domain_type = 'SIGNAL_GROUP'
      `,
      [domain.id, params.assessmentVersionId, regeneratedDomainKey],
    );
  }

  for (const signal of nextSignalKeys) {
    await params.db.query(
      `
      UPDATE signals
      SET
        signal_key = $4,
        updated_at = NOW()
      WHERE id = $1
        AND assessment_version_id = $2
        AND domain_id = $3
      `,
      [signal.signalId, params.assessmentVersionId, domain.id, signal.signalKey],
    );
  }

  return {
    domainId: domain.id,
    domainKey: regeneratedDomainKey,
  };
}

export async function deleteDomainRecord(params: {
  db: Queryable;
  assessmentVersionId: string;
  domainId: string;
}): Promise<void> {
  const exists = await domainExists({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    domainId: params.domainId,
  });
  if (!exists) {
    throw new Error('DOMAIN_NOT_FOUND');
  }

  await params.db.query(
    `
    DELETE FROM signals
    WHERE assessment_version_id = $1
      AND domain_id = $2
    `,
    [params.assessmentVersionId, params.domainId],
  );

  await params.db.query(
    `
    DELETE FROM domains
    WHERE id = $1
      AND assessment_version_id = $2
      AND domain_type = 'SIGNAL_GROUP'
    `,
    [params.domainId, params.assessmentVersionId],
  );
}

export async function createSignalRecord(params: {
  db: Queryable;
  assessmentVersionId: string;
  domainId: string;
  values: AdminAuthoringFormValues;
}): Promise<void> {
  const domainExistsForVersion = await getDomainKey({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    domainId: params.domainId,
  });
  if (!domainExistsForVersion) {
    throw new Error('DOMAIN_NOT_FOUND');
  }

  const signalKey = slugifySignalKey(params.values.key);
  if (!signalKey) {
    throw new Error('SIGNAL_KEY_INVALID');
  }

  if (
    await duplicateSignalKeyExists({
      db: params.db,
      assessmentVersionId: params.assessmentVersionId,
      signalKey,
    })
  ) {
    throw new Error('SIGNAL_KEY_EXISTS');
  }

  const orderIndex = await getNextSignalOrderIndex(
    params.db,
    params.assessmentVersionId,
    params.domainId,
  );

  await params.db.query(
    `
    INSERT INTO signals (
      assessment_version_id,
      domain_id,
      signal_key,
      label,
      description,
      order_index,
      is_overlay
    )
    VALUES ($1, $2, $3, $4, $5, $6, FALSE)
    `,
    [
      params.assessmentVersionId,
      params.domainId,
      signalKey,
      params.values.label,
      params.values.description || null,
      orderIndex,
    ],
  );
}

export async function updateSignalRecord(params: {
  db: Queryable;
  assessmentVersionId: string;
  domainId: string;
  signalId: string;
  values: AdminAuthoringFormValues;
}): Promise<void> {
  const signalKey = slugifySignalKey(params.values.key);
  if (!signalKey) {
    throw new Error('SIGNAL_KEY_INVALID');
  }

  const domainPresent = await domainExists({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    domainId: params.domainId,
  });
  if (!domainPresent) {
    throw new Error('DOMAIN_NOT_FOUND');
  }

  const signalPresent = await signalExists({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    domainId: params.domainId,
    signalId: params.signalId,
  });
  if (!signalPresent) {
    throw new Error('SIGNAL_NOT_FOUND');
  }

  if (
    await duplicateSignalKeyExists({
      db: params.db,
      assessmentVersionId: params.assessmentVersionId,
      signalKey,
      excludedSignalId: params.signalId,
    })
  ) {
    throw new Error('SIGNAL_KEY_EXISTS');
  }

  await params.db.query(
    `
    UPDATE signals
    SET
      signal_key = $4,
      label = $5,
      description = $6,
      updated_at = NOW()
    WHERE id = $1
      AND assessment_version_id = $2
      AND domain_id = $3
    `,
    [
      params.signalId,
      params.assessmentVersionId,
      params.domainId,
      signalKey,
      params.values.label,
      params.values.description || null,
    ],
  );
}

export async function updateSignalLabel(params: {
  db: Queryable;
  assessmentVersionId: string;
  domainId: string;
  signalId: string;
  label: string;
}): Promise<{ signalId: string; label: string; signalKey: string }> {
  const label = normalizeInlineText(params.label);

  if (!params.assessmentVersionId || !params.domainId || !params.signalId) {
    throw new Error('SIGNAL_NOT_FOUND');
  }

  if (!label) {
    throw new Error('SIGNAL_LABEL_REQUIRED');
  }

  const result = await params.db.query<{ id: string; label: string; signal_key: string }>(
    `
    UPDATE signals
    SET
      label = $4,
      updated_at = NOW()
    WHERE id = $1
      AND assessment_version_id = $2
      AND domain_id = $3
    RETURNING id, label, signal_key
    `,
    [params.signalId, params.assessmentVersionId, params.domainId, label],
  );

  const updatedSignal = result.rows[0];
  if (!updatedSignal) {
    throw new Error('SIGNAL_NOT_FOUND');
  }

  return {
    signalId: updatedSignal.id,
    label: updatedSignal.label,
    signalKey: updatedSignal.signal_key,
  };
}

export async function regenerateSignalKey(params: {
  db: Queryable;
  assessmentVersionId: string;
  signalId: string;
}): Promise<{ signalId: string; signalKey: string }> {
  const signal = await getSignalScope({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    signalId: params.signalId,
  });
  if (!signal) {
    throw new Error('SIGNAL_NOT_FOUND');
  }

  const regeneratedSignalKey = generateSignalKey(signal.domain_key, signal.label);
  if (!regeneratedSignalKey) {
    throw new Error('SIGNAL_KEY_INVALID');
  }

  if (
    regeneratedSignalKey !== signal.signal_key &&
    (await duplicateSignalKeyExists({
      db: params.db,
      assessmentVersionId: params.assessmentVersionId,
      signalKey: regeneratedSignalKey,
      excludedSignalId: signal.id,
    }))
  ) {
    throw new Error('SIGNAL_KEY_EXISTS');
  }

  if (regeneratedSignalKey !== signal.signal_key) {
    await params.db.query(
      `
      UPDATE signals
      SET
        signal_key = $4,
        updated_at = NOW()
      WHERE id = $1
        AND assessment_version_id = $2
        AND domain_id = $3
      `,
      [signal.id, params.assessmentVersionId, signal.domain_id, regeneratedSignalKey],
    );
  }

  return {
    signalId: signal.id,
    signalKey: regeneratedSignalKey,
  };
}

export async function deleteSignalRecord(params: {
  db: Queryable;
  assessmentVersionId: string;
  domainId: string;
  signalId: string;
}): Promise<void> {
  const signalPresent = await signalExists({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    domainId: params.domainId,
    signalId: params.signalId,
  });
  if (!signalPresent) {
    throw new Error('SIGNAL_NOT_FOUND');
  }

  await params.db.query(
    `
    DELETE FROM signals
    WHERE id = $1
      AND assessment_version_id = $2
      AND domain_id = $3
    `,
    [params.signalId, params.assessmentVersionId, params.domainId],
  );
}

async function runWriteAction(params: {
  assessmentKey: string;
  values: AdminAuthoringFormValues;
  action: (db: Queryable) => Promise<void>;
  duplicateKeyCode: 'DOMAIN_KEY_EXISTS' | 'SIGNAL_KEY_EXISTS';
  missingCode: 'DOMAIN_NOT_FOUND' | 'SIGNAL_NOT_FOUND';
}): Promise<AdminAuthoringFormState> {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await params.action(client);
    await client.query('COMMIT');

    revalidatePath(authoringPath(params.assessmentKey));

    return initialAdminAuthoringFormState;
  } catch (error) {
    await client.query('ROLLBACK');

    if (error instanceof Error && error.message === params.duplicateKeyCode) {
      return {
        formError: null,
        fieldErrors: {
          key:
            params.duplicateKeyCode === 'DOMAIN_KEY_EXISTS'
              ? 'That domain key already exists in this draft version.'
              : 'That signal key already exists in this draft version.',
        },
        values: params.values,
      };
    }

    if (error instanceof Error && error.message === params.missingCode) {
      return {
        formError:
          params.missingCode === 'DOMAIN_NOT_FOUND'
            ? 'The selected domain is no longer available in this draft version.'
            : 'The selected signal is no longer available in this draft version.',
        fieldErrors: {},
        values: params.values,
      };
    }

    if (
      error instanceof Error &&
      (error.message === 'DOMAIN_KEY_INVALID' || error.message === 'SIGNAL_KEY_INVALID')
    ) {
      return {
        formError: 'A deterministic key could not be generated from that name.',
        fieldErrors: {
          label: 'Use a name with letters or numbers so a stable key can be generated.',
        },
        values: params.values,
      };
    }

    return {
      formError: 'Changes could not be saved. Review the inputs and try again.',
      fieldErrors: {},
      values: params.values,
    };
  } finally {
    client.release();
  }
}

function getValuesFromFormData(formData: FormData): AdminAuthoringFormValues {
  return {
    label: normalizeFormValue(formData.get('label')),
    key: normalizeKey(normalizeFormValue(formData.get('key'))),
    description: normalizeFormValue(formData.get('description')),
  };
}

export async function createDomainAction(
  context: ActionContext,
  _previousState: AdminAuthoringFormState,
  formData: FormData,
): Promise<AdminAuthoringFormState> {
  const values = {
    ...getValuesFromFormData(formData),
    key: slugifyDomainKey(normalizeFormValue(formData.get('key'))),
  };
  const validation = validateAdminAuthoringValues(values);
  if (Object.keys(validation.fieldErrors).length > 0) {
    return validation;
  }

  return runWriteAction({
    assessmentKey: context.assessmentKey,
    values,
    duplicateKeyCode: 'DOMAIN_KEY_EXISTS',
    missingCode: 'DOMAIN_NOT_FOUND',
    action: (db) =>
      createDomainRecord({
        db,
        assessmentVersionId: context.assessmentVersionId,
        values,
      }),
  });
}

export async function updateDomainAction(
  context: ActionContext,
  _previousState: AdminAuthoringFormState,
  formData: FormData,
): Promise<AdminAuthoringFormState> {
  const values = {
    ...getValuesFromFormData(formData),
    key: slugifyDomainKey(normalizeFormValue(formData.get('key'))),
  };
  const validation = validateAdminAuthoringValues(values);
  if (Object.keys(validation.fieldErrors).length > 0) {
    return validation;
  }

  return runWriteAction({
    assessmentKey: context.assessmentKey,
    values,
    duplicateKeyCode: 'DOMAIN_KEY_EXISTS',
    missingCode: 'DOMAIN_NOT_FOUND',
    action: (db) =>
      updateDomainRecord({
        db,
        assessmentVersionId: context.assessmentVersionId,
        domainId: context.domainId ?? '',
        values,
      }),
  });
}

export async function deleteDomainAction(
  context: ActionContext,
  _previousState: AdminAuthoringFormState,
  _formData: FormData,
): Promise<AdminAuthoringFormState> {
  return runWriteAction({
    assessmentKey: context.assessmentKey,
    values: emptyAdminAuthoringFormValues,
    duplicateKeyCode: 'DOMAIN_KEY_EXISTS',
    missingCode: 'DOMAIN_NOT_FOUND',
    action: (db) =>
      deleteDomainRecord({
        db,
        assessmentVersionId: context.assessmentVersionId,
        domainId: context.domainId ?? '',
      }),
  });
}

export async function createSignalAction(
  context: ActionContext,
  _previousState: AdminAuthoringFormState,
  formData: FormData,
): Promise<AdminAuthoringFormState> {
  const values = {
    ...getValuesFromFormData(formData),
    key: slugifySignalKey(normalizeFormValue(formData.get('key'))),
  };
  const validation = validateAdminAuthoringValues(values);
  if (Object.keys(validation.fieldErrors).length > 0) {
    return validation;
  }

  return runWriteAction({
    assessmentKey: context.assessmentKey,
    values,
    duplicateKeyCode: 'SIGNAL_KEY_EXISTS',
    missingCode: 'DOMAIN_NOT_FOUND',
    action: (db) =>
      createSignalRecord({
        db,
        assessmentVersionId: context.assessmentVersionId,
        domainId: context.domainId ?? '',
        values,
      }),
  });
}

export async function updateSignalAction(
  context: ActionContext,
  _previousState: AdminAuthoringFormState,
  formData: FormData,
): Promise<AdminAuthoringFormState> {
  const values = {
    ...getValuesFromFormData(formData),
    key: slugifySignalKey(normalizeFormValue(formData.get('key'))),
  };
  const validation = validateAdminAuthoringValues(values);
  if (Object.keys(validation.fieldErrors).length > 0) {
    return validation;
  }

  return runWriteAction({
    assessmentKey: context.assessmentKey,
    values,
    duplicateKeyCode: 'SIGNAL_KEY_EXISTS',
    missingCode: 'SIGNAL_NOT_FOUND',
    action: (db) =>
      updateSignalRecord({
        db,
        assessmentVersionId: context.assessmentVersionId,
        domainId: context.domainId ?? '',
        signalId: context.signalId ?? '',
        values,
      }),
  });
}

export async function deleteSignalAction(
  context: ActionContext,
  _previousState: AdminAuthoringFormState,
  _formData: FormData,
): Promise<AdminAuthoringFormState> {
  return runWriteAction({
    assessmentKey: context.assessmentKey,
    values: emptyAdminAuthoringFormValues,
    duplicateKeyCode: 'SIGNAL_KEY_EXISTS',
    missingCode: 'SIGNAL_NOT_FOUND',
    action: (db) =>
      deleteSignalRecord({
        db,
        assessmentVersionId: context.assessmentVersionId,
        domainId: context.domainId ?? '',
        signalId: context.signalId ?? '',
      }),
  });
}

export async function updateDomainLabelAction(params: {
  assessmentKey: string;
  assessmentVersionId: string;
  domainId: string;
  label: string;
}): Promise<InlineDomainLabelUpdateResult> {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const record = await updateDomainLabel({
      db: client,
      assessmentVersionId: params.assessmentVersionId,
      domainId: params.domainId,
      label: params.label,
    });
    await client.query('COMMIT');
    revalidatePath(authoringPath(params.assessmentKey));
    return { ok: true, record };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);

    if (error instanceof Error) {
      if (error.message === 'DOMAIN_LABEL_REQUIRED') {
        return { ok: false, error: 'Domain name is required.' };
      }

      if (error.message === 'DOMAIN_NOT_FOUND') {
        return { ok: false, error: 'The selected domain is no longer available in this draft version.' };
      }
    }

    return { ok: false, error: 'Domain name could not be saved. Try again.' };
  } finally {
    client.release();
  }
}

export async function updateSignalLabelAction(params: {
  assessmentKey: string;
  assessmentVersionId: string;
  domainId: string;
  signalId: string;
  label: string;
}): Promise<InlineSignalLabelUpdateResult> {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const record = await updateSignalLabel({
      db: client,
      assessmentVersionId: params.assessmentVersionId,
      domainId: params.domainId,
      signalId: params.signalId,
      label: params.label,
    });
    await client.query('COMMIT');
    revalidatePath(authoringPath(params.assessmentKey));
    return { ok: true, record };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);

    if (error instanceof Error) {
      if (error.message === 'SIGNAL_LABEL_REQUIRED') {
        return { ok: false, error: 'Signal name is required.' };
      }

      if (error.message === 'SIGNAL_NOT_FOUND') {
        return { ok: false, error: 'The selected signal is no longer available in this draft version.' };
      }
    }

    return { ok: false, error: 'Signal name could not be saved. Try again.' };
  } finally {
    client.release();
  }
}

export async function regenerateDomainKeyAction(params: {
  assessmentKey: string;
  assessmentVersionId: string;
  domainId: string;
}): Promise<InlineDomainKeyRegenerateResult> {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const record = await regenerateDomainKey({
      db: client,
      assessmentVersionId: params.assessmentVersionId,
      domainId: params.domainId,
    });
    await client.query('COMMIT');
    revalidatePath(authoringPath(params.assessmentKey));
    return { ok: true, record };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);

    if (error instanceof Error) {
      if (error.message === 'DOMAIN_NOT_FOUND') {
        return { ok: false, error: 'The selected domain is no longer available in this draft version.' };
      }

      if (error.message === 'DOMAIN_KEY_INVALID') {
        return { ok: false, error: 'Use a domain name with letters or numbers to regenerate the key.' };
      }

      if (error.message === 'DOMAIN_KEY_EXISTS' || error.message === 'SIGNAL_KEY_EXISTS') {
        return { ok: false, error: 'This key is already in use.' };
      }

      if (error.message === 'SIGNAL_KEY_INVALID') {
        return { ok: false, error: 'A child signal needs a valid name before keys can be regenerated.' };
      }
    }

    return { ok: false, error: 'Domain key could not be regenerated. Try again.' };
  } finally {
    client.release();
  }
}

export async function regenerateSignalKeyAction(params: {
  assessmentKey: string;
  assessmentVersionId: string;
  signalId: string;
}): Promise<InlineSignalKeyRegenerateResult> {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const record = await regenerateSignalKey({
      db: client,
      assessmentVersionId: params.assessmentVersionId,
      signalId: params.signalId,
    });
    await client.query('COMMIT');
    revalidatePath(authoringPath(params.assessmentKey));
    return { ok: true, record };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);

    if (error instanceof Error) {
      if (error.message === 'SIGNAL_NOT_FOUND') {
        return { ok: false, error: 'The selected signal is no longer available in this draft version.' };
      }

      if (error.message === 'SIGNAL_KEY_INVALID') {
        return { ok: false, error: 'Use a signal name with letters or numbers to regenerate the key.' };
      }

      if (error.message === 'SIGNAL_KEY_EXISTS') {
        return { ok: false, error: 'This key is already in use.' };
      }
    }

    return { ok: false, error: 'Signal key could not be regenerated. Try again.' };
  } finally {
    client.release();
  }
}

