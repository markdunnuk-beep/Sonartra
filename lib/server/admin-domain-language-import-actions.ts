'use server';

import {
  initialAdminDomainLanguageImportState,
  type AdminDomainLanguageImportState,
} from '@/lib/admin/admin-domain-language-import';
import {
  importDomainLanguageForAssessmentVersion,
  previewDomainLanguageForAssessmentVersion,
} from '@/lib/server/admin-domain-language-import';

type DomainLanguageActionContext = {
  assessmentVersionId: string;
};

type DomainLanguageActionValues = {
  rawInput: string;
};

function buildEmptyInputState(
  rawInput: string,
  lastAction: AdminDomainLanguageImportState['lastAction'],
): AdminDomainLanguageImportState {
  return {
    ...initialAdminDomainLanguageImportState,
    rawInput,
    lastAction,
    hasSubmitted: true,
    formError: 'Paste one or more domain language rows before continuing.',
  };
}

export async function previewDomainLanguageAction(
  context: DomainLanguageActionContext,
  values: DomainLanguageActionValues,
): Promise<AdminDomainLanguageImportState> {
  if (!values.rawInput.trim()) {
    return buildEmptyInputState(values.rawInput, 'preview');
  }

  const result = await previewDomainLanguageForAssessmentVersion({
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

export async function importDomainLanguageAction(
  context: DomainLanguageActionContext,
  values: DomainLanguageActionValues,
): Promise<AdminDomainLanguageImportState> {
  if (!values.rawInput.trim()) {
    return buildEmptyInputState(values.rawInput, 'import');
  }

  const result = await importDomainLanguageForAssessmentVersion({
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
