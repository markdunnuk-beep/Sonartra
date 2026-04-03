'use server';

import { revalidatePath } from 'next/cache';

import {
  initialAdminReportLanguageImportState,
  type AdminReportLanguageImportState,
} from '@/lib/admin/admin-report-language-import';
import {
  getReportSectionEmptyInputNoun,
  type ReportLanguageSection,
} from '@/lib/admin/report-language-import';
import {
  importReportLanguageForAssessmentVersion,
  previewReportLanguageForAssessmentVersion,
} from '@/lib/server/admin-report-language-import';

type ReportLanguageActionContext = {
  assessmentVersionId: string;
  reportSection: Exclude<ReportLanguageSection, 'intro'>;
};

type ReportLanguageActionValues = {
  rawInput: string;
};

function buildEmptyInputState(
  reportSection: Exclude<ReportLanguageSection, 'intro'>,
  rawInput: string,
  lastAction: AdminReportLanguageImportState['lastAction'],
): AdminReportLanguageImportState {
  return {
    ...initialAdminReportLanguageImportState,
    reportSection,
    rawInput,
    lastAction,
    hasSubmitted: true,
    formError: `Paste one or more ${getReportSectionEmptyInputNoun(reportSection)} rows before continuing.`,
  };
}

export async function previewReportLanguageAction(
  context: ReportLanguageActionContext,
  values: ReportLanguageActionValues,
): Promise<AdminReportLanguageImportState> {
  if (!values.rawInput.trim()) {
    return buildEmptyInputState(context.reportSection, values.rawInput, 'preview');
  }

  const result = await previewReportLanguageForAssessmentVersion({
    assessmentVersionId: context.assessmentVersionId,
    reportSection: context.reportSection,
    rawInput: values.rawInput,
  });

  return {
    reportSection: context.reportSection,
    rawInput: values.rawInput,
    lastAction: 'preview',
    hasSubmitted: true,
    success: result.success,
    canImport: result.canImport,
    parseErrors: result.parseErrors,
    validationErrors: result.validationErrors,
    planErrors: result.planErrors,
    previewGroups: result.previewGroups,
    summary: result.summary,
    executionError: result.executionError,
    formError: null,
  };
}

export async function importReportLanguageAction(
  context: ReportLanguageActionContext,
  values: ReportLanguageActionValues,
): Promise<AdminReportLanguageImportState> {
  if (!values.rawInput.trim()) {
    return buildEmptyInputState(context.reportSection, values.rawInput, 'import');
  }

  const result = await importReportLanguageForAssessmentVersion({
    assessmentVersionId: context.assessmentVersionId,
    reportSection: context.reportSection,
    rawInput: values.rawInput,
  });

  return {
    reportSection: context.reportSection,
    rawInput: values.rawInput,
    lastAction: 'import',
    hasSubmitted: true,
    success: result.success,
    canImport: result.canImport,
    parseErrors: result.parseErrors,
    validationErrors: result.validationErrors,
    planErrors: result.planErrors,
    previewGroups: result.previewGroups,
    summary: result.summary,
    executionError: result.executionError,
    formError: null,
  };
}

export const reportLanguageImportRevalidate = revalidatePath;
