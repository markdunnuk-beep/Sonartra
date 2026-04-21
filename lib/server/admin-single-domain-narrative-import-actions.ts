'use server';

import {
  initialSingleDomainNarrativeImportState,
  type SingleDomainNarrativeImportIssue,
  type SingleDomainNarrativeImportState,
} from '@/lib/admin/single-domain-narrative-import';
import type { SingleDomainNarrativeDatasetKey } from '@/lib/assessment-language/single-domain-narrative-types';
import {
  importSingleDomainNarrativeSectionForAssessmentVersion,
} from '@/lib/server/admin-single-domain-narrative-import';

type ActionContext = {
  assessmentVersionId: string;
  datasetKey: SingleDomainNarrativeDatasetKey;
};

function normalizeIssues(
  issues: readonly { message: string }[],
  prefix: string,
): readonly SingleDomainNarrativeImportIssue[] {
  return issues.map((issue, index) => ({
    key: `${prefix}-${index}-${issue.message}`,
    message: issue.message,
  }));
}

export async function importSingleDomainNarrativeSectionAction(
  context: ActionContext,
  _previousState: SingleDomainNarrativeImportState,
  formData: FormData,
): Promise<SingleDomainNarrativeImportState> {
  const rawInput = String(formData.get('rawInput') ?? '').trim();

  if (!rawInput) {
    return {
      ...initialSingleDomainNarrativeImportState,
      datasetKey: context.datasetKey,
      rawInput: '',
      formError: 'Paste pipe-delimited rows before importing this section.',
    };
  }

  const result = await importSingleDomainNarrativeSectionForAssessmentVersion({
    assessmentVersionId: context.assessmentVersionId,
    datasetKey: context.datasetKey,
    rawInput,
  });

  return {
    datasetKey: context.datasetKey,
    rawInput,
    success: result.success,
    parseErrors: normalizeIssues(result.parseErrors, 'parse'),
    validationErrors: normalizeIssues(result.validationErrors, 'validation'),
    planErrors: normalizeIssues(result.planErrors, 'plan'),
    executionError: result.executionError,
    formError: null,
    latestValidationResult: result.latestValidationResult,
    summary: result.summary,
  };
}
