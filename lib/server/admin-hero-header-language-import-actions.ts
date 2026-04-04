'use server';

import {
  initialAdminHeroHeaderImportState,
  type AdminHeroHeaderImportState,
} from '@/lib/admin/admin-hero-header-language-import';
import {
  importHeroHeaderLanguageForAssessmentVersion,
  previewHeroHeaderLanguageForAssessmentVersion,
} from '@/lib/server/admin-hero-header-language-import';

type ActionContext = {
  assessmentVersionId: string;
};

type ActionValues = {
  rawInput: string;
};

function buildEmptyInputState(
  rawInput: string,
  lastAction: AdminHeroHeaderImportState['lastAction'],
): AdminHeroHeaderImportState {
  return {
    ...initialAdminHeroHeaderImportState,
    rawInput,
    lastAction,
    hasSubmitted: true,
    formError: 'Paste one or more Hero Header rows before continuing.',
  };
}

export async function previewHeroHeaderLanguageAction(
  context: ActionContext,
  values: ActionValues,
): Promise<AdminHeroHeaderImportState> {
  if (!values.rawInput.trim()) {
    return buildEmptyInputState(values.rawInput, 'preview');
  }

  const result = await previewHeroHeaderLanguageForAssessmentVersion({
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

export async function importHeroHeaderLanguageAction(
  context: ActionContext,
  values: ActionValues,
): Promise<AdminHeroHeaderImportState> {
  if (!values.rawInput.trim()) {
    return buildEmptyInputState(values.rawInput, 'import');
  }

  const result = await importHeroHeaderLanguageForAssessmentVersion({
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
