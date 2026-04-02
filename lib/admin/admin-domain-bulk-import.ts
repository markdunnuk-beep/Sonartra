import type {
  DomainBulkImportExecutionResult,
  DomainBulkImportExecutionSummary,
} from '@/lib/server/admin-domain-bulk-import';
import type {
  PlannedDomainBulkImportAcceptedRow,
  PlannedDomainBulkImportRejectedRow,
} from '@/lib/server/admin-domain-bulk-import-plan';

export type AdminDomainBulkImportSummary = DomainBulkImportExecutionSummary & {
  rowCount: number;
  acceptedCount: number;
};

export type AdminDomainBulkImportState = {
  rawInput: string;
  lastAction: 'idle' | 'preview' | 'import';
  hasSubmitted: boolean;
  success: boolean;
  ok: boolean;
  canImport: boolean;
  didImport: boolean;
  accepted: readonly PlannedDomainBulkImportAcceptedRow[];
  rejected: readonly PlannedDomainBulkImportRejectedRow[];
  created: ReadonlyArray<DomainBulkImportExecutionResult['created'][number]>;
  summary: AdminDomainBulkImportSummary;
  executionError: string | null;
  formError: string | null;
};

export const initialAdminDomainBulkImportState: AdminDomainBulkImportState = {
  rawInput: '',
  lastAction: 'idle',
  hasSubmitted: false,
  success: false,
  ok: false,
  canImport: false,
  didImport: false,
  accepted: [],
  rejected: [],
  created: [],
  summary: {
    assessmentVersionId: '',
    lifecycleStatus: 'ARCHIVED',
    importedCount: 0,
    rejectedCount: 0,
    basedOn: {
      authoredDomainCount: 0,
      authoredDomainMaxOrderIndex: -1,
    },
    rowCount: 0,
    acceptedCount: 0,
  },
  executionError: null,
  formError: null,
};
