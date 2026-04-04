import type { Queryable } from '@/lib/engine/repository-sql';
import { getDbPool } from '@/lib/server/db';

export type AssessmentVersionIntroRecord = {
  introTitle: string;
  introSummary: string;
  introHowItWorks: string;
  estimatedTimeOverride: string | null;
  instructions: string | null;
  confidentialityNote: string | null;
};

type AssessmentVersionIntroRow = {
  intro_title: string;
  intro_summary: string;
  intro_how_it_works: string;
  estimated_time_override: string | null;
  instructions: string | null;
  confidentiality_note: string | null;
};

export async function getAssessmentVersionIntro(
  assessmentVersionId: string,
  db: Queryable = getDbPool(),
): Promise<AssessmentVersionIntroRecord | null> {
  const result = await db.query<AssessmentVersionIntroRow>(
    `
    SELECT
      intro_title,
      intro_summary,
      intro_how_it_works,
      estimated_time_override,
      instructions,
      confidentiality_note
    FROM assessment_version_intro
    WHERE assessment_version_id = $1
    `,
    [assessmentVersionId],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    introTitle: row.intro_title,
    introSummary: row.intro_summary,
    introHowItWorks: row.intro_how_it_works,
    estimatedTimeOverride: row.estimated_time_override,
    instructions: row.instructions,
    confidentialityNote: row.confidentiality_note,
  };
}

export async function upsertAssessmentVersionIntro(
  db: Queryable,
  params: {
    assessmentVersionId: string;
    values: AssessmentVersionIntroRecord;
  },
): Promise<void> {
  await db.query(
    `
    INSERT INTO assessment_version_intro (
      assessment_version_id,
      intro_title,
      intro_summary,
      intro_how_it_works,
      estimated_time_override,
      instructions,
      confidentiality_note
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (assessment_version_id)
    DO UPDATE SET
      intro_title = EXCLUDED.intro_title,
      intro_summary = EXCLUDED.intro_summary,
      intro_how_it_works = EXCLUDED.intro_how_it_works,
      estimated_time_override = EXCLUDED.estimated_time_override,
      instructions = EXCLUDED.instructions,
      confidentiality_note = EXCLUDED.confidentiality_note,
      updated_at = NOW()
    `,
    [
      params.assessmentVersionId,
      params.values.introTitle,
      params.values.introSummary,
      params.values.introHowItWorks,
      params.values.estimatedTimeOverride,
      params.values.instructions,
      params.values.confidentialityNote,
    ],
  );
}
