'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { getDbPool } from '@/lib/server/db';

export type AdminAssessmentCreateFormValues = {
  title: string;
  assessmentKey: string;
  description: string;
};

export type AdminAssessmentCreateFormState = {
  formError: string | null;
  fieldErrors: {
    title?: string;
    assessmentKey?: string;
    description?: string;
  };
  values: AdminAssessmentCreateFormValues;
};

type InsertAssessmentRecord = {
  id: string;
  assessment_key: string;
};

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

const INITIAL_VERSION_TAG = '1.0.0';
const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const emptyAdminAssessmentCreateFormValues: AdminAssessmentCreateFormValues = {
  title: '',
  assessmentKey: '',
  description: '',
};

export const initialAdminAssessmentCreateFormState: AdminAssessmentCreateFormState = {
  formError: null,
  fieldErrors: {},
  values: emptyAdminAssessmentCreateFormValues,
};

function normalizeFormValue(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeAssessmentKey(value: string): string {
  return value.trim().toLowerCase();
}

function validateInput(values: AdminAssessmentCreateFormValues): AdminAssessmentCreateFormState {
  const fieldErrors: AdminAssessmentCreateFormState['fieldErrors'] = {};

  if (!values.title) {
    fieldErrors.title = 'Assessment title is required.';
  }

  if (!values.assessmentKey) {
    fieldErrors.assessmentKey = 'Assessment key is required.';
  } else if (!KEY_PATTERN.test(values.assessmentKey)) {
    fieldErrors.assessmentKey =
      'Use lowercase letters, numbers, and single hyphens only.';
  } else if (values.assessmentKey.length > 64) {
    fieldErrors.assessmentKey = 'Assessment key must be 64 characters or fewer.';
  }

  if (values.description.length > 600) {
    fieldErrors.description = 'Description must be 600 characters or fewer.';
  }

  return {
    formError: null,
    fieldErrors,
    values,
  };
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
  const values: AdminAssessmentCreateFormValues = {
    title: normalizeFormValue(formData.get('title')),
    assessmentKey: normalizeAssessmentKey(normalizeFormValue(formData.get('assessmentKey'))),
    description: normalizeFormValue(formData.get('description')),
  };

  const validation = validateInput(values);
  if (Object.keys(validation.fieldErrors).length > 0) {
    return validation;
  }

  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const created = await createAdminAssessmentRecords({
      db: client,
      values,
    });

    await client.query('COMMIT');

    revalidatePath('/admin/assessments');
    revalidatePath(`/admin/assessments/${created.assessmentKey}`);

    redirect(`/admin/assessments/${created.assessmentKey}`);
  } catch (error) {
    await client.query('ROLLBACK');

    if (error instanceof Error && error.message === 'ASSESSMENT_KEY_EXISTS') {
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
    client.release();
  }
}
