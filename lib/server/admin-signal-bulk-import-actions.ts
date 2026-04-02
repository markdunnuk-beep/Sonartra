'use server';

import {
  executeSignalBulkImport,
  previewSignalBulkImport,
  type SignalBulkImportExecutionResult,
} from '@/lib/server/admin-signal-bulk-import';
import {
  initialAdminSignalBulkImportState,
  type AdminSignalBulkImportState,
} from '@/lib/admin/admin-signal-bulk-import';
import { countNonEmptyBulkImportRows } from '@/lib/admin/admin-bulk-import-shared';

type SignalBulkImportActionContext = {
  assessmentVersionId: string;
};

type SignalBulkImportActionValues = {
  rawInput: string;
};

export async function importSignalBulkAction(
  context: SignalBulkImportActionContext,
  values: SignalBulkImportActionValues,
): Promise<AdminSignalBulkImportState> {
  if (!values.rawInput.trim()) {
    return buildEmptyInputState(values.rawInput, 'import');
  }

  const result = await executeSignalBulkImport({
    assessmentVersionId: context.assessmentVersionId,
    rawInput: values.rawInput,
  });

  return toState(result, values.rawInput, 'import');
}

export async function previewSignalBulkImportAction(
  context: SignalBulkImportActionContext,
  values: SignalBulkImportActionValues,
): Promise<AdminSignalBulkImportState> {
  if (!values.rawInput.trim()) {
    return buildEmptyInputState(values.rawInput, 'preview');
  }

  const result = await previewSignalBulkImport({
    assessmentVersionId: context.assessmentVersionId,
    rawInput: values.rawInput,
  });

  return toState(result, values.rawInput, 'preview');
}

function buildEmptyInputState(
  rawInput: string,
  lastAction: AdminSignalBulkImportState['lastAction'],
): AdminSignalBulkImportState {
  return {
    ...initialAdminSignalBulkImportState,
    rawInput,
    lastAction,
    hasSubmitted: true,
    formError: 'Paste at least one signal row, then preview the import.',
  };
}

function toState(
  result: SignalBulkImportExecutionResult,
  rawInput: string,
  lastAction: 'preview' | 'import',
): AdminSignalBulkImportState {
  return {
    rawInput,
    lastAction,
    hasSubmitted: true,
    success: result.ok && (lastAction === 'preview' ? true : result.didImport),
    canImport: result.canImport,
    didImport: result.didImport,
    accepted: result.accepted,
    rejected: result.rejected,
    summary: {
      ...result.summary,
      rowCount: countNonEmptyBulkImportRows(rawInput),
      acceptedCount: result.accepted.length,
    },
    executionError: result.executionError,
    formError: null,
  };
}
