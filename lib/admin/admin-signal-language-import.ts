import type {
  SignalLanguageParseError,
  SignalLanguagePreviewGroup,
  SignalLanguageValidationError,
} from '@/lib/admin/signal-language-import';

export type AdminSignalLanguageImportSummary = {
  assessmentVersionId: string | null;
  rowCount: number;
  signalCount: number;
  existingRowCount: number;
  importedRowCount: number;
  importedSignalCount: number;
};

export type AdminSignalLanguageImportState = {
  rawInput: string;
  lastAction: 'idle' | 'preview' | 'import';
  hasSubmitted: boolean;
  success: boolean;
  canImport: boolean;
  parseErrors: readonly SignalLanguageParseError[];
  validationErrors: readonly SignalLanguageValidationError[];
  planErrors: readonly {
    code: 'ASSESSMENT_VERSION_NOT_FOUND' | 'ASSESSMENT_VERSION_NOT_EDITABLE' | 'SIGNAL_SET_EMPTY';
    message: string;
  }[];
  previewGroups: readonly SignalLanguagePreviewGroup[];
  summary: AdminSignalLanguageImportSummary;
  executionError: string | null;
  formError: string | null;
};

export const initialAdminSignalLanguageImportState: AdminSignalLanguageImportState = {
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
    signalCount: 0,
    existingRowCount: 0,
    importedRowCount: 0,
    importedSignalCount: 0,
  },
  executionError: null,
  formError: null,
};
