'use server';

import { executeDomainBulkImport, type DomainBulkImportExecutionResult } from '@/lib/server/admin-domain-bulk-import';

type DomainBulkImportActionContext = {
  assessmentVersionId: string;
};

type DomainBulkImportActionValues = {
  rawInput: string;
};

export async function importDomainBulkAction(
  context: DomainBulkImportActionContext,
  values: DomainBulkImportActionValues,
): Promise<DomainBulkImportExecutionResult> {
  return executeDomainBulkImport({
    assessmentVersionId: context.assessmentVersionId,
    rawInput: values.rawInput,
  });
}
