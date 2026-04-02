import type {
  SignalBulkImportExecutionResult,
  SignalBulkImportExecutionSummary,
} from '@/lib/server/admin-signal-bulk-import';
import type {
  PlannedSignalBulkImportAcceptedDomainGroup,
  PlannedSignalBulkImportAcceptedRow,
  PlannedSignalBulkImportRejectedRow,
} from '@/lib/server/admin-signal-bulk-import-plan';

export type AdminSignalBulkImportSummary = SignalBulkImportExecutionSummary & {
  rowCount: number;
  acceptedCount: number;
};

export type AdminSignalBulkImportState = {
  rawInput: string;
  lastAction: 'idle' | 'preview' | 'import';
  hasSubmitted: boolean;
  success: boolean;
  ok: boolean;
  canImport: boolean;
  didImport: boolean;
  accepted: readonly PlannedSignalBulkImportAcceptedRow[];
  acceptedByDomain: readonly PlannedSignalBulkImportAcceptedDomainGroup[];
  rejected: readonly PlannedSignalBulkImportRejectedRow[];
  created: ReadonlyArray<SignalBulkImportExecutionResult['created'][number]>;
  createdByDomain: ReadonlyArray<SignalBulkImportExecutionResult['createdByDomain'][number]>;
  summary: AdminSignalBulkImportSummary;
  executionError: string | null;
  formError: string | null;
};

export const initialAdminSignalBulkImportState: AdminSignalBulkImportState = {
  rawInput: '',
  lastAction: 'idle',
  hasSubmitted: false,
  success: false,
  ok: false,
  canImport: false,
  didImport: false,
  accepted: [],
  acceptedByDomain: [],
  rejected: [],
  created: [],
  createdByDomain: [],
  summary: {
    assessmentVersionId: '',
    lifecycleStatus: 'ARCHIVED',
    importedCount: 0,
    rejectedCount: 0,
    basedOn: {
      authoredDomainCount: 0,
      signalCount: 0,
    },
    perDomainCreateCounts: {},
    rowCount: 0,
    acceptedCount: 0,
  },
  executionError: null,
  formError: null,
};
