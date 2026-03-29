'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getDbPool } from '@/lib/server/db';

export type AdminAssessmentDeleteActionState = {
  formError: string | null;
  formSuccess: string | null;
};

export const initialAdminAssessmentDeleteActionState: AdminAssessmentDeleteActionState = {
  formError: null,
  formSuccess: null,
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

type DeleteAssessmentActionDependencies = {
  getDbPool(): DbPoolLike;
  redirect(path: string): never;
  revalidatePath(path: string): void;
};

type DeleteAssessmentContext = {
  assessmentId: string;
  assessmentKey: string;
};

type DeleteAssessmentContextRow = {
  assessment_id: string;
  assessment_key: string;
};

type RuntimeDataCountRow = {
  attempt_count: string;
  result_count: string;
};

type DeletedAssessmentRow = {
  id: string;
};

type DeleteAssessmentFailureStage =
  | 'load_assessment'
  | 'check_runtime_data'
  | 'delete_weights'
  | 'delete_options'
  | 'delete_questions'
  | 'delete_signals'
  | 'delete_domains'
  | 'delete_versions'
  | 'delete_assessment';

class DeleteAssessmentPersistenceError extends Error {
  readonly stage: DeleteAssessmentFailureStage;
  readonly cause: unknown;

  constructor(stage: DeleteAssessmentFailureStage, cause: unknown) {
    super('DELETE_ASSESSMENT_PERSISTENCE_FAILED');
    this.name = 'DeleteAssessmentPersistenceError';
    this.stage = stage;
    this.cause = cause;
  }
}

function assessmentPath(assessmentKey: string): string {
  return `/admin/assessments/${assessmentKey}`;
}

function toCount(value: string | number | null | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== 'string') {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function unwrapDeleteAssessmentError(error: unknown): {
  cause: unknown;
  stage: DeleteAssessmentFailureStage | null;
} {
  if (error instanceof DeleteAssessmentPersistenceError) {
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

async function loadAssessmentContext(
  db: Queryable,
  assessmentKey: string,
): Promise<DeleteAssessmentContext | null> {
  try {
    const result = await db.query<DeleteAssessmentContextRow>(
      `
      SELECT
        id AS assessment_id,
        assessment_key
      FROM assessments
      WHERE assessment_key = $1
      `,
      [assessmentKey],
    );

    const row = result.rows[0];
    return row
      ? {
          assessmentId: row.assessment_id,
          assessmentKey: row.assessment_key,
        }
      : null;
  } catch (error) {
    throw new DeleteAssessmentPersistenceError('load_assessment', error);
  }
}

async function loadRuntimeDataCounts(
  db: Queryable,
  assessmentId: string,
): Promise<RuntimeDataCountRow> {
  try {
    const result = await db.query<RuntimeDataCountRow>(
      `
      SELECT
        (
          SELECT COUNT(*)::text
          FROM attempts
          WHERE assessment_id = $1
             OR assessment_version_id IN (
               SELECT id
               FROM assessment_versions
               WHERE assessment_id = $1
             )
        ) AS attempt_count,
        (
          SELECT COUNT(*)::text
          FROM results
          WHERE assessment_id = $1
             OR assessment_version_id IN (
               SELECT id
               FROM assessment_versions
               WHERE assessment_id = $1
             )
        ) AS result_count
      `,
      [assessmentId],
    );

    return result.rows[0] ?? {
      attempt_count: '0',
      result_count: '0',
    };
  } catch (error) {
    throw new DeleteAssessmentPersistenceError('check_runtime_data', error);
  }
}

function mapDeleteAssessmentErrorToState(error: unknown): AdminAssessmentDeleteActionState | null {
  if (!(error instanceof Error)) {
    return null;
  }

  switch (error.message) {
    case 'DELETE_CONFIRMATION_REQUIRED':
      return {
        formError:
          'Confirm permanent deletion before continuing. This action cannot be undone.',
        formSuccess: null,
      };
    case 'ASSESSMENT_NOT_FOUND':
      return {
        formError: 'This assessment could not be found anymore.',
        formSuccess: null,
      };
    case 'ASSESSMENT_DELETE_BLOCKED_RUNTIME_DATA':
      return {
        formError:
          'This assessment cannot be permanently deleted because runtime user data already exists for it.',
        formSuccess: null,
      };
    default:
      return null;
  }
}

function logDeleteAssessmentFailure(params: {
  assessmentKey: string;
  stage: DeleteAssessmentFailureStage | null;
  error: unknown;
}): void {
  const message = params.error instanceof Error ? params.error.message : String(params.error);
  console.error('[admin-assessment-delete] mutation failure', {
    assessmentKey: params.assessmentKey,
    stage: params.stage,
    message,
  });
}

export async function deleteAssessmentRecords(params: {
  db: Queryable;
  assessmentKey: string;
}): Promise<void> {
  const assessment = await loadAssessmentContext(params.db, params.assessmentKey);
  if (!assessment) {
    throw new Error('ASSESSMENT_NOT_FOUND');
  }

  const runtimeDataCounts = await loadRuntimeDataCounts(params.db, assessment.assessmentId);
  if (
    toCount(runtimeDataCounts.attempt_count) > 0 ||
    toCount(runtimeDataCounts.result_count) > 0
  ) {
    throw new Error('ASSESSMENT_DELETE_BLOCKED_RUNTIME_DATA');
  }

  try {
    await params.db.query(
      `
      DELETE FROM option_signal_weights
      WHERE option_id IN (
        SELECT o.id
        FROM options o
        INNER JOIN questions q ON q.id = o.question_id
        INNER JOIN assessment_versions av ON av.id = q.assessment_version_id
        WHERE av.assessment_id = $1
      )
      OR signal_id IN (
        SELECT s.id
        FROM signals s
        INNER JOIN assessment_versions av ON av.id = s.assessment_version_id
        WHERE av.assessment_id = $1
      )
      `,
      [assessment.assessmentId],
    );
  } catch (error) {
    throw new DeleteAssessmentPersistenceError('delete_weights', error);
  }

  try {
    await params.db.query(
      `
      DELETE FROM options
      WHERE question_id IN (
        SELECT q.id
        FROM questions q
        INNER JOIN assessment_versions av ON av.id = q.assessment_version_id
        WHERE av.assessment_id = $1
      )
      `,
      [assessment.assessmentId],
    );
  } catch (error) {
    throw new DeleteAssessmentPersistenceError('delete_options', error);
  }

  try {
    await params.db.query(
      `
      DELETE FROM questions
      WHERE assessment_version_id IN (
        SELECT id
        FROM assessment_versions
        WHERE assessment_id = $1
      )
      `,
      [assessment.assessmentId],
    );
  } catch (error) {
    throw new DeleteAssessmentPersistenceError('delete_questions', error);
  }

  try {
    await params.db.query(
      `
      DELETE FROM signals
      WHERE assessment_version_id IN (
        SELECT id
        FROM assessment_versions
        WHERE assessment_id = $1
      )
      `,
      [assessment.assessmentId],
    );
  } catch (error) {
    throw new DeleteAssessmentPersistenceError('delete_signals', error);
  }

  try {
    await params.db.query(
      `
      DELETE FROM domains
      WHERE assessment_version_id IN (
        SELECT id
        FROM assessment_versions
        WHERE assessment_id = $1
      )
      `,
      [assessment.assessmentId],
    );
  } catch (error) {
    throw new DeleteAssessmentPersistenceError('delete_domains', error);
  }

  try {
    await params.db.query(
      `
      DELETE FROM assessment_versions
      WHERE assessment_id = $1
      `,
      [assessment.assessmentId],
    );
  } catch (error) {
    throw new DeleteAssessmentPersistenceError('delete_versions', error);
  }

  try {
    const result = await params.db.query<DeletedAssessmentRow>(
      `
      DELETE FROM assessments
      WHERE id = $1
        AND assessment_key = $2
      RETURNING id
      `,
      [assessment.assessmentId, assessment.assessmentKey],
    );

    if (!result.rows[0]?.id) {
      throw new Error('ASSESSMENT_NOT_FOUND');
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'ASSESSMENT_NOT_FOUND') {
      throw error;
    }

    throw new DeleteAssessmentPersistenceError('delete_assessment', error);
  }
}

export async function deleteAssessmentAction(
  assessmentKey: string,
  _previousState: AdminAssessmentDeleteActionState,
  formData: FormData,
): Promise<AdminAssessmentDeleteActionState> {
  return deleteAssessmentActionWithDependencies(assessmentKey, _previousState, formData);
}

export async function deleteAssessmentActionWithDependencies(
  assessmentKey: string,
  _previousState: AdminAssessmentDeleteActionState,
  formData: FormData,
  dependencies: DeleteAssessmentActionDependencies = {
    getDbPool,
    redirect,
    revalidatePath,
  },
): Promise<AdminAssessmentDeleteActionState> {
  if (formData.get('confirmDelete') !== 'on') {
    return {
      formError:
        'Confirm permanent deletion before continuing. This action cannot be undone.',
      formSuccess: null,
    };
  }

  let client: TransactionClient | null = null;

  try {
    client = await dependencies.getDbPool().connect();
    await client.query('BEGIN');

    await deleteAssessmentRecords({
      db: client,
      assessmentKey,
    });

    await client.query('COMMIT');
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK').catch(() => undefined);
    }

    const { cause, stage } = unwrapDeleteAssessmentError(error);
    const mapped = mapDeleteAssessmentErrorToState(cause);
    if (mapped) {
      return mapped;
    }

    logDeleteAssessmentFailure({
      assessmentKey,
      stage,
      error: cause,
    });

    return {
      formError: 'The assessment could not be deleted. Try again after refreshing the page.',
      formSuccess: null,
    };
  } finally {
    client?.release();
  }

  dependencies.revalidatePath('/admin/assessments');
  dependencies.revalidatePath(assessmentPath(assessmentKey));
  dependencies.redirect('/admin/assessments');
}
