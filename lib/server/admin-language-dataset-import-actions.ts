'use server';

import {
  initialAdminLanguageDatasetImportState,
  type AdminLanguageDatasetImportIssue,
  type AdminLanguageDatasetImportPreviewGroup,
  type AdminLanguageDatasetImportState,
  type LanguageImportDataset,
} from '@/lib/admin/admin-language-dataset-import';
import { importHeroHeaderLanguageForAssessmentVersion } from '@/lib/server/admin-hero-header-language-import';
import { importReportLanguageForAssessmentVersion } from '@/lib/server/admin-report-language-import';

type ActionContext = {
  assessmentVersionId: string;
};

type ActionValues = {
  dataset: LanguageImportDataset;
  rawInput: string;
};

function normalizeIssues(
  issues: readonly { message: string }[],
  keyBuilder: (issue: { message: string }, index: number) => string,
): readonly AdminLanguageDatasetImportIssue[] {
  return issues.map((issue, index) => ({
    key: keyBuilder(issue, index),
    message: issue.message,
  }));
}

function normalizePreviewGroups(
  dataset: LanguageImportDataset,
  previewGroups: readonly {
    targetKey: string;
    targetLabel: string;
    entries: readonly Record<string, string | number>[];
  }[],
): readonly AdminLanguageDatasetImportPreviewGroup[] {
  return previewGroups.map((group) => ({
    targetKey: group.targetKey,
    targetLabel: group.targetLabel,
    entries: group.entries.map((entry) => ({
      lineNumber: Number(entry.lineNumber ?? 0),
      label: dataset === 'heroHeader' ? String(entry.label ?? 'headline') : String(entry.label ?? entry.field ?? 'content'),
      content: String(entry.content ?? entry.headline ?? ''),
    })),
  }));
}

function buildEmptyInputState(dataset: LanguageImportDataset, rawInput: string): AdminLanguageDatasetImportState {
  const noun =
    dataset === 'heroHeader'
      ? 'Hero Header'
      : dataset === 'domain'
        ? 'domain chapter'
        : dataset === 'signal'
          ? 'signal'
          : 'pair summary';

  return {
    ...initialAdminLanguageDatasetImportState,
    dataset,
    rawInput,
    formError: `Paste one or more ${noun} rows before continuing.`,
  };
}

export async function importLanguageDatasetAction(
  context: ActionContext,
  values: ActionValues,
): Promise<AdminLanguageDatasetImportState> {
  if (!values.rawInput.trim()) {
    return buildEmptyInputState(values.dataset, values.rawInput);
  }

  if (values.dataset === 'heroHeader') {
    const result = await importHeroHeaderLanguageForAssessmentVersion({
      assessmentVersionId: context.assessmentVersionId,
      rawInput: values.rawInput,
    });

    return {
      dataset: values.dataset,
      rawInput: values.rawInput,
      success: result.success,
      parseErrors: normalizeIssues(result.parseErrors, (issue, index) => `parse-${index}-${issue.message}`),
      validationErrors: normalizeIssues(
        result.validationErrors,
        (issue, index) => `validation-${index}-${issue.message}`,
      ),
      planErrors: normalizeIssues(result.planErrors, (issue, index) => `plan-${index}-${issue.message}`),
      previewGroups: normalizePreviewGroups(values.dataset, result.previewGroups),
      summary: result.summary,
      executionError: result.executionError,
      formError: null,
    };
  }

  const reportSection =
    values.dataset === 'domain'
      ? 'domain'
      : values.dataset === 'signal'
        ? 'signal'
        : 'pair';
  const result = await importReportLanguageForAssessmentVersion({
    assessmentVersionId: context.assessmentVersionId,
    reportSection,
    rawInput: values.rawInput,
  });

  return {
    dataset: values.dataset,
    rawInput: values.rawInput,
    success: result.success,
    parseErrors: normalizeIssues(result.parseErrors, (issue, index) => `parse-${index}-${issue.message}`),
    validationErrors: normalizeIssues(
      result.validationErrors,
      (issue, index) => `validation-${index}-${issue.message}`,
    ),
    planErrors: normalizeIssues(result.planErrors, (issue, index) => `plan-${index}-${issue.message}`),
    previewGroups: normalizePreviewGroups(values.dataset, result.previewGroups),
    summary: result.summary,
    executionError: result.executionError,
    formError: null,
  };
}
