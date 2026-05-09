import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import {
  applyRankedPatternImportForAdmin,
  auditRankedPatternPublishReadinessForAdmin,
  auditRankedPatternWorkbookForAdmin,
  dryRunRankedPatternImportForAdmin,
  requireRankedPatternPublishableForAdmin,
} from '@/lib/server/ranked-pattern-admin-import-workflow';
import {
  auditRankedPatternPackageActionWithDependencies,
  auditRankedPatternPublishReadinessActionWithDependencies,
  createRankedPatternPackageDraftVersionActionWithDependencies,
  createRankedPatternDraftVersionActionWithDependencies,
  dryRunRankedPatternImportActionWithDependencies,
  applyRankedPatternImportActionWithDependencies,
  publishRankedPatternVersionActionWithDependencies,
  uploadRankedPatternWorkbookPackageActionWithDependencies,
} from '@/lib/server/ranked-pattern-admin-import-workflow-actions';
import { resolveRankedPatternPackageSource } from '@/lib/server/ranked-pattern-package-source-resolver';
import {
  buildRankedPatternWorkbookStorageObjectPath,
  readRankedPatternWorkbookPackage,
  uploadRankedPatternWorkbookPackage,
  type RankedPatternWorkbookStorageAdapter,
  type RankedPatternWorkbookStorageReference,
} from '@/lib/server/ranked-pattern-workbook-storage';
import type { RankedPatternImportDiagnostic } from '@/content/assessment-packages/import-contract/ranked-pattern-import-validation';
import type { ParsedRankedPatternWorkbookFile } from '@/content/assessment-packages/import-contract/ranked-pattern-workbook-parser';

const leadershipWorkbookPath =
  'content/assessment-packages/leadership-approach/sonartra_reader_first_import_schema_LEADERSHIP_APPROACH_TEST.xlsx';

const runtimeCounts = Object.freeze({
  assessments: 0,
  assessment_versions: 0,
  domains: 0,
  signals: 0,
  questions: 0,
  options: 0,
  option_signal_weights: 0,
});

const resultLanguageCounts = Object.freeze({
  assessment_ranked_patterns: 0,
  assessment_score_shape_rules: 0,
  assessment_result_section_definitions: 0,
  assessment_result_language_rows: 0,
  assessment_report_preview_cases: 0,
});

const parsedWorkbook: ParsedRankedPatternWorkbookFile = Object.freeze({
  sourcePath: 'ranked-pattern.xlsx',
  workbookName: 'ranked-pattern.xlsx',
  sheets: Object.freeze({}),
  missingSheets: Object.freeze([]),
  unexpectedSheets: Object.freeze([]),
  parsedAt: '2026-05-07T00:00:00.000Z',
});

function memoryWorkbookStorageAdapter(store = new Map<string, Buffer>()): RankedPatternWorkbookStorageAdapter {
  return Object.freeze({
    async uploadObject(params) {
      store.set(`${params.bucket}/${params.objectPath}`, Buffer.from(params.bytes));
    },
    async readObject(params) {
      const bytes = store.get(`${params.bucket}/${params.objectPath}`);
      if (!bytes) {
        throw new Error('MISSING_OBJECT');
      }

      return Buffer.from(bytes);
    },
    async deleteObject(params) {
      store.delete(`${params.bucket}/${params.objectPath}`);
    },
  });
}

test('package source resolver resolves an existing local workbook path and computes a stable hash', async () => {
  const result = await resolveRankedPatternPackageSource({ sourcePath: leadershipWorkbookPath });
  const expectedHash = createHash('sha256').update(readFileSync(leadershipWorkbookPath)).digest('hex');

  assert.equal(result.ok, true);
  assert.equal(result.sourceKind, 'local_path');
  assert.equal(result.sourceName, 'sonartra_reader_first_import_schema_LEADERSHIP_APPROACH_TEST.xlsx');
  assert.equal(result.sourceHash, expectedHash);
  assert.equal(result.bytes.length > 0, true);
  assert.deepEqual(result.diagnostics, []);
});

test('package source resolver derives source name and respects provided source name', async () => {
  const derived = await resolveRankedPatternPackageSource({ sourcePath: leadershipWorkbookPath });
  const provided = await resolveRankedPatternPackageSource({
    sourcePath: leadershipWorkbookPath,
    sourceName: 'Leadership Approach test upload.xlsx',
  });

  assert.equal(derived.ok, true);
  assert.equal(derived.sourceName, 'sonartra_reader_first_import_schema_LEADERSHIP_APPROACH_TEST.xlsx');
  assert.equal(provided.ok, true);
  assert.equal(provided.sourceName, 'Leadership Approach test upload.xlsx');
  assert.equal(provided.sourceHash, derived.sourceHash);
});

test('package source resolver supports package references without exposing broad filesystem reads', async () => {
  const result = await resolveRankedPatternPackageSource({ sourcePath: 'leadership-approach' });

  assert.equal(result.ok, true);
  assert.equal(result.sourceKind, 'package_reference');
  assert.equal(result.resolvedPath?.endsWith('sonartra_reader_first_import_schema_LEADERSHIP_APPROACH_TEST.xlsx'), true);

  const unsafe = await resolveRankedPatternPackageSource({ sourcePath: '../package.json' });
  assert.equal(unsafe.ok, false);
  assert.equal(unsafe.diagnostics[0]?.code, 'UNSAFE_PACKAGE_SOURCE_REFERENCE');
});

test('package source resolver returns structured errors for missing, unsupported, and unreadable sources', async () => {
  const missing = await resolveRankedPatternPackageSource({ sourcePath: '' });
  const unsupported = await resolveRankedPatternPackageSource({
    sourcePath: 'content/assessment-packages/leadership-approach/README.md',
  });
  const unreadable = await resolveRankedPatternPackageSource({
    sourcePath: 'content/assessment-packages/leadership-approach/missing.xlsx',
  });

  assert.equal(missing.ok, false);
  assert.equal(missing.diagnostics[0]?.code, 'PACKAGE_SOURCE_REQUIRED');
  assert.equal(unsupported.ok, false);
  assert.equal(unsupported.diagnostics[0]?.code, 'UNSUPPORTED_PACKAGE_SOURCE_EXTENSION');
  assert.equal(unreadable.ok, false);
  assert.equal(unreadable.diagnostics[0]?.code, 'PACKAGE_SOURCE_UNREADABLE');
});

test('ranked-pattern workbook storage accepts .xlsx uploads and returns private storage reference', async () => {
  const bytes = readFileSync(leadershipWorkbookPath);
  const storageAdapter = memoryWorkbookStorageAdapter();
  const result = await uploadRankedPatternWorkbookPackage({
    bytes,
    originalFileName: 'Leadership Approach TEST.xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    uploadedAt: new Date('2026-05-09T12:34:56.000Z'),
    storageAdapter,
  });

  const expectedHash = createHash('sha256').update(bytes).digest('hex');
  assert.equal(result.ok, true);
  assert.equal(result.storageReference.sourceKind, 'storage_object');
  assert.equal(result.storageReference.bucket, 'assessment-import-packages');
  assert.equal(result.storageReference.sourceHash, expectedHash);
  assert.equal(result.storageReference.sizeBytes, bytes.length);
  assert.equal(result.storageReference.objectPath, `2026/05/20260509T123456Z-${expectedHash.slice(0, 12)}-leadership-approach-test.xlsx`);
  assert.equal('publicUrl' in result.storageReference, false);
});

test('ranked-pattern workbook storage rejects missing, non-xlsx, empty, oversized, and unconfigured uploads', async () => {
  const bytes = Buffer.from('not a workbook');
  const missing = await uploadRankedPatternWorkbookPackage({ originalFileName: 'package.xlsx', storageAdapter: memoryWorkbookStorageAdapter() });
  const unsupported = await uploadRankedPatternWorkbookPackage({ bytes, originalFileName: 'package.csv', storageAdapter: memoryWorkbookStorageAdapter() });
  const empty = await uploadRankedPatternWorkbookPackage({ bytes: Buffer.alloc(0), originalFileName: 'package.xlsx', storageAdapter: memoryWorkbookStorageAdapter() });
  const oversized = await uploadRankedPatternWorkbookPackage({ bytes, originalFileName: 'package.xlsx', maxBytes: 2, storageAdapter: memoryWorkbookStorageAdapter() });
  const unconfigured = await uploadRankedPatternWorkbookPackage({ bytes, originalFileName: 'package.xlsx', storageAdapter: null as never });

  assert.equal(missing.ok, false);
  assert.equal(missing.diagnostics[0]?.code, 'WORKBOOK_FILE_REQUIRED');
  assert.equal(unsupported.ok, false);
  assert.equal(unsupported.diagnostics[0]?.code, 'UNSUPPORTED_WORKBOOK_EXTENSION');
  assert.equal(empty.ok, false);
  assert.equal(empty.diagnostics[0]?.code, 'WORKBOOK_FILE_EMPTY');
  assert.equal(oversized.ok, false);
  assert.equal(oversized.diagnostics[0]?.code, 'WORKBOOK_FILE_TOO_LARGE');
  assert.equal(unconfigured.ok, false);
  assert.equal(unconfigured.diagnostics[0]?.code, 'WORKBOOK_STORAGE_CONFIG_MISSING');
});

test('ranked-pattern workbook storage builds safe object paths without trusting client paths', () => {
  const objectPath = buildRankedPatternWorkbookStorageObjectPath({
    originalFileName: '../../Leadership Approach FINAL TEST.xlsx',
    sourceHash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    uploadedAt: new Date('2026-05-09T01:02:03.000Z'),
  });

  assert.equal(objectPath, '2026/05/20260509T010203Z-abcdef123456-leadership-approach-final-test.xlsx');
});

test('storage object reference resolves through package source resolver and matches local workbook metadata', async () => {
  const bytes = readFileSync(leadershipWorkbookPath);
  const storageAdapter = memoryWorkbookStorageAdapter();
  const upload = await uploadRankedPatternWorkbookPackage({
    bytes,
    originalFileName: 'Leadership Approach Upload.xlsx',
    uploadedAt: new Date('2026-05-09T12:00:00.000Z'),
    storageAdapter,
  });
  assert.equal(upload.ok, true);

  const local = await auditRankedPatternWorkbookForAdmin(
    { sourcePath: 'leadership-approach' },
    {
      async requireAdminUser() {
        return adminUser() as never;
      },
    },
  );
  const storage = await auditRankedPatternWorkbookForAdmin(
    { storageReference: upload.storageReference },
    {
      async requireAdminUser() {
        return adminUser() as never;
      },
      resolvePackageSource(input) {
        return resolveRankedPatternPackageSource({ ...input, storageAdapter });
      },
    },
  );

  assert.equal(storage.status, 'ready');
  assert.equal(storage.source.sourceHash, local.source.sourceHash);
  assert.equal(storage.packageMetadata?.assessmentKey, local.packageMetadata?.assessmentKey);
  assert.equal(storage.packageMetadata?.version, local.packageMetadata?.version);
  assert.equal(storage.packageMetadata?.domainKey, local.packageMetadata?.domainKey);
});

test('private storage reads validate hash and missing config with structured diagnostics', async () => {
  const bytes = readFileSync(leadershipWorkbookPath);
  const sourceHash = createHash('sha256').update(bytes).digest('hex');
  const reference: RankedPatternWorkbookStorageReference = Object.freeze({
    sourceKind: 'storage_object',
    bucket: 'assessment-import-packages',
    objectPath: '2026/05/test.xlsx',
    originalFileName: 'test.xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    sizeBytes: bytes.length,
    sourceHash,
  });

  const missingConfig = await readRankedPatternWorkbookPackage(reference, null);
  const mismatchedHash = await readRankedPatternWorkbookPackage(
    { ...reference, sourceHash: '0'.repeat(64) },
    memoryWorkbookStorageAdapter(new Map([[`${reference.bucket}/${reference.objectPath}`, bytes]])),
  );

  assert.equal(missingConfig.ok, false);
  assert.equal(missingConfig.diagnostics[0]?.code, 'WORKBOOK_STORAGE_CONFIG_MISSING');
  assert.equal(mismatchedHash.ok, false);
  assert.equal(mismatchedHash.diagnostics[0]?.code, 'WORKBOOK_SOURCE_HASH_MISMATCH');
});

const blockingDiagnostic: RankedPatternImportDiagnostic = Object.freeze({
  severity: 'error',
  code: 'MISSING_REQUIRED_FIELD',
  message: 'Required value is missing.',
  sheetKey: '06_Orientation',
  rowNumber: 12,
  fieldKey: 'pattern_key',
  lookupKey: 'orientation::bad',
});

const warningDiagnostic: RankedPatternImportDiagnostic = Object.freeze({
  severity: 'warning',
  code: 'SCORE_SHAPE_RULES_NOT_SUPPLIED',
  message: 'Fixed platform score-shape policy is active.',
});

function adminUser() {
  return {
    internalUserId: 'admin-1',
    clerkUserId: 'clerk-admin-1',
    userEmail: 'admin@example.com',
    userRole: 'admin',
    userStatus: 'active',
    isAdmin: true,
  };
}

function fakeAudit(pass = true, diagnostics: readonly RankedPatternImportDiagnostic[] = []) {
  return Object.freeze({
    parsedWorkbook,
    normalisedPackage: Object.freeze({
      sourcePath: parsedWorkbook.sourcePath,
      workbookName: parsedWorkbook.workbookName,
      metadata: Object.freeze([]),
      signals: Object.freeze([]),
      questions: Object.freeze([]),
      options: Object.freeze([]),
      optionWeights: Object.freeze([]),
      context: Object.freeze([]),
      orientation: Object.freeze([]),
      recognition: Object.freeze([]),
      signalRoles: Object.freeze([]),
      patternMechanics: Object.freeze([]),
      patternSynthesis: Object.freeze([]),
      strengths: Object.freeze([]),
      narrowing: Object.freeze([]),
      application: Object.freeze([]),
      closingIntegration: Object.freeze([]),
      reportPreviewCases: Object.freeze([]),
      importSummaryRows: Object.freeze([]),
      validationReferenceRows: Object.freeze([]),
      lookupRows: Object.freeze([]),
      diagnostics: Object.freeze([]),
    }),
    detectedSheets: Object.freeze(['00_Metadata', '15_Report_Preview', '18_Lookups']),
    missingSheets: Object.freeze([]),
    unexpectedSheets: Object.freeze([]),
    rowCounts: Object.freeze({
      bySheet: Object.freeze({}) as never,
      runtimeDefinition: 5,
      runtimeResultContent: 10,
      adminImportSupport: 4,
    }),
    normalisedCounts: Object.freeze({
      runtimeDefinition: 5,
      runtimeResultContent: 10,
      adminImportSupport: 4,
    }),
    diagnosticCounts: Object.freeze({
      error: diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length,
      warning: diagnostics.filter((diagnostic) => diagnostic.severity === 'warning').length,
    }),
    normalisationDiagnosticCounts: Object.freeze({ error: 0, warning: 0 }),
    diagnostics: Object.freeze([...diagnostics]),
    normalisationDiagnostics: Object.freeze([]),
    pass,
  });
}

function runtimeResult(overrides: Record<string, unknown> = {}) {
  const plan = Object.freeze({
    assessmentKey: 'assessment_key',
    version: '1.0.0',
    domainKey: 'domain_key',
    operations: Object.freeze([]),
    operationCountsByTable: Object.freeze({ ...runtimeCounts, assessments: 1, assessment_versions: 1 }),
    diagnostics: Object.freeze([]),
  });

  return Object.freeze({
    dryRun: true,
    plan,
    assessmentId: null,
    assessmentVersionId: null,
    importBatchId: null,
    countsByTable: runtimeCounts,
    diagnostics: Object.freeze([]),
    ...overrides,
  });
}

function resultLanguageResult(overrides: Record<string, unknown> = {}) {
  const plan = Object.freeze({
    assessmentVersionId: 'version-1',
    domainKey: 'domain_key',
    operations: Object.freeze([]),
    operationCountsByTable: Object.freeze({
      ...resultLanguageCounts,
      assessment_result_language_rows: 10,
      assessment_report_preview_cases: 1,
    }),
    diagnostics: Object.freeze([warningDiagnostic]),
  });

  return Object.freeze({
    dryRun: true,
    assessmentVersionId: 'version-1',
    importBatchId: null,
    plan,
    countsByTable: resultLanguageCounts,
    diagnostics: Object.freeze([warningDiagnostic]),
    ...overrides,
  });
}

test('audit workflow returns workbook diagnostics without database writes', async () => {
  let adminGuardCalls = 0;
  let getDbPoolCalls = 0;
  const result = await auditRankedPatternWorkbookForAdmin(
    { parsedWorkbook },
    {
      async requireAdminUser() {
        adminGuardCalls += 1;
        return adminUser() as never;
      },
      getDbPool() {
        getDbPoolCalls += 1;
        throw new Error('SHOULD_NOT_REQUEST_DB');
      },
      auditParsedWorkbook() {
        return fakeAudit(false, [blockingDiagnostic]) as never;
      },
    },
  );

  assert.equal(adminGuardCalls, 1);
  assert.equal(getDbPoolCalls, 0);
  assert.equal(result.status, 'blocked');
  assert.equal(result.blockingDiagnostics[0]?.sheetKey, '06_Orientation');
  assert.equal(result.blockingDiagnostics[0]?.rowNumber, 12);
});

test('dry-run workflow returns runtime and result-language plans without database writes', async () => {
  let getDbPoolCalls = 0;
  const dryRunFlags: boolean[] = [];
  const result = await dryRunRankedPatternImportForAdmin(
    { parsedWorkbook, targetAssessmentVersionId: 'target-version' },
    {
      async requireAdminUser() {
        return adminUser() as never;
      },
      getDbPool() {
        getDbPoolCalls += 1;
        throw new Error('SHOULD_NOT_REQUEST_DB');
      },
      auditParsedWorkbook() {
        return fakeAudit(true) as never;
      },
      async persistRuntimeDefinition(input) {
        dryRunFlags.push(input.dryRun === true);
        return runtimeResult() as never;
      },
      async persistResultLanguage(input) {
        dryRunFlags.push(input.dryRun === true);
        assert.equal(input.assessmentVersionId, 'target-version');
        return resultLanguageResult() as never;
      },
    },
  );

  assert.equal(getDbPoolCalls, 0);
  assert.deepEqual(dryRunFlags, [true, true]);
  assert.equal(result.status, 'ready');
  assert.equal(result.resultLanguagePlanSummary?.operationCountsByTable.assessment_report_preview_cases, 1);
  assert.equal(result.warningDiagnostics.some((diagnostic) => diagnostic.code === 'SCORE_SHAPE_RULES_NOT_SUPPLIED'), true);
});

test('package audit works through the package source resolver', async () => {
  const result = await auditRankedPatternWorkbookForAdmin(
    { sourcePath: leadershipWorkbookPath },
    {
      async requireAdminUser() {
        return adminUser() as never;
      },
    },
  );

  assert.equal(result.status, 'ready');
  assert.equal(result.source.sourceHash?.length, 64);
  assert.equal(result.packageMetadata?.assessmentKey, 'leadership-approach');
  assert.equal(result.packageMetadata?.version, '1.00-test');
  assert.equal(result.blockingDiagnostics.length, 0);
});

test('dry-run import works through the package source resolver without database writes', async () => {
  let getDbPoolCalls = 0;
  const result = await dryRunRankedPatternImportForAdmin(
    { sourcePath: 'leadership-approach' },
    {
      async requireAdminUser() {
        return adminUser() as never;
      },
      getDbPool() {
        getDbPoolCalls += 1;
        throw new Error('SHOULD_NOT_REQUEST_DB');
      },
    },
  );

  assert.equal(getDbPoolCalls, 0);
  assert.equal(result.status, 'ready');
  assert.equal(result.source.sourceHash?.length, 64);
  assert.equal(result.source.sourceName, 'sonartra_reader_first_import_schema_LEADERSHIP_APPROACH_TEST.xlsx');
  assert.equal(result.runtimeDefinitionPlanSummary?.operationCountsByTable.questions, 16);
  assert.equal(result.resultLanguagePlanSummary?.operationCountsByTable.assessment_result_language_rows, 713);
});

test('apply workflow aborts before persistence when workbook audit has blocking diagnostics', async () => {
  let persistCalls = 0;
  const result = await applyRankedPatternImportForAdmin(
    { parsedWorkbook },
    {
      async requireAdminUser() {
        return adminUser() as never;
      },
      auditParsedWorkbook() {
        return fakeAudit(false, [blockingDiagnostic]) as never;
      },
      async persistRuntimeDefinition() {
        persistCalls += 1;
        throw new Error('SHOULD_NOT_PERSIST');
      },
      async persistResultLanguage() {
        persistCalls += 1;
        throw new Error('SHOULD_NOT_PERSIST');
      },
    },
  );

  assert.equal(persistCalls, 0);
  assert.equal(result.status, 'blocked');
  assert.equal(result.createdOrUpdatedIds.assessmentVersionId, null);
});

test('apply workflow writes runtime definition before result language and never publishes', async () => {
  const calls: string[] = [];
  const result = await applyRankedPatternImportForAdmin(
    { parsedWorkbook, targetAssessmentId: 'assessment-1', targetAssessmentVersionId: 'version-1' },
    {
      async requireAdminUser() {
        calls.push('guard');
        return adminUser() as never;
      },
      getDbPool() {
        calls.push('pool');
        return {
          async connect() {
            return {
              async query() {
                throw new Error('TARGET_QUERY_SHOULD_BE_MOCKED');
              },
              release() {},
            };
          },
        } as never;
      },
      auditParsedWorkbook() {
        calls.push('audit-workbook');
        return fakeAudit(true) as never;
      },
      async validateImportTarget(input) {
        calls.push('validate-target');
        assert.equal(input.targetAssessmentVersionId, 'version-1');
        assert.equal(input.targetAssessmentId, 'assessment-1');
        return { summary: null, diagnostics: Object.freeze([]) };
      },
      async persistRuntimeDefinition(input) {
        calls.push('persist-runtime');
        assert.equal(input.dryRun, false);
        return runtimeResult({
          dryRun: false,
          assessmentId: 'assessment-1',
          assessmentVersionId: 'version-1',
          countsByTable: Object.freeze({ ...runtimeCounts, assessments: 1, assessment_versions: 1 }),
        }) as never;
      },
      async persistResultLanguage(input) {
        calls.push('persist-result-language');
        assert.equal(input.dryRun, false);
        assert.equal(input.assessmentVersionId, 'version-1');
        return resultLanguageResult({
          dryRun: false,
          countsByTable: Object.freeze({
            ...resultLanguageCounts,
            assessment_result_language_rows: 10,
            assessment_report_preview_cases: 1,
          }),
        }) as never;
      },
      async auditAssessmentVersion() {
        calls.push('publish-audit');
        throw new Error('SHOULD_NOT_PUBLISH_AUDIT_DURING_APPLY');
      },
    },
  );

  assert.deepEqual(calls, ['guard', 'audit-workbook', 'pool', 'validate-target', 'persist-runtime', 'persist-result-language']);
  assert.equal(result.status, 'applied');
  assert.equal(result.createdOrUpdatedIds.assessmentId, 'assessment-1');
  assert.equal(result.createdOrUpdatedIds.assessmentVersionId, 'version-1');
});

test('apply workflow rejects missing target draft version before persistence', async () => {
  let persistCalls = 0;
  const result = await applyRankedPatternImportForAdmin(
    { parsedWorkbook },
    {
      async requireAdminUser() {
        return adminUser() as never;
      },
      getDbPool() {
        return {
          async connect() {
            return {
              async query() {
                throw new Error('TARGET_QUERY_SHOULD_BE_MOCKED');
              },
              release() {},
            };
          },
        } as never;
      },
      auditParsedWorkbook() {
        return fakeAudit(true) as never;
      },
      async validateImportTarget() {
        return {
          summary: null,
          diagnostics: Object.freeze([
            {
              severity: 'error' as const,
              code: 'MISSING_TARGET_DRAFT_VERSION',
              message: 'Apply import requires an explicit target draft assessment version.',
            },
          ]),
        };
      },
      async persistRuntimeDefinition() {
        persistCalls += 1;
        throw new Error('SHOULD_NOT_PERSIST');
      },
      async persistResultLanguage() {
        persistCalls += 1;
        throw new Error('SHOULD_NOT_PERSIST');
      },
    },
  );

  assert.equal(persistCalls, 0);
  assert.equal(result.status, 'blocked');
  assert.equal(result.blockingDiagnostics[0]?.code, 'MISSING_TARGET_DRAFT_VERSION');
});

test('publish audit workflow is read-only and releases the database client', async () => {
  let released = false;
  const result = await auditRankedPatternPublishReadinessForAdmin(
    { targetAssessmentVersionId: 'version-1' },
    {
      async requireAdminUser() {
        return adminUser() as never;
      },
      getDbPool() {
        return {
          async connect() {
            return {
              async query() {
                throw new Error('QUERY_SHOULD_BE_MOCKED_BY_AUDITOR');
              },
              release() {
                released = true;
              },
            };
          },
        } as never;
      },
      async auditAssessmentVersion(input) {
        assert.equal(input.assessmentVersionId, 'version-1');
        return {
          assessmentVersionId: 'version-1',
          canPublish: true,
          blockingCount: 0,
          warningCount: 0,
          findings: Object.freeze([]),
          summaryCountsByCategory: Object.freeze({}) as never,
        };
      },
    },
  );

  assert.equal(result.canPublish, true);
  assert.equal(released, true);
});

test('publish gating helper returns blocking diagnostics without changing lifecycle status', async () => {
  const result = await requireRankedPatternPublishableForAdmin(
    { targetAssessmentVersionId: 'version-1' },
    {
      async requireAdminUser() {
        return adminUser() as never;
      },
      getDbPool() {
        return {
          async connect() {
            return {
              async query() {
                return { rows: [] };
              },
              release() {},
            };
          },
        } as never;
      },
      async auditAssessmentVersion() {
        return {
          assessmentVersionId: 'version-1',
          canPublish: false,
          blockingCount: 1,
          warningCount: 0,
          findings: Object.freeze([
            {
              severity: 'blocking',
              code: 'MISSING_PREVIEW_CASE',
              message: 'At least one preview case is required.',
              category: 'preview_cases',
            },
          ]),
          summaryCountsByCategory: Object.freeze({}) as never,
        };
      },
    },
  );

  assert.equal(result.canPublish, false);
  assert.deepEqual(result.blockingDiagnostics, [
    {
      severity: 'error',
      code: 'MISSING_PREVIEW_CASE',
      message: 'At least one preview case is required.',
    },
  ]);
});

test('workflow rejects missing admin context before parsing or persistence', async () => {
  let parsed = false;
  await assert.rejects(
    auditRankedPatternWorkbookForAdmin(
      { sourcePath: 'ranked-pattern.xlsx' },
      {
        async requireAdminUser() {
          throw new Error('NOT_ADMIN');
        },
        parseWorkbookFile() {
          parsed = true;
          return parsedWorkbook;
        },
      },
    ),
    /NOT_ADMIN/,
  );

  assert.equal(parsed, false);
});

test('server action returns diagnostics from the guarded audit workflow', async () => {
  const formData = new FormData();
  formData.set('sourcePath', 'ranked-pattern.xlsx');
  const result = await auditRankedPatternPackageActionWithDependencies(
    { targetAssessmentVersionId: 'version-1' },
    formData,
    {
      async auditWorkbook(input) {
        assert.equal(input.sourcePath, 'ranked-pattern.xlsx');
        return {
          status: 'blocked',
          source: {
            sourceName: 'ranked-pattern.xlsx',
            sourceHash: null,
            workbookName: 'ranked-pattern.xlsx',
            sourcePath: 'ranked-pattern.xlsx',
            parsedAt: '2026-05-07T00:00:00.000Z',
          },
          workbookAuditSummary: {
            pass: false,
            detectedSheets: [],
            missingSheets: [],
            unexpectedSheets: [],
            diagnosticCounts: { error: 1, warning: 0 },
            normalisationDiagnosticCounts: { error: 0, warning: 0 },
          },
          normalisationDiagnostics: [],
          blockingDiagnostics: [blockingDiagnostic],
          warningDiagnostics: [],
          createdOrUpdatedIds: { assessmentId: null, assessmentVersionId: 'version-1', importBatchId: null },
          countsByStorageTarget: {
            workbookRowsByStorageTarget: { bySheet: {} as never, runtimeDefinition: 0, runtimeResultContent: 0, adminImportSupport: 0 },
            normalisedRowsByStorageTarget: { runtimeDefinition: 0, runtimeResultContent: 0, adminImportSupport: 0 },
          },
        };
      },
      async dryRunImport() {
        throw new Error('SHOULD_NOT_DRY_RUN');
      },
      async applyImport() {
        throw new Error('SHOULD_NOT_APPLY');
      },
      async auditPublishReadiness() {
        throw new Error('SHOULD_NOT_PUBLISH_AUDIT');
      },
    },
  );

  assert.equal(result.formError, null);
  assert.equal(result.ok, true);
  assert.deepEqual(result.fieldErrors, {});
  assert.equal(result.result?.blockingDiagnostics[0]?.code, 'MISSING_REQUIRED_FIELD');
});

test('server action returns inline field error when workbook source is missing', async () => {
  const result = await applyRankedPatternImportActionWithDependencies(
    { targetAssessmentVersionId: 'version-1' },
    new FormData(),
    actionDependencies(),
  );

  assert.equal(result.ok, false);
  assert.match(result.formError ?? '', /Upload a ranked-pattern workbook/);
  assert.equal(result.fieldErrors.sourcePath, 'Workbook file path or package reference is required.');
});

test('dry-run server action does not call apply persistence', async () => {
  const formData = new FormData();
  formData.set('sourcePath', 'ranked-pattern.xlsx');
  let dryRunCalled = false;
  const result = await dryRunRankedPatternImportActionWithDependencies(
    {},
    formData,
    {
      async auditWorkbook() {
        throw new Error('SHOULD_NOT_AUDIT_ONLY');
      },
      async dryRunImport() {
        dryRunCalled = true;
        return {
          status: 'ready',
          source: {
            sourceName: 'ranked-pattern.xlsx',
            sourceHash: null,
            workbookName: 'ranked-pattern.xlsx',
            sourcePath: 'ranked-pattern.xlsx',
            parsedAt: '2026-05-07T00:00:00.000Z',
          },
          workbookAuditSummary: {
            pass: true,
            detectedSheets: [],
            missingSheets: [],
            unexpectedSheets: [],
            diagnosticCounts: { error: 0, warning: 0 },
            normalisationDiagnosticCounts: { error: 0, warning: 0 },
          },
          normalisationDiagnostics: [],
          blockingDiagnostics: [],
          warningDiagnostics: [],
          createdOrUpdatedIds: { assessmentId: null, assessmentVersionId: null, importBatchId: null },
          countsByStorageTarget: {
            workbookRowsByStorageTarget: { bySheet: {} as never, runtimeDefinition: 0, runtimeResultContent: 0, adminImportSupport: 0 },
            normalisedRowsByStorageTarget: { runtimeDefinition: 0, runtimeResultContent: 0, adminImportSupport: 0 },
          },
        };
      },
      async applyImport() {
        throw new Error('SHOULD_NOT_APPLY');
      },
      async auditPublishReadiness() {
        throw new Error('SHOULD_NOT_PUBLISH_AUDIT');
      },
    },
  );

  assert.equal(dryRunCalled, true);
  assert.equal(result.ok, true);
  assert.equal(result.result?.status, 'ready');
});

function actionDependencies(overrides: Record<string, unknown> = {}) {
  return {
    async requireAdminUser() {
      return adminUser() as never;
    },
    async auditWorkbook() {
      throw new Error('SHOULD_NOT_AUDIT');
    },
    async dryRunImport() {
      throw new Error('SHOULD_NOT_DRY_RUN');
    },
    async applyImport() {
      throw new Error('SHOULD_NOT_APPLY');
    },
    async auditPublishReadiness() {
      throw new Error('SHOULD_NOT_AUDIT_PUBLISH');
    },
    ...overrides,
  } as never;
}

function uploadedReference(overrides: Partial<RankedPatternWorkbookStorageReference> = {}): RankedPatternWorkbookStorageReference {
  return {
    sourceKind: 'storage_object',
    bucket: 'assessment-import-packages',
    objectPath: '2026/05/test.xlsx',
    originalFileName: 'test.xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    sizeBytes: 123,
    sourceHash: 'a'.repeat(64),
    ...overrides,
  };
}

test('workbook upload server action returns safe private storage metadata without public URL', async () => {
  const formData = new FormData();
  formData.set('workbookFile', new File([new Uint8Array([1, 2, 3])], 'test.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }));

  const result = await uploadRankedPatternWorkbookPackageActionWithDependencies(
    formData,
    actionDependencies({
      async uploadWorkbook(input: { originalFileName?: string | null }) {
        assert.equal(input.originalFileName, 'test.xlsx');
        return {
          ok: true,
          storageReference: uploadedReference(),
          diagnostics: [],
        };
      },
      signStorageReference(reference: RankedPatternWorkbookStorageReference) {
        return { storageReference: reference, token: 'signed-storage-reference' };
      },
    }),
  );

  assert.equal(result.ok, true);
  assert.equal(result.result?.fileName, 'test.xlsx');
  assert.equal(result.result?.shortSourceHash, 'aaaaaaaaaaaa');
  assert.equal(result.result?.safeObjectPath, 'assessment-import-packages/2026/05/test.xlsx');
  assert.equal(result.result?.storageReferenceToken, 'signed-storage-reference');
  assert.equal(JSON.stringify(result).includes('publicUrl'), false);
});

test('workbook upload server action rejects missing file and upload validation failures', async () => {
  const missing = await uploadRankedPatternWorkbookPackageActionWithDependencies(new FormData(), actionDependencies());
  const nonXlsxForm = new FormData();
  nonXlsxForm.set('workbookFile', new File(['bad'], 'bad.csv', { type: 'text/csv' }));
  const nonXlsx = await uploadRankedPatternWorkbookPackageActionWithDependencies(
    nonXlsxForm,
    actionDependencies({
      async uploadWorkbook() {
        return {
          ok: false,
          storageReference: null,
          diagnostics: [
            {
              severity: 'error',
              code: 'UNSUPPORTED_WORKBOOK_EXTENSION',
              message: 'Ranked-pattern workbook uploads must be .xlsx files.',
              fieldKey: 'file',
            },
          ],
        };
      },
    }),
  );
  const oversizedForm = new FormData();
  oversizedForm.set('workbookFile', new File(['too-large'], 'large.xlsx'));
  const oversized = await uploadRankedPatternWorkbookPackageActionWithDependencies(
    oversizedForm,
    actionDependencies({
      async uploadWorkbook() {
        return {
          ok: false,
          storageReference: null,
          diagnostics: [
            {
              severity: 'error',
              code: 'WORKBOOK_FILE_TOO_LARGE',
              message: 'Ranked-pattern workbook upload exceeds the configured size limit.',
              fieldKey: 'file',
            },
          ],
        };
      },
    }),
  );

  assert.equal(missing.ok, false);
  assert.equal(missing.fieldErrors.workbookFile, 'A .xlsx workbook file is required.');
  assert.equal(nonXlsx.ok, false);
  assert.equal(nonXlsx.fieldErrors.workbookFile, 'Ranked-pattern workbook uploads must be .xlsx files.');
  assert.equal(oversized.ok, false);
  assert.equal(oversized.fieldErrors.workbookFile, 'Ranked-pattern workbook upload exceeds the configured size limit.');
});

test('workflow server action audits uploaded storage reference after token verification', async () => {
  const formData = new FormData();
  formData.set('storageReferenceToken', 'signed-storage-reference');
  const result = await auditRankedPatternPackageActionWithDependencies(
    {},
    formData,
    actionDependencies({
      verifyStorageReferenceToken(token: string) {
        assert.equal(token, 'signed-storage-reference');
        return uploadedReference();
      },
      async auditWorkbook(input: { storageReference?: RankedPatternWorkbookStorageReference }) {
        assert.equal(input.storageReference?.sourceKind, 'storage_object');
        return {
          status: 'ready',
          source: {
            sourceName: 'test.xlsx',
            sourceHash: 'a'.repeat(64),
            workbookName: 'test.xlsx',
            sourcePath: null,
            parsedAt: '2026-05-07T00:00:00.000Z',
          },
          workbookAuditSummary: {
            pass: true,
            detectedSheets: [],
            missingSheets: [],
            unexpectedSheets: [],
            diagnosticCounts: { error: 0, warning: 0 },
            normalisationDiagnosticCounts: { error: 0, warning: 0 },
          },
          normalisationDiagnostics: [],
          blockingDiagnostics: [],
          warningDiagnostics: [],
          createdOrUpdatedIds: { assessmentId: null, assessmentVersionId: null, importBatchId: null },
          countsByStorageTarget: {
            workbookRowsByStorageTarget: { bySheet: {} as never, runtimeDefinition: 0, runtimeResultContent: 0, adminImportSupport: 0 },
            normalisedRowsByStorageTarget: { runtimeDefinition: 0, runtimeResultContent: 0, adminImportSupport: 0 },
          },
        };
      },
    }),
  );

  assert.equal(result.ok, true);
  assert.equal(result.result?.source.sourcePath, null);
  assert.equal(result.result?.source.sourceHash, 'a'.repeat(64));
});

test('workflow server action rejects tampered uploaded storage reference token inline', async () => {
  const formData = new FormData();
  formData.set('storageReferenceToken', 'tampered');
  const result = await auditRankedPatternPackageActionWithDependencies(
    {},
    formData,
    actionDependencies({
      verifyStorageReferenceToken() {
        return null;
      },
    }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.fieldErrors.storageReferenceToken, 'Uploaded workbook reference is invalid or expired.');
});

test('create draft server action returns structured success', async () => {
  const result = await createRankedPatternDraftVersionActionWithDependencies(
    { assessmentKey: 'decision-style' },
    actionDependencies({
      async createDraftVersion(input: { assessmentKeyOrId: string }) {
        assert.equal(input.assessmentKeyOrId, 'decision-style');
        return {
          status: 'created',
          assessmentId: 'assessment-1',
          assessmentKey: 'decision-style',
          draftVersionId: 'version-2',
          draftVersionTag: '2.00',
          sourceVersionTag: '1.00',
          lifecycleStatus: 'DRAFT',
          mode: 'single_domain',
          resultModelKey: 'ranked_pattern',
          copied: {},
          diagnostics: [],
        };
      },
    }),
  );

  assert.equal(result.formError, null);
  assert.equal(result.ok, true);
  assert.match(result.formSuccess ?? '', /Draft 2\.00/);
  assert.equal(result.result?.status, 'created');
});

test('create draft server action returns structured existing-draft blocker', async () => {
  const result = await createRankedPatternDraftVersionActionWithDependencies(
    { assessmentKey: 'decision-style' },
    actionDependencies({
      async createDraftVersion(input: { assessmentKeyOrId: string }) {
        assert.equal(input.assessmentKeyOrId, 'decision-style');
        return {
          status: 'blocked',
          assessmentId: 'assessment-1',
          assessmentKey: 'decision-style',
          draftVersionId: 'version-2',
          draftVersionTag: '2.00',
          diagnostics: [
            {
              severity: 'error',
              code: 'DRAFT_VERSION_ALREADY_EXISTS',
              message: 'A draft version already exists. Continue authoring that draft before creating another one.',
            },
          ],
        };
      },
    }),
  );

  assert.equal(result.ok, false);
  assert.match(result.formError ?? '', /draft version already exists/i);
  assert.equal(result.result?.status, 'blocked');
  assert.equal(result.result?.draftVersionId, 'version-2');
});

test('package-first draft server action validates missing workbook source inline', async () => {
  const result = await createRankedPatternPackageDraftVersionActionWithDependencies(
    { assessmentKey: '' },
    new FormData(),
    actionDependencies(),
  );

  assert.equal(result.ok, false);
  assert.equal(result.fieldErrors.sourcePath, 'Workbook file path or package reference is required.');
  assert.match(result.formError ?? '', /Upload a ranked-pattern workbook/);
});

test('package-first draft server action returns resolved draft target from metadata workflow', async () => {
  const formData = new FormData();
  formData.set('sourcePath', 'leadership-approach.xlsx');
  const result = await createRankedPatternPackageDraftVersionActionWithDependencies(
    { assessmentKey: '' },
    formData,
    actionDependencies({
      async createPackageDraftVersion(input: { sourcePath: string }) {
        assert.equal(input.sourcePath, 'leadership-approach.xlsx');
        return {
          status: 'resolved',
          assessmentId: 'assessment-1',
          assessmentKey: 'leadership-approach',
          draftVersionId: 'version-2',
          draftVersionTag: '1.00-test',
          lifecycleStatus: 'DRAFT',
          mode: 'single_domain',
          resultModelKey: 'ranked_pattern',
          diagnostics: [],
        };
      },
    }),
  );

  assert.equal(result.ok, true);
  assert.match(result.formSuccess ?? '', /Draft 1\.00-test was resolved from package metadata/);
  assert.equal(result.result?.status, 'resolved');
  assert.equal(result.result?.assessmentKey, 'leadership-approach');
});

test('publish audit server action returns structured draft-version validation errors', async () => {
  const result = await auditRankedPatternPublishReadinessActionWithDependencies(
    { targetAssessmentVersionId: '' },
    actionDependencies(),
  );

  assert.equal(result.ok, false);
  assert.match(result.formError ?? '', /No target draft version is available/);
  assert.equal(result.fieldErrors.targetAssessmentVersionId, 'Publish audit requires an editable draft version.');
});

test('publish server action blocks with publish-audit diagnostics', async () => {
  const result = await publishRankedPatternVersionActionWithDependencies(
    { assessmentKey: 'decision-style', targetAssessmentVersionId: 'version-2' },
    actionDependencies({
      async publishVersion(input: { targetAssessmentVersionId: string }) {
        assert.equal(input.targetAssessmentVersionId, 'version-2');
        return {
          status: 'blocked',
          assessmentVersionId: 'version-2',
          versionSummary: null,
          publishAudit: null,
          blockingDiagnostics: [
            {
              severity: 'error',
              code: 'MISSING_RANKED_PATTERNS',
              message: 'Exactly twenty-four ranked patterns are required.',
            },
          ],
          warningDiagnostics: [],
        };
      },
    }),
  );

  assert.match(result.formError ?? '', /twenty-four ranked patterns/);
  assert.equal(result.ok, false);
  assert.equal(result.result?.status, 'blocked');
});

test('publish server action returns structured success only after service publish succeeds', async () => {
  const result = await publishRankedPatternVersionActionWithDependencies(
    { assessmentKey: 'decision-style', targetAssessmentVersionId: 'version-2' },
    actionDependencies({
      async publishVersion() {
        return {
          status: 'published',
          assessmentId: 'assessment-1',
          assessmentKey: 'decision-style',
          publishedVersionId: 'version-2',
          publishedVersionTag: '2.00',
          archivedVersionIds: ['version-1'],
          publishAudit: {
            assessmentVersionId: 'version-2',
            canPublish: true,
            blockingCount: 0,
            warningCount: 0,
            findings: [],
            summaryCountsByCategory: {},
          },
          warningDiagnostics: [],
        };
      },
    }),
  );

  assert.equal(result.formError, null);
  assert.equal(result.ok, true);
  assert.match(result.formSuccess ?? '', /active ranked-pattern version for new attempts/);
  assert.equal(result.result?.status, 'published');
});
