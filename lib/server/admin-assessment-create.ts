'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { normalizeAssessmentKeyInput } from '@/lib/admin/assessment-key';
import {
  type AdminAssessmentCreateFormState,
  type AdminAssessmentCreateFormValues,
  validateAdminAssessmentCreateValues,
} from '@/lib/admin/admin-assessment-create';
import { getDbPool } from '@/lib/server/db';

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

const INITIAL_VERSION_TAG = '1.0.0';

function normalizeFormValue(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeAssessmentKey(value: string): string {
  return normalizeAssessmentKeyInput(value);
}

function isAssessmentKeyExistsError(error: unknown): boolean {
  if (error instanceof Error && error.message === 'ASSESSMENT_KEY_EXISTS') {
    return true;
  }

  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as {
    code?: string;
    constraint?: string;
    message?: string;
  };

  if (candidate.code !== '23505') {
    return false;
  }

  return (
    candidate.constraint?.includes('assessment') === true ||
    candidate.message?.includes('assessment_key') === true
  );
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
  const existing = await assessmentKeyExists(params.db, params.values.assessmentKey);
  if (existing) {
    throw new Error('ASSESSMENT_KEY_EXISTS');
  }

  const insertedAssessment = await params.db.query<InsertAssessmentRecord>(
    `
    INSERT INTO assessments (
      assessment_key,
      title,
      description,
      is_active
    )
    VALUES ($1, $2, $3, TRUE)
    RETURNING id, assessment_key
    `,
    [
      params.values.assessmentKey,
      params.values.title,
      params.values.description || null,
    ],
  );

  const assessment = insertedAssessment.rows[0];
  if (!assessment) {
    throw new Error('ASSESSMENT_INSERT_FAILED');
  }

  await params.db.query(
    `
    INSERT INTO assessment_versions (
      assessment_id,
      version,
      lifecycle_status,
      title_override,
      description_override
    )
    VALUES ($1, $2, 'DRAFT', NULL, NULL)
    `,
    [assessment.id, INITIAL_VERSION_TAG],
  );

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
  };

  const validation = validateAdminAssessmentCreateValues(values);
  if (Object.keys(validation.fieldErrors).length > 0) {
    return validation;
  }

  let client: TransactionClient | null = null;

  try {
    client = await dependencies.getDbPool().connect();
    await client.query('BEGIN');

    const created = await createAdminAssessmentRecords({
      db: client,
      values,
    });

    await client.query('COMMIT');

    dependencies.revalidatePath('/admin/assessments');
    dependencies.revalidatePath(`/admin/assessments/${created.assessmentKey}`);

    dependencies.redirect(`/admin/assessments/${created.assessmentKey}`);
    throw new Error('UNREACHABLE_REDIRECT_COMPLETED');
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK').catch(() => undefined);
    }

    if (isAssessmentKeyExistsError(error)) {
      return {
        formError: null,
        fieldErrors: {
          assessmentKey: 'That assessment key is already in use.',
        },
        values,
      };
    }

    return {
      formError:
        'The assessment could not be created. Review the inputs and try again.',
      fieldErrors: {},
      values,
    };
  } finally {
    client?.release();
  }
}
