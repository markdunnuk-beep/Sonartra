'use server';

import {
  executeDomainBulkImport,
  previewDomainBulkImport,
  type DomainBulkImportExecutionResult,
} from '@/lib/server/admin-domain-bulk-import';
import {
  initialAdminDomainBulkImportState,
  type AdminDomainBulkImportState,
} from '@/lib/admin/admin-domain-bulk-import';
import { countNonEmptyBulkImportRows } from '@/lib/admin/admin-bulk-import-shared';

type DomainBulkImportActionContext = {
  assessmentVersionId: string;
};

type DomainBulkImportActionValues = {
  rawInput: string;
};

export async function importDomainBulkAction(
  context: DomainBulkImportActionContext,
  values: DomainBulkImportActionValues,
): Promise<AdminDomainBulkImportState> {
  if (!values.rawInput.trim()) {
    return buildEmptyInputState(values.rawInput, 'import');
  }

  const result = await executeDomainBulkImport({
    assessmentVersionId: context.assessmentVersionId,
    rawInput: values.rawInput,
  });

  return toState(result, values.rawInput, 'import');
}

export async function previewDomainBulkImportAction(
  context: DomainBulkImportActionContext,
  values: DomainBulkImportActionValues,
): Promise<AdminDomainBulkImportState> {
  if (!values.rawInput.trim()) {
    return buildEmptyInputState(values.rawInput, 'preview');
  }

  const result = await previewDomainBulkImport({
    assessmentVersionId: context.assessmentVersionId,
    rawInput: values.rawInput,
  });

  return toState(result, values.rawInput, 'preview');
}

function buildEmptyInputState(
  rawInput: string,
  lastAction: AdminDomainBulkImportState['lastAction'],
): AdminDomainBulkImportState {
  return {
    ...initialAdminDomainBulkImportState,
    rawInput,
    lastAction,
    hasSubmitted: true,
    formError: 'Paste at least one domain row, then preview the import.',
  };
}

function toState(
  result: DomainBulkImportExecutionResult,
  rawInput: string,
  lastAction: 'preview' | 'import',
): AdminDomainBulkImportState {
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
