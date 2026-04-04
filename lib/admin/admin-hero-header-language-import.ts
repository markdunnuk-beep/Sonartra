import type {
  HeroHeaderParseError,
  HeroHeaderValidationError,
} from '@/lib/admin/hero-header-language-import';

export type AdminHeroHeaderPreviewGroup = {
  targetKey: string;
  targetLabel: string;
  entries: readonly {
    lineNumber: number;
    headline: string;
  }[];
};

export type AdminHeroHeaderImportState = {
  rawInput: string;
  lastAction: 'idle' | 'preview' | 'import';
  hasSubmitted: boolean;
  success: boolean;
  canImport: boolean;
  parseErrors: readonly HeroHeaderParseError[];
  validationErrors: readonly HeroHeaderValidationError[];
  planErrors: readonly {
    code:
      | 'ASSESSMENT_VERSION_NOT_FOUND'
      | 'ASSESSMENT_VERSION_NOT_EDITABLE'
      | 'SIGNAL_SET_EMPTY';
    message: string;
  }[];
  previewGroups: readonly AdminHeroHeaderPreviewGroup[];
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

export const initialAdminHeroHeaderImportState: AdminHeroHeaderImportState = {
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
