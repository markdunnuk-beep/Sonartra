'use server';

import {
  initialSingleDomainLanguageImportState,
  type SingleDomainLanguageImportIssue,
  type SingleDomainLanguageImportPreviewGroup,
  type SingleDomainLanguageImportState,
} from '@/lib/admin/single-domain-language-import';
import {
  getSingleDomainLanguageDatasetDefinition,
} from '@/lib/admin/single-domain-language-datasets';
import {
  importSingleDomainLanguageDatasetForAssessmentVersion,
} from '@/lib/server/admin-single-domain-language-import';
import type { SingleDomainLanguageDatasetKey } from '@/lib/types/single-domain-language';

type ActionContext = {
  assessmentVersionId: string;
};

type ActionValues = {
  datasetKey: SingleDomainLanguageDatasetKey;
  rawInput: string;
};

function normalizeIssues(
  issues: readonly { message: string }[],
  keyBuilder: (issue: { message: string }, index: number) => string,
): readonly SingleDomainLanguageImportIssue[] {
  return issues.map((issue, index) => ({
    key: keyBuilder(issue, index),
    message: issue.message,
  }));
}

function normalizePreviewGroups(
  previewGroups: readonly SingleDomainLanguageImportPreviewGroup[],
): readonly SingleDomainLanguageImportPreviewGroup[] {
  return previewGroups.map((group) => ({
    targetKey: group.targetKey,
    targetLabel: group.targetLabel,
    entries: group.entries.map((entry) => ({
      lineNumber: entry.lineNumber,
      label: entry.label,
      content: entry.content,
    })),
  }));
}

function buildEmptyInputState(
  datasetKey: SingleDomainLanguageDatasetKey,
  rawInput: string,
): SingleDomainLanguageImportState {
  const definition = getSingleDomainLanguageDatasetDefinition(datasetKey);

  return {
    ...initialSingleDomainLanguageImportState,
    datasetKey,
    rawInput,
    formError: `Paste ${definition.label} rows before importing.`,
  };
}

export async function importSingleDomainLanguageDatasetAction(
  context: ActionContext,
  values: ActionValues,
): Promise<SingleDomainLanguageImportState> {
  if (!values.rawInput.trim()) {
    return buildEmptyInputState(values.datasetKey, values.rawInput);
  }

  const result = await importSingleDomainLanguageDatasetForAssessmentVersion({
    assessmentVersionId: context.assessmentVersionId,
    datasetKey: values.datasetKey,
    rawInput: values.rawInput,
  });

  return {
    datasetKey: values.datasetKey,
    rawInput: values.rawInput,
    success: result.success,
    parseErrors: normalizeIssues(result.parseErrors, (issue, index) => `parse-${index}-${issue.message}`),
    validationErrors: normalizeIssues(
      result.validationErrors,
      (issue, index) => `validation-${index}-${issue.message}`,
    ),
    planErrors: normalizeIssues(result.planErrors, (issue, index) => `plan-${index}-${issue.message}`),
    previewGroups: normalizePreviewGroups(result.previewGroups),
    summary: result.summary,
    executionError: result.executionError,
    formError: null,
  };
}
