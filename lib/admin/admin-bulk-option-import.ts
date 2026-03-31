import type {
  BulkOptionGroupValidationError,
  BulkOptionGroupValidationWarning,
  BulkOptionImportPlanError,
  PlannedBulkOptionQuestionImport,
  ValidatedBulkOptionQuestionGroup,
  BulkOptionParseError,
} from '@/lib/admin/bulk-option-import';

export type AdminBulkOptionImportSummary = {
  assessmentVersionId: string | null;
  questionGroupCount: number;
  questionsMatched: number;
  questionsImported: number;
  optionsInserted: number;
  existingOptionsDeleted: number;
};

export type AdminBulkOptionImportState = {
  rawInput: string;
  lastAction: 'idle' | 'preview' | 'import';
  hasSubmitted: boolean;
  success: boolean;
  canImport: boolean;
  parseErrors: BulkOptionParseError[];
  groupErrors: BulkOptionGroupValidationError[];
  planErrors: BulkOptionImportPlanError[];
  warnings: BulkOptionGroupValidationWarning[];
  questionGroups: readonly ValidatedBulkOptionQuestionGroup[];
  plannedQuestions: readonly PlannedBulkOptionQuestionImport[];
  summary: AdminBulkOptionImportSummary;
  executionError: string | null;
  formError: string | null;
};

export const initialAdminBulkOptionImportState: AdminBulkOptionImportState = {
  rawInput: '',
  lastAction: 'idle',
  hasSubmitted: false,
  success: false,
  canImport: false,
  parseErrors: [],
  groupErrors: [],
  planErrors: [],
  warnings: [],
  questionGroups: [],
  plannedQuestions: [],
  summary: {
    assessmentVersionId: null,
    questionGroupCount: 0,
    questionsMatched: 0,
    questionsImported: 0,
    optionsInserted: 0,
    existingOptionsDeleted: 0,
  },
  executionError: null,
  formError: null,
};
