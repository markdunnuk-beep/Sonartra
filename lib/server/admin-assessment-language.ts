'use server';

import { revalidatePath } from 'next/cache';

import { getDbPool } from '@/lib/server/db';

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

type AssessmentLanguageDependencies = {
  db: Queryable;
  revalidatePath(path: string): void;
};

type AssessmentVersionRow = {
  assessment_key: string;
  lifecycle_status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
};

export type UpsertAssessmentLanguageParams = {
  assessmentVersionId: string;
  section: 'assessment_description';
  content: string;
};

export type UpsertAssessmentLanguageResult = {
  ok: boolean;
  value: string | null;
  error: string | null;
};

function authoringPath(assessmentKey: string): string {
  return `/admin/assessments/${assessmentKey}/language`;
}

async function loadAssessmentVersion(
  db: Queryable,
  assessmentVersionId: string,
): Promise<AssessmentVersionRow | null> {
  const result = await db.query<AssessmentVersionRow>(
    `
    SELECT
      a.assessment_key,
      av.lifecycle_status
    FROM assessment_versions av
    INNER JOIN assessments a ON a.id = av.assessment_id
    WHERE av.id = $1
    `,
    [assessmentVersionId],
  );

  return result.rows[0] ?? null;
}

export async function upsertAssessmentLanguage(
  params: UpsertAssessmentLanguageParams,
): Promise<UpsertAssessmentLanguageResult> {
  return upsertAssessmentLanguageWithDependencies(params, {
    db: getDbPool(),
    revalidatePath,
  });
}

export async function upsertAssessmentLanguageWithDependencies(
  params: UpsertAssessmentLanguageParams,
  dependencies: AssessmentLanguageDependencies,
): Promise<UpsertAssessmentLanguageResult> {
  const assessmentVersion = await loadAssessmentVersion(dependencies.db, params.assessmentVersionId);

  if (!assessmentVersion) {
    return {
      ok: false,
      value: null,
      error: 'Assessment language could not be saved because the assessment version was not found.',
    };
  }

  if (assessmentVersion.lifecycle_status !== 'DRAFT') {
    return {
      ok: false,
      value: null,
      error: 'Assessment language can be edited only for draft assessment versions.',
    };
  }

  const trimmedContent = params.content.trim();

  try {
    if (!trimmedContent) {
      await dependencies.db.query(
        `
        DELETE FROM assessment_version_language_assessment
        WHERE assessment_version_id = $1
          AND section = $2
        `,
        [params.assessmentVersionId, params.section],
      );
    } else {
      await dependencies.db.query(
        `
        INSERT INTO assessment_version_language_assessment (
          assessment_version_id,
          section,
          content
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (assessment_version_id, section)
        DO UPDATE SET
          content = EXCLUDED.content,
          updated_at = NOW()
        `,
        [params.assessmentVersionId, params.section, trimmedContent],
      );
    }

    dependencies.revalidatePath('/admin/assessments');
    dependencies.revalidatePath(authoringPath(assessmentVersion.assessment_key));

    return {
      ok: true,
      value: trimmedContent || null,
      error: null,
    };
  } catch {
    return {
      ok: false,
      value: null,
      error: 'Assessment language could not be saved. Try again.',
    };
  }
}
