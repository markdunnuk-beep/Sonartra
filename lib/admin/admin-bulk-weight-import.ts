import type {
  BulkWeightGroupValidationError,
  BulkWeightGroupValidationWarning,
  BulkWeightImportPlanError,
  PlannedBulkWeightGroupImport,
  ValidatedBulkWeightGroup,
  BulkWeightParseError,
} from '@/lib/admin/bulk-weight-import';

export type AdminBulkWeightImportSummary = {
  assessmentVersionId: string | null;
  optionGroupCount: number;
  questionCountMatched: number;
  optionGroupCountMatched: number;
  optionGroupCountImported: number;
  weightsInserted: number;
  weightsDeleted: number;
};

export type AdminBulkWeightImportState = {
  rawInput: string;
  lastAction: 'idle' | 'preview' | 'import';
  hasSubmitted: boolean;
  success: boolean;
  canImport: boolean;
  parseErrors: BulkWeightParseError[];
  groupErrors: BulkWeightGroupValidationError[];
  planErrors: BulkWeightImportPlanError[];
  warnings: BulkWeightGroupValidationWarning[];
  weightGroups: readonly ValidatedBulkWeightGroup[];
  plannedOptionGroups: readonly PlannedBulkWeightGroupImport[];
  summary: AdminBulkWeightImportSummary;
  executionError: string | null;
  formError: string | null;
};

export const initialAdminBulkWeightImportState: AdminBulkWeightImportState = {
  rawInput: '',
  lastAction: 'idle',
  hasSubmitted: false,
  success: false,
  canImport: false,
  parseErrors: [],
  groupErrors: [],
  planErrors: [],
  warnings: [],
  weightGroups: [],
  plannedOptionGroups: [],
  summary: {
    assessmentVersionId: null,
    optionGroupCount: 0,
    questionCountMatched: 0,
    optionGroupCountMatched: 0,
    optionGroupCountImported: 0,
    weightsInserted: 0,
    weightsDeleted: 0,
  },
  executionError: null,
  formError: null,
};
