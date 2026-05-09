'use server';

import { revalidatePath } from 'next/cache';

import {
  applyRankedPatternImportForAdmin,
  auditRankedPatternPublishReadinessForAdmin,
  auditRankedPatternWorkbookForAdmin,
  dryRunRankedPatternImportForAdmin,
} from '@/lib/server/ranked-pattern-admin-import-workflow';
import {
  createRankedPatternDraftVersion,
  publishRankedPatternAssessmentVersion,
} from '@/lib/server/ranked-pattern-admin-versioning';
import type {
  RankedPatternAdminImportActionState,
  RankedPatternDraftVersionActionState,
  RankedPatternPublishAuditActionState,
  RankedPatternPublishVersionActionState,
} from '@/lib/server/ranked-pattern-admin-import-workflow-action-state';

type RankedPatternAdminImportActionContext = {
  readonly targetAssessmentId?: string;
  readonly targetAssessmentVersionId?: string;
};

type RankedPatternVersionActionContext = {
  readonly assessmentKey: string;
  readonly targetAssessmentVersionId?: string;
};

type RankedPatternAdminImportActionDependencies = {
  readonly auditWorkbook: typeof auditRankedPatternWorkbookForAdmin;
  readonly dryRunImport: typeof dryRunRankedPatternImportForAdmin;
  readonly applyImport: typeof applyRankedPatternImportForAdmin;
  readonly auditPublishReadiness: typeof auditRankedPatternPublishReadinessForAdmin;
  readonly createDraftVersion?: typeof createRankedPatternDraftVersion;
  readonly publishVersion?: typeof publishRankedPatternAssessmentVersion;
  readonly revalidatePath?: typeof revalidatePath;
};

const defaultDependencies: RankedPatternAdminImportActionDependencies = {
  auditWorkbook: auditRankedPatternWorkbookForAdmin,
  dryRunImport: dryRunRankedPatternImportForAdmin,
  applyImport: applyRankedPatternImportForAdmin,
  auditPublishReadiness: auditRankedPatternPublishReadinessForAdmin,
  createDraftVersion: createRankedPatternDraftVersion,
  publishVersion: publishRankedPatternAssessmentVersion,
  revalidatePath,
};

function actionInputFromFormData(
  context: RankedPatternAdminImportActionContext,
  formData: FormData,
) {
  const sourcePath = String(formData.get('sourcePath') ?? '').trim();
  const sourceName = String(formData.get('sourceName') ?? '').trim();
  const sourceHash = String(formData.get('sourceHash') ?? '').trim();

  return {
    sourcePath,
    sourceName: sourceName || undefined,
    sourceHash: sourceHash || undefined,
    targetAssessmentId: context.targetAssessmentId,
    targetAssessmentVersionId: context.targetAssessmentVersionId,
  };
}

function missingSourcePathState(): RankedPatternAdminImportActionState {
  const message =
    'Provide a ranked-pattern workbook file path. Upload storage is intentionally deferred until the admin file convention is settled.';
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

function safeImportErrorState(): RankedPatternAdminImportActionState {
  const message = 'The ranked-pattern package workflow could not run. Check the file path and try again.';
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

export async function publishRankedPatternVersionAction(
  context: RankedPatternVersionActionContext,
  _previousState: RankedPatternPublishVersionActionState,
  _formData: FormData,
): Promise<RankedPatternPublishVersionActionState> {
  return publishRankedPatternVersionActionWithDependencies(context, defaultDependencies);
}

export async function auditRankedPatternPackageActionWithDependencies(
  context: RankedPatternAdminImportActionContext,
  formData: FormData,
  dependencies: RankedPatternAdminImportActionDependencies,
): Promise<RankedPatternAdminImportActionState> {
  const input = actionInputFromFormData(context, formData);
  if (!input.sourcePath) {
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
  const input = actionInputFromFormData(context, formData);
  if (!input.sourcePath) {
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
  const input = actionInputFromFormData(context, formData);
  if (!input.sourcePath) {
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
