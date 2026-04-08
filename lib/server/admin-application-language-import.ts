'use server';

import { revalidatePath } from 'next/cache';

import type { AdminLanguageDatasetImportPreviewGroup } from '@/lib/admin/admin-language-dataset-import';
import {
  parseApplicationActionPromptsImport,
  parseApplicationContributionImport,
  parseApplicationDevelopmentImport,
  parseApplicationRiskImport,
  parseApplicationThesisImport,
} from '@/lib/server/application-language-import';
import {
  getAssessmentVersionApplicationLanguage,
  replaceAssessmentVersionApplicationActionPrompts,
  replaceAssessmentVersionApplicationContribution,
  replaceAssessmentVersionApplicationDevelopment,
  replaceAssessmentVersionApplicationRisk,
  replaceAssessmentVersionApplicationThesis,
} from '@/lib/server/assessment-version-application-language';
import { getDbPool } from '@/lib/server/db';

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

type Dependencies = {
  db: Queryable & {
    connect(): Promise<Queryable & { release(): void }>;
  };
  revalidatePath(path: string): void;
};

type PreviewDependencies = {
  db: Queryable;
};

export type ApplicationImportDataset =
  | 'applicationThesis'
  | 'applicationContribution'
  | 'applicationRisk'
  | 'applicationDevelopment'
  | 'applicationActionPrompts';

type AssessmentVersionRow = {
  assessment_id: string;
  assessment_key: string;
  assessment_version_id: string;
  lifecycle_status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
};

type LatestDraftRow = {
  assessment_version_id: string;
};

type AssessmentVersionImportTarget = {
  assessmentId: string;
  assessmentKey: string;
  assessmentVersionId: string;
  lifecycleStatus: AssessmentVersionRow['lifecycle_status'];
};

export type ApplicationLanguageImportPlanError = {
  code:
    | 'ASSESSMENT_VERSION_NOT_FOUND'
    | 'LATEST_DRAFT_NOT_FOUND'
    | 'ASSESSMENT_VERSION_NOT_EDITABLE';
  message: string;
};

export type ApplicationLanguageImportResult = {
  success: boolean;
  canImport: boolean;
  parseErrors: readonly { message: string }[];
  validationErrors: readonly { message: string }[];
  planErrors: readonly ApplicationLanguageImportPlanError[];
  previewGroups: readonly AdminLanguageDatasetImportPreviewGroup[];
  summary: {
    assessmentVersionId: string | null;
    rowCount: number;
    targetCount: number;
    existingRowCount: number;
    importedRowCount: number;
    importedTargetCount: number;
  };
  executionError: string | null;
};

export type ApplicationLanguageImportCommand = {
  assessmentVersionId: string;
  dataset: ApplicationImportDataset;
  rawInput: string;
};

function authoringPath(assessmentKey: string): string {
  return `/admin/assessments/${assessmentKey}/language`;
}

export async function previewApplicationLanguageForAssessmentVersion(
  command: ApplicationLanguageImportCommand,
): Promise<ApplicationLanguageImportResult> {
  return previewApplicationLanguageForAssessmentVersionWithDependencies(command, {
    db: getDbPool(),
  });
}

export async function previewApplicationLanguageForAssessmentVersionWithDependencies(
  command: ApplicationLanguageImportCommand,
  dependencies: PreviewDependencies,
): Promise<ApplicationLanguageImportResult> {
  const parsed = parseByDataset(command.dataset, command.rawInput);
  if (parsed.errors.length > 0) {
    return buildResult({
      assessmentVersionId: command.assessmentVersionId,
      parseErrors: parsed.errors,
      validationErrors: [],
      planErrors: [],
      previewGroups: [],
      existingRowCount: 0,
    });
  }

  const target = await loadWritableDraftTarget(dependencies.db, command.assessmentVersionId);
  const planErrors = buildPlanErrors(target);
  const existingRows = target
    ? await getAssessmentVersionApplicationLanguage(dependencies.db, target.assessmentVersionId)
    : null;

  return buildResult({
    assessmentVersionId: target?.assessmentVersionId ?? command.assessmentVersionId,
    parseErrors: [],
    validationErrors: [],
    planErrors,
    previewGroups: planErrors.length === 0 ? buildPreviewGroups(command.dataset, parsed.rows) : [],
    existingRowCount: existingRows ? getDatasetRowCount(command.dataset, existingRows) : 0,
    rowCount: parsed.rows.length,
    targetCount: countTargets(command.dataset, parsed.rows),
  });
}

export async function importApplicationLanguageForAssessmentVersion(
  command: ApplicationLanguageImportCommand,
): Promise<ApplicationLanguageImportResult> {
  return importApplicationLanguageForAssessmentVersionWithDependencies(command, {
    db: getDbPool(),
    revalidatePath,
  });
}

export async function importApplicationLanguageForAssessmentVersionWithDependencies(
  command: ApplicationLanguageImportCommand,
  dependencies: Dependencies,
): Promise<ApplicationLanguageImportResult> {
  const preview = await previewApplicationLanguageForAssessmentVersionWithDependencies(command, {
    db: dependencies.db,
  });

  if (!preview.canImport) {
    return preview;
  }

  const target = await loadWritableDraftTarget(dependencies.db, command.assessmentVersionId);
  if (!target) {
    return {
      ...preview,
      success: false,
      canImport: false,
      planErrors: buildPlanErrors(null),
    };
  }

  try {
    switch (command.dataset) {
      case 'applicationThesis': {
        const parsed = parseApplicationThesisImport(command.rawInput);
        await replaceAssessmentVersionApplicationThesis(dependencies.db, {
          assessmentVersionId: target.assessmentVersionId,
          rows: parsed.rows,
        });
        return buildSuccessResult(
          preview,
          dependencies,
          target.assessmentKey,
          target.assessmentVersionId,
          parsed.rows.length,
          countTargets(command.dataset, parsed.rows),
        );
      }
      case 'applicationContribution': {
        const parsed = parseApplicationContributionImport(command.rawInput);
        await replaceAssessmentVersionApplicationContribution(dependencies.db, {
          assessmentVersionId: target.assessmentVersionId,
          rows: parsed.rows,
        });
        return buildSuccessResult(
          preview,
          dependencies,
          target.assessmentKey,
          target.assessmentVersionId,
          parsed.rows.length,
          countTargets(command.dataset, parsed.rows),
        );
      }
      case 'applicationRisk': {
        const parsed = parseApplicationRiskImport(command.rawInput);
        await replaceAssessmentVersionApplicationRisk(dependencies.db, {
          assessmentVersionId: target.assessmentVersionId,
          rows: parsed.rows,
        });
        return buildSuccessResult(
          preview,
          dependencies,
          target.assessmentKey,
          target.assessmentVersionId,
          parsed.rows.length,
          countTargets(command.dataset, parsed.rows),
        );
      }
      case 'applicationDevelopment': {
        const parsed = parseApplicationDevelopmentImport(command.rawInput);
        await replaceAssessmentVersionApplicationDevelopment(dependencies.db, {
          assessmentVersionId: target.assessmentVersionId,
          rows: parsed.rows,
        });
        return buildSuccessResult(
          preview,
          dependencies,
          target.assessmentKey,
          target.assessmentVersionId,
          parsed.rows.length,
          countTargets(command.dataset, parsed.rows),
        );
      }
      case 'applicationActionPrompts': {
        const parsed = parseApplicationActionPromptsImport(command.rawInput);
        await replaceAssessmentVersionApplicationActionPrompts(dependencies.db, {
          assessmentVersionId: target.assessmentVersionId,
          rows: parsed.rows,
        });
        return buildSuccessResult(
          preview,
          dependencies,
          target.assessmentKey,
          target.assessmentVersionId,
          parsed.rows.length,
          countTargets(command.dataset, parsed.rows),
        );
      }
    }
  } catch (error) {
    return {
      ...preview,
      success: false,
      canImport: false,
      executionError: error instanceof Error
        ? `${datasetLabel(command.dataset)} import could not be saved: ${error.message}`
        : `${datasetLabel(command.dataset)} import could not be saved.`,
    };
  }
}

function buildSuccessResult(
  preview: ApplicationLanguageImportResult,
  dependencies: Dependencies,
  assessmentKey: string,
  assessmentVersionId: string,
  importedRowCount: number,
  importedTargetCount: number,
): ApplicationLanguageImportResult {
  dependencies.revalidatePath('/admin/assessments');
  dependencies.revalidatePath(authoringPath(assessmentKey));

  return {
    ...preview,
    success: true,
    canImport: false,
    summary: {
      ...preview.summary,
      assessmentVersionId,
      importedRowCount,
      importedTargetCount,
    },
  };
}

async function loadWritableDraftTarget(
  db: Queryable,
  assessmentVersionId: string,
): Promise<AssessmentVersionImportTarget | null> {
  const versionResult = await db.query<AssessmentVersionRow>(
    `
    SELECT
      av.assessment_id,
      a.assessment_key,
      av.id AS assessment_version_id,
      av.lifecycle_status
    FROM assessment_versions av
    INNER JOIN assessments a ON a.id = av.assessment_id
    WHERE av.id = $1
    `,
    [assessmentVersionId],
  );

  const version = versionResult.rows[0] ?? null;
  if (!version) {
    return null;
  }

  const latestDraftResult = await db.query<LatestDraftRow>(
    `
    SELECT
      id AS assessment_version_id
    FROM assessment_versions
    WHERE assessment_id = $1
      AND lifecycle_status = 'DRAFT'
    ORDER BY created_at DESC, id DESC
    LIMIT 1
    `,
    [version.assessment_id],
  );

  const latestDraft = latestDraftResult.rows[0] ?? null;
  if (!latestDraft) {
    return {
      assessmentId: version.assessment_id,
      assessmentKey: version.assessment_key,
      assessmentVersionId: version.assessment_version_id,
      lifecycleStatus: version.lifecycle_status,
    };
  }

  return {
    assessmentId: version.assessment_id,
    assessmentKey: version.assessment_key,
    assessmentVersionId: latestDraft.assessment_version_id,
    lifecycleStatus:
      latestDraft.assessment_version_id === version.assessment_version_id
        ? version.lifecycle_status
        : 'DRAFT',
  };
}

function buildPlanErrors(
  target: AssessmentVersionImportTarget | null,
): readonly ApplicationLanguageImportPlanError[] {
  if (!target) {
    return [{
      code: 'ASSESSMENT_VERSION_NOT_FOUND',
      message: 'The selected assessment version could not be found.',
    }];
  }

  if (target.lifecycleStatus !== 'DRAFT') {
    return [{
      code: 'LATEST_DRAFT_NOT_FOUND',
      message: 'Application Plan imports require an active draft assessment version.',
    }];
  }

  return [];
}

function parseByDataset(dataset: ApplicationImportDataset, rawInput: string) {
  switch (dataset) {
    case 'applicationThesis':
      return parseApplicationThesisImport(rawInput);
    case 'applicationContribution':
      return parseApplicationContributionImport(rawInput);
    case 'applicationRisk':
      return parseApplicationRiskImport(rawInput);
    case 'applicationDevelopment':
      return parseApplicationDevelopmentImport(rawInput);
    case 'applicationActionPrompts':
      return parseApplicationActionPromptsImport(rawInput);
  }
}

function buildPreviewGroups(
  dataset: ApplicationImportDataset,
  rows: readonly Record<string, unknown>[],
): readonly AdminLanguageDatasetImportPreviewGroup[] {
  return rows.map((row, index) => {
    const targetKey =
      dataset === 'applicationThesis'
        ? String(row.heroPatternKey)
        : String(row.sourceKey);

    const targetLabel =
      dataset === 'applicationThesis'
        ? String(row.heroPatternKey)
        : dataset === 'applicationActionPrompts'
          ? `${row.sourceType}:${row.sourceKey}`
          : `${row.sourceType}:${row.sourceKey}#${row.priority}`;

    const entries = Object.entries(row)
      .filter(([key]) => !['heroPatternKey', 'sourceType', 'sourceKey', 'priority'].includes(key))
      .map(([key, value]) => ({
        lineNumber: index + 2,
        label: key,
        content: value === null ? '' : String(value),
      }));

    return {
      targetKey,
      targetLabel,
      entries,
    };
  });
}

function buildResult(params: {
  assessmentVersionId: string | null;
  parseErrors: readonly { lineNumber: number; message: string }[];
  validationErrors: readonly { message: string }[];
  planErrors: readonly ApplicationLanguageImportPlanError[];
  previewGroups: readonly AdminLanguageDatasetImportPreviewGroup[];
  existingRowCount: number;
  rowCount?: number;
  targetCount?: number;
}): ApplicationLanguageImportResult {
  const success =
    params.parseErrors.length === 0 &&
    params.validationErrors.length === 0 &&
    params.planErrors.length === 0;

  return {
    success,
    canImport: success,
    parseErrors: params.parseErrors.map((error) => ({ message: error.message })),
    validationErrors: params.validationErrors.map((error) => ({ message: error.message })),
    planErrors: params.planErrors,
    previewGroups: params.previewGroups,
    summary: {
      assessmentVersionId: params.assessmentVersionId,
      rowCount: params.rowCount ?? 0,
      targetCount: params.targetCount ?? 0,
      existingRowCount: params.existingRowCount,
      importedRowCount: 0,
      importedTargetCount: 0,
    },
    executionError: null,
  };
}

function getDatasetRowCount(
  dataset: ApplicationImportDataset,
  rows: Awaited<ReturnType<typeof getAssessmentVersionApplicationLanguage>>,
): number {
  switch (dataset) {
    case 'applicationThesis':
      return rows.thesis.length;
    case 'applicationContribution':
      return rows.contribution.length;
    case 'applicationRisk':
      return rows.risk.length;
    case 'applicationDevelopment':
      return rows.development.length;
    case 'applicationActionPrompts':
      return rows.prompts.length;
  }
}

function countTargets(dataset: ApplicationImportDataset, rows: readonly Record<string, unknown>[]): number {
  switch (dataset) {
    case 'applicationThesis':
      return new Set(rows.map((row) => String(row.heroPatternKey))).size;
    case 'applicationActionPrompts':
      return new Set(rows.map((row) => `${row.sourceType}|${row.sourceKey}`)).size;
    default:
      return new Set(rows.map((row) => `${row.sourceType}|${row.sourceKey}|${row.priority}`)).size;
  }
}

function datasetLabel(dataset: ApplicationImportDataset): string {
  switch (dataset) {
    case 'applicationThesis':
      return 'Application Thesis';
    case 'applicationContribution':
      return 'Contribution Language';
    case 'applicationRisk':
      return 'Risk Language';
    case 'applicationDevelopment':
      return 'Development Language';
    case 'applicationActionPrompts':
      return 'Action Prompt Language';
  }
}
