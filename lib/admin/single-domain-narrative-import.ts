import type { SingleDomainNarrativeDatasetKey } from '@/lib/assessment-language/single-domain-narrative-types';

export type SingleDomainNarrativeImportIssue = {
  key: string;
  message: string;
};

export type SingleDomainNarrativeImportState = {
  datasetKey: SingleDomainNarrativeDatasetKey;
  rawInput: string;
  success: boolean;
  parseErrors: readonly SingleDomainNarrativeImportIssue[];
  validationErrors: readonly SingleDomainNarrativeImportIssue[];
  planErrors: readonly SingleDomainNarrativeImportIssue[];
  executionError: string | null;
  formError: string | null;
  latestValidationResult: string | null;
  summary: {
    assessmentVersionId: string | null;
    rowCount: number;
    existingRowCount: number;
    importedRowCount: number;
  };
};

export const initialSingleDomainNarrativeImportState: SingleDomainNarrativeImportState = {
  datasetKey: 'SINGLE_DOMAIN_INTRO',
  rawInput: '',
  success: false,
  parseErrors: [],
  validationErrors: [],
  planErrors: [],
  executionError: null,
  formError: null,
  latestValidationResult: null,
  summary: {
    assessmentVersionId: null,
    rowCount: 0,
    existingRowCount: 0,
    importedRowCount: 0,
  },
};
