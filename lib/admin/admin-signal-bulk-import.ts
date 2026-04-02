import type { SignalBulkImportExecutionSummary } from '@/lib/server/admin-signal-bulk-import';
import type {
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
  canImport: boolean;
  didImport: boolean;
  accepted: readonly PlannedSignalBulkImportAcceptedRow[];
  rejected: readonly PlannedSignalBulkImportRejectedRow[];
  summary: AdminSignalBulkImportSummary;
  executionError: string | null;
  formError: string | null;
};

export const initialAdminSignalBulkImportState: AdminSignalBulkImportState = {
  rawInput: '',
  lastAction: 'idle',
  hasSubmitted: false,
  success: false,
  canImport: false,
  didImport: false,
  accepted: [],
  rejected: [],
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
