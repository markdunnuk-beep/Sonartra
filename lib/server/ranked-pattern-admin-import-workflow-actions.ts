'use server';

import { revalidatePath } from 'next/cache';

import {
  applyRankedPatternImportForAdmin,
  auditRankedPatternPublishReadinessForAdmin,
  auditRankedPatternWorkbookForAdmin,
  createOrResolveRankedPatternPackageDraftForAdmin,
  dryRunRankedPatternImportForAdmin,
} from '@/lib/server/ranked-pattern-admin-import-workflow';
import { getDbPool } from '@/lib/server/db';
import {
  importReportFirstTemplateRows,
  promoteReportFirstTemplatesForPublish,
} from '@/lib/server/report-first-template-import';
import { requireAdminUser } from '@/lib/server/admin-access';
import {
  createRankedPatternDraftVersion,
  publishRankedPatternAssessmentVersion,
} from '@/lib/server/ranked-pattern-admin-versioning';
import type {
  RankedPatternAdminImportActionState,
  RankedPatternDraftVersionActionState,
  RankedPatternPublishAuditActionState,
  RankedPatternPublishVersionActionState,
  RankedPatternWorkbookUploadActionState,
  ReportFirstTemplateImportActionState,
  ReportFirstTemplatePromotionActionState,
} from '@/lib/server/ranked-pattern-admin-import-workflow-action-state';
import {
  signRankedPatternWorkbookStorageReference,
  uploadRankedPatternWorkbookPackage,
  verifyRankedPatternWorkbookStorageReferenceToken,
} from '@/lib/server/ranked-pattern-workbook-storage';

type RankedPatternAdminImportActionContext = {
  readonly targetAssessmentId?: string;
  readonly targetAssessmentVersionId?: string;
};

type RankedPatternVersionActionContext = {
  readonly assessmentKey: string;
  readonly targetAssessmentVersionId?: string;
};

type ReportFirstTemplateImportActionContext = {
  readonly assessmentKey: string;
  readonly targetAssessmentVersionId?: string;
};

type RankedPatternAdminImportActionDependencies = {
  readonly requireAdminUser?: typeof requireAdminUser;
  readonly uploadWorkbook?: typeof uploadRankedPatternWorkbookPackage;
  readonly signStorageReference?: typeof signRankedPatternWorkbookStorageReference;
  readonly verifyStorageReferenceToken?: typeof verifyRankedPatternWorkbookStorageReferenceToken;
  readonly auditWorkbook: typeof auditRankedPatternWorkbookForAdmin;
  readonly dryRunImport: typeof dryRunRankedPatternImportForAdmin;
  readonly applyImport: typeof applyRankedPatternImportForAdmin;
  readonly auditPublishReadiness: typeof auditRankedPatternPublishReadinessForAdmin;
  readonly createDraftVersion?: typeof createRankedPatternDraftVersion;
  readonly createPackageDraftVersion?: typeof createOrResolveRankedPatternPackageDraftForAdmin;
  readonly publishVersion?: typeof publishRankedPatternAssessmentVersion;
  readonly importReportFirstTemplates?: typeof importReportFirstTemplateRows;
  readonly promoteReportFirstTemplates?: typeof promoteReportFirstTemplatesForPublish;
  readonly getDbPool?: typeof getDbPool;
  readonly revalidatePath?: typeof revalidatePath;
};

const defaultDependencies: RankedPatternAdminImportActionDependencies = {
  requireAdminUser,
  uploadWorkbook: uploadRankedPatternWorkbookPackage,
  signStorageReference: signRankedPatternWorkbookStorageReference,
  verifyStorageReferenceToken: verifyRankedPatternWorkbookStorageReferenceToken,
  auditWorkbook: auditRankedPatternWorkbookForAdmin,
  dryRunImport: dryRunRankedPatternImportForAdmin,
  applyImport: applyRankedPatternImportForAdmin,
  auditPublishReadiness: auditRankedPatternPublishReadinessForAdmin,
  createDraftVersion: createRankedPatternDraftVersion,
  createPackageDraftVersion: createOrResolveRankedPatternPackageDraftForAdmin,
  publishVersion: publishRankedPatternAssessmentVersion,
  importReportFirstTemplates: importReportFirstTemplateRows,
  promoteReportFirstTemplates: promoteReportFirstTemplatesForPublish,
  getDbPool,
  revalidatePath,
};

function actionInputFromFormData(
  context: RankedPatternAdminImportActionContext,
  formData: FormData,
  dependencies: Pick<RankedPatternAdminImportActionDependencies, 'verifyStorageReferenceToken'> = defaultDependencies,
) {
  const sourcePath = String(formData.get('sourcePath') ?? '').trim();
  const sourceName = String(formData.get('sourceName') ?? '').trim();
  const sourceHash = String(formData.get('sourceHash') ?? '').trim();
  const storageReferenceToken = String(formData.get('storageReferenceToken') ?? '').trim();
  const storageReference = storageReferenceToken
    ? dependencies.verifyStorageReferenceToken?.(storageReferenceToken) ?? null
    : null;

  return {
    sourcePath,
    sourceName: sourceName || undefined,
    sourceHash: sourceHash || undefined,
    storageReference: storageReference ?? undefined,
    storageReferenceToken,
    targetAssessmentId: String(formData.get('targetAssessmentId') ?? '').trim() || context.targetAssessmentId,
    targetAssessmentVersionId:
      String(formData.get('targetAssessmentVersionId') ?? '').trim() || context.targetAssessmentVersionId,
  };
}

function missingSourcePathState(): RankedPatternAdminImportActionState {
  const message =
    'Upload a ranked-pattern workbook or provide a local/admin package reference.';
  return {
    ok: false,
    message,
    formError: message,
    fieldErrors: {
      sourcePath: 'Workbook file path or package reference is required.',
    },
    result: null,
  };
}

function invalidStorageReferenceState(): RankedPatternAdminImportActionState {
  const message =
    'The uploaded workbook reference is no longer valid. Upload the workbook again before running this action.';
  return {
    ok: false,
    message,
    formError: message,
    fieldErrors: {
      storageReferenceToken: 'Uploaded workbook reference is invalid or expired. The token contents were not accepted.',
    },
    result: null,
  };
}

function safeImportErrorState(): RankedPatternAdminImportActionState {
  const message =
    'The ranked-pattern package workflow could not run. Check the selected package source and try again.';
  return {
    ok: false,
    message,
    formError: message,
    fieldErrors: {},
    result: null,
  };
}

function revalidateAssessmentAdminPaths(
  assessmentKey: string,
  dependencies: Pick<RankedPatternAdminImportActionDependencies, 'revalidatePath'>,
): void {
  dependencies.revalidatePath?.('/admin/assessments');
  dependencies.revalidatePath?.(`/admin/assessments/${assessmentKey}`);
}

function storageActorId(userId: string): string | null {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)
    ? userId
    : null;
}

export async function auditRankedPatternPackageAction(
  context: RankedPatternAdminImportActionContext,
  _previousState: RankedPatternAdminImportActionState,
  formData: FormData,
): Promise<RankedPatternAdminImportActionState> {
  return auditRankedPatternPackageActionWithDependencies(context, formData, defaultDependencies);
}

export async function dryRunRankedPatternImportAction(
  context: RankedPatternAdminImportActionContext,
  _previousState: RankedPatternAdminImportActionState,
  formData: FormData,
): Promise<RankedPatternAdminImportActionState> {
  return dryRunRankedPatternImportActionWithDependencies(context, formData, defaultDependencies);
}

export async function applyRankedPatternImportAction(
  context: RankedPatternAdminImportActionContext,
  _previousState: RankedPatternAdminImportActionState,
  formData: FormData,
): Promise<RankedPatternAdminImportActionState> {
  return applyRankedPatternImportActionWithDependencies(context, formData, defaultDependencies);
}

export async function auditRankedPatternPublishReadinessAction(
  context: Required<Pick<RankedPatternAdminImportActionContext, 'targetAssessmentVersionId'>>,
  _previousState: RankedPatternPublishAuditActionState,
  _formData: FormData,
): Promise<RankedPatternPublishAuditActionState> {
  return auditRankedPatternPublishReadinessActionWithDependencies(context, defaultDependencies);
}

export async function createRankedPatternDraftVersionAction(
  context: RankedPatternVersionActionContext,
  _previousState: RankedPatternDraftVersionActionState,
  _formData: FormData,
): Promise<RankedPatternDraftVersionActionState> {
  return createRankedPatternDraftVersionActionWithDependencies(context, defaultDependencies);
}

export async function createRankedPatternPackageDraftVersionAction(
  context: RankedPatternVersionActionContext,
  _previousState: RankedPatternDraftVersionActionState,
  formData: FormData,
): Promise<RankedPatternDraftVersionActionState> {
  return createRankedPatternPackageDraftVersionActionWithDependencies(context, formData, defaultDependencies);
}

export async function publishRankedPatternVersionAction(
  context: RankedPatternVersionActionContext,
  _previousState: RankedPatternPublishVersionActionState,
  _formData: FormData,
): Promise<RankedPatternPublishVersionActionState> {
  return publishRankedPatternVersionActionWithDependencies(context, defaultDependencies);
}

export async function uploadRankedPatternWorkbookPackageAction(
  _previousState: RankedPatternWorkbookUploadActionState,
  formData: FormData,
): Promise<RankedPatternWorkbookUploadActionState> {
  return uploadRankedPatternWorkbookPackageActionWithDependencies(formData, defaultDependencies);
}

export async function importReportFirstTemplatesAction(
  context: ReportFirstTemplateImportActionContext,
  _previousState: ReportFirstTemplateImportActionState,
  _formData: FormData,
): Promise<ReportFirstTemplateImportActionState> {
  return importReportFirstTemplatesActionWithDependencies(context, defaultDependencies);
}

export async function promoteReportFirstTemplatesAction(
  context: ReportFirstTemplateImportActionContext,
  _previousState: ReportFirstTemplatePromotionActionState,
  _formData: FormData,
): Promise<ReportFirstTemplatePromotionActionState> {
  return promoteReportFirstTemplatesActionWithDependencies(context, defaultDependencies);
}

export async function importReportFirstTemplatesActionWithDependencies(
  context: ReportFirstTemplateImportActionContext,
  dependencies: RankedPatternAdminImportActionDependencies,
): Promise<ReportFirstTemplateImportActionState> {
  const targetAssessmentVersionId = context.targetAssessmentVersionId?.trim() ?? '';
  if (!targetAssessmentVersionId) {
    const message = 'Create or open a draft version before importing report-first templates.';
    return {
      ok: false,
      message,
      formError: message,
      formSuccess: null,
      fieldErrors: {
        targetAssessmentVersionId: 'Report-first template import requires an editable draft version.',
      },
      result: null,
    };
  }

  try {
    const requireAdmin = dependencies.requireAdminUser ?? requireAdminUser;
    const adminUser = await requireAdmin();
    const importTemplates = dependencies.importReportFirstTemplates ?? importReportFirstTemplateRows;
    const result = await importTemplates({
      db: (dependencies.getDbPool ?? getDbPool)(),
      assessmentKey: context.assessmentKey,
      assessmentVersionId: targetAssessmentVersionId,
      actorId: storageActorId(adminUser.userId),
      importBatchId: null,
    });

    dependencies.revalidatePath?.(`/admin/assessments/ranked-pattern/${context.assessmentKey}/workflow`);
    dependencies.revalidatePath?.(`/admin/assessments/ranked-pattern/${context.assessmentKey}/workflow/report-first-preview`);

    const coverageCopy = result.publishableFullCoverage
      ? 'Generated report-first coverage is complete; publish audit still checks active DB template rows.'
      : `${result.missingTemplateCount} report-first templates are still missing, so publish remains blocked.`;

    return {
      ok: true,
      message: `Imported ${result.importedTemplateCount} report-first template rows. ${coverageCopy}`,
      formError: null,
      formSuccess: `Imported ${result.importedTemplateCount} report-first template rows. ${coverageCopy}`,
      fieldErrors: {},
      result,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : 'Report-first template import could not run. Check the draft version and generated artifact, then try again.';
    return {
      ok: false,
      message,
      formError: message,
      formSuccess: null,
      fieldErrors: {},
      result: null,
    };
  }
}

export async function promoteReportFirstTemplatesActionWithDependencies(
  context: ReportFirstTemplateImportActionContext,
  dependencies: RankedPatternAdminImportActionDependencies,
): Promise<ReportFirstTemplatePromotionActionState> {
  const targetAssessmentVersionId = context.targetAssessmentVersionId?.trim() ?? '';
  if (!targetAssessmentVersionId) {
    const message = 'Create or open a draft version before preparing report-first templates for publish.';
    return {
      ok: false,
      message,
      formError: message,
      formSuccess: null,
      fieldErrors: {
        targetAssessmentVersionId: 'Report-first publish prep requires an editable draft version.',
      },
      result: null,
    };
  }

  try {
    const requireAdmin = dependencies.requireAdminUser ?? requireAdminUser;
    await requireAdmin();
    const promoteTemplates = dependencies.promoteReportFirstTemplates ?? promoteReportFirstTemplatesForPublish;
    const result = await promoteTemplates({
      db: (dependencies.getDbPool ?? getDbPool)(),
      assessmentVersionId: targetAssessmentVersionId,
    });

    dependencies.revalidatePath?.(`/admin/assessments/ranked-pattern/${context.assessmentKey}/workflow`);
    dependencies.revalidatePath?.(`/admin/assessments/ranked-pattern/${context.assessmentKey}/workflow/report-first-preview`);

    if (result.status === 'blocked') {
      const message =
        result.auditFindings[0]?.message ??
        'Report-first templates are not ready for publish prep. Import a complete, valid 24-template set first.';
      return {
        ok: false,
        message,
        formError: message,
        formSuccess: null,
        fieldErrors: {},
        result,
      };
    }

    const actionCopy = result.status === 'already_active'
      ? 'Report-first templates were already prepared for publish.'
      : `Prepared ${result.promotedTemplateCount} report-first templates for publish audit.`;
    const message = `${actionCopy} This does not publish the assessment.`;
    return {
      ok: true,
      message,
      formError: null,
      formSuccess: message,
      fieldErrors: {},
      result,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : 'Report-first template publish prep could not run. Check draft storage and try again.';
    return {
      ok: false,
      message,
      formError: message,
      formSuccess: null,
      fieldErrors: {},
      result: null,
    };
  }
}

export async function uploadRankedPatternWorkbookPackageActionWithDependencies(
  formData: FormData,
  dependencies: RankedPatternAdminImportActionDependencies,
): Promise<RankedPatternWorkbookUploadActionState> {
  try {
    const requireAdmin = dependencies.requireAdminUser ?? requireAdminUser;
    await requireAdmin();
  } catch {
    const message = 'Only admins can upload ranked-pattern workbook packages.';
    return {
      ok: false,
      message,
      formError: message,
      fieldErrors: {},
      result: null,
    };
  }

  const file = formData.get('workbookFile');
  if (!(file instanceof File)) {
    const message = 'Choose a .xlsx ranked-pattern workbook before uploading.';
    return {
      ok: false,
      message,
      formError: message,
      fieldErrors: {
        workbookFile: 'A .xlsx workbook file is required.',
      },
      result: null,
    };
  }

  try {
    const uploadWorkbook = dependencies.uploadWorkbook ?? uploadRankedPatternWorkbookPackage;
    const upload = await uploadWorkbook({
      bytes: await file.arrayBuffer(),
      originalFileName: file.name,
      contentType: file.type,
    });

    if (!upload.ok) {
      const message =
        upload.diagnostics[0]?.message ??
        'Workbook upload failed. Check the selected file and storage configuration.';
      return {
        ok: false,
        message,
        formError: message,
        fieldErrors: Object.fromEntries(
          upload.diagnostics
            .filter((diagnostic) => diagnostic.fieldKey)
            .map((diagnostic) => [diagnostic.fieldKey === 'file' ? 'workbookFile' : diagnostic.fieldKey, diagnostic.message]),
        ),
        result: null,
      };
    }

    const signStorageReference = dependencies.signStorageReference ?? signRankedPatternWorkbookStorageReference;
    const signed = signStorageReference(upload.storageReference);
    if (!signed) {
      const message =
        'Workbook upload succeeded, but the private storage reference could not be signed. Ask an administrator to check the signing configuration.';
      return {
        ok: false,
        message,
        formError: message,
        fieldErrors: {
          storageReferenceToken: 'Private workbook storage signing is not configured.',
        },
        result: null,
      };
    }

    return {
      ok: true,
      message: 'Workbook uploaded to private storage.',
      formError: null,
      fieldErrors: {},
      result: {
        storageReference: signed.storageReference,
        storageReferenceToken: signed.token,
        fileName: signed.storageReference.originalFileName,
        sizeBytes: signed.storageReference.sizeBytes,
        sourceHash: signed.storageReference.sourceHash,
        shortSourceHash: signed.storageReference.sourceHash.slice(0, 12),
        safeObjectPath: `${signed.storageReference.bucket}/${signed.storageReference.objectPath}`,
      },
    };
  } catch {
    const message =
      'Workbook upload could not run. Try again, or ask an administrator to check private workbook storage.';
    return {
      ok: false,
      message,
      formError: message,
      fieldErrors: {},
      result: null,
    };
  }
}

export async function auditRankedPatternPackageActionWithDependencies(
  context: RankedPatternAdminImportActionContext,
  formData: FormData,
  dependencies: RankedPatternAdminImportActionDependencies,
): Promise<RankedPatternAdminImportActionState> {
  const input = actionInputFromFormData(context, formData, dependencies);
  if (input.storageReferenceToken && !input.storageReference) {
    return invalidStorageReferenceState();
  }
  if (!input.sourcePath && !input.storageReference) {
    return missingSourcePathState();
  }

  try {
    return {
      ok: true,
      message: 'Package audit completed.',
      formError: null,
      fieldErrors: {},
      result: await dependencies.auditWorkbook(input),
    };
  } catch {
    return safeImportErrorState();
  }
}

export async function dryRunRankedPatternImportActionWithDependencies(
  context: RankedPatternAdminImportActionContext,
  formData: FormData,
  dependencies: RankedPatternAdminImportActionDependencies,
): Promise<RankedPatternAdminImportActionState> {
  const input = actionInputFromFormData(context, formData, dependencies);
  if (input.storageReferenceToken && !input.storageReference) {
    return invalidStorageReferenceState();
  }
  if (!input.sourcePath && !input.storageReference) {
    return missingSourcePathState();
  }

  try {
    return {
      ok: true,
      message: 'Dry-run import completed.',
      formError: null,
      fieldErrors: {},
      result: await dependencies.dryRunImport(input),
    };
  } catch {
    return safeImportErrorState();
  }
}

export async function applyRankedPatternImportActionWithDependencies(
  context: RankedPatternAdminImportActionContext,
  formData: FormData,
  dependencies: RankedPatternAdminImportActionDependencies,
): Promise<RankedPatternAdminImportActionState> {
  const input = actionInputFromFormData(context, formData, dependencies);
  if (input.storageReferenceToken && !input.storageReference) {
    return invalidStorageReferenceState();
  }
  if (!input.sourcePath && !input.storageReference) {
    return missingSourcePathState();
  }

  try {
    return {
      ok: true,
      message: 'Import apply completed.',
      formError: null,
      fieldErrors: {},
      result: await dependencies.applyImport(input),
    };
  } catch {
    return safeImportErrorState();
  }
}

export async function auditRankedPatternPublishReadinessActionWithDependencies(
  context: Required<Pick<RankedPatternAdminImportActionContext, 'targetAssessmentVersionId'>>,
  dependencies: RankedPatternAdminImportActionDependencies,
): Promise<RankedPatternPublishAuditActionState> {
  if (!context.targetAssessmentVersionId.trim()) {
    const message = 'No target draft version is available for publish audit. Create or open a draft first.';
    return {
      ok: false,
      message,
      formError: message,
      fieldErrors: {
        targetAssessmentVersionId: 'Publish audit requires an editable draft version.',
      },
      result: null,
    };
  }

  try {
    return {
      ok: true,
      message: 'Publish readiness audit completed.',
      formError: null,
      fieldErrors: {},
      result: await dependencies.auditPublishReadiness({
        targetAssessmentVersionId: context.targetAssessmentVersionId,
      }),
    };
  } catch {
    const message = 'Publish readiness audit could not run. Try again after refreshing the page.';
    return {
      ok: false,
      message,
      formError: message,
      fieldErrors: {},
      result: null,
    };
  }
}

export async function createRankedPatternDraftVersionActionWithDependencies(
  context: RankedPatternVersionActionContext,
  dependencies: RankedPatternAdminImportActionDependencies,
): Promise<RankedPatternDraftVersionActionState> {
  if (!context.assessmentKey.trim()) {
    const message = 'No assessment was supplied for draft creation.';
    return {
      ok: false,
      message,
      formError: message,
      formSuccess: null,
      fieldErrors: {
        assessmentKey: 'Assessment key is required.',
      },
      result: null,
    };
  }

  try {
    const createDraftVersionDependency = dependencies.createDraftVersion ?? createRankedPatternDraftVersion;
    const result = await createDraftVersionDependency({
      assessmentKeyOrId: context.assessmentKey,
    });

    if (result.status === 'created') {
      revalidateAssessmentAdminPaths(context.assessmentKey, dependencies);
      return {
        ok: true,
        message: `Draft ${result.draftVersionTag} was created for ranked-pattern import.`,
        formError: null,
        formSuccess: `Draft ${result.draftVersionTag} was created for ranked-pattern import.`,
        fieldErrors: {},
        result,
      };
    }

    const message = result.diagnostics[0]?.message ?? 'A ranked-pattern draft version could not be created.';
    return {
      ok: false,
      message,
      formError: message,
      formSuccess: null,
      fieldErrors: {},
      result,
    };
  } catch {
    const message = 'A ranked-pattern draft version could not be created. Try again after refreshing the page.';
    return {
      ok: false,
      message,
      formError: message,
      formSuccess: null,
      fieldErrors: {},
      result: null,
    };
  }
}

export async function createRankedPatternPackageDraftVersionActionWithDependencies(
  context: RankedPatternVersionActionContext,
  formData: FormData,
  dependencies: RankedPatternAdminImportActionDependencies,
): Promise<RankedPatternDraftVersionActionState> {
  const input = actionInputFromFormData({}, formData, dependencies);
  if (input.storageReferenceToken && !input.storageReference) {
    const message =
      'The uploaded workbook reference is no longer valid. Upload the workbook again before resolving a draft.';
    return {
      ok: false,
      message,
      formError: message,
      formSuccess: null,
      fieldErrors: {
        storageReferenceToken: 'Uploaded workbook reference is invalid or expired. The token contents were not accepted.',
      },
      result: null,
    };
  }
  if (!input.sourcePath && !input.storageReference) {
    const sourceState = missingSourcePathState();
    return {
      ok: false,
      message: sourceState.message,
      formError: sourceState.formError,
      formSuccess: null,
      fieldErrors: sourceState.fieldErrors,
      result: null,
    };
  }

  try {
    const createPackageDraftVersionDependency =
      dependencies.createPackageDraftVersion ?? createOrResolveRankedPatternPackageDraftForAdmin;
    const result = await createPackageDraftVersionDependency(input);

    if (result.status === 'created' || result.status === 'resolved') {
      const assessmentKey = result.assessmentKey || context.assessmentKey;
      if (assessmentKey) {
        revalidateAssessmentAdminPaths(assessmentKey, dependencies);
        dependencies.revalidatePath?.(`/admin/assessments/ranked-pattern/${assessmentKey}/workflow`);
      }
      dependencies.revalidatePath?.('/admin/assessments/ranked-pattern/workflow');

      const verb = result.status === 'created' ? 'created' : 'resolved';
      return {
        ok: true,
        message: `Draft ${result.draftVersionTag} was ${verb} from package metadata.`,
        formError: null,
        formSuccess: `Draft ${result.draftVersionTag} was ${verb} from package metadata.`,
        fieldErrors: {},
        result,
      };
    }

    const message =
      result.diagnostics[0]?.message ?? 'A ranked-pattern draft could not be resolved from package metadata.';
    return {
      ok: false,
      message,
      formError: message,
      formSuccess: null,
      fieldErrors: {},
      result,
    };
  } catch {
    const message =
      'A ranked-pattern draft could not be resolved from package metadata. Check the workbook path and try again.';
    return {
      ok: false,
      message,
      formError: message,
      formSuccess: null,
      fieldErrors: {},
      result: null,
    };
  }
}

export async function publishRankedPatternVersionActionWithDependencies(
  context: RankedPatternVersionActionContext,
  dependencies: RankedPatternAdminImportActionDependencies,
): Promise<RankedPatternPublishVersionActionState> {
  const targetAssessmentVersionId = context.targetAssessmentVersionId?.trim() ?? '';
  if (!targetAssessmentVersionId) {
    const message = 'No target draft version was supplied for publishing.';
    return {
      ok: false,
      message,
      formError: message,
      formSuccess: null,
      fieldErrors: {
        targetAssessmentVersionId: 'Publishing requires an audited draft version.',
      },
      result: null,
    };
  }

  try {
    const publishVersionDependency = dependencies.publishVersion ?? publishRankedPatternAssessmentVersion;
    const result = await publishVersionDependency({ targetAssessmentVersionId });

    if (result.status === 'published') {
      revalidateAssessmentAdminPaths(context.assessmentKey, dependencies);
      return {
        ok: true,
        message: `Draft ${result.publishedVersionTag} is now the active ranked-pattern version for new attempts.`,
        formError: null,
        formSuccess: `Draft ${result.publishedVersionTag} is now the active ranked-pattern version for new attempts.`,
        fieldErrors: {},
        result,
      };
    }

    const message =
      result.blockingDiagnostics[0]?.message ??
      'Publish audit found blocking findings. Resolve them before publishing.';
    return {
      ok: false,
      message,
      formError: message,
      formSuccess: null,
      fieldErrors: {},
      result,
    };
  } catch {
    const message = 'The ranked-pattern draft could not be published. Try again after refreshing the page.';
    return {
      ok: false,
      message,
      formError: message,
      formSuccess: null,
      fieldErrors: {},
      result: null,
    };
  }
}
