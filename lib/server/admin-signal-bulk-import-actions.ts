'use server';

import { executeSignalBulkImport, type SignalBulkImportExecutionResult } from '@/lib/server/admin-signal-bulk-import';

type SignalBulkImportActionContext = {
  assessmentVersionId: string;
};

type SignalBulkImportActionValues = {
  rawInput: string;
};

export async function importSignalBulkAction(
  context: SignalBulkImportActionContext,
  values: SignalBulkImportActionValues,
): Promise<SignalBulkImportExecutionResult> {
  return executeSignalBulkImport({
    assessmentVersionId: context.assessmentVersionId,
    rawInput: values.rawInput,
  });
}
