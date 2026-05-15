import type { Queryable } from '@/lib/engine/repository-sql';

export const REPORT_FIRST_TEMPLATE_CONTRACT = 'report_first_canonical_payload_v1';

export class ReportFirstTemplateStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportFirstTemplateStorageError';
  }
}

export type ReportFirstTemplateStatus = 'draft' | 'active' | 'inactive';

export type CompiledReportFirstTemplateForStorage = {
  readonly report_key: string;
  readonly pattern_key: string;
  readonly domain_key: string;
  readonly report_contract: string;
  readonly content_hash: string;
  readonly report_template_json: unknown;
};

export type StoredReportFirstTemplate = {
  readonly id: string;
  readonly assessmentVersionId: string;
  readonly domainKey: string;
  readonly patternKey: string;
  readonly reportKey: string;
  readonly reportContract: string;
  readonly contentHash: string;
  readonly status: ReportFirstTemplateStatus;
};

type StoredReportFirstTemplateRow = {
  readonly id: string;
  readonly assessment_version_id: string;
  readonly domain_key: string;
  readonly pattern_key: string;
  readonly report_key: string;
  readonly report_contract: string;
  readonly content_hash: string;
  readonly status: ReportFirstTemplateStatus;
};

type StoreReportFirstTemplateParams = {
  readonly db: Queryable;
  readonly assessmentVersionId: string;
  readonly template: CompiledReportFirstTemplateForStorage;
  readonly createdBy?: string | null;
  readonly importBatchId?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireNonEmptyText(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new ReportFirstTemplateStorageError(`Report-first template ${fieldName} is required.`);
  }
}

function assertTemplateShape(template: CompiledReportFirstTemplateForStorage): void {
  requireNonEmptyText(template.report_key, 'report_key');
  requireNonEmptyText(template.pattern_key, 'pattern_key');
  requireNonEmptyText(template.domain_key, 'domain_key');
  requireNonEmptyText(template.content_hash, 'content_hash');

  if (template.report_contract !== REPORT_FIRST_TEMPLATE_CONTRACT) {
    throw new ReportFirstTemplateStorageError(
      `Unsupported report-first template contract "${template.report_contract}". Expected ${REPORT_FIRST_TEMPLATE_CONTRACT}.`,
    );
  }

  if (!/^[a-z0-9]+_[a-z0-9]+_[a-z0-9]+_[a-z0-9]+$/.test(template.pattern_key)) {
    throw new ReportFirstTemplateStorageError(
      `Invalid report-first pattern_key "${template.pattern_key}". Expected four ranked signal keys separated by underscores.`,
    );
  }

  if (!isRecord(template.report_template_json) || Object.keys(template.report_template_json).length === 0) {
    throw new ReportFirstTemplateStorageError('Report-first template report_template_json must be a non-empty object.');
  }
}

async function assertAssessmentVersionExists(db: Queryable, assessmentVersionId: string): Promise<void> {
  const result = await db.query<{ id: string }>(
    `
    SELECT id
    FROM assessment_versions
    WHERE id = $1
    `,
    [assessmentVersionId],
  );

  if (result.rows.length !== 1) {
    throw new ReportFirstTemplateStorageError(
      `Report-first template import target assessment_version_id "${assessmentVersionId}" does not exist.`,
    );
  }
}

async function assertActiveRankedPatternExists(
  db: Queryable,
  assessmentVersionId: string,
  template: CompiledReportFirstTemplateForStorage,
): Promise<void> {
  const result = await db.query<{ pattern_key: string }>(
    `
    SELECT pattern_key
    FROM assessment_ranked_patterns
    WHERE assessment_version_id = $1
      AND domain_key = $2
      AND pattern_key = $3
      AND status = 'active'
    `,
    [assessmentVersionId, template.domain_key, template.pattern_key],
  );

  if (result.rows.length !== 1) {
    throw new ReportFirstTemplateStorageError(
      `Report-first template pattern_key "${template.pattern_key}" does not resolve to an active ranked pattern for assessment_version_id "${assessmentVersionId}".`,
    );
  }
}

function mapStoredRow(row: StoredReportFirstTemplateRow): StoredReportFirstTemplate {
  return Object.freeze({
    id: row.id,
    assessmentVersionId: row.assessment_version_id,
    domainKey: row.domain_key,
    patternKey: row.pattern_key,
    reportKey: row.report_key,
    reportContract: row.report_contract,
    contentHash: row.content_hash,
    status: row.status,
  });
}

async function validateTargetAndTemplate(params: StoreReportFirstTemplateParams): Promise<void> {
  assertTemplateShape(params.template);
  await assertAssessmentVersionExists(params.db, params.assessmentVersionId);
  await assertActiveRankedPatternExists(params.db, params.assessmentVersionId, params.template);
}

async function findLatestDraftId(params: StoreReportFirstTemplateParams): Promise<string | null> {
  const result = await params.db.query<{ id: string }>(
    `
    SELECT id
    FROM assessment_report_first_templates
    WHERE assessment_version_id = $1
      AND pattern_key = $2
      AND status = 'draft'
    ORDER BY updated_at DESC, id DESC
    LIMIT 1
    `,
    [params.assessmentVersionId, params.template.pattern_key],
  );

  return result.rows[0]?.id ?? null;
}

async function insertReportFirstTemplate(
  params: StoreReportFirstTemplateParams & { readonly status: ReportFirstTemplateStatus },
): Promise<StoredReportFirstTemplate> {
  const result = await params.db.query<StoredReportFirstTemplateRow>(
    `
    INSERT INTO assessment_report_first_templates (
      assessment_version_id,
      domain_key,
      pattern_key,
      report_key,
      report_contract,
      report_template_json,
      content_hash,
      status,
      created_by,
      import_batch_id
    )
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)
    RETURNING
      id,
      assessment_version_id,
      domain_key,
      pattern_key,
      report_key,
      report_contract,
      content_hash,
      status
    `,
    [
      params.assessmentVersionId,
      params.template.domain_key,
      params.template.pattern_key,
      params.template.report_key,
      params.template.report_contract,
      JSON.stringify(params.template.report_template_json),
      params.template.content_hash,
      params.status,
      params.createdBy ?? null,
      params.importBatchId ?? null,
    ],
  );

  const row = result.rows[0];
  if (!row) {
    throw new ReportFirstTemplateStorageError('Report-first template insert did not return a row.');
  }

  return mapStoredRow(row);
}

async function updateDraftReportFirstTemplate(
  params: StoreReportFirstTemplateParams & { readonly existingTemplateId: string },
): Promise<StoredReportFirstTemplate> {
  const result = await params.db.query<StoredReportFirstTemplateRow>(
    `
    UPDATE assessment_report_first_templates
    SET
      domain_key = $2,
      report_key = $3,
      report_contract = $4,
      report_template_json = $5::jsonb,
      content_hash = $6,
      created_by = $7,
      import_batch_id = $8,
      updated_at = NOW()
    WHERE id = $1
      AND status = 'draft'
    RETURNING
      id,
      assessment_version_id,
      domain_key,
      pattern_key,
      report_key,
      report_contract,
      content_hash,
      status
    `,
    [
      params.existingTemplateId,
      params.template.domain_key,
      params.template.report_key,
      params.template.report_contract,
      JSON.stringify(params.template.report_template_json),
      params.template.content_hash,
      params.createdBy ?? null,
      params.importBatchId ?? null,
    ],
  );

  const row = result.rows[0];
  if (!row) {
    throw new ReportFirstTemplateStorageError('Report-first draft template update did not return a row.');
  }

  return mapStoredRow(row);
}

export async function storeDraftReportFirstTemplate(
  params: StoreReportFirstTemplateParams,
): Promise<StoredReportFirstTemplate> {
  await validateTargetAndTemplate(params);

  const existingTemplateId = await findLatestDraftId(params);
  if (existingTemplateId) {
    return updateDraftReportFirstTemplate({ ...params, existingTemplateId });
  }

  return insertReportFirstTemplate({ ...params, status: 'draft' });
}

export async function replaceActiveReportFirstTemplate(
  params: StoreReportFirstTemplateParams,
): Promise<StoredReportFirstTemplate> {
  await validateTargetAndTemplate(params);

  await params.db.query('BEGIN');

  try {
    await params.db.query(
      `
      UPDATE assessment_report_first_templates
      SET status = 'inactive',
          updated_at = NOW()
      WHERE assessment_version_id = $1
        AND pattern_key = $2
        AND status = 'active'
      `,
      [params.assessmentVersionId, params.template.pattern_key],
    );

    const stored = await insertReportFirstTemplate({ ...params, status: 'active' });
    await params.db.query('COMMIT');
    return stored;
  } catch (error) {
    await params.db.query('ROLLBACK').catch(() => undefined);
    throw error;
  }
}
