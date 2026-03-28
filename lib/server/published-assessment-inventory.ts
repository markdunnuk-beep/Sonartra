import type { Queryable } from '@/lib/engine/repository-sql';

export type PublishedAssessmentInventoryItem = {
  assessmentId: string;
  assessmentKey: string;
  title: string;
  description: string | null;
  assessmentVersionId: string;
  versionTag: string;
  publishedAt: string | null;
  questionCount: number;
};

type PublishedAssessmentInventoryRow = {
  assessment_id: string;
  assessment_key: string;
  assessment_title: string;
  assessment_description: string | null;
  assessment_version_id: string;
  version_tag: string;
  published_at: string | null;
  question_count: string;
};

function mapPublishedAssessmentInventoryRow(
  row: PublishedAssessmentInventoryRow,
): PublishedAssessmentInventoryItem {
  return {
    assessmentId: row.assessment_id,
    assessmentKey: row.assessment_key,
    title: row.assessment_title,
    description: row.assessment_description,
    assessmentVersionId: row.assessment_version_id,
    versionTag: row.version_tag,
    publishedAt: row.published_at,
    questionCount: Number(row.question_count),
  };
}

export async function listPublishedAssessmentInventory(
  db: Queryable,
): Promise<readonly PublishedAssessmentInventoryItem[]> {
  const result = await db.query<PublishedAssessmentInventoryRow>(
    `
    SELECT
      a.id AS assessment_id,
      a.assessment_key,
      a.title AS assessment_title,
      a.description AS assessment_description,
      av.id AS assessment_version_id,
      av.version AS version_tag,
      av.published_at,
      COUNT(q.id) AS question_count
    FROM assessments a
    INNER JOIN assessment_versions av ON av.assessment_id = a.id
    LEFT JOIN questions q ON q.assessment_version_id = av.id
    WHERE av.lifecycle_status = 'PUBLISHED'
    GROUP BY
      a.id,
      a.assessment_key,
      a.title,
      a.description,
      av.id,
      av.version,
      av.published_at
    ORDER BY a.title ASC, a.assessment_key ASC
    `,
  );

  return Object.freeze(result.rows.map(mapPublishedAssessmentInventoryRow));
}
