'use server';

import {
  initialAdminOverviewLanguageImportState,
  type AdminOverviewLanguageImportState,
} from '@/lib/admin/admin-overview-language-import';
import {
  importOverviewLanguageForAssessmentVersion,
  previewOverviewLanguageForAssessmentVersion,
} from '@/lib/server/admin-overview-language-import';

type OverviewLanguageActionContext = {
  assessmentVersionId: string;
};

type OverviewLanguageActionValues = {
  rawInput: string;
};

function buildEmptyInputState(
  rawInput: string,
  lastAction: AdminOverviewLanguageImportState['lastAction'],
): AdminOverviewLanguageImportState {
  return {
    ...initialAdminOverviewLanguageImportState,
    rawInput,
    lastAction,
    hasSubmitted: true,
    formError: 'Paste one or more overview language rows before continuing.',
  };
}

export async function previewOverviewLanguageAction(
  context: OverviewLanguageActionContext,
  values: OverviewLanguageActionValues,
): Promise<AdminOverviewLanguageImportState> {
  if (!values.rawInput.trim()) {
    return buildEmptyInputState(values.rawInput, 'preview');
  }

  const result = await previewOverviewLanguageForAssessmentVersion({
    assessmentVersionId: context.assessmentVersionId,
    rawInput: values.rawInput,
  });

  return {
    rawInput: values.rawInput,
    lastAction: 'preview',
    hasSubmitted: true,
    success: result.success,
    canImport: result.canImport,
    parseErrors: result.parseErrors,
    validationErrors: result.validationErrors,
    planErrors: result.planErrors,
    previewGroups: result.previewGroups,
    summary: result.summary,
    executionError: result.executionError,
    formError: null,
  };
}

export async function importOverviewLanguageAction(
  context: OverviewLanguageActionContext,
  values: OverviewLanguageActionValues,
): Promise<AdminOverviewLanguageImportState> {
  if (!values.rawInput.trim()) {
    return buildEmptyInputState(values.rawInput, 'import');
  }

  const result = await importOverviewLanguageForAssessmentVersion({
    assessmentVersionId: context.assessmentVersionId,
    rawInput: values.rawInput,
  });

  return {
    rawInput: values.rawInput,
    lastAction: 'import',
    hasSubmitted: true,
    success: result.success,
    canImport: result.canImport,
    parseErrors: result.parseErrors,
    validationErrors: result.validationErrors,
    planErrors: result.planErrors,
    previewGroups: result.previewGroups,
    summary: result.summary,
    executionError: result.executionError,
    formError: null,
  };
}
