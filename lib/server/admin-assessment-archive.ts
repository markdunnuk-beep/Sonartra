'use server';

import { revalidatePath } from 'next/cache';

import type { AdminAssessmentArchiveActionState } from '@/lib/admin/admin-assessment-archive';
import { getDbPool } from '@/lib/server/db';

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

type TransactionClient = Queryable & {
  release(): void;
};

type DbPoolLike = {
  connect(): Promise<TransactionClient>;
};

type ArchiveAssessmentActionDependencies = {
  getDbPool(): DbPoolLike;
  revalidatePath(path: string): void;
};

type ArchiveAssessmentContextRow = {
  assessment_id: string;
  assessment_key: string;
  assessment_is_active: boolean;
};

type ArchiveAssessmentImpactRow = {
  published_version_count: string;
  assignment_count: string;
};

class ArchiveAssessmentPersistenceError extends Error {
  readonly stage: 'load_assessment' | 'load_impact' | 'archive_assessment';
  readonly cause: unknown;

  constructor(stage: 'load_assessment' | 'load_impact' | 'archive_assessment', cause: unknown) {
    super('ARCHIVE_ASSESSMENT_PERSISTENCE_FAILED');
    this.name = 'ArchiveAssessmentPersistenceError';
    this.stage = stage;
    this.cause = cause;
  }
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

async function loadAssessmentContext(
  db: Queryable,
  assessmentKey: string,
): Promise<ArchiveAssessmentContextRow | null> {
  try {
    const result = await db.query<ArchiveAssessmentContextRow>(
      `
      SELECT
        id AS assessment_id,
        assessment_key,
        is_active AS assessment_is_active
      FROM assessments
      WHERE assessment_key = $1
      `,
      [assessmentKey],
    );

    return result.rows[0] ?? null;
  } catch (error) {
    throw new ArchiveAssessmentPersistenceError('load_assessment', error);
  }
}

async function loadArchiveImpact(
  db: Queryable,
  assessmentId: string,
): Promise<ArchiveAssessmentImpactRow> {
  try {
    const result = await db.query<ArchiveAssessmentImpactRow>(
      `
      SELECT
        (
          SELECT COUNT(*)::text
          FROM assessment_versions
          WHERE assessment_id = $1
            AND lifecycle_status = 'PUBLISHED'
        ) AS published_version_count,
        (
          SELECT COUNT(*)::text
          FROM user_assessment_assignments
          WHERE assessment_id = $1
        ) AS assignment_count
      `,
      [assessmentId],
    );

    return result.rows[0] ?? {
      published_version_count: '0',
      assignment_count: '0',
    };
  } catch (error) {
    throw new ArchiveAssessmentPersistenceError('load_impact', error);
  }
}

export async function archiveAssessmentRecord(params: {
  db: Queryable;
  assessmentKey: string;
}): Promise<'archived' | 'already_archived'> {
  const assessment = await loadAssessmentContext(params.db, params.assessmentKey);
  if (!assessment) {
    throw new Error('ASSESSMENT_NOT_FOUND');
  }

  if (!assessment.assessment_is_active) {
    return 'already_archived';
  }

  const impact = await loadArchiveImpact(params.db, assessment.assessment_id);
  if (
    toCount(impact.published_version_count) > 0 &&
    toCount(impact.assignment_count) > 0
  ) {
    throw new Error('ASSESSMENT_ARCHIVE_BLOCKED_ASSIGNED_PUBLISHED');
  }

  try {
    await params.db.query(
      `
      UPDATE assessments
      SET
        is_active = FALSE,
        updated_at = NOW()
      WHERE id = $1
        AND assessment_key = $2
      `,
      [assessment.assessment_id, assessment.assessment_key],
    );
  } catch (error) {
    throw new ArchiveAssessmentPersistenceError('archive_assessment', error);
  }

  return 'archived';
}

function mapArchiveAssessmentErrorToState(error: unknown): AdminAssessmentArchiveActionState | null {
  if (!(error instanceof Error)) {
    return null;
  }

  switch (error.message) {
    case 'ARCHIVE_CONFIRMATION_REQUIRED':
      return {
        formError: 'Confirm archive before continuing.',
        formSuccess: null,
      };
    case 'ASSESSMENT_NOT_FOUND':
      return {
        formError: 'This assessment could not be found anymore.',
        formSuccess: null,
      };
    case 'ASSESSMENT_ARCHIVE_BLOCKED_ASSIGNED_PUBLISHED':
      return {
        formError: 'This published assessment is still assigned to users. Remove those assignments before archiving it.',
        formSuccess: null,
      };
    default:
      return null;
  }
}

export async function archiveAssessmentAction(
  assessmentKey: string,
  _previousState: AdminAssessmentArchiveActionState,
  formData: FormData,
): Promise<AdminAssessmentArchiveActionState> {
  return archiveAssessmentActionWithDependencies(assessmentKey, _previousState, formData);
}

export async function archiveAssessmentActionWithDependencies(
  assessmentKey: string,
  _previousState: AdminAssessmentArchiveActionState,
  formData: FormData,
  dependencies: ArchiveAssessmentActionDependencies = {
    getDbPool,
    revalidatePath,
  },
): Promise<AdminAssessmentArchiveActionState> {
  if (formData.get('confirmArchive') !== 'on') {
    return {
      formError: 'Confirm archive before continuing.',
      formSuccess: null,
    };
  }

  let client: TransactionClient | null = null;

  try {
    client = await dependencies.getDbPool().connect();
    await client.query('BEGIN');

    const outcome = await archiveAssessmentRecord({
      db: client,
      assessmentKey,
    });

    await client.query('COMMIT');

    dependencies.revalidatePath('/admin/assessments');
    dependencies.revalidatePath(`/admin/assessments/${assessmentKey}`);
    dependencies.revalidatePath('/app/assessments');
    dependencies.revalidatePath('/app/workspace');
    dependencies.revalidatePath('/admin/users');

    return {
      formError: null,
      formSuccess: outcome === 'already_archived'
        ? 'This assessment is already archived.'
        : 'Assessment archived. Existing attempts and results were preserved.',
    };
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK').catch(() => undefined);
    }

    const mapped = mapArchiveAssessmentErrorToState(
      error instanceof ArchiveAssessmentPersistenceError ? error.cause : error,
    );
    if (mapped) {
      return mapped;
    }

    console.error('[admin-assessment-archive] mutation failure', {
      assessmentKey,
      stage: error instanceof ArchiveAssessmentPersistenceError ? error.stage : null,
      message: error instanceof Error ? error.message : String(error),
    });

    return {
      formError: 'The assessment could not be archived. Try again after refreshing the page.',
      formSuccess: null,
    };
  } finally {
    client?.release();
  }
}
