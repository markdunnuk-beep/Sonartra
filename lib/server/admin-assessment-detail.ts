import type { Queryable } from '@/lib/engine/repository-sql';

import type { AdminAssessmentVersionStatus } from '@/lib/server/admin-assessment-dashboard';

export type AdminAssessmentDetailVersion = {
  assessmentVersionId: string;
  versionTag: string;
  status: AdminAssessmentVersionStatus;
  publishedAt: string | null;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminAssessmentDetailViewModel = {
  assessmentId: string;
  assessmentKey: string;
  title: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  versions: readonly AdminAssessmentDetailVersion[];
  latestDraftVersion: AdminAssessmentDetailVersion | null;
};

type AdminAssessmentDetailRow = {
  assessment_id: string;
  assessment_key: string;
  assessment_title: string;
  assessment_description: string | null;
  assessment_is_active: boolean;
  assessment_created_at: string;
  assessment_updated_at: string;
  assessment_version_id: string | null;
  version_tag: string | null;
  version_status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | null;
  published_at: string | null;
  version_created_at: string | null;
  version_updated_at: string | null;
  question_count: string;
};

function normalizeVersionStatus(
  status: AdminAssessmentDetailRow['version_status'],
): AdminAssessmentVersionStatus | null {
  if (!status) {
    return null;
  }

  switch (status) {
    case 'DRAFT':
      return 'draft';
    case 'PUBLISHED':
      return 'published';
    case 'ARCHIVED':
      return 'archived';
  }
}

export async function getAdminAssessmentDetailByKey(
  db: Queryable,
  assessmentKey: string,
): Promise<AdminAssessmentDetailViewModel | null> {
  const result = await db.query<AdminAssessmentDetailRow>(
    `
    SELECT
      a.id AS assessment_id,
      a.assessment_key,
      a.title AS assessment_title,
      a.description AS assessment_description,
      a.is_active AS assessment_is_active,
      a.created_at AS assessment_created_at,
      a.updated_at AS assessment_updated_at,
      av.id AS assessment_version_id,
      av.version AS version_tag,
      av.lifecycle_status AS version_status,
      av.published_at,
      av.created_at AS version_created_at,
      av.updated_at AS version_updated_at,
      COUNT(q.id) AS question_count
    FROM assessments a
    LEFT JOIN assessment_versions av ON av.assessment_id = a.id
    LEFT JOIN questions q ON q.assessment_version_id = av.id
    WHERE a.assessment_key = $1
    GROUP BY
      a.id,
      a.assessment_key,
      a.title,
      a.description,
      a.is_active,
      a.created_at,
      a.updated_at,
      av.id,
      av.version,
      av.lifecycle_status,
      av.published_at,
      av.created_at,
      av.updated_at
    ORDER BY
      av.updated_at DESC NULLS LAST,
      av.created_at DESC NULLS LAST,
      av.version DESC NULLS LAST
    `,
    [assessmentKey],
  );

  const firstRow = result.rows[0];
  if (!firstRow) {
    return null;
  }

  const versions = result.rows
    .flatMap((row) => {
      if (
        !row.assessment_version_id ||
        !row.version_tag ||
        !row.version_status ||
        !row.version_created_at ||
        !row.version_updated_at
      ) {
        return [];
      }

      const status = normalizeVersionStatus(row.version_status);
      if (!status) {
        return [];
      }

      return [
        {
          assessmentVersionId: row.assessment_version_id,
          versionTag: row.version_tag,
          status,
          publishedAt: row.published_at,
          questionCount: Number(row.question_count),
          createdAt: row.version_created_at,
          updatedAt: row.version_updated_at,
        } satisfies AdminAssessmentDetailVersion,
      ];
    })
    .sort((left, right) => {
      if (right.updatedAt !== left.updatedAt) {
        return right.updatedAt.localeCompare(left.updatedAt);
      }

      return right.versionTag.localeCompare(left.versionTag);
    });

  return {
    assessmentId: firstRow.assessment_id,
    assessmentKey: firstRow.assessment_key,
    title: firstRow.assessment_title,
    description: firstRow.assessment_description,
    isActive: firstRow.assessment_is_active,
    createdAt: firstRow.assessment_created_at,
    updatedAt: firstRow.assessment_updated_at,
    versions: Object.freeze(versions),
    latestDraftVersion: versions.find((version) => version.status === 'draft') ?? null,
  };
}
