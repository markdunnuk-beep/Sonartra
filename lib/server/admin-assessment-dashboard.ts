import { getAssessmentBuilderBasePath } from '@/lib/admin/assessment-builder-paths';
import { compareAssessmentVersionTagsDesc } from '@/lib/admin/admin-assessment-versioning';
import type { Queryable } from '@/lib/engine/repository-sql';
import { validateLatestDraftAssessmentVersion } from '@/lib/server/admin-assessment-validation';
import type { AssessmentMode } from '@/lib/types/assessment';
import { getAssessmentModeLabel, resolveAssessmentMode } from '@/lib/utils/assessment-mode';

export type AdminAssessmentVersionStatus = 'draft' | 'published' | 'archived';
export type AdminAssessmentOverallStatus =
  | 'published'
  | 'draft_only'
  | 'published_and_draft'
  | 'setup_incomplete'
  | 'no_versions';

export type AdminAssessmentVersionSummary = {
  assessmentVersionId: string;
  versionTag: string;
  status: AdminAssessmentVersionStatus;
  titleOverride: string | null;
  descriptionOverride: string | null;
  publishedAt: string | null;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminAssessmentDraftReadiness = 'ready' | 'not_ready' | 'no_draft';

export type AdminAssessmentDashboardItem = {
  assessmentId: string;
  assessmentKey: string;
  mode: AssessmentMode;
  modeLabel: 'Multi-Domain' | 'Single-Domain';
  title: string;
  description: string | null;
  isActive: boolean;
  overallStatus: AdminAssessmentOverallStatus;
  overallStatusLabel: string;
  overallStatusDetail: string;
  versionCount: number;
  publishedVersion: AdminAssessmentVersionSummary | null;
  latestDraftVersion: AdminAssessmentVersionSummary | null;
  latestDraftReadiness: AdminAssessmentDraftReadiness;
  latestUpdatedAt: string;
  actionHref: string;
  versions: readonly AdminAssessmentVersionSummary[];
};

export type AdminAssessmentDashboardSummary = {
  totalAssessments: number;
  publishedCount: number;
  publishedAndDraftCount: number;
  draftOnlyCount: number;
  setupIncompleteCount: number;
  noVersionsCount: number;
};

export type AdminAssessmentDashboardViewModel = {
  summary: AdminAssessmentDashboardSummary;
  assessments: readonly AdminAssessmentDashboardItem[];
};

type AdminAssessmentCatalogRow = {
  assessment_id: string;
  assessment_key: string;
  assessment_title: string;
  assessment_mode: string | null;
  assessment_description: string | null;
  assessment_is_active: boolean;
  assessment_created_at: string;
  assessment_updated_at: string;
  assessment_version_id: string | null;
  version_tag: string | null;
  version_status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | null;
  title_override: string | null;
  description_override: string | null;
  published_at: string | null;
  version_created_at: string | null;
  version_updated_at: string | null;
  question_count: string;
};

function toComparableString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toTimestamp(value: unknown): number {
  if (typeof value !== 'string') {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function compareStringsDesc(left: unknown, right: unknown): number {
  return toComparableString(right).localeCompare(toComparableString(left));
}

function compareTimestampsDesc(left: unknown, right: unknown): number {
  return toTimestamp(right) - toTimestamp(left);
}

function normalizeVersionStatus(
  status: AdminAssessmentCatalogRow['version_status'],
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

function formatOverallStatus(params: {
  publishedVersion: AdminAssessmentVersionSummary | null;
  latestDraftVersion: AdminAssessmentVersionSummary | null;
  versionCount: number;
}): Pick<
  AdminAssessmentDashboardItem,
  'overallStatus' | 'overallStatusLabel' | 'overallStatusDetail'
> {
  if (params.publishedVersion && params.latestDraftVersion) {
    return {
      overallStatus: 'published_and_draft',
      overallStatusLabel: 'Published + Draft',
      overallStatusDetail: `Published ${params.publishedVersion.versionTag} is live and draft ${params.latestDraftVersion.versionTag} is the latest working version.`,
    };
  }

  if (params.publishedVersion) {
    return {
      overallStatus: 'published',
      overallStatusLabel: 'Published',
      overallStatusDetail: `Version ${params.publishedVersion.versionTag} is the current published definition.`,
    };
  }

  if (params.latestDraftVersion) {
    return {
      overallStatus: 'draft_only',
      overallStatusLabel: 'Draft only',
      overallStatusDetail: `Draft ${params.latestDraftVersion.versionTag} exists, but no published version is available yet.`,
    };
  }

  if (params.versionCount === 0) {
    return {
      overallStatus: 'no_versions',
      overallStatusLabel: 'No versions',
      overallStatusDetail: 'Assessment metadata exists, but no version snapshots have been created yet.',
    };
  }

  return {
    overallStatus: 'setup_incomplete',
    overallStatusLabel: 'Setup incomplete',
    overallStatusDetail: 'Versions exist, but none are currently in draft or published state.',
  };
}

function buildActionHref(assessmentKey: string, mode?: AssessmentMode | string | null): string {
  return getAssessmentBuilderBasePath(assessmentKey, mode);
}

function mapAssessmentDashboardItem(
  rows: readonly AdminAssessmentCatalogRow[],
  latestDraftReadiness: AdminAssessmentDraftReadiness,
): AdminAssessmentDashboardItem {
  const firstRow = rows[0];
  if (!firstRow) {
    throw new Error('Cannot map admin assessment dashboard item without rows');
  }

  const versions = rows
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
          titleOverride: row.title_override,
          descriptionOverride: row.description_override,
          publishedAt: row.published_at,
          questionCount: Number(row.question_count),
          createdAt: row.version_created_at,
          updatedAt: row.version_updated_at,
        } satisfies AdminAssessmentVersionSummary,
      ];
    })
    .sort((left, right) => {
      const updatedAtComparison = compareTimestampsDesc(left.updatedAt, right.updatedAt);
      if (updatedAtComparison !== 0) {
        return updatedAtComparison;
      }

      return compareAssessmentVersionTagsDesc(left.versionTag, right.versionTag);
    });

  const publishedVersion = versions.find((version) => version.status === 'published') ?? null;
  const latestDraftVersion = versions.find((version) => version.status === 'draft') ?? null;
  const latestUpdatedAt =
    [firstRow.assessment_updated_at, ...versions.map((version) => version.updatedAt)]
      .sort(compareTimestampsDesc)[0] ?? firstRow.assessment_updated_at;
  const statusProjection = formatOverallStatus({
    publishedVersion,
    latestDraftVersion,
    versionCount: versions.length,
  });

  return {
    assessmentId: firstRow.assessment_id,
    assessmentKey: firstRow.assessment_key,
    mode: resolveAssessmentMode(firstRow.assessment_mode),
    modeLabel: getAssessmentModeLabel(firstRow.assessment_mode),
    title: firstRow.assessment_title,
    description: firstRow.assessment_description,
    isActive: firstRow.assessment_is_active,
    overallStatus: statusProjection.overallStatus,
    overallStatusLabel: statusProjection.overallStatusLabel,
    overallStatusDetail: statusProjection.overallStatusDetail,
    versionCount: versions.length,
    publishedVersion,
    latestDraftVersion,
    latestDraftReadiness,
    latestUpdatedAt,
    actionHref: buildActionHref(firstRow.assessment_key, firstRow.assessment_mode),
    versions: Object.freeze(versions),
  };
}

async function listAdminAssessmentCatalogRows(
  db: Queryable,
): Promise<readonly AdminAssessmentCatalogRow[]> {
  const result = await db.query<AdminAssessmentCatalogRow>(
    `
    SELECT
      a.id AS assessment_id,
      a.assessment_key,
      a.title AS assessment_title,
      COALESCE(av.mode, a.mode) AS assessment_mode,
      a.description AS assessment_description,
      a.is_active AS assessment_is_active,
      a.created_at AS assessment_created_at,
      a.updated_at AS assessment_updated_at,
      av.id AS assessment_version_id,
      av.version AS version_tag,
      av.lifecycle_status AS version_status,
      av.title_override,
      av.description_override,
      av.published_at,
      av.created_at AS version_created_at,
      av.updated_at AS version_updated_at,
      COUNT(q.id) AS question_count
    FROM assessments a
    LEFT JOIN assessment_versions av ON av.assessment_id = a.id
    LEFT JOIN questions q ON q.assessment_version_id = av.id
    GROUP BY
      a.id,
      a.assessment_key,
      a.title,
      a.mode,
      a.description,
      a.is_active,
      a.created_at,
      a.updated_at,
      av.id,
      av.mode,
      av.version,
      av.lifecycle_status,
      av.title_override,
      av.description_override,
      av.published_at,
      av.created_at,
      av.updated_at
    ORDER BY
      a.title ASC,
      a.assessment_key ASC,
      av.updated_at DESC NULLS LAST,
      av.created_at DESC NULLS LAST,
      av.version DESC NULLS LAST
    `,
  );

  return Object.freeze(result.rows);
}

export async function buildAdminAssessmentDashboardViewModel(
  db: Queryable,
): Promise<AdminAssessmentDashboardViewModel> {
  const rows = await listAdminAssessmentCatalogRows(db);
  const rowsByAssessmentId = new Map<string, AdminAssessmentCatalogRow[]>();

  for (const row of rows) {
    const existing = rowsByAssessmentId.get(row.assessment_id);
    if (existing) {
      existing.push(row);
      continue;
    }

    rowsByAssessmentId.set(row.assessment_id, [row]);
  }

  const groupedRows = Array.from(rowsByAssessmentId.values());
  const readinessByAssessmentKey = new Map<string, AdminAssessmentDraftReadiness>();

  await Promise.all(
    groupedRows.map(async (group) => {
      const assessmentKey = group[0]?.assessment_key;
      if (!assessmentKey) {
        return;
      }

      const validation = await validateLatestDraftAssessmentVersion(db, assessmentKey);
      readinessByAssessmentKey.set(
        assessmentKey,
        validation.status === 'ready'
          ? 'ready'
          : validation.status === 'no_draft'
            ? 'no_draft'
            : 'not_ready',
      );
    }),
  );

  const assessments = Object.freeze(
    groupedRows.map((group) =>
      mapAssessmentDashboardItem(
        group,
        readinessByAssessmentKey.get(group[0]?.assessment_key ?? '') ?? 'no_draft',
      ),
    ),
  );

  return {
    summary: {
      totalAssessments: assessments.length,
      publishedCount: assessments.filter((assessment) => assessment.publishedVersion !== null).length,
      publishedAndDraftCount: assessments.filter(
        (assessment) => assessment.overallStatus === 'published_and_draft',
      ).length,
      draftOnlyCount: assessments.filter((assessment) => assessment.overallStatus === 'draft_only').length,
      setupIncompleteCount: assessments.filter(
        (assessment) => assessment.overallStatus === 'setup_incomplete',
      ).length,
      noVersionsCount: assessments.filter((assessment) => assessment.overallStatus === 'no_versions').length,
    },
    assessments,
  };
}
