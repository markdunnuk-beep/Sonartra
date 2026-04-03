import type {
  ImportableReportLanguageSection,
  ReportLanguageParseError,
  ReportLanguageValidationError,
} from '@/lib/admin/report-language-import';

export type AdminReportLanguageImportPreviewGroup = {
  targetKey: string;
  targetLabel: string;
  entries: readonly {
    lineNumber: number;
    field: string;
    content: string;
  }[];
};

export type AdminReportLanguageImportSummary = {
  assessmentVersionId: string | null;
  rowCount: number;
  targetCount: number;
  existingRowCount: number;
  importedRowCount: number;
  importedTargetCount: number;
};

export type AdminReportLanguageImportState = {
  reportSection: ImportableReportLanguageSection;
  rawInput: string;
  lastAction: 'idle' | 'preview' | 'import';
  hasSubmitted: boolean;
  success: boolean;
  canImport: boolean;
  parseErrors: readonly ReportLanguageParseError[];
  validationErrors: readonly ReportLanguageValidationError[];
  planErrors: readonly {
    code:
      | 'ASSESSMENT_VERSION_NOT_FOUND'
      | 'ASSESSMENT_VERSION_NOT_EDITABLE'
      | 'SIGNAL_SET_EMPTY'
      | 'DOMAIN_SET_EMPTY'
      | 'WRONG_REPORT_SECTION';
    message: string;
  }[];
  previewGroups: readonly AdminReportLanguageImportPreviewGroup[];
  summary: AdminReportLanguageImportSummary;
  executionError: string | null;
  formError: string | null;
};

export const initialAdminReportLanguageImportState: AdminReportLanguageImportState = {
  reportSection: 'hero',
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
    targetCount: 0,
    existingRowCount: 0,
    importedRowCount: 0,
    importedTargetCount: 0,
  },
  executionError: null,
  formError: null,
};
