'use server';

import { revalidatePath } from 'next/cache';

import {
  applyRankedPatternImportForAdmin,
  auditRankedPatternPublishReadinessForAdmin,
  auditRankedPatternWorkbookForAdmin,
  dryRunRankedPatternImportForAdmin,
  type RankedPatternAdminImportWorkflowResult,
} from '@/lib/server/ranked-pattern-admin-import-workflow';
import {
  createRankedPatternDraftVersion,
  publishRankedPatternAssessmentVersion,
  type RankedPatternDraftVersionResult,
  type RankedPatternPublishVersionResult,
} from '@/lib/server/ranked-pattern-admin-versioning';

export type RankedPatternAdminImportActionState = {
  readonly formError: string | null;
  readonly result: RankedPatternAdminImportWorkflowResult | null;
};

export type RankedPatternPublishAuditActionState = {
  readonly formError: string | null;
  readonly result: Awaited<ReturnType<typeof auditRankedPatternPublishReadinessForAdmin>> | null;
};

export type RankedPatternDraftVersionActionState = {
  readonly formError: string | null;
  readonly formSuccess: string | null;
  readonly result: RankedPatternDraftVersionResult | null;
};

export type RankedPatternPublishVersionActionState = {
  readonly formError: string | null;
  readonly formSuccess: string | null;
  readonly result: RankedPatternPublishVersionResult | null;
};

export const initialRankedPatternAdminImportActionState: RankedPatternAdminImportActionState = {
  formError: null,
  result: null,
};

export const initialRankedPatternPublishAuditActionState: RankedPatternPublishAuditActionState = {
  formError: null,
  result: null,
};

export const initialRankedPatternDraftVersionActionState: RankedPatternDraftVersionActionState = {
  formError: null,
  formSuccess: null,
  result: null,
};

export const initialRankedPatternPublishVersionActionState: RankedPatternPublishVersionActionState = {
  formError: null,
  formSuccess: null,
  result: null,
};

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
  return {
    formError:
      'Provide a ranked-pattern workbook file path. Upload storage is intentionally deferred until the admin file convention is settled.',
    result: null,
  };
}

function safeImportErrorState(): RankedPatternAdminImportActionState {
  return {
    formError: 'The ranked-pattern package workflow could not run. Check the file path and try again.',
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
      formError: null,
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
      formError: null,
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
      formError: null,
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
    return {
      formError: 'No target assessment version was supplied for publish audit.',
      result: null,
    };
  }

  try {
    return {
      formError: null,
      result: await dependencies.auditPublishReadiness({
        targetAssessmentVersionId: context.targetAssessmentVersionId,
      }),
    };
  } catch {
    return {
      formError: 'Publish readiness audit could not run. Try again after refreshing the page.',
      result: null,
    };
  }
}

export async function createRankedPatternDraftVersionActionWithDependencies(
  context: RankedPatternVersionActionContext,
  dependencies: RankedPatternAdminImportActionDependencies,
): Promise<RankedPatternDraftVersionActionState> {
  if (!context.assessmentKey.trim()) {
    return {
      formError: 'No assessment was supplied for draft creation.',
      formSuccess: null,
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
        formError: null,
        formSuccess: `Draft ${result.draftVersionTag} was created for ranked-pattern import.`,
        result,
      };
    }

    return {
      formError: result.diagnostics[0]?.message ?? 'A ranked-pattern draft version could not be created.',
      formSuccess: null,
      result,
    };
  } catch {
    return {
      formError: 'A ranked-pattern draft version could not be created. Try again after refreshing the page.',
      formSuccess: null,
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
    return {
      formError: 'No target draft version was supplied for publishing.',
      formSuccess: null,
      result: null,
    };
  }

  try {
    const publishVersionDependency = dependencies.publishVersion ?? publishRankedPatternAssessmentVersion;
    const result = await publishVersionDependency({ targetAssessmentVersionId });

    if (result.status === 'published') {
      revalidateAssessmentAdminPaths(context.assessmentKey, dependencies);
      return {
        formError: null,
        formSuccess: `Draft ${result.publishedVersionTag} is now the active ranked-pattern version for new attempts.`,
        result,
      };
    }

    return {
      formError:
        result.blockingDiagnostics[0]?.message ??
        'Publish audit found blocking findings. Resolve them before publishing.',
      formSuccess: null,
      result,
    };
  } catch {
    return {
      formError: 'The ranked-pattern draft could not be published. Try again after refreshing the page.',
      formSuccess: null,
      result: null,
    };
  }
}
