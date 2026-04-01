import type {
  OverviewLanguageParseError,
  OverviewLanguagePreviewGroup,
  OverviewLanguageValidationError,
} from '@/lib/admin/overview-language-import';

export type AdminOverviewLanguageImportSummary = {
  assessmentVersionId: string | null;
  rowCount: number;
  patternCount: number;
  existingRowCount: number;
  importedRowCount: number;
  importedPatternCount: number;
};

export type AdminOverviewLanguageImportState = {
  rawInput: string;
  lastAction: 'idle' | 'preview' | 'import';
  hasSubmitted: boolean;
  success: boolean;
  canImport: boolean;
  parseErrors: readonly OverviewLanguageParseError[];
  validationErrors: readonly OverviewLanguageValidationError[];
  planErrors: readonly {
    code: 'ASSESSMENT_VERSION_NOT_FOUND' | 'ASSESSMENT_VERSION_NOT_EDITABLE' | 'SIGNAL_SET_EMPTY';
    message: string;
  }[];
  previewGroups: readonly OverviewLanguagePreviewGroup[];
  summary: AdminOverviewLanguageImportSummary;
  executionError: string | null;
  formError: string | null;
};

export const initialAdminOverviewLanguageImportState: AdminOverviewLanguageImportState = {
  rawInput: '',
  lastAction: 'idle',
  hasSubmitted: false,
  success: false,
  canImport: false,
  parseErrors: [],
  validationErrors: [],
  planErrors: [],
  previewGroups: [],
  summary: {
    assessmentVersionId: null,
    rowCount: 0,
    patternCount: 0,
    existingRowCount: 0,
    importedRowCount: 0,
    importedPatternCount: 0,
  },
  executionError: null,
  formError: null,
};
