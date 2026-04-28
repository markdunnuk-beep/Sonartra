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
  type SingleDomainLanguageImportResult,
} from '@/lib/server/admin-single-domain-language-import';
import type { SingleDomainLanguageDatasetKey } from '@/lib/types/single-domain-language';

type ActionContext = {
  assessmentVersionId: string;
};

type ActionValues = {
  datasetKey: SingleDomainLanguageDatasetKey;
  rawInput: string;
};

type ImportExecutor = (command: {
  assessmentVersionId: string;
  datasetKey: SingleDomainLanguageDatasetKey;
  rawInput: string;
}) => Promise<SingleDomainLanguageImportResult>;

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
  previousStateOrValues: SingleDomainLanguageImportState | ActionValues,
  maybeFormData?: FormData,
): Promise<SingleDomainLanguageImportState> {
  return importSingleDomainLanguageDatasetActionWithExecutor(
    context,
    previousStateOrValues,
    maybeFormData,
    importSingleDomainLanguageDatasetForAssessmentVersion,
  );
}

function isActionValues(value: unknown): value is ActionValues {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return 'datasetKey' in value && 'rawInput' in value;
}

function normalizeActionValues(
  previousStateOrValues: SingleDomainLanguageImportState | ActionValues,
  maybeFormData?: FormData,
): ActionValues {
  if (maybeFormData instanceof FormData) {
    return {
      datasetKey: String(maybeFormData.get('datasetKey') ?? '') as SingleDomainLanguageDatasetKey,
      rawInput: String(maybeFormData.get('rawInput') ?? ''),
    };
  }

  if (isActionValues(previousStateOrValues)) {
    return previousStateOrValues;
  }

  const previousState = previousStateOrValues as SingleDomainLanguageImportState;

  return {
    datasetKey: previousState.datasetKey,
    rawInput: previousState.rawInput,
  };
}

export async function importSingleDomainLanguageDatasetActionWithExecutor(
  context: ActionContext,
  previousStateOrValues: SingleDomainLanguageImportState | ActionValues,
  maybeFormData: FormData | undefined,
  executor: ImportExecutor,
): Promise<SingleDomainLanguageImportState> {
  const values = normalizeActionValues(previousStateOrValues, maybeFormData);

  if (!values.rawInput.trim()) {
    return buildEmptyInputState(values.datasetKey, values.rawInput);
  }

  const result = await executor({
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
