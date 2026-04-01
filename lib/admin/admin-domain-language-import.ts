import type {
  DomainLanguageParseError,
  DomainLanguagePreviewGroup,
  DomainLanguageValidationError,
} from '@/lib/admin/domain-language-import';

export type AdminDomainLanguageImportSummary = {
  assessmentVersionId: string | null;
  rowCount: number;
  domainCount: number;
  existingRowCount: number;
  importedRowCount: number;
  importedDomainCount: number;
};

export type AdminDomainLanguageImportState = {
  rawInput: string;
  lastAction: 'idle' | 'preview' | 'import';
  hasSubmitted: boolean;
  success: boolean;
  canImport: boolean;
  parseErrors: readonly DomainLanguageParseError[];
  validationErrors: readonly DomainLanguageValidationError[];
  planErrors: readonly {
    code: 'ASSESSMENT_VERSION_NOT_FOUND' | 'ASSESSMENT_VERSION_NOT_EDITABLE' | 'DOMAIN_SET_EMPTY';
    message: string;
  }[];
  previewGroups: readonly DomainLanguagePreviewGroup[];
  summary: AdminDomainLanguageImportSummary;
  executionError: string | null;
  formError: string | null;
};

export const initialAdminDomainLanguageImportState: AdminDomainLanguageImportState = {
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
    domainCount: 0,
    existingRowCount: 0,
    importedRowCount: 0,
    importedDomainCount: 0,
  },
  executionError: null,
  formError: null,
};
