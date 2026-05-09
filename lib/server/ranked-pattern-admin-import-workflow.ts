import {
  auditParsedRankedPatternWorkbook,
  type RankedPatternPackageAuditResult,
} from '@/content/assessment-packages/import-contract/ranked-pattern-package-audit';
import {
  auditRankedPatternAssessmentVersion,
  type RankedPatternPublishAuditResult,
} from '@/content/assessment-packages/import-contract/ranked-pattern-publish-audit';
import {
  persistRankedPatternResultLanguage,
  persistRankedPatternRuntimeDefinition,
  planRankedPatternResultLanguagePersistence,
  planRankedPatternRuntimeDefinitionPersistence,
  type RankedPatternPersistenceDbPool,
  type RankedPatternResultLanguagePersistenceResult,
  type RankedPatternRuntimeDefinitionPersistenceResult,
} from '@/content/assessment-packages/import-contract/ranked-pattern-import-persistence';
import {
  parseRankedPatternWorkbookBuffer,
  parseRankedPatternWorkbookFile,
  type ParsedRankedPatternWorkbookFile,
} from '@/content/assessment-packages/import-contract/ranked-pattern-workbook-parser';
import type { RankedPatternImportDiagnostic } from '@/content/assessment-packages/import-contract/ranked-pattern-import-validation';
import { getDbPool } from '@/lib/server/db';
import { requireAdminUser } from '@/lib/server/admin-access';
import type { RequestUserContext } from '@/lib/server/request-user';
import {
  createOrResolveRankedPatternPackageDraftVersion,
  validateRankedPatternDraftImportTarget,
  type RankedPatternVersionDiagnostic,
} from '@/lib/server/ranked-pattern-admin-versioning';
import {
  resolveRankedPatternPackageSource,
  type RankedPatternPackageSourceDiagnostic,
  type RankedPatternResolvedPackageSource,
} from '@/lib/server/ranked-pattern-package-source-resolver';
import type { RankedPatternWorkbookStorageReference } from '@/lib/server/ranked-pattern-workbook-storage';

type AdminImportStatus = 'blocked' | 'ready' | 'applied' | 'publishable' | 'not_publishable';

export type RankedPatternAdminWorkflowSourceInput =
  | {
      readonly sourcePath: string;
      readonly storageReference?: never;
      readonly parsedWorkbook?: never;
    }
  | {
      readonly sourcePath?: string;
      readonly storageReference: RankedPatternWorkbookStorageReference;
      readonly parsedWorkbook?: never;
    }
  | {
      readonly sourcePath?: string;
      readonly storageReference?: never;
      readonly parsedWorkbook: ParsedRankedPatternWorkbookFile;
    };

export type RankedPatternAdminWorkflowBaseInput = RankedPatternAdminWorkflowSourceInput & {
  readonly targetAssessmentId?: string;
  readonly targetAssessmentVersionId?: string;
  readonly sourceName?: string;
  readonly sourceHash?: string;
};

export type RankedPatternPublishAuditWorkflowInput = {
  readonly targetAssessmentVersionId: string;
};

export type RankedPatternPublishGateResult = {
  readonly canPublish: boolean;
  readonly publishAudit: RankedPatternPublishAuditResult;
  readonly blockingDiagnostics: readonly RankedPatternAdminWorkflowDiagnostic[];
};

export type RankedPatternAdminWorkflowSourceMetadata = {
  readonly sourceName: string;
  readonly sourceHash: string | null;
  readonly workbookName: string;
  readonly sourcePath: string | null;
  readonly parsedAt: string;
};

export type RankedPatternAdminWorkflowDiagnostic = RankedPatternImportDiagnostic | {
  readonly severity: 'error' | 'warning';
  readonly code: string;
  readonly message: string;
};

export type RankedPatternAdminWorkflowCounts = {
  readonly workbookRowsByStorageTarget: RankedPatternPackageAuditResult['rowCounts'];
  readonly normalisedRowsByStorageTarget: RankedPatternPackageAuditResult['normalisedCounts'];
  readonly runtimeDefinitionPlanByTable?: RankedPatternRuntimeDefinitionPersistenceResult['plan']['operationCountsByTable'];
  readonly resultLanguagePlanByTable?: RankedPatternResultLanguagePersistenceResult['plan']['operationCountsByTable'];
  readonly appliedRuntimeDefinitionByTable?: RankedPatternRuntimeDefinitionPersistenceResult['countsByTable'];
  readonly appliedResultLanguageByTable?: RankedPatternResultLanguagePersistenceResult['countsByTable'];
};

export type RankedPatternAdminImportWorkflowResult = {
  readonly status: AdminImportStatus;
  readonly source: RankedPatternAdminWorkflowSourceMetadata;
  readonly packageMetadata: {
    readonly assessmentKey: string | null;
    readonly assessmentTitle: string | null;
    readonly version: string | null;
    readonly domainKey: string | null;
  } | null;
  readonly workbookAuditSummary: {
    readonly pass: boolean;
    readonly detectedSheets: readonly string[];
    readonly missingSheets: RankedPatternPackageAuditResult['missingSheets'];
    readonly unexpectedSheets: readonly string[];
    readonly diagnosticCounts: RankedPatternPackageAuditResult['diagnosticCounts'];
    readonly normalisationDiagnosticCounts: RankedPatternPackageAuditResult['normalisationDiagnosticCounts'];
  };
  readonly normalisationDiagnostics: readonly RankedPatternImportDiagnostic[];
  readonly runtimeDefinitionPlanSummary?: RankedPatternRuntimeDefinitionPersistenceResult['plan'];
  readonly resultLanguagePlanSummary?: RankedPatternResultLanguagePersistenceResult['plan'];
  readonly publishAuditSummary?: RankedPatternPublishAuditResult;
  readonly blockingDiagnostics: readonly RankedPatternAdminWorkflowDiagnostic[];
  readonly warningDiagnostics: readonly RankedPatternAdminWorkflowDiagnostic[];
  readonly createdOrUpdatedIds: {
    readonly assessmentId: string | null;
    readonly assessmentVersionId: string | null;
    readonly importBatchId: string | null;
  };
  readonly countsByStorageTarget: RankedPatternAdminWorkflowCounts;
};

type WorkflowDependencies = {
  readonly requireAdminUser: () => Promise<RequestUserContext>;
  readonly getDbPool: () => RankedPatternPersistenceDbPool;
  readonly parseWorkbookFile: typeof parseRankedPatternWorkbookFile;
  readonly parseWorkbookBuffer: typeof parseRankedPatternWorkbookBuffer;
  readonly resolvePackageSource: typeof resolveRankedPatternPackageSource;
  readonly auditParsedWorkbook: typeof auditParsedRankedPatternWorkbook;
  readonly persistRuntimeDefinition: typeof persistRankedPatternRuntimeDefinition;
  readonly persistResultLanguage: typeof persistRankedPatternResultLanguage;
  readonly auditAssessmentVersion: typeof auditRankedPatternAssessmentVersion;
  readonly validateImportTarget: typeof validateRankedPatternDraftImportTarget;
  readonly createOrResolvePackageDraftVersion: typeof createOrResolveRankedPatternPackageDraftVersion;
  readonly nowIso: () => string;
};

const defaultDependencies: WorkflowDependencies = {
  requireAdminUser,
  getDbPool,
  parseWorkbookFile: parseRankedPatternWorkbookFile,
  parseWorkbookBuffer: parseRankedPatternWorkbookBuffer,
  resolvePackageSource: resolveRankedPatternPackageSource,
  auditParsedWorkbook: auditParsedRankedPatternWorkbook,
  persistRuntimeDefinition: persistRankedPatternRuntimeDefinition,
  persistResultLanguage: persistRankedPatternResultLanguage,
  auditAssessmentVersion: auditRankedPatternAssessmentVersion,
  validateImportTarget: validateRankedPatternDraftImportTarget,
  createOrResolvePackageDraftVersion: createOrResolveRankedPatternPackageDraftVersion,
  nowIso: () => new Date().toISOString(),
};

function diagnosticSeverity(diagnostic: RankedPatternAdminWorkflowDiagnostic): 'error' | 'warning' {
  return diagnostic.severity === 'error' ? 'error' : 'warning';
}

function splitDiagnostics(diagnostics: readonly RankedPatternAdminWorkflowDiagnostic[]): {
  readonly blockingDiagnostics: readonly RankedPatternAdminWorkflowDiagnostic[];
  readonly warningDiagnostics: readonly RankedPatternAdminWorkflowDiagnostic[];
} {
  return Object.freeze({
    blockingDiagnostics: Object.freeze(diagnostics.filter((diagnostic) => diagnosticSeverity(diagnostic) === 'error')),
    warningDiagnostics: Object.freeze(diagnostics.filter((diagnostic) => diagnosticSeverity(diagnostic) === 'warning')),
  });
}

type PreparedWorkbookInput =
  | {
      readonly ok: true;
      readonly parsedWorkbook: ParsedRankedPatternWorkbookFile;
      readonly source: RankedPatternAdminWorkflowSourceMetadata;
    }
  | {
      readonly ok: false;
      readonly result: RankedPatternAdminImportWorkflowResult;
    };

function sourceResolutionDiagnostics(
  diagnostics: readonly RankedPatternPackageSourceDiagnostic[],
): readonly RankedPatternAdminWorkflowDiagnostic[] {
  return Object.freeze(
    diagnostics.map((diagnostic) =>
      Object.freeze({
        severity: diagnostic.severity,
        code: diagnostic.code,
        message: diagnostic.message,
        fieldKey: diagnostic.fieldKey,
      }),
    ),
  );
}

function blockedSourceResult(
  input: RankedPatternAdminWorkflowBaseInput,
  resolved: RankedPatternResolvedPackageSource,
): RankedPatternAdminImportWorkflowResult {
  const diagnostics = sourceResolutionDiagnostics(resolved.diagnostics);
  const split = splitDiagnostics(diagnostics);
  return Object.freeze({
    status: 'blocked' as const,
    source: Object.freeze({
      sourceName: resolved.sourceName ?? input.sourceName ?? resolved.safeDisplayName,
      sourceHash: null,
      workbookName: resolved.safeDisplayName,
      sourcePath: resolved.resolvedPath,
      parsedAt: new Date().toISOString(),
    }),
    packageMetadata: null,
    workbookAuditSummary: Object.freeze({
      pass: false,
      detectedSheets: Object.freeze([]),
      missingSheets: Object.freeze([]),
      unexpectedSheets: Object.freeze([]),
      diagnosticCounts: Object.freeze({ error: split.blockingDiagnostics.length, warning: split.warningDiagnostics.length }),
      normalisationDiagnosticCounts: Object.freeze({ error: 0, warning: 0 }),
    }),
    normalisationDiagnostics: Object.freeze([]),
    blockingDiagnostics: split.blockingDiagnostics,
    warningDiagnostics: split.warningDiagnostics,
    createdOrUpdatedIds: Object.freeze({
      assessmentId: input.targetAssessmentId ?? null,
      assessmentVersionId: input.targetAssessmentVersionId ?? null,
      importBatchId: null,
    }),
    countsByStorageTarget: Object.freeze({
      workbookRowsByStorageTarget: Object.freeze({
        bySheet: Object.freeze({}) as never,
        runtimeDefinition: 0,
        runtimeResultContent: 0,
        adminImportSupport: 0,
      }),
      normalisedRowsByStorageTarget: Object.freeze({
        runtimeDefinition: 0,
        runtimeResultContent: 0,
        adminImportSupport: 0,
      }),
    }),
  });
}

function sourceMetadataFromParsedWorkbook(
  input: RankedPatternAdminWorkflowBaseInput,
  parsedWorkbook: ParsedRankedPatternWorkbookFile,
): RankedPatternAdminWorkflowSourceMetadata {
  return Object.freeze({
    sourceName: input.sourceName ?? parsedWorkbook.workbookName ?? 'ranked-pattern-workbook',
    sourceHash: input.sourceHash ?? null,
    workbookName: parsedWorkbook.workbookName,
    sourcePath: input.sourcePath ?? parsedWorkbook.sourcePath ?? null,
    parsedAt: parsedWorkbook.parsedAt,
  });
}

function sourceMetadataFromResolvedSource(
  resolved: Extract<RankedPatternResolvedPackageSource, { readonly ok: true }>,
  parsedWorkbook: ParsedRankedPatternWorkbookFile,
): RankedPatternAdminWorkflowSourceMetadata {
  return Object.freeze({
    sourceName: resolved.sourceName,
    sourceHash: resolved.sourceHash,
    workbookName: parsedWorkbook.workbookName,
    sourcePath: resolved.resolvedPath,
    parsedAt: parsedWorkbook.parsedAt,
  });
}

async function prepareWorkbookInput(
  input: RankedPatternAdminWorkflowBaseInput,
  dependencies: WorkflowDependencies,
): Promise<PreparedWorkbookInput> {
  if ('parsedWorkbook' in input && input.parsedWorkbook) {
    return Object.freeze({
      ok: true as const,
      parsedWorkbook: input.parsedWorkbook,
      source: sourceMetadataFromParsedWorkbook(input, input.parsedWorkbook),
    });
  }

  const resolved = await dependencies.resolvePackageSource(input);
  if (!resolved.ok) {
    return Object.freeze({
      ok: false as const,
      result: blockedSourceResult(input, resolved),
    });
  }

  const parsedWorkbook = dependencies.parseWorkbookBuffer(resolved.bytes, {
    sourcePath: resolved.resolvedPath ?? resolved.originalReference,
    workbookName: resolved.sourceName,
  });

  return Object.freeze({
    ok: true as const,
    parsedWorkbook,
    source: sourceMetadataFromResolvedSource(resolved, parsedWorkbook),
  });
}

function auditSummary(audit: RankedPatternPackageAuditResult): RankedPatternAdminImportWorkflowResult['workbookAuditSummary'] {
  return Object.freeze({
    pass: audit.pass,
    detectedSheets: audit.detectedSheets,
    missingSheets: audit.missingSheets,
    unexpectedSheets: audit.unexpectedSheets,
    diagnosticCounts: audit.diagnosticCounts,
    normalisationDiagnosticCounts: audit.normalisationDiagnosticCounts,
  });
}

function baseResult(params: {
  readonly status: AdminImportStatus;
  readonly input: RankedPatternAdminWorkflowBaseInput;
  readonly audit: RankedPatternPackageAuditResult;
  readonly source: RankedPatternAdminWorkflowSourceMetadata;
  readonly diagnostics: readonly RankedPatternAdminWorkflowDiagnostic[];
  readonly runtimeResult?: RankedPatternRuntimeDefinitionPersistenceResult;
  readonly resultLanguageResult?: RankedPatternResultLanguagePersistenceResult;
  readonly publishAudit?: RankedPatternPublishAuditResult;
}): RankedPatternAdminImportWorkflowResult {
  const split = splitDiagnostics(params.diagnostics);
  return Object.freeze({
    status: params.status,
    source: params.source,
    packageMetadata: params.audit.normalisedPackage.metadata[0]
      ? Object.freeze({
          assessmentKey: params.audit.normalisedPackage.metadata[0].assessmentKey,
          assessmentTitle: params.audit.normalisedPackage.metadata[0].assessmentTitle,
          version: params.audit.normalisedPackage.metadata[0].version,
          domainKey: params.audit.normalisedPackage.metadata[0].domainKey,
        })
      : null,
    workbookAuditSummary: auditSummary(params.audit),
    normalisationDiagnostics: params.audit.normalisationDiagnostics,
    runtimeDefinitionPlanSummary: params.runtimeResult?.plan,
    resultLanguagePlanSummary: params.resultLanguageResult?.plan,
    publishAuditSummary: params.publishAudit,
    blockingDiagnostics: split.blockingDiagnostics,
    warningDiagnostics: split.warningDiagnostics,
    createdOrUpdatedIds: Object.freeze({
      assessmentId: params.runtimeResult?.assessmentId ?? params.input.targetAssessmentId ?? null,
      assessmentVersionId:
        params.runtimeResult?.assessmentVersionId ?? params.input.targetAssessmentVersionId ?? null,
      importBatchId:
        params.runtimeResult?.importBatchId ?? params.resultLanguageResult?.importBatchId ?? null,
    }),
    countsByStorageTarget: Object.freeze({
      workbookRowsByStorageTarget: params.audit.rowCounts,
      normalisedRowsByStorageTarget: params.audit.normalisedCounts,
      runtimeDefinitionPlanByTable: params.runtimeResult?.plan.operationCountsByTable,
      resultLanguagePlanByTable: params.resultLanguageResult?.plan.operationCountsByTable,
      appliedRuntimeDefinitionByTable: params.runtimeResult?.countsByTable,
      appliedResultLanguageByTable: params.resultLanguageResult?.countsByTable,
    }),
  });
}

function workbookDiagnostics(audit: RankedPatternPackageAuditResult): readonly RankedPatternAdminWorkflowDiagnostic[] {
  return Object.freeze([...audit.diagnostics, ...audit.normalisationDiagnostics]);
}

function versionDiagnostics(
  diagnostics: readonly RankedPatternVersionDiagnostic[],
): readonly RankedPatternAdminWorkflowDiagnostic[] {
  return Object.freeze(diagnostics.map((item) => Object.freeze({ ...item })));
}

export async function auditRankedPatternWorkbookForAdmin(
  input: RankedPatternAdminWorkflowBaseInput,
  dependencies: Partial<WorkflowDependencies> = {},
): Promise<RankedPatternAdminImportWorkflowResult> {
  const deps = { ...defaultDependencies, ...dependencies };
  await deps.requireAdminUser();
  const prepared = await prepareWorkbookInput(input, deps);
  if (!prepared.ok) {
    return prepared.result;
  }
  const parsedWorkbook = prepared.parsedWorkbook;
  const audit = deps.auditParsedWorkbook(parsedWorkbook);
  const diagnostics = workbookDiagnostics(audit);
  return baseResult({
    status: audit.pass ? 'ready' : 'blocked',
    input,
    audit,
    source: prepared.source,
    diagnostics,
  });
}

export async function createOrResolveRankedPatternPackageDraftForAdmin(
  input: RankedPatternAdminWorkflowBaseInput,
  dependencies: Partial<WorkflowDependencies> = {},
) {
  const deps = { ...defaultDependencies, ...dependencies };
  const adminUser = await deps.requireAdminUser();
  const prepared = await prepareWorkbookInput(input, deps);
  if (!prepared.ok) {
    return Object.freeze({
      status: 'blocked' as const,
      diagnostics: prepared.result.blockingDiagnostics,
    });
  }
  const parsedWorkbook = prepared.parsedWorkbook;
  const audit = deps.auditParsedWorkbook(parsedWorkbook);
  const diagnostics = workbookDiagnostics(audit);
  const blocking = splitDiagnostics(diagnostics).blockingDiagnostics;

  if (blocking.length > 0) {
    return Object.freeze({
      status: 'blocked' as const,
      diagnostics: blocking,
    });
  }

  const metadata = audit.normalisedPackage.metadata[0] ?? null;
  if (!metadata) {
    return Object.freeze({
      status: 'blocked' as const,
      diagnostics: Object.freeze([
        {
          severity: 'error' as const,
          code: 'PACKAGE_METADATA_REQUIRED',
          message: 'Package metadata could not be read from the workbook.',
        },
      ]),
    });
  }

  return deps.createOrResolvePackageDraftVersion(
    { metadata },
    {
      requireAdminUser: async () => adminUser,
      getDbPool: deps.getDbPool,
    },
  );
}

export async function dryRunRankedPatternImportForAdmin(
  input: RankedPatternAdminWorkflowBaseInput,
  dependencies: Partial<WorkflowDependencies> = {},
): Promise<RankedPatternAdminImportWorkflowResult> {
  const deps = { ...defaultDependencies, ...dependencies };
  await deps.requireAdminUser();
  const prepared = await prepareWorkbookInput(input, deps);
  if (!prepared.ok) {
    return prepared.result;
  }
  const parsedWorkbook = prepared.parsedWorkbook;
  const audit = deps.auditParsedWorkbook(parsedWorkbook);
  const runtimeResult = await deps.persistRuntimeDefinition({
    normalisedPackage: audit.normalisedPackage,
    sourceName: prepared.source.sourceName,
    sourceHash: prepared.source.sourceHash ?? undefined,
    dryRun: true,
  });
  const assessmentVersionId =
    input.targetAssessmentVersionId || runtimeResult.assessmentVersionId || 'dry-run-assessment-version';
  const resultLanguageResult = await deps.persistResultLanguage({
    normalisedPackage: audit.normalisedPackage,
    assessmentVersionId,
    assessmentId: input.targetAssessmentId,
    dryRun: true,
  });
  const diagnostics = Object.freeze([
    ...workbookDiagnostics(audit),
    ...runtimeResult.diagnostics,
    ...resultLanguageResult.diagnostics,
  ]);

  return baseResult({
    status: splitDiagnostics(diagnostics).blockingDiagnostics.length === 0 ? 'ready' : 'blocked',
    input,
    audit,
    source: prepared.source,
    diagnostics,
    runtimeResult,
    resultLanguageResult,
  });
}

export async function applyRankedPatternImportForAdmin(
  input: RankedPatternAdminWorkflowBaseInput,
  dependencies: Partial<WorkflowDependencies> = {},
): Promise<RankedPatternAdminImportWorkflowResult> {
  const deps = { ...defaultDependencies, ...dependencies };
  await deps.requireAdminUser();
  const prepared = await prepareWorkbookInput(input, deps);
  if (!prepared.ok) {
    return prepared.result;
  }
  const parsedWorkbook = prepared.parsedWorkbook;
  const audit = deps.auditParsedWorkbook(parsedWorkbook);
  const auditDiagnostics = workbookDiagnostics(audit);
  if (splitDiagnostics(auditDiagnostics).blockingDiagnostics.length > 0) {
    return baseResult({
      status: 'blocked',
      input,
      audit,
      source: prepared.source,
      diagnostics: auditDiagnostics,
    });
  }

  const db = deps.getDbPool();
  const targetClient = await db.connect();
  try {
    const target = await deps.validateImportTarget({
      db: targetClient,
      targetAssessmentVersionId: input.targetAssessmentVersionId ?? '',
      targetAssessmentId: input.targetAssessmentId,
      metadata: audit.normalisedPackage.metadata[0] ?? null,
    });
    const targetDiagnostics = versionDiagnostics(target.diagnostics);

    if (splitDiagnostics(targetDiagnostics).blockingDiagnostics.length > 0) {
      return baseResult({
        status: 'blocked',
        input,
        audit,
        source: prepared.source,
        diagnostics: Object.freeze([...auditDiagnostics, ...targetDiagnostics]),
      });
    }
  } finally {
    targetClient.release?.();
  }

  const runtimeResult = await deps.persistRuntimeDefinition({
    normalisedPackage: audit.normalisedPackage,
    sourceName: prepared.source.sourceName,
    sourceHash: prepared.source.sourceHash ?? undefined,
    dryRun: false,
    db,
  });
  const runtimeTargetMismatch =
    input.targetAssessmentVersionId &&
    runtimeResult.assessmentVersionId &&
    runtimeResult.assessmentVersionId !== input.targetAssessmentVersionId;
  if (runtimeTargetMismatch) {
    return baseResult({
      status: 'blocked',
      input,
      audit,
      source: prepared.source,
      diagnostics: Object.freeze([
        ...auditDiagnostics,
        ...runtimeResult.diagnostics,
        {
          severity: 'error' as const,
          code: 'RUNTIME_PERSISTED_VERSION_MISMATCH',
          message: 'Runtime import resolved a different assessment version than the selected draft target.',
        },
      ]),
      runtimeResult,
    });
  }
  const runtimeBlocking = runtimeResult.diagnostics.some((diagnostic) => diagnostic.severity === 'error');
  if (runtimeBlocking || !runtimeResult.assessmentVersionId) {
    return baseResult({
      status: 'blocked',
      input,
      audit,
      source: prepared.source,
      diagnostics: Object.freeze([...auditDiagnostics, ...runtimeResult.diagnostics]),
      runtimeResult,
    });
  }

  const resultLanguageResult = await deps.persistResultLanguage({
    normalisedPackage: audit.normalisedPackage,
    assessmentVersionId: runtimeResult.assessmentVersionId,
    assessmentId: runtimeResult.assessmentId ?? input.targetAssessmentId,
    dryRun: false,
    db,
  });
  const diagnostics = Object.freeze([
    ...auditDiagnostics,
    ...runtimeResult.diagnostics,
    ...resultLanguageResult.diagnostics,
  ]);

  return baseResult({
    status: splitDiagnostics(diagnostics).blockingDiagnostics.length === 0 ? 'applied' : 'blocked',
    input,
    audit,
    source: prepared.source,
    diagnostics,
    runtimeResult,
    resultLanguageResult,
  });
}

export async function auditRankedPatternPublishReadinessForAdmin(
  input: RankedPatternPublishAuditWorkflowInput,
  dependencies: Partial<WorkflowDependencies> = {},
): Promise<RankedPatternPublishAuditResult> {
  const deps = { ...defaultDependencies, ...dependencies };
  await deps.requireAdminUser();
  const client = await deps.getDbPool().connect();
  try {
    return await deps.auditAssessmentVersion({
      assessmentVersionId: input.targetAssessmentVersionId,
      db: client,
    });
  } finally {
    client.release?.();
  }
}

export async function requireRankedPatternPublishableForAdmin(
  input: RankedPatternPublishAuditWorkflowInput,
  dependencies: Partial<WorkflowDependencies> = {},
): Promise<RankedPatternPublishGateResult> {
  const publishAudit = await auditRankedPatternPublishReadinessForAdmin(input, dependencies);
  const blockingDiagnostics = publishAudit.findings
    .filter((finding) => finding.severity === 'blocking')
    .map((finding) =>
      Object.freeze({
        severity: 'error' as const,
        code: finding.code,
        message: finding.message,
      }),
    );

  return Object.freeze({
    canPublish: publishAudit.canPublish,
    publishAudit,
    blockingDiagnostics: Object.freeze(blockingDiagnostics),
  });
}

export async function planRankedPatternImportForAdmin(input: RankedPatternAdminWorkflowBaseInput): Promise<{
  readonly runtimeDefinitionPlan: ReturnType<typeof planRankedPatternRuntimeDefinitionPersistence>;
  readonly resultLanguagePlan: ReturnType<typeof planRankedPatternResultLanguagePersistence>;
}> {
  const prepared = await prepareWorkbookInput(input, defaultDependencies);
  if (!prepared.ok) {
    throw new Error(prepared.result.blockingDiagnostics[0]?.message ?? 'Package source could not be resolved.');
  }
  const parsedWorkbook = prepared.parsedWorkbook;
  const audit = auditParsedRankedPatternWorkbook(parsedWorkbook);
  const runtimeDefinitionPlan = planRankedPatternRuntimeDefinitionPersistence(audit.normalisedPackage);
  const resultLanguagePlan = planRankedPatternResultLanguagePersistence({
    normalisedPackage: audit.normalisedPackage,
    assessmentVersionId: input.targetAssessmentVersionId || 'dry-run-assessment-version',
    assessmentId: input.targetAssessmentId,
    dryRun: true,
  });

  return Object.freeze({
    runtimeDefinitionPlan,
    resultLanguagePlan,
  });
}
