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

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

type ActionContext = {
  assessmentKey: string;
  assessmentVersionId: string;
  domainId?: string;
  signalId?: string;
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
  if (
    await duplicateDomainKeyExists({
      db: params.db,
      assessmentVersionId: params.assessmentVersionId,
      domainKey: params.values.key,
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
      params.values.key,
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
      domainKey: params.values.key,
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
      params.values.key,
      params.values.label,
      params.values.description || null,
    ],
  );
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
  const domainPresent = await domainExists({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    domainId: params.domainId,
  });
  if (!domainPresent) {
    throw new Error('DOMAIN_NOT_FOUND');
  }

  if (
    await duplicateSignalKeyExists({
      db: params.db,
      assessmentVersionId: params.assessmentVersionId,
      signalKey: params.values.key,
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
      params.values.key,
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
      signalKey: params.values.key,
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
      params.values.key,
      params.values.label,
      params.values.description || null,
    ],
  );
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
  const values = getValuesFromFormData(formData);
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
  const values = getValuesFromFormData(formData);
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
  const values = getValuesFromFormData(formData);
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
  const values = getValuesFromFormData(formData);
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

