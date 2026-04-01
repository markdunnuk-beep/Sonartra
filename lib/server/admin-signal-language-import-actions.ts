'use server';

import {
  initialAdminSignalLanguageImportState,
  type AdminSignalLanguageImportState,
} from '@/lib/admin/admin-signal-language-import';
import {
  importSignalLanguageForAssessmentVersion,
  previewSignalLanguageForAssessmentVersion,
} from '@/lib/server/admin-signal-language-import';

type SignalLanguageActionContext = {
  assessmentVersionId: string;
};

type SignalLanguageActionValues = {
  rawInput: string;
};

function buildEmptyInputState(
  rawInput: string,
  lastAction: AdminSignalLanguageImportState['lastAction'],
): AdminSignalLanguageImportState {
  return {
    ...initialAdminSignalLanguageImportState,
    rawInput,
    lastAction,
    hasSubmitted: true,
    formError: 'Paste one or more signal language rows before continuing.',
  };
}

export async function previewSignalLanguageAction(
  context: SignalLanguageActionContext,
  values: SignalLanguageActionValues,
): Promise<AdminSignalLanguageImportState> {
  if (!values.rawInput.trim()) {
    return buildEmptyInputState(values.rawInput, 'preview');
  }

  const result = await previewSignalLanguageForAssessmentVersion({
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

export async function importSignalLanguageAction(
  context: SignalLanguageActionContext,
  values: SignalLanguageActionValues,
): Promise<AdminSignalLanguageImportState> {
  if (!values.rawInput.trim()) {
    return buildEmptyInputState(values.rawInput, 'import');
  }

  const result = await importSignalLanguageForAssessmentVersion({
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
