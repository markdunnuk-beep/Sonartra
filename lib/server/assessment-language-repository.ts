import type { Queryable } from '@/lib/engine/repository-sql';
import { getDbPool } from '@/lib/server/db';

type AssessmentLanguageRow = {
  section: string;
  content: string;
};

export async function getAssessmentLanguage(
  assessmentVersionId: string,
  db: Queryable = getDbPool(),
): Promise<{ assessment_description: string | null }> {
  const result = await db.query<AssessmentLanguageRow>(
    `
    SELECT
      section,
      content
    FROM assessment_version_language_assessment
    WHERE assessment_version_id = $1
    ORDER BY section ASC
    `,
    [assessmentVersionId],
  );

  const map: Record<string, string> = {};

  for (const row of result.rows) {
    map[row.section] = row.content;
  }

  return {
    assessment_description: map.assessment_description ?? null,
  };
}
