import type { Queryable } from '@/lib/engine/repository-sql';

import type { AdminAssessmentVersionStatus } from '@/lib/server/admin-assessment-dashboard';

export type AdminAssessmentDetailSignal = {
  signalId: string;
  signalKey: string;
  label: string;
  description: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminAssessmentDetailDomain = {
  domainId: string;
  domainKey: string;
  label: string;
  description: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  signals: readonly AdminAssessmentDetailSignal[];
};

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
  authoredDomains: readonly AdminAssessmentDetailDomain[];
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

type AdminAssessmentAuthoringDomainRow = {
  domain_id: string;
  domain_key: string;
  domain_label: string;
  domain_description: string | null;
  domain_order_index: number;
  domain_created_at: string;
  domain_updated_at: string;
};

type AdminAssessmentAuthoringSignalRow = {
  signal_id: string;
  domain_id: string;
  signal_key: string;
  signal_label: string;
  signal_description: string | null;
  signal_order_index: number;
  signal_created_at: string;
  signal_updated_at: string;
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

async function loadAuthoringDomainsForVersion(
  db: Queryable,
  assessmentVersionId: string,
): Promise<readonly AdminAssessmentDetailDomain[]> {
  const [domainsResult, signalsResult] = await Promise.all([
    db.query<AdminAssessmentAuthoringDomainRow>(
      `
      SELECT
        id AS domain_id,
        domain_key,
        label AS domain_label,
        description AS domain_description,
        order_index AS domain_order_index,
        created_at AS domain_created_at,
        updated_at AS domain_updated_at
      FROM domains
      WHERE assessment_version_id = $1
        AND domain_type = 'SIGNAL_GROUP'
      ORDER BY order_index ASC, id ASC
      `,
      [assessmentVersionId],
    ),
    db.query<AdminAssessmentAuthoringSignalRow>(
      `
      SELECT
        id AS signal_id,
        domain_id,
        signal_key,
        label AS signal_label,
        description AS signal_description,
        order_index AS signal_order_index,
        created_at AS signal_created_at,
        updated_at AS signal_updated_at
      FROM signals
      WHERE assessment_version_id = $1
      ORDER BY domain_id ASC, order_index ASC, id ASC
      `,
      [assessmentVersionId],
    ),
  ]);

  const signalsByDomainId = new Map<string, AdminAssessmentDetailSignal[]>();

  for (const row of signalsResult.rows) {
    const mappedSignal: AdminAssessmentDetailSignal = {
      signalId: row.signal_id,
      signalKey: row.signal_key,
      label: row.signal_label,
      description: row.signal_description,
      orderIndex: row.signal_order_index,
      createdAt: row.signal_created_at,
      updatedAt: row.signal_updated_at,
    };
    const existing = signalsByDomainId.get(row.domain_id);

    if (existing) {
      existing.push(mappedSignal);
      continue;
    }

    signalsByDomainId.set(row.domain_id, [mappedSignal]);
  }

  return Object.freeze(
    domainsResult.rows.map((row) => ({
      domainId: row.domain_id,
      domainKey: row.domain_key,
      label: row.domain_label,
      description: row.domain_description,
      orderIndex: row.domain_order_index,
      createdAt: row.domain_created_at,
      updatedAt: row.domain_updated_at,
      signals: Object.freeze(
        (signalsByDomainId.get(row.domain_id) ?? []).sort(
          (left, right) => left.orderIndex - right.orderIndex || left.signalId.localeCompare(right.signalId),
        ),
      ),
    })),
  );
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
      const updatedAtComparison = compareTimestampsDesc(left.updatedAt, right.updatedAt);
      if (updatedAtComparison !== 0) {
        return updatedAtComparison;
      }

      return compareStringsDesc(left.versionTag, right.versionTag);
    });
  const latestDraftVersion = versions.find((version) => version.status === 'draft') ?? null;
  const authoredDomains = latestDraftVersion
    ? await loadAuthoringDomainsForVersion(db, latestDraftVersion.assessmentVersionId)
    : Object.freeze([]);

  return {
    assessmentId: firstRow.assessment_id,
    assessmentKey: firstRow.assessment_key,
    title: firstRow.assessment_title,
    description: firstRow.assessment_description,
    isActive: firstRow.assessment_is_active,
    createdAt: firstRow.assessment_created_at,
    updatedAt: firstRow.assessment_updated_at,
    versions: Object.freeze(versions),
    latestDraftVersion,
    authoredDomains,
  };
}
