import type { Queryable } from '@/lib/engine/repository-sql';

type ResultListRow = {
  result_id: string;
  attempt_id: string;
  assessment_id: string;
  assessment_key: string;
  assessment_title: string;
  version_tag: string;
  readiness_status: 'READY';
  generated_at: string | null;
  created_at: string;
  canonical_result_payload: unknown;
};

type ResultDetailRow = ResultListRow;

export type PersistedReadyResultRecord = {
  resultId: string;
  attemptId: string;
  assessmentId: string;
  assessmentKey: string;
  assessmentTitle: string;
  version: string;
  readinessStatus: 'READY';
  generatedAt: string | null;
  createdAt: string;
  canonicalResultPayload: unknown;
};

function mapReadyResultRecord(row: ResultListRow): PersistedReadyResultRecord {
  return {
    resultId: row.result_id,
    attemptId: row.attempt_id,
    assessmentId: row.assessment_id,
    assessmentKey: row.assessment_key,
    assessmentTitle: row.assessment_title,
    version: row.version_tag,
    readinessStatus: 'READY',
    generatedAt: row.generated_at,
    createdAt: row.created_at,
    canonicalResultPayload: row.canonical_result_payload,
  };
}

export async function listReadyResultsForUser(
  db: Queryable,
  userId: string,
): Promise<readonly PersistedReadyResultRecord[]> {
  const result = await db.query<ResultListRow>(
    `
    SELECT
      r.id AS result_id,
      r.attempt_id,
      r.assessment_id,
      a.assessment_key,
      a.title AS assessment_title,
      av.version AS version_tag,
      r.readiness_status,
      r.generated_at,
      r.created_at,
      r.canonical_result_payload
    FROM results r
    INNER JOIN attempts t ON t.id = r.attempt_id
    INNER JOIN assessments a ON a.id = r.assessment_id
    INNER JOIN assessment_versions av ON av.id = r.assessment_version_id
    WHERE t.user_id = $1
      AND r.readiness_status = 'READY'
      AND r.canonical_result_payload IS NOT NULL
    ORDER BY COALESCE(r.generated_at, r.created_at) DESC, r.id DESC
    `,
    [userId],
  );

  return Object.freeze(result.rows.map(mapReadyResultRecord));
}

export async function getReadyResultDetailForUser(
  db: Queryable,
  params: {
    resultId: string;
    userId: string;
  },
): Promise<PersistedReadyResultRecord | null> {
  const result = await db.query<ResultDetailRow>(
    `
    SELECT
      r.id AS result_id,
      r.attempt_id,
      r.assessment_id,
      a.assessment_key,
      a.title AS assessment_title,
      av.version AS version_tag,
      r.readiness_status,
      r.generated_at,
      r.created_at,
      r.canonical_result_payload
    FROM results r
    INNER JOIN attempts t ON t.id = r.attempt_id
    INNER JOIN assessments a ON a.id = r.assessment_id
    INNER JOIN assessment_versions av ON av.id = r.assessment_version_id
    WHERE r.id = $1
      AND t.user_id = $2
      AND r.readiness_status = 'READY'
      AND r.canonical_result_payload IS NOT NULL
    `,
    [params.resultId, params.userId],
  );

  const row = result.rows[0];
  return row ? mapReadyResultRecord(row) : null;
}
