export type HeroImportDataset = 'pairTraitWeight' | 'heroRule' | 'heroLanguage';

export type AdminHeroDatasetImportIssue = {
  key: string;
  message: string;
};

export type AdminHeroDatasetImportPreviewGroup = {
  targetKey: string;
  targetLabel: string;
  entries: readonly {
    lineNumber: number;
    label: string;
    content: string;
  }[];
};

export type AdminHeroDatasetImportState = {
  dataset: HeroImportDataset;
  rawInput: string;
  success: boolean;
  parseErrors: readonly AdminHeroDatasetImportIssue[];
  validationErrors: readonly AdminHeroDatasetImportIssue[];
  planErrors: readonly AdminHeroDatasetImportIssue[];
  previewGroups: readonly AdminHeroDatasetImportPreviewGroup[];
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

export const initialAdminHeroDatasetImportState: AdminHeroDatasetImportState = {
  dataset: 'pairTraitWeight',
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
