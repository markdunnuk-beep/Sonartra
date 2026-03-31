'use server';

import {
  initialAdminBulkOptionImportState,
  type AdminBulkOptionImportState,
} from '@/lib/admin/admin-bulk-option-import';
import {
  importBulkOptionsForAssessmentVersion,
  previewBulkOptionsForAssessmentVersion,
} from '@/lib/server/admin-bulk-option-import';

type BulkOptionImportActionContext = {
  assessmentVersionId: string;
};

type BulkOptionImportActionValues = {
  rawInput: string;
};

function normalizeValues(values: BulkOptionImportActionValues): BulkOptionImportActionValues {
  return {
    rawInput: values.rawInput,
  };
}

function buildEmptyInputState(
  rawInput: string,
  lastAction: AdminBulkOptionImportState['lastAction'],
): AdminBulkOptionImportState {
  return {
    ...initialAdminBulkOptionImportState,
    rawInput,
    lastAction,
    hasSubmitted: true,
    formError: 'Paste one or more option rows before continuing.',
  };
}

export async function previewBulkOptionsAction(
  context: BulkOptionImportActionContext,
  values: BulkOptionImportActionValues,
): Promise<AdminBulkOptionImportState> {
  const normalizedValues = normalizeValues(values);

  if (!normalizedValues.rawInput.trim()) {
    return buildEmptyInputState(normalizedValues.rawInput, 'preview');
  }

  const result = await previewBulkOptionsForAssessmentVersion({
    assessmentVersionId: context.assessmentVersionId,
    rawInput: normalizedValues.rawInput,
  });

  return {
    rawInput: normalizedValues.rawInput,
    lastAction: 'preview',
    hasSubmitted: true,
    success: result.success,
    canImport: result.canImport,
    parseErrors: result.parseErrors,
    groupErrors: result.groupErrors,
    planErrors: result.planErrors,
    warnings: result.warnings,
    questionGroups: result.questionGroups,
    plannedQuestions: result.plannedQuestions,
    summary: result.summary,
    executionError: result.executionError,
    formError: null,
  };
}

export async function importBulkOptionsAction(
  context: BulkOptionImportActionContext,
  values: BulkOptionImportActionValues,
): Promise<AdminBulkOptionImportState> {
  const normalizedValues = normalizeValues(values);

  if (!normalizedValues.rawInput.trim()) {
    return buildEmptyInputState(normalizedValues.rawInput, 'import');
  }

  const result = await importBulkOptionsForAssessmentVersion({
    assessmentVersionId: context.assessmentVersionId,
    rawInput: normalizedValues.rawInput,
  });

  return {
    rawInput: normalizedValues.rawInput,
    lastAction: 'import',
    hasSubmitted: true,
    success: result.success,
    canImport: result.canImport,
    parseErrors: result.parseErrors,
    groupErrors: result.groupErrors,
    planErrors: result.planErrors,
    warnings: result.warnings,
    questionGroups: result.questionGroups,
    plannedQuestions: result.plannedQuestions,
    summary: result.summary,
    executionError: result.executionError,
    formError: null,
  };
}
