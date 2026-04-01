import type {
  PairLanguageParseError,
  PairLanguagePreviewGroup,
  PairLanguageValidationError,
} from '@/lib/admin/pair-language-import';

export type AdminPairLanguageImportSummary = {
  assessmentVersionId: string | null;
  rowCount: number;
  pairCount: number;
  existingRowCount: number;
  importedRowCount: number;
  importedPairCount: number;
};

export type AdminPairLanguageImportState = {
  rawInput: string;
  lastAction: 'idle' | 'preview' | 'import';
  hasSubmitted: boolean;
  success: boolean;
  canImport: boolean;
  parseErrors: readonly PairLanguageParseError[];
  validationErrors: readonly PairLanguageValidationError[];
  planErrors: readonly {
    code: 'ASSESSMENT_VERSION_NOT_FOUND' | 'ASSESSMENT_VERSION_NOT_EDITABLE' | 'SIGNAL_SET_EMPTY';
    message: string;
  }[];
  previewGroups: readonly PairLanguagePreviewGroup[];
  summary: AdminPairLanguageImportSummary;
  executionError: string | null;
  formError: string | null;
};

export const initialAdminPairLanguageImportState: AdminPairLanguageImportState = {
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
    pairCount: 0,
    existingRowCount: 0,
    importedRowCount: 0,
    importedPairCount: 0,
  },
  executionError: null,
  formError: null,
};
