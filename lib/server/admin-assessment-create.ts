'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { normalizeAssessmentKeyInput } from '@/lib/admin/assessment-key';
import { INITIAL_ASSESSMENT_VERSION_TAG } from '@/lib/admin/admin-assessment-versioning';
import {
  type AdminAssessmentCreateFormState,
  type AdminAssessmentCreateFormValues,
  validateAdminAssessmentCreateValues,
} from '@/lib/admin/admin-assessment-create';
import { getDbPool } from '@/lib/server/db';
import { resolveAssessmentMode } from '@/lib/utils/assessment-mode';

type InsertAssessmentRecord = {
  id: string;
  assessment_key: string;
};

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

type TransactionClient = Queryable & {
  release(): void;
};

type DbPoolLike = {
  connect(): Promise<TransactionClient>;
};

type CreateAssessmentActionDependencies = {
  getDbPool(): DbPoolLike;
  redirect(path: string): never;
  revalidatePath(path: string): void;
};

type CreateAssessmentFailureStage =
  | 'precheck_assessment_key'
  | 'insert_assessment'
  | 'insert_assessment_version';

type PostgresErrorLike = {
  code?: string;
  constraint?: string;
  detail?: string;
  message?: string;
  table?: string;
  column?: string;
};

class CreateAssessmentPersistenceError extends Error {
  readonly stage: CreateAssessmentFailureStage;
  readonly cause: unknown;

  constructor(stage: CreateAssessmentFailureStage, cause: unknown) {
    super('CREATE_ASSESSMENT_PERSISTENCE_FAILED');
    this.name = 'CreateAssessmentPersistenceError';
    this.stage = stage;
    this.cause = cause;
  }
}

const GENERIC_CREATE_ERROR_MESSAGE =
  'The assessment could not be created. Review the inputs and try again.';

function normalizeFormValue(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeAssessmentKey(value: string): string {
  return normalizeAssessmentKeyInput(value);
}

function unwrapCreateAssessmentError(error: unknown): {
  cause: unknown;
  stage: CreateAssessmentFailureStage | null;
} {
  if (error instanceof CreateAssessmentPersistenceError) {
    return {
      cause: error.cause,
      stage: error.stage,
    };
  }

  return {
    cause: error,
    stage: null,
  };
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
    typeof candidate.message !== 'string' &&
    typeof candidate.table !== 'string' &&
    typeof candidate.column !== 'string'
  ) {
    return null;
  }

  return candidate;
}

function isAssessmentKeyExistsError(error: unknown): boolean {
  if (error instanceof Error && error.message === 'ASSESSMENT_KEY_EXISTS') {
    return true;
  }

  const candidate = toPostgresErrorLike(error);
  if (!candidate || candidate.code !== '23505') {
    return false;
  }

  return (
    candidate.constraint?.includes('assessment') === true ||
    candidate.message?.includes('assessment_key') === true ||
    candidate.detail?.includes('(assessment_key)') === true
  );
}

function buildFieldErrorState(
  values: AdminAssessmentCreateFormValues,
  field: keyof AdminAssessmentCreateFormState['fieldErrors'],
  message: string,
): AdminAssessmentCreateFormState {
  return {
    formError: null,
    fieldErrors: {
      [field]: message,
    },
    values,
  };
}

function mapDatabaseFailureToFormState(
  values: AdminAssessmentCreateFormValues,
  error: unknown,
  stage: CreateAssessmentFailureStage | null,
): AdminAssessmentCreateFormState | null {
  if (isAssessmentKeyExistsError(error)) {
    return buildFieldErrorState(values, 'assessmentKey', 'That assessment key is already in use.');
  }

  const candidate = toPostgresErrorLike(error);
  if (!candidate) {
    return null;
  }

  if (candidate.code === '23502') {
    if (candidate.column === 'title') {
      return buildFieldErrorState(values, 'title', 'Assessment title is required.');
    }

    if (candidate.column === 'assessment_key') {
      return buildFieldErrorState(values, 'assessmentKey', 'Assessment key is required.');
    }

    return {
      formError:
        stage === 'insert_assessment_version'
          ? 'The initial draft version could not be created because the database requires additional version fields.'
          : 'The assessment could not be created because the database requires additional fields.',
      fieldErrors: {},
      values,
    };
  }

  if (candidate.code === '23514') {
    return {
      formError:
        stage === 'insert_assessment_version'
          ? 'The initial draft version could not be created because the database rejected the version lifecycle values.'
          : 'The assessment could not be created because the database rejected one of the submitted values.',
      fieldErrors: {},
      values,
    };
  }

  if (candidate.code === '23503') {
    return {
      formError:
        stage === 'insert_assessment_version'
          ? 'The initial draft version could not be linked to the new assessment record.'
          : 'The assessment could not be created because a required related record was missing.',
      fieldErrors: {},
      values,
    };
  }

  if (candidate.code === '23505') {
    return {
      formError:
        stage === 'insert_assessment_version'
          ? `The initial draft version (${INITIAL_ASSESSMENT_VERSION_TAG}) could not be created because a unique database constraint was violated.`
          : 'The assessment could not be created because a unique database constraint was violated.',
      fieldErrors: {},
      values,
    };
  }

  return null;
}

function logCreateAssessmentFailure(params: {
  values: AdminAssessmentCreateFormValues;
  error: unknown;
  stage: CreateAssessmentFailureStage | null;
}): void {
  const candidate = toPostgresErrorLike(params.error);
  console.error('[admin-assessment-create] persistence failure', {
    assessmentKey: params.values.assessmentKey,
    title: params.values.title,
    descriptionLength: params.values.description.length,
    stage: params.stage,
    code: candidate?.code,
    constraint: candidate?.constraint,
    table: candidate?.table,
    column: candidate?.column,
    detail: candidate?.detail,
    message:
      candidate?.message ??
      (params.error instanceof Error ? params.error.message : String(params.error)),
  });
}

async function assessmentKeyExists(db: Queryable, assessmentKey: string): Promise<boolean> {
  const result = await db.query<{ id: string }>(
    `
    SELECT id
    FROM assessments
    WHERE assessment_key = $1
    `,
    [assessmentKey],
  );

  return result.rows.length > 0;
}

export async function createAdminAssessmentRecords(params: {
  db: Queryable;
  values: AdminAssessmentCreateFormValues;
}): Promise<{ assessmentId: string; assessmentKey: string }> {
  let existing = false;

  try {
    existing = await assessmentKeyExists(params.db, params.values.assessmentKey);
  } catch (error) {
    throw new CreateAssessmentPersistenceError('precheck_assessment_key', error);
  }

  if (existing) {
    throw new Error('ASSESSMENT_KEY_EXISTS');
  }

  let assessment: InsertAssessmentRecord | undefined;

  try {
    const insertedAssessment = await params.db.query<InsertAssessmentRecord>(
      `
      INSERT INTO assessments (
        assessment_key,
        mode,
        title,
        description,
        is_active
      )
      VALUES ($1, $2, $3, $4, TRUE)
      RETURNING id, assessment_key
      `,
      [
        params.values.assessmentKey,
        params.values.mode,
        params.values.title,
        params.values.description || null,
      ],
    );

    assessment = insertedAssessment.rows[0];
  } catch (error) {
    throw new CreateAssessmentPersistenceError('insert_assessment', error);
  }

  if (!assessment) {
    throw new Error('ASSESSMENT_INSERT_FAILED');
  }

  try {
    await params.db.query(
      `
      INSERT INTO assessment_versions (
        assessment_id,
        mode,
        version,
        lifecycle_status,
        title_override,
        description_override
      )
      VALUES ($1, $2, $3, 'DRAFT', NULL, NULL)
      `,
      [assessment.id, params.values.mode, INITIAL_ASSESSMENT_VERSION_TAG],
    );
  } catch (error) {
    throw new CreateAssessmentPersistenceError('insert_assessment_version', error);
  }

  return {
    assessmentId: assessment.id,
    assessmentKey: assessment.assessment_key,
  };
}

export async function createAssessmentAction(
  _previousState: AdminAssessmentCreateFormState,
  formData: FormData,
): Promise<AdminAssessmentCreateFormState> {
  return createAssessmentActionWithDependencies(_previousState, formData);
}

export async function createAssessmentActionWithDependencies(
  _previousState: AdminAssessmentCreateFormState,
  formData: FormData,
  dependencies: CreateAssessmentActionDependencies = {
    getDbPool,
    redirect,
    revalidatePath,
  },
): Promise<AdminAssessmentCreateFormState> {
  const values: AdminAssessmentCreateFormValues = {
    title: normalizeFormValue(formData.get('title')),
    assessmentKey: normalizeAssessmentKey(normalizeFormValue(formData.get('assessmentKey'))),
    description: normalizeFormValue(formData.get('description')),
    mode: resolveAssessmentMode(normalizeFormValue(formData.get('mode'))),
  };

  const validation = validateAdminAssessmentCreateValues(values);
  if (Object.keys(validation.fieldErrors).length > 0) {
    return validation;
  }

  let client: TransactionClient | null = null;
  let created: { assessmentId: string; assessmentKey: string } | null = null;

  try {
    client = await dependencies.getDbPool().connect();
    await client.query('BEGIN');

    created = await createAdminAssessmentRecords({
      db: client,
      values,
    });

    await client.query('COMMIT');
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK').catch(() => undefined);
    }

    const { cause, stage } = unwrapCreateAssessmentError(error);
    const knownFailure = mapDatabaseFailureToFormState(values, cause, stage);

    if (knownFailure) {
      if (knownFailure.formError) {
        logCreateAssessmentFailure({
          values,
          error: cause,
          stage,
        });
      }

      return knownFailure;
    }

    logCreateAssessmentFailure({
      values,
      error: cause,
      stage,
    });

    return {
      formError: GENERIC_CREATE_ERROR_MESSAGE,
      fieldErrors: {},
      values,
    };
  } finally {
    client?.release();
  }

  if (!created) {
    return {
      formError: GENERIC_CREATE_ERROR_MESSAGE,
      fieldErrors: {},
      values,
    };
  }

  dependencies.revalidatePath('/admin/assessments');
  dependencies.revalidatePath(`/admin/assessments/${created.assessmentKey}`);
  dependencies.redirect(`/admin/assessments/${created.assessmentKey}`);
}


