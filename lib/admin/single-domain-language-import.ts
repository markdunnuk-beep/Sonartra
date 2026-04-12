import type { SingleDomainLanguageDatasetKey } from '@/lib/types/single-domain-language';

export type SingleDomainLanguageImportIssue = {
  key: string;
  message: string;
};

export type SingleDomainLanguageImportPreviewGroup = {
  targetKey: string;
  targetLabel: string;
  entries: readonly {
    lineNumber: number;
    label: string;
    content: string;
  }[];
};

export type SingleDomainLanguageImportState = {
  datasetKey: SingleDomainLanguageDatasetKey;
  rawInput: string;
  success: boolean;
  parseErrors: readonly SingleDomainLanguageImportIssue[];
  validationErrors: readonly SingleDomainLanguageImportIssue[];
  planErrors: readonly SingleDomainLanguageImportIssue[];
  previewGroups: readonly SingleDomainLanguageImportPreviewGroup[];
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

export const initialSingleDomainLanguageImportState: SingleDomainLanguageImportState = {
  datasetKey: 'DOMAIN_FRAMING',
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
