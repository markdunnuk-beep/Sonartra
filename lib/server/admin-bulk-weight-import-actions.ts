'use server';

import {
  initialAdminBulkWeightImportState,
  type AdminBulkWeightImportState,
} from '@/lib/admin/admin-bulk-weight-import';
import {
  importBulkWeightsForAssessmentVersion,
  previewBulkWeightsForAssessmentVersion,
} from '@/lib/server/admin-bulk-weight-import';

type BulkWeightImportActionContext = {
  assessmentVersionId: string;
};

type BulkWeightImportActionValues = {
  rawInput: string;
};

function normalizeValues(values: BulkWeightImportActionValues): BulkWeightImportActionValues {
  return {
    rawInput: values.rawInput,
  };
}

function buildEmptyInputState(
  rawInput: string,
  lastAction: AdminBulkWeightImportState['lastAction'],
): AdminBulkWeightImportState {
  return {
    ...initialAdminBulkWeightImportState,
    rawInput,
    lastAction,
    hasSubmitted: true,
    formError: 'Paste one or more weight rows before continuing.',
  };
}

export async function previewBulkWeightsAction(
  context: BulkWeightImportActionContext,
  values: BulkWeightImportActionValues,
): Promise<AdminBulkWeightImportState> {
  const normalizedValues = normalizeValues(values);

  if (!normalizedValues.rawInput.trim()) {
    return buildEmptyInputState(normalizedValues.rawInput, 'preview');
  }

  const result = await previewBulkWeightsForAssessmentVersion({
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
    weightGroups: result.weightGroups,
    plannedOptionGroups: result.plannedOptionGroups,
    summary: result.summary,
    executionError: result.executionError,
    formError: null,
  };
}

export async function importBulkWeightsAction(
  context: BulkWeightImportActionContext,
  values: BulkWeightImportActionValues,
): Promise<AdminBulkWeightImportState> {
  const normalizedValues = normalizeValues(values);

  if (!normalizedValues.rawInput.trim()) {
    return buildEmptyInputState(normalizedValues.rawInput, 'import');
  }

  const result = await importBulkWeightsForAssessmentVersion({
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
    weightGroups: result.weightGroups,
    plannedOptionGroups: result.plannedOptionGroups,
    summary: result.summary,
    executionError: result.executionError,
    formError: null,
  };
}
