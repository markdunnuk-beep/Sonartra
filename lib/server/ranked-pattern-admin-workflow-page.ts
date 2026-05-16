import { compareAssessmentVersionTagsDesc } from '@/lib/admin/admin-assessment-versioning';
import type { Queryable } from '@/lib/engine/repository-sql';
import type { AdminAssessmentDetailVersion } from '@/lib/server/admin-assessment-detail';
import type { AdminAssessmentVersionStatus } from '@/lib/server/admin-assessment-dashboard';

type RankedPatternWorkflowAssessmentRow = {
  readonly assessment_id: string;
  readonly assessment_key: string;
  readonly assessment_mode: string | null;
  readonly assessment_title: string;
  readonly assessment_description: string | null;
  readonly assessment_is_active: boolean;
  readonly assessment_created_at: string;
  readonly assessment_updated_at: string;
  readonly assessment_version_id: string | null;
  readonly version_tag: string | null;
  readonly version_status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | null;
  readonly published_at: string | null;
  readonly version_created_at: string | null;
  readonly version_updated_at: string | null;
  readonly question_count: string | number | null;
};

export type RankedPatternWorkflowAssessment = {
  readonly assessmentId: string;
  readonly assessmentKey: string;
  readonly mode: string | null;
  readonly title: string;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly versions: readonly AdminAssessmentDetailVersion[];
  readonly publishedVersion: AdminAssessmentDetailVersion | null;
  readonly latestDraftVersion: AdminAssessmentDetailVersion | null;
};

function normalizeVersionStatus(status: string | null): AdminAssessmentVersionStatus | null {
  if (status === 'DRAFT') {
    return 'draft';
  }

  if (status === 'PUBLISHED') {
    return 'published';
  }

  if (status === 'ARCHIVED') {
    return 'archived';
  }

  return null;
}

function toQuestionCount(value: string | number | null): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (!value) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getRankedPatternWorkflowAssessment(
  db: Queryable,
  assessmentKey: string,
): Promise<RankedPatternWorkflowAssessment | null> {
  const result = await db.query<RankedPatternWorkflowAssessmentRow>(
    `
    SELECT
      a.id AS assessment_id,
      a.assessment_key,
      a.mode AS assessment_mode,
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
    LEFT JOIN assessment_versions av
      ON av.assessment_id = a.id
      AND av.result_model_key = 'ranked_pattern'
    LEFT JOIN questions q ON q.assessment_version_id = av.id
    WHERE a.assessment_key = $1
    GROUP BY
      a.id,
      a.assessment_key,
      a.mode,
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
          questionCount: toQuestionCount(row.question_count),
          createdAt: row.version_created_at,
          updatedAt: row.version_updated_at,
        } satisfies AdminAssessmentDetailVersion,
      ];
    })
    .sort((left, right) => {
      const updatedAtComparison = Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
      if (updatedAtComparison !== 0) {
        return updatedAtComparison;
      }

      return compareAssessmentVersionTagsDesc(left.versionTag, right.versionTag);
    });

  return Object.freeze({
    assessmentId: firstRow.assessment_id,
    assessmentKey: firstRow.assessment_key,
    mode: firstRow.assessment_mode,
    title: firstRow.assessment_title,
    description: firstRow.assessment_description,
    isActive: firstRow.assessment_is_active,
    createdAt: firstRow.assessment_created_at,
    updatedAt: firstRow.assessment_updated_at,
    versions: Object.freeze(versions),
    publishedVersion: versions.find((version) => version.status === 'published') ?? null,
    latestDraftVersion: versions.find((version) => version.status === 'draft') ?? null,
  });
}
