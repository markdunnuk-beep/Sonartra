import {
  auditRankedPatternAssessmentVersion,
  type RankedPatternPublishAuditResult,
} from '@/content/assessment-packages/import-contract/ranked-pattern-publish-audit';
import {
  rankedPatternAssessmentMode,
  rankedPatternResultModelKey,
} from '@/content/assessment-packages/import-contract/ranked-pattern-import-manifest';
import type { NormalisedMetadataRecord } from '@/content/assessment-packages/import-contract/ranked-pattern-import-normalise';
import { getDbPool } from '@/lib/server/db';
import { requireAdminUser } from '@/lib/server/admin-access';
import type { RequestUserContext } from '@/lib/server/request-user';
import { createDraftVersionFromLatestPublishedAssessmentRecords } from '@/lib/server/admin-assessment-draft-version-service';
import {
  isRankedPatternPackageCompatibleAssessment,
  looksLikeLegacyOrTestAssessmentKey,
} from '@/lib/ranked-pattern-admin-compatibility';

type QueryResult<T> = {
  readonly rows: readonly T[];
};

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<QueryResult<T>>;
};

type TransactionClient = Queryable & {
  release?(): void;
};

type DbPool = {
  connect(): Promise<TransactionClient>;
};

export type RankedPatternVersionLifecycleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

type RankedPatternAssessmentVersionRow = {
  readonly assessment_id: string;
  readonly assessment_key: string;
  readonly assessment_title: string;
  readonly assessment_version_id: string;
  readonly version_tag: string;
  readonly lifecycle_status: RankedPatternVersionLifecycleStatus;
  readonly mode: string | null;
  readonly result_model_key: string | null;
  readonly published_at: string | null;
};

type RankedPatternAssessmentShellRow = {
  readonly id: string;
  readonly assessment_key: string;
  readonly title: string;
  readonly mode: string | null;
  readonly is_active: boolean;
};

type RankedPatternAssessmentShellVersionRow = {
  readonly id: string;
  readonly version: string;
  readonly lifecycle_status: RankedPatternVersionLifecycleStatus;
  readonly mode: string | null;
  readonly result_model_key: string | null;
};

export type RankedPatternVersionSummary = {
  readonly assessmentId: string;
  readonly assessmentKey: string;
  readonly assessmentTitle: string;
  readonly assessmentVersionId: string;
  readonly versionTag: string;
  readonly lifecycleStatus: RankedPatternVersionLifecycleStatus;
  readonly mode: string | null;
  readonly resultModelKey: string | null;
  readonly publishedAt: string | null;
};

export type RankedPatternVersionDiagnostic = {
  readonly severity: 'error' | 'warning';
  readonly code: string;
  readonly message: string;
};

export type RankedPatternDraftVersionResult =
  | {
      readonly status: 'created';
      readonly assessmentId: string;
      readonly assessmentKey: string;
      readonly draftVersionId: string;
      readonly draftVersionTag: string;
      readonly sourceVersionTag: string;
      readonly lifecycleStatus: 'DRAFT';
      readonly mode: typeof rankedPatternAssessmentMode;
      readonly resultModelKey: typeof rankedPatternResultModelKey;
      readonly copied: Readonly<Record<string, number>>;
      readonly diagnostics: readonly RankedPatternVersionDiagnostic[];
    }
  | {
      readonly status: 'resolved';
      readonly assessmentId: string;
      readonly assessmentKey: string;
      readonly draftVersionId: string;
      readonly draftVersionTag: string;
      readonly lifecycleStatus: 'DRAFT';
      readonly mode: typeof rankedPatternAssessmentMode;
      readonly resultModelKey: typeof rankedPatternResultModelKey;
      readonly diagnostics: readonly RankedPatternVersionDiagnostic[];
    }
  | {
      readonly status: 'blocked';
      readonly assessmentId?: string;
      readonly assessmentKey?: string;
      readonly draftVersionId?: string;
      readonly draftVersionTag?: string;
      readonly diagnostics: readonly RankedPatternVersionDiagnostic[];
    };

export type RankedPatternVersionPublishAuditWorkflowResult = {
  readonly assessmentVersionId: string;
  readonly versionSummary: RankedPatternVersionSummary | null;
  readonly canPublish: boolean;
  readonly publishAudit: RankedPatternPublishAuditResult | null;
  readonly blockingDiagnostics: readonly RankedPatternVersionDiagnostic[];
  readonly warningDiagnostics: readonly RankedPatternVersionDiagnostic[];
};

export type RankedPatternPublishVersionResult =
  | {
      readonly status: 'published';
      readonly assessmentId: string;
      readonly assessmentKey: string;
      readonly publishedVersionId: string;
      readonly publishedVersionTag: string;
      readonly archivedVersionIds: readonly string[];
      readonly publishAudit: RankedPatternPublishAuditResult;
      readonly warningDiagnostics: readonly RankedPatternVersionDiagnostic[];
    }
  | {
      readonly status: 'blocked';
      readonly assessmentVersionId: string;
      readonly versionSummary: RankedPatternVersionSummary | null;
      readonly publishAudit: RankedPatternPublishAuditResult | null;
      readonly blockingDiagnostics: readonly RankedPatternVersionDiagnostic[];
      readonly warningDiagnostics: readonly RankedPatternVersionDiagnostic[];
    };

type RankedPatternAdminVersioningDependencies = {
  readonly requireAdminUser: () => Promise<RequestUserContext>;
  readonly getDbPool: () => DbPool;
  readonly auditAssessmentVersion: typeof auditRankedPatternAssessmentVersion;
  readonly createDraftVersionRecords: typeof createDraftVersionFromLatestPublishedAssessmentRecords;
};

type DraftVersionRecordsInput = Parameters<typeof createDraftVersionFromLatestPublishedAssessmentRecords>[0];

const defaultDependencies: RankedPatternAdminVersioningDependencies = {
  requireAdminUser,
  getDbPool,
  auditAssessmentVersion: auditRankedPatternAssessmentVersion,
  createDraftVersionRecords: createDraftVersionFromLatestPublishedAssessmentRecords,
};

function diagnostic(params: RankedPatternVersionDiagnostic): RankedPatternVersionDiagnostic {
  return Object.freeze(params);
}

function splitDiagnostics(diagnostics: readonly RankedPatternVersionDiagnostic[]): {
  readonly blockingDiagnostics: readonly RankedPatternVersionDiagnostic[];
  readonly warningDiagnostics: readonly RankedPatternVersionDiagnostic[];
} {
  return Object.freeze({
    blockingDiagnostics: Object.freeze(diagnostics.filter((item) => item.severity === 'error')),
    warningDiagnostics: Object.freeze(diagnostics.filter((item) => item.severity === 'warning')),
  });
}

function mapVersionSummary(row: RankedPatternAssessmentVersionRow): RankedPatternVersionSummary {
  return Object.freeze({
    assessmentId: row.assessment_id,
    assessmentKey: row.assessment_key,
    assessmentTitle: row.assessment_title,
    assessmentVersionId: row.assessment_version_id,
    versionTag: row.version_tag,
    lifecycleStatus: row.lifecycle_status,
    mode: row.mode,
    resultModelKey: row.result_model_key,
    publishedAt: row.published_at,
  });
}

function metadataValue(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function validatePackageMetadataForDraft(
  metadata: NormalisedMetadataRecord,
): readonly RankedPatternVersionDiagnostic[] {
  const diagnostics: RankedPatternVersionDiagnostic[] = [];

  if (!metadataValue(metadata.assessmentKey)) {
    diagnostics.push(diagnostic({
      severity: 'error',
      code: 'PACKAGE_ASSESSMENT_KEY_REQUIRED',
      message: 'Package metadata must include assessment_key before a ranked-pattern draft can be created.',
    }));
  }

  if (!metadataValue(metadata.version)) {
    diagnostics.push(diagnostic({
      severity: 'error',
      code: 'PACKAGE_VERSION_REQUIRED',
      message: 'Package metadata must include version before a ranked-pattern draft can be created.',
    }));
  }

  if (!metadataValue(metadata.assessmentTitle)) {
    diagnostics.push(diagnostic({
      severity: 'error',
      code: 'PACKAGE_TITLE_REQUIRED',
      message: 'Package metadata must include assessment title before a ranked-pattern draft can be created.',
    }));
  }

  if (metadata.mode && metadata.mode !== rankedPatternAssessmentMode) {
    diagnostics.push(diagnostic({
      severity: 'error',
      code: 'PACKAGE_MODE_NOT_RANKED_PATTERN',
      message: 'Package metadata must declare single-domain mode for ranked-pattern import.',
    }));
  }

  if (metadata.resultModelKey && metadata.resultModelKey !== rankedPatternResultModelKey) {
    diagnostics.push(diagnostic({
      severity: 'error',
      code: 'PACKAGE_RESULT_MODEL_NOT_RANKED_PATTERN',
      message: 'Package metadata must declare ranked_pattern as the result model.',
    }));
  }

  if (metadata.lifecycleStatus && metadata.lifecycleStatus.toUpperCase() !== 'DRAFT') {
    diagnostics.push(diagnostic({
      severity: 'error',
      code: 'PACKAGE_LIFECYCLE_NOT_DRAFT',
      message: 'Package metadata must describe a draft version; import apply and publish remain separate actions.',
    }));
  }

  return Object.freeze(diagnostics);
}

function packageCompatibilityDiagnostics(params: {
  readonly assessment: RankedPatternAssessmentShellRow;
  readonly versions: readonly RankedPatternAssessmentShellVersionRow[];
}): readonly RankedPatternVersionDiagnostic[] {
  const diagnostics: RankedPatternVersionDiagnostic[] = [];

  if (!isRankedPatternPackageCompatibleAssessment({
    assessmentKey: params.assessment.assessment_key,
    title: params.assessment.title,
    mode: params.assessment.mode,
    isActive: params.assessment.is_active,
  })) {
    diagnostics.push(diagnostic({
      severity: 'error',
      code: looksLikeLegacyOrTestAssessmentKey(params.assessment.assessment_key)
        ? 'PACKAGE_ASSESSMENT_KEY_LEGACY_RESERVED'
        : 'PACKAGE_ASSESSMENT_KEY_CONFLICT',
      message:
        'An assessment record already exists for this key, but it is not compatible with ranked-pattern package import. Archive the legacy record or use a compatible ranked-pattern package key.',
    }));
  }

  if (
    params.versions.some(
      (version) => version.mode !== rankedPatternAssessmentMode || version.result_model_key !== rankedPatternResultModelKey,
    )
  ) {
    diagnostics.push(diagnostic({
      severity: 'error',
      code: 'PACKAGE_ASSESSMENT_VERSION_CONFLICT',
      message:
        'Existing versions for this assessment key are not ranked-pattern package versions. The package will not be attached silently.',
    }));
  }

  return Object.freeze(diagnostics);
}

async function loadAssessmentShellByKey(
  db: Queryable,
  assessmentKey: string,
): Promise<RankedPatternAssessmentShellRow | null> {
  const result = await db.query<RankedPatternAssessmentShellRow>(
    `
    SELECT
      id,
      assessment_key,
      title,
      mode,
      is_active
    FROM assessments
    WHERE assessment_key = $1
    `,
    [assessmentKey],
  );

  return result.rows[0] ?? null;
}

async function loadAssessmentShellVersions(
  db: Queryable,
  assessmentId: string,
): Promise<readonly RankedPatternAssessmentShellVersionRow[]> {
  const result = await db.query<RankedPatternAssessmentShellVersionRow>(
    `
    SELECT
      id,
      version,
      lifecycle_status,
      mode,
      result_model_key
    FROM assessment_versions
    WHERE assessment_id = $1
    ORDER BY updated_at DESC, created_at DESC
    `,
    [assessmentId],
  );

  return Object.freeze([...result.rows]);
}

async function insertRankedPatternAssessmentShell(
  db: Queryable,
  metadata: NormalisedMetadataRecord,
): Promise<string> {
  const result = await db.query<{ readonly id: string }>(
    `
    INSERT INTO assessments (
      assessment_key,
      mode,
      title,
      description,
      is_active
    )
    VALUES ($1, $2, $3, $4, TRUE)
    RETURNING id
    `,
    [
      metadata.assessmentKey,
      rankedPatternAssessmentMode,
      metadata.assessmentTitle,
      metadata.assessmentDescription,
    ],
  );

  const id = result.rows[0]?.id;
  if (!id) {
    throw new Error('RANKED_PATTERN_PACKAGE_ASSESSMENT_CREATE_FAILED');
  }

  return id;
}

async function insertRankedPatternDraftVersionShell(params: {
  readonly db: Queryable;
  readonly assessmentId: string;
  readonly versionTag: string;
}): Promise<string> {
  const result = await params.db.query<{ readonly id: string }>(
    `
    INSERT INTO assessment_versions (
      assessment_id,
      version,
      lifecycle_status,
      mode,
      result_model_key,
      title_override,
      description_override
    )
    VALUES ($1, $2, 'DRAFT', $3, $4, NULL, NULL)
    RETURNING id
    `,
    [
      params.assessmentId,
      params.versionTag,
      rankedPatternAssessmentMode,
      rankedPatternResultModelKey,
    ],
  );

  const id = result.rows[0]?.id;
  if (!id) {
    throw new Error('RANKED_PATTERN_PACKAGE_DRAFT_CREATE_FAILED');
  }

  return id;
}

export async function loadRankedPatternVersionSummary(
  db: Queryable,
  assessmentVersionId: string,
): Promise<RankedPatternVersionSummary | null> {
  const result = await db.query<RankedPatternAssessmentVersionRow>(
    `
    SELECT
      a.id AS assessment_id,
      a.assessment_key,
      a.title AS assessment_title,
      av.id AS assessment_version_id,
      av.version AS version_tag,
      av.lifecycle_status,
      av.mode,
      av.result_model_key,
      av.published_at
    FROM assessment_versions av
    INNER JOIN assessments a ON a.id = av.assessment_id
    WHERE av.id = $1
    `,
    [assessmentVersionId],
  );

  const row = result.rows[0];
  return row ? mapVersionSummary(row) : null;
}

function importTargetDiagnostics(params: {
  readonly targetAssessmentVersionId: string;
  readonly summary: RankedPatternVersionSummary | null;
  readonly targetAssessmentId?: string;
  readonly metadata?: NormalisedMetadataRecord | null;
}): readonly RankedPatternVersionDiagnostic[] {
  const diagnostics: RankedPatternVersionDiagnostic[] = [];

  if (!params.targetAssessmentVersionId.trim()) {
    diagnostics.push(diagnostic({
      severity: 'error',
      code: 'MISSING_TARGET_DRAFT_VERSION',
      message: 'Apply import requires an explicit target draft assessment version.',
    }));
    return Object.freeze(diagnostics);
  }

  if (!params.summary) {
    diagnostics.push(diagnostic({
      severity: 'error',
      code: 'TARGET_VERSION_NOT_FOUND',
      message: 'The target assessment version could not be found.',
    }));
    return Object.freeze(diagnostics);
  }

  if (params.summary.lifecycleStatus !== 'DRAFT') {
    diagnostics.push(diagnostic({
      severity: 'error',
      code: 'TARGET_VERSION_NOT_DRAFT',
      message: 'Ranked-pattern package import can only be applied to an editable draft version.',
    }));
  }

  if (params.summary.mode !== rankedPatternAssessmentMode) {
    diagnostics.push(diagnostic({
      severity: 'error',
      code: 'TARGET_VERSION_MODE_NOT_RANKED_PATTERN',
      message: 'The target version must use single-domain mode before ranked-pattern import can be applied.',
    }));
  }

  if (params.summary.resultModelKey !== rankedPatternResultModelKey) {
    diagnostics.push(diagnostic({
      severity: 'error',
      code: 'TARGET_VERSION_MODEL_NOT_RANKED_PATTERN',
      message: 'The target version must be marked as ranked_pattern before ranked-pattern import can be applied.',
    }));
  }

  if (params.targetAssessmentId && params.summary.assessmentId !== params.targetAssessmentId) {
    diagnostics.push(diagnostic({
      severity: 'error',
      code: 'TARGET_ASSESSMENT_MISMATCH',
      message: 'The target version does not belong to the selected assessment.',
    }));
  }

  const metadata = params.metadata;
  if (metadata) {
    if (metadata.assessmentKey && metadata.assessmentKey !== params.summary.assessmentKey) {
      diagnostics.push(diagnostic({
        severity: 'error',
        code: 'PACKAGE_ASSESSMENT_MISMATCH',
        message: 'The package assessment key does not match the selected target assessment.',
      }));
    }

    if (metadata.version && metadata.version !== params.summary.versionTag) {
      diagnostics.push(diagnostic({
        severity: 'error',
        code: 'PACKAGE_VERSION_MISMATCH',
        message: 'The package version does not match the selected target draft version.',
      }));
    }

    if (metadata.lifecycleStatus && metadata.lifecycleStatus.toUpperCase() !== 'DRAFT') {
      diagnostics.push(diagnostic({
        severity: 'error',
        code: 'PACKAGE_LIFECYCLE_NOT_DRAFT',
        message: 'The package metadata must describe a draft version; import apply never publishes a version.',
      }));
    }
  }

  return Object.freeze(diagnostics);
}

export async function validateRankedPatternDraftImportTarget(params: {
  readonly db: Queryable;
  readonly targetAssessmentVersionId: string;
  readonly targetAssessmentId?: string;
  readonly metadata?: NormalisedMetadataRecord | null;
}): Promise<{
  readonly summary: RankedPatternVersionSummary | null;
  readonly diagnostics: readonly RankedPatternVersionDiagnostic[];
}> {
  const summary = params.targetAssessmentVersionId.trim()
    ? await loadRankedPatternVersionSummary(params.db, params.targetAssessmentVersionId)
    : null;

  return Object.freeze({
    summary,
    diagnostics: importTargetDiagnostics({
      targetAssessmentVersionId: params.targetAssessmentVersionId,
      summary,
      targetAssessmentId: params.targetAssessmentId,
      metadata: params.metadata,
    }),
  });
}

async function markDraftAsRankedPattern(params: {
  readonly db: Queryable;
  readonly draftVersionId: string;
}): Promise<void> {
  const result = await params.db.query<{ readonly id: string }>(
    `
    UPDATE assessment_versions
    SET
      mode = $2,
      result_model_key = $3,
      updated_at = NOW()
    WHERE id = $1
      AND lifecycle_status = 'DRAFT'
    RETURNING id
    `,
    [params.draftVersionId, rankedPatternAssessmentMode, rankedPatternResultModelKey],
  );

  if (!result.rows[0]?.id) {
    throw new Error('RANKED_PATTERN_DRAFT_MARK_FAILED');
  }
}

export async function createRankedPatternDraftVersion(
  input: { readonly assessmentKeyOrId: string },
  dependencies: Partial<RankedPatternAdminVersioningDependencies> = {},
): Promise<RankedPatternDraftVersionResult> {
  const deps = { ...defaultDependencies, ...dependencies };
  await deps.requireAdminUser();
  const db = deps.getDbPool();
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    const created = await deps.createDraftVersionRecords({
      db: client as DraftVersionRecordsInput['db'],
      assessmentKeyOrId: input.assessmentKeyOrId,
    });

    if (created.status !== 'created') {
      await client.query('ROLLBACK');

      if (created.status === 'draft_exists') {
        return Object.freeze({
          status: 'blocked',
          assessmentId: created.assessmentId,
          assessmentKey: created.assessmentKey,
          draftVersionId: created.draftVersionId,
          draftVersionTag: created.draftVersionTag,
          diagnostics: Object.freeze([
            diagnostic({
              severity: 'error',
              code: 'DRAFT_VERSION_ALREADY_EXISTS',
              message: 'A draft version already exists. Continue authoring that draft before creating another one.',
            }),
          ]),
        });
      }

      return Object.freeze({
        status: 'blocked',
        assessmentId: 'assessmentId' in created ? created.assessmentId : undefined,
        assessmentKey: 'assessmentKey' in created ? created.assessmentKey : undefined,
        diagnostics: Object.freeze([
          diagnostic({
            severity: 'error',
            code: created.status.toUpperCase(),
            message: 'A ranked-pattern draft version could not be created from the latest published version.',
          }),
        ]),
      });
    }

    await markDraftAsRankedPattern({
      db: client,
      draftVersionId: created.draftVersionId,
    });
    await client.query('COMMIT');

    return Object.freeze({
      status: 'created',
      assessmentId: created.assessmentId,
      assessmentKey: created.assessmentKey,
      draftVersionId: created.draftVersionId,
      draftVersionTag: created.draftVersionTag,
      sourceVersionTag: created.sourceVersionTag,
      lifecycleStatus: 'DRAFT',
      mode: rankedPatternAssessmentMode,
      resultModelKey: rankedPatternResultModelKey,
      copied: Object.freeze({ ...created.copied }),
      diagnostics: Object.freeze([]),
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release?.();
  }
}

export async function createOrResolveRankedPatternPackageDraftVersion(
  input: { readonly metadata: NormalisedMetadataRecord },
  dependencies: Partial<RankedPatternAdminVersioningDependencies> = {},
): Promise<RankedPatternDraftVersionResult> {
  const deps = { ...defaultDependencies, ...dependencies };
  await deps.requireAdminUser();

  const metadataDiagnostics = validatePackageMetadataForDraft(input.metadata);
  if (metadataDiagnostics.some((item) => item.severity === 'error')) {
    return Object.freeze({
      status: 'blocked',
      assessmentKey: input.metadata.assessmentKey ?? undefined,
      diagnostics: metadataDiagnostics,
    });
  }

  const assessmentKey = input.metadata.assessmentKey?.trim() ?? '';
  const versionTag = input.metadata.version?.trim() ?? '';
  const db = deps.getDbPool();
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    const existingAssessment = await loadAssessmentShellByKey(client, assessmentKey);

    if (existingAssessment) {
      const versions = await loadAssessmentShellVersions(client, existingAssessment.id);
      const compatibilityDiagnostics = packageCompatibilityDiagnostics({
        assessment: existingAssessment,
        versions,
      });

      if (compatibilityDiagnostics.some((item) => item.severity === 'error')) {
        await client.query('ROLLBACK');
        return Object.freeze({
          status: 'blocked',
          assessmentId: existingAssessment.id,
          assessmentKey,
          diagnostics: compatibilityDiagnostics,
        });
      }

      const targetVersion = versions.find((version) => version.version === versionTag);
      if (targetVersion) {
        if (targetVersion.lifecycle_status !== 'DRAFT') {
          await client.query('ROLLBACK');
          return Object.freeze({
            status: 'blocked',
            assessmentId: existingAssessment.id,
            assessmentKey,
            draftVersionId: targetVersion.id,
            draftVersionTag: targetVersion.version,
            diagnostics: Object.freeze([
              diagnostic({
                severity: 'error',
                code: 'PACKAGE_VERSION_NOT_DRAFT',
                message: 'The package version already exists but is not an editable draft. Import apply will not write to non-draft versions.',
              }),
            ]),
          });
        }

        await client.query('COMMIT');
        return Object.freeze({
          status: 'resolved',
          assessmentId: existingAssessment.id,
          assessmentKey,
          draftVersionId: targetVersion.id,
          draftVersionTag: targetVersion.version,
          lifecycleStatus: 'DRAFT',
          mode: rankedPatternAssessmentMode,
          resultModelKey: rankedPatternResultModelKey,
          diagnostics: Object.freeze([]),
        });
      }

      const existingDraft = versions.find((version) => version.lifecycle_status === 'DRAFT');
      if (existingDraft) {
        await client.query('ROLLBACK');
        return Object.freeze({
          status: 'blocked',
          assessmentId: existingAssessment.id,
          assessmentKey,
          draftVersionId: existingDraft.id,
          draftVersionTag: existingDraft.version,
          diagnostics: Object.freeze([
            diagnostic({
              severity: 'error',
              code: 'DRAFT_VERSION_ALREADY_EXISTS',
              message:
                'A different draft version already exists for this package. Continue with that draft or archive it before creating another one.',
            }),
          ]),
        });
      }

      const draftVersionId = await insertRankedPatternDraftVersionShell({
        db: client,
        assessmentId: existingAssessment.id,
        versionTag,
      });
      await client.query('COMMIT');
      return Object.freeze({
        status: 'created',
        assessmentId: existingAssessment.id,
        assessmentKey,
        draftVersionId,
        draftVersionTag: versionTag,
        sourceVersionTag: 'package metadata',
        lifecycleStatus: 'DRAFT',
        mode: rankedPatternAssessmentMode,
        resultModelKey: rankedPatternResultModelKey,
        copied: Object.freeze({}),
        diagnostics: Object.freeze([]),
      });
    }

    const assessmentId = await insertRankedPatternAssessmentShell(client, input.metadata);
    const draftVersionId = await insertRankedPatternDraftVersionShell({
      db: client,
      assessmentId,
      versionTag,
    });
    await client.query('COMMIT');

    return Object.freeze({
      status: 'created',
      assessmentId,
      assessmentKey,
      draftVersionId,
      draftVersionTag: versionTag,
      sourceVersionTag: 'package metadata',
      lifecycleStatus: 'DRAFT',
      mode: rankedPatternAssessmentMode,
      resultModelKey: rankedPatternResultModelKey,
      copied: Object.freeze({}),
      diagnostics: Object.freeze([]),
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release?.();
  }
}

export async function runRankedPatternVersionPublishAudit(
  input: { readonly targetAssessmentVersionId: string },
  dependencies: Partial<RankedPatternAdminVersioningDependencies> = {},
): Promise<RankedPatternVersionPublishAuditWorkflowResult> {
  const deps = { ...defaultDependencies, ...dependencies };
  await deps.requireAdminUser();
  const db = deps.getDbPool();
  const client = await db.connect();

  try {
    const summary = await loadRankedPatternVersionSummary(client, input.targetAssessmentVersionId);
    const diagnostics = importTargetDiagnostics({
      targetAssessmentVersionId: input.targetAssessmentVersionId,
      summary,
    });

    const publishAudit = summary
      ? await deps.auditAssessmentVersion({
          assessmentVersionId: input.targetAssessmentVersionId,
          db: client,
        })
      : null;

    const auditDiagnostics: RankedPatternVersionDiagnostic[] = publishAudit
      ? publishAudit.findings.map((finding) => diagnostic({
          severity: finding.severity === 'blocking' ? 'error' : 'warning',
          code: finding.code,
          message: finding.message,
        }))
      : [];
    const split = splitDiagnostics([...diagnostics, ...auditDiagnostics]);

    return Object.freeze({
      assessmentVersionId: input.targetAssessmentVersionId,
      versionSummary: summary,
      canPublish: summary?.lifecycleStatus === 'DRAFT' && publishAudit?.canPublish === true && split.blockingDiagnostics.length === 0,
      publishAudit,
      blockingDiagnostics: split.blockingDiagnostics,
      warningDiagnostics: split.warningDiagnostics,
    });
  } finally {
    client.release?.();
  }
}

export async function publishRankedPatternAssessmentVersion(
  input: { readonly targetAssessmentVersionId: string },
  dependencies: Partial<RankedPatternAdminVersioningDependencies> = {},
): Promise<RankedPatternPublishVersionResult> {
  const deps = { ...defaultDependencies, ...dependencies };
  await deps.requireAdminUser();
  const db = deps.getDbPool();
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const summary = await loadRankedPatternVersionSummary(client, input.targetAssessmentVersionId);
    const targetDiagnostics = importTargetDiagnostics({
      targetAssessmentVersionId: input.targetAssessmentVersionId,
      summary,
    });

    if (targetDiagnostics.some((item) => item.severity === 'error') || !summary) {
      await client.query('ROLLBACK');
      const split = splitDiagnostics(targetDiagnostics);
      return Object.freeze({
        status: 'blocked',
        assessmentVersionId: input.targetAssessmentVersionId,
        versionSummary: summary,
        publishAudit: null,
        blockingDiagnostics: split.blockingDiagnostics,
        warningDiagnostics: split.warningDiagnostics,
      });
    }

    const publishAudit = await deps.auditAssessmentVersion({
      assessmentVersionId: input.targetAssessmentVersionId,
      db: client,
    });
    const auditDiagnostics = publishAudit.findings.map((finding) => diagnostic({
      severity: finding.severity === 'blocking' ? 'error' : 'warning',
      code: finding.code,
      message: finding.message,
    }));
    const split = splitDiagnostics(auditDiagnostics);

    if (!publishAudit.canPublish || publishAudit.blockingCount > 0 || split.blockingDiagnostics.length > 0) {
      await client.query('ROLLBACK');
      return Object.freeze({
        status: 'blocked',
        assessmentVersionId: input.targetAssessmentVersionId,
        versionSummary: summary,
        publishAudit,
        blockingDiagnostics: split.blockingDiagnostics,
        warningDiagnostics: split.warningDiagnostics,
      });
    }

    const archived = await client.query<{ readonly id: string }>(
      `
      UPDATE assessment_versions
      SET
        lifecycle_status = 'ARCHIVED',
        updated_at = NOW()
      WHERE assessment_id = $1
        AND lifecycle_status = 'PUBLISHED'
        AND id <> $2
      RETURNING id
      `,
      [summary.assessmentId, summary.assessmentVersionId],
    );

    const published = await client.query<{ readonly id: string }>(
      `
      UPDATE assessment_versions
      SET
        lifecycle_status = 'PUBLISHED',
        published_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
        AND assessment_id = $2
        AND lifecycle_status = 'DRAFT'
      RETURNING id
      `,
      [summary.assessmentVersionId, summary.assessmentId],
    );

    const publishedId = published.rows[0]?.id;
    if (!publishedId) {
      throw new Error('RANKED_PATTERN_PUBLISH_TARGET_NOT_DRAFT');
    }

    await client.query('COMMIT');

    return Object.freeze({
      status: 'published',
      assessmentId: summary.assessmentId,
      assessmentKey: summary.assessmentKey,
      publishedVersionId: publishedId,
      publishedVersionTag: summary.versionTag,
      archivedVersionIds: Object.freeze(archived.rows.map((row) => row.id)),
      publishAudit,
      warningDiagnostics: split.warningDiagnostics,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release?.();
  }
}
