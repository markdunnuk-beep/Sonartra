'use server';

import { revalidatePath } from 'next/cache';

import {
  type AdminWeightingAuthoringFormState,
  type AdminWeightingAuthoringFormValues,
  emptyAdminWeightingAuthoringFormValues,
  initialAdminWeightingAuthoringFormState,
  validateAdminWeightingAuthoringValues,
} from '@/lib/admin/admin-weighting-authoring';
import { getDbPool } from '@/lib/server/db';

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

type ActionContext = {
  assessmentKey: string;
  assessmentVersionId: string;
  optionId: string;
  optionSignalWeightId?: string;
};

type PostgresErrorLike = {
  code?: string;
  constraint?: string;
  detail?: string;
  message?: string;
};

type OptionScopeRow = {
  option_id: string;
  question_id: string;
  assessment_version_id: string;
};

type SignalScopeRow = {
  signal_id: string;
  assessment_version_id: string;
};

type WeightScopeRow = {
  option_signal_weight_id: string;
};

function normalizeFormValue(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

function authoringPath(assessmentKey: string): string {
  return `/admin/assessments/${assessmentKey}`;
}

function toPostgresErrorLike(error: unknown): PostgresErrorLike | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const candidate = error as PostgresErrorLike;
  if (
    typeof candidate.code !== 'string' &&
    typeof candidate.constraint !== 'string' &&
    typeof candidate.detail !== 'string' &&
    typeof candidate.message !== 'string'
  ) {
    return null;
  }

  return candidate;
}

function isDuplicateWeightError(error: unknown): boolean {
  if (error instanceof Error && error.message === 'OPTION_SIGNAL_MAPPING_EXISTS') {
    return true;
  }

  const candidate = toPostgresErrorLike(error);
  if (!candidate || candidate.code !== '23505') {
    return false;
  }

  return (
    candidate.constraint?.includes('option_signal_weights') === true ||
    candidate.message?.includes('option_signal_weights') === true ||
    candidate.detail?.includes('(option_id, signal_id)') === true
  );
}

async function loadOptionScope(params: {
  db: Queryable;
  assessmentVersionId: string;
  optionId: string;
}): Promise<OptionScopeRow | null> {
  const result = await params.db.query<OptionScopeRow>(
    `
    SELECT
      o.id AS option_id,
      q.id AS question_id,
      q.assessment_version_id
    FROM options o
    INNER JOIN questions q ON q.id = o.question_id
    WHERE o.id = $1
      AND q.assessment_version_id = $2
    `,
    [params.optionId, params.assessmentVersionId],
  );

  return result.rows[0] ?? null;
}

async function signalExists(params: {
  db: Queryable;
  assessmentVersionId: string;
  signalId: string;
}): Promise<boolean> {
  const result = await params.db.query<SignalScopeRow>(
    `
    SELECT
      id AS signal_id,
      assessment_version_id
    FROM signals
    WHERE id = $1
      AND assessment_version_id = $2
    `,
    [params.signalId, params.assessmentVersionId],
  );

  return result.rows.length > 0;
}

async function duplicateWeightExists(params: {
  db: Queryable;
  optionId: string;
  signalId: string;
  excludedOptionSignalWeightId?: string;
}): Promise<boolean> {
  const result = await params.db.query<WeightScopeRow>(
    `
    SELECT id AS option_signal_weight_id
    FROM option_signal_weights
    WHERE option_id = $1
      AND signal_id = $2
      AND ($3::uuid IS NULL OR id <> $3::uuid)
    `,
    [params.optionId, params.signalId, params.excludedOptionSignalWeightId ?? null],
  );

  return result.rows.length > 0;
}

async function optionSignalWeightExists(params: {
  db: Queryable;
  assessmentVersionId: string;
  optionId: string;
  optionSignalWeightId: string;
}): Promise<boolean> {
  const result = await params.db.query<WeightScopeRow>(
    `
    SELECT osw.id AS option_signal_weight_id
    FROM option_signal_weights osw
    INNER JOIN options o ON o.id = osw.option_id
    INNER JOIN questions q ON q.id = o.question_id
    INNER JOIN signals s ON s.id = osw.signal_id
    WHERE osw.id = $1
      AND osw.option_id = $2
      AND q.assessment_version_id = $3
      AND s.assessment_version_id = $3
    `,
    [params.optionSignalWeightId, params.optionId, params.assessmentVersionId],
  );

  return result.rows.length > 0;
}

export async function createOptionSignalWeightRecord(params: {
  db: Queryable;
  assessmentVersionId: string;
  optionId: string;
  values: AdminWeightingAuthoringFormValues;
}): Promise<void> {
  const optionScope = await loadOptionScope({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    optionId: params.optionId,
  });
  if (!optionScope) {
    throw new Error('OPTION_NOT_FOUND');
  }

  const signalPresent = await signalExists({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    signalId: params.values.signalId,
  });
  if (!signalPresent) {
    throw new Error('SIGNAL_NOT_FOUND');
  }

  if (
    await duplicateWeightExists({
      db: params.db,
      optionId: params.optionId,
      signalId: params.values.signalId,
    })
  ) {
    throw new Error('OPTION_SIGNAL_MAPPING_EXISTS');
  }

  await params.db.query(
    `
    INSERT INTO option_signal_weights (
      option_id,
      signal_id,
      weight
    )
    VALUES ($1, $2, $3::numeric(12, 4))
    `,
    [params.optionId, params.values.signalId, params.values.weight],
  );
}

export async function updateOptionSignalWeightRecord(params: {
  db: Queryable;
  assessmentVersionId: string;
  optionId: string;
  optionSignalWeightId: string;
  values: AdminWeightingAuthoringFormValues;
}): Promise<void> {
  const optionScope = await loadOptionScope({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    optionId: params.optionId,
  });
  if (!optionScope) {
    throw new Error('OPTION_NOT_FOUND');
  }

  const mappingPresent = await optionSignalWeightExists({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    optionId: params.optionId,
    optionSignalWeightId: params.optionSignalWeightId,
  });
  if (!mappingPresent) {
    throw new Error('OPTION_SIGNAL_MAPPING_NOT_FOUND');
  }

  const signalPresent = await signalExists({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    signalId: params.values.signalId,
  });
  if (!signalPresent) {
    throw new Error('SIGNAL_NOT_FOUND');
  }

  if (
    await duplicateWeightExists({
      db: params.db,
      optionId: params.optionId,
      signalId: params.values.signalId,
      excludedOptionSignalWeightId: params.optionSignalWeightId,
    })
  ) {
    throw new Error('OPTION_SIGNAL_MAPPING_EXISTS');
  }

  await params.db.query(
    `
    UPDATE option_signal_weights
    SET
      signal_id = $3,
      weight = $4::numeric(12, 4),
      updated_at = NOW()
    WHERE id = $1
      AND option_id = $2
    `,
    [params.optionSignalWeightId, params.optionId, params.values.signalId, params.values.weight],
  );
}

export async function deleteOptionSignalWeightRecord(params: {
  db: Queryable;
  assessmentVersionId: string;
  optionId: string;
  optionSignalWeightId: string;
}): Promise<void> {
  const optionScope = await loadOptionScope({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    optionId: params.optionId,
  });
  if (!optionScope) {
    throw new Error('OPTION_NOT_FOUND');
  }

  const mappingPresent = await optionSignalWeightExists({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    optionId: params.optionId,
    optionSignalWeightId: params.optionSignalWeightId,
  });
  if (!mappingPresent) {
    throw new Error('OPTION_SIGNAL_MAPPING_NOT_FOUND');
  }

  await params.db.query(
    `
    DELETE FROM option_signal_weights
    WHERE id = $1
      AND option_id = $2
    `,
    [params.optionSignalWeightId, params.optionId],
  );
}

function getValuesFromFormData(formData: FormData): AdminWeightingAuthoringFormValues {
  return {
    signalId: normalizeFormValue(formData.get('signalId')),
    weight: normalizeFormValue(formData.get('weight')),
  };
}

async function runWeightWriteAction(params: {
  assessmentKey: string;
  values: AdminWeightingAuthoringFormValues;
  action: (db: Queryable) => Promise<void>;
}): Promise<AdminWeightingAuthoringFormState> {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await params.action(client);
    await client.query('COMMIT');

    revalidatePath(authoringPath(params.assessmentKey));

    return initialAdminWeightingAuthoringFormState;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);

    if (isDuplicateWeightError(error)) {
      return {
        formError: null,
        fieldErrors: {
          signalId: 'That signal is already mapped to this option.',
        },
        values: params.values,
      };
    }

    if (error instanceof Error && error.message === 'OPTION_NOT_FOUND') {
      return {
        formError: 'The selected option is no longer available in this draft version.',
        fieldErrors: {},
        values: params.values,
      };
    }

    if (error instanceof Error && error.message === 'SIGNAL_NOT_FOUND') {
      return {
        formError: 'The selected signal is no longer available in this draft version.',
        fieldErrors: {},
        values: params.values,
      };
    }

    if (error instanceof Error && error.message === 'OPTION_SIGNAL_MAPPING_NOT_FOUND') {
      return {
        formError: 'The selected weighting mapping is no longer available in this draft version.',
        fieldErrors: {},
        values: params.values,
      };
    }

    return {
      formError: 'Weighting changes could not be saved. Review the inputs and try again.',
      fieldErrors: {},
      values: params.values,
    };
  } finally {
    client.release();
  }
}

export async function createOptionSignalWeightAction(
  context: ActionContext,
  _previousState: AdminWeightingAuthoringFormState,
  formData: FormData,
): Promise<AdminWeightingAuthoringFormState> {
  const values = getValuesFromFormData(formData);
  const validation = validateAdminWeightingAuthoringValues(values);
  if (Object.keys(validation.fieldErrors).length > 0) {
    return validation;
  }

  return runWeightWriteAction({
    assessmentKey: context.assessmentKey,
    values,
    action: (db) =>
      createOptionSignalWeightRecord({
        db,
        assessmentVersionId: context.assessmentVersionId,
        optionId: context.optionId,
        values,
      }),
  });
}

export async function updateOptionSignalWeightAction(
  context: ActionContext,
  _previousState: AdminWeightingAuthoringFormState,
  formData: FormData,
): Promise<AdminWeightingAuthoringFormState> {
  const values = getValuesFromFormData(formData);
  const validation = validateAdminWeightingAuthoringValues(values);
  if (Object.keys(validation.fieldErrors).length > 0) {
    return validation;
  }

  return runWeightWriteAction({
    assessmentKey: context.assessmentKey,
    values,
    action: (db) =>
      updateOptionSignalWeightRecord({
        db,
        assessmentVersionId: context.assessmentVersionId,
        optionId: context.optionId,
        optionSignalWeightId: context.optionSignalWeightId ?? '',
        values,
      }),
  });
}

export async function deleteOptionSignalWeightAction(
  context: ActionContext,
  _previousState: AdminWeightingAuthoringFormState,
  _formData: FormData,
): Promise<AdminWeightingAuthoringFormState> {
  return runWeightWriteAction({
    assessmentKey: context.assessmentKey,
    values: emptyAdminWeightingAuthoringFormValues,
    action: (db) =>
      deleteOptionSignalWeightRecord({
        db,
        assessmentVersionId: context.assessmentVersionId,
        optionId: context.optionId,
        optionSignalWeightId: context.optionSignalWeightId ?? '',
      }),
  });
}
