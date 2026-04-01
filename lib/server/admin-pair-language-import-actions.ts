'use server';

import {
  initialAdminPairLanguageImportState,
  type AdminPairLanguageImportState,
} from '@/lib/admin/admin-pair-language-import';
import {
  importPairLanguageForAssessmentVersion,
  previewPairLanguageForAssessmentVersion,
} from '@/lib/server/admin-pair-language-import';

type PairLanguageActionContext = {
  assessmentVersionId: string;
};

type PairLanguageActionValues = {
  rawInput: string;
};

function buildEmptyInputState(
  rawInput: string,
  lastAction: AdminPairLanguageImportState['lastAction'],
): AdminPairLanguageImportState {
  return {
    ...initialAdminPairLanguageImportState,
    rawInput,
    lastAction,
    hasSubmitted: true,
    formError: 'Paste one or more pair language rows before continuing.',
  };
}

export async function previewPairLanguageAction(
  context: PairLanguageActionContext,
  values: PairLanguageActionValues,
): Promise<AdminPairLanguageImportState> {
  if (!values.rawInput.trim()) {
    return buildEmptyInputState(values.rawInput, 'preview');
  }

  const result = await previewPairLanguageForAssessmentVersion({
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

export async function importPairLanguageAction(
  context: PairLanguageActionContext,
  values: PairLanguageActionValues,
): Promise<AdminPairLanguageImportState> {
  if (!values.rawInput.trim()) {
    return buildEmptyInputState(values.rawInput, 'import');
  }

  const result = await importPairLanguageForAssessmentVersion({
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
