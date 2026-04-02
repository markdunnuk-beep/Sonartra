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
    formError: 'Paste one or more domain rows before continuing.',
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
    ok: result.ok,
    canImport: result.canImport,
    didImport: result.didImport,
    accepted: result.accepted,
    rejected: result.rejected,
    created: result.created,
    summary: {
      ...result.summary,
      rowCount: countNonEmptyRows(rawInput),
      acceptedCount: result.accepted.length,
    },
    executionError: result.executionError,
    formError: null,
  };
}

function countNonEmptyRows(rawInput: string): number {
  return rawInput
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .length;
}
