import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

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
  parseRankedPatternWorkbookFile,
  type ParsedRankedPatternWorkbookFile,
} from '@/content/assessment-packages/import-contract/ranked-pattern-workbook-parser';
import type { RankedPatternImportDiagnostic } from '@/content/assessment-packages/import-contract/ranked-pattern-import-validation';
import { getDbPool } from '@/lib/server/db';
import { requireAdminUser } from '@/lib/server/admin-access';
import type { RequestUserContext } from '@/lib/server/request-user';

type AdminImportStatus = 'blocked' | 'ready' | 'applied' | 'publishable' | 'not_publishable';

export type RankedPatternAdminWorkflowSourceInput =
  | {
      readonly sourcePath: string;
      readonly parsedWorkbook?: never;
    }
  | {
      readonly sourcePath?: string;
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
  readonly auditParsedWorkbook: typeof auditParsedRankedPatternWorkbook;
  readonly persistRuntimeDefinition: typeof persistRankedPatternRuntimeDefinition;
  readonly persistResultLanguage: typeof persistRankedPatternResultLanguage;
  readonly auditAssessmentVersion: typeof auditRankedPatternAssessmentVersion;
  readonly nowIso: () => string;
};

const defaultDependencies: WorkflowDependencies = {
  requireAdminUser,
  getDbPool,
  parseWorkbookFile: parseRankedPatternWorkbookFile,
  auditParsedWorkbook: auditParsedRankedPatternWorkbook,
  persistRuntimeDefinition: persistRankedPatternRuntimeDefinition,
  persistResultLanguage: persistRankedPatternResultLanguage,
  auditAssessmentVersion: auditRankedPatternAssessmentVersion,
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

function sourceHashForPath(sourcePath: string): string | null {
  try {
    return createHash('sha256').update(readFileSync(sourcePath)).digest('hex');
  } catch {
    return null;
  }
}

function workbookFromInput(
  input: RankedPatternAdminWorkflowBaseInput,
  dependencies: WorkflowDependencies,
): ParsedRankedPatternWorkbookFile {
  if ('parsedWorkbook' in input && input.parsedWorkbook) {
    return input.parsedWorkbook;
  }

  return dependencies.parseWorkbookFile(input.sourcePath);
}

function sourceMetadata(input: RankedPatternAdminWorkflowBaseInput, parsedWorkbook: ParsedRankedPatternWorkbookFile): RankedPatternAdminWorkflowSourceMetadata {
  const sourcePath = input.sourcePath ?? parsedWorkbook.sourcePath ?? null;
  return Object.freeze({
    sourceName: input.sourceName ?? parsedWorkbook.workbookName ?? (sourcePath ? path.basename(sourcePath) : 'ranked-pattern-workbook'),
    sourceHash: input.sourceHash ?? (sourcePath ? sourceHashForPath(sourcePath) : null),
    workbookName: parsedWorkbook.workbookName,
    sourcePath,
    parsedAt: parsedWorkbook.parsedAt,
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

export async function auditRankedPatternWorkbookForAdmin(
  input: RankedPatternAdminWorkflowBaseInput,
  dependencies: Partial<WorkflowDependencies> = {},
): Promise<RankedPatternAdminImportWorkflowResult> {
  const deps = { ...defaultDependencies, ...dependencies };
  await deps.requireAdminUser();
  const parsedWorkbook = workbookFromInput(input, deps);
  const audit = deps.auditParsedWorkbook(parsedWorkbook);
  const diagnostics = workbookDiagnostics(audit);
  return baseResult({
    status: audit.pass ? 'ready' : 'blocked',
    input,
    audit,
    source: sourceMetadata(input, parsedWorkbook),
    diagnostics,
  });
}

export async function dryRunRankedPatternImportForAdmin(
  input: RankedPatternAdminWorkflowBaseInput,
  dependencies: Partial<WorkflowDependencies> = {},
): Promise<RankedPatternAdminImportWorkflowResult> {
  const deps = { ...defaultDependencies, ...dependencies };
  await deps.requireAdminUser();
  const parsedWorkbook = workbookFromInput(input, deps);
  const audit = deps.auditParsedWorkbook(parsedWorkbook);
  const runtimeResult = await deps.persistRuntimeDefinition({
    normalisedPackage: audit.normalisedPackage,
    sourceName: input.sourceName,
    sourceHash: input.sourceHash,
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
    source: sourceMetadata(input, parsedWorkbook),
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
  const parsedWorkbook = workbookFromInput(input, deps);
  const audit = deps.auditParsedWorkbook(parsedWorkbook);
  const auditDiagnostics = workbookDiagnostics(audit);
  if (splitDiagnostics(auditDiagnostics).blockingDiagnostics.length > 0) {
    return baseResult({
      status: 'blocked',
      input,
      audit,
      source: sourceMetadata(input, parsedWorkbook),
      diagnostics: auditDiagnostics,
    });
  }

  const db = deps.getDbPool();
  const runtimeResult = await deps.persistRuntimeDefinition({
    normalisedPackage: audit.normalisedPackage,
    sourceName: input.sourceName,
    sourceHash: input.sourceHash,
    dryRun: false,
    db,
  });
  const runtimeBlocking = runtimeResult.diagnostics.some((diagnostic) => diagnostic.severity === 'error');
  if (runtimeBlocking || !runtimeResult.assessmentVersionId) {
    return baseResult({
      status: 'blocked',
      input,
      audit,
      source: sourceMetadata(input, parsedWorkbook),
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
    source: sourceMetadata(input, parsedWorkbook),
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

export function planRankedPatternImportForAdmin(input: RankedPatternAdminWorkflowBaseInput): {
  readonly runtimeDefinitionPlan: ReturnType<typeof planRankedPatternRuntimeDefinitionPersistence>;
  readonly resultLanguagePlan: ReturnType<typeof planRankedPatternResultLanguagePersistence>;
} {
  const parsedWorkbook = 'parsedWorkbook' in input && input.parsedWorkbook
    ? input.parsedWorkbook
    : parseRankedPatternWorkbookFile(input.sourcePath);
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
