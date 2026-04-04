export type LanguageImportDataset = 'heroHeader' | 'domain' | 'signal' | 'pair';

export type AdminLanguageDatasetImportIssue = {
  key: string;
  message: string;
};

export type AdminLanguageDatasetImportPreviewGroup = {
  targetKey: string;
  targetLabel: string;
  entries: readonly {
    lineNumber: number;
    label: string;
    content: string;
  }[];
};

export type AdminLanguageDatasetImportState = {
  dataset: LanguageImportDataset;
  rawInput: string;
  success: boolean;
  parseErrors: readonly AdminLanguageDatasetImportIssue[];
  validationErrors: readonly AdminLanguageDatasetImportIssue[];
  planErrors: readonly AdminLanguageDatasetImportIssue[];
  previewGroups: readonly AdminLanguageDatasetImportPreviewGroup[];
  summary: {
    assessmentVersionId: string | null;
    rowCount: number;
    targetCount: number;
    existingRowCount: number;
    importedRowCount: number;
    importedTargetCount: number;
  };
  executionError: string | null;
  formError: string | null;
};

export const initialAdminLanguageDatasetImportState: AdminLanguageDatasetImportState = {
  dataset: 'heroHeader',
  rawInput: '',
  success: false,
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
