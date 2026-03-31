'use server';

import { revalidatePath } from 'next/cache';

import {
  buildBulkWeightImportPlan,
  buildBulkWeightImportPreview,
  type BulkWeightGroupValidationError,
  type BulkWeightGroupValidationWarning,
  type BulkWeightImportPlanError,
  type BulkWeightImportTargetAssessmentVersion,
  type BulkWeightImportTargetOption,
  type BulkWeightImportTargetQuestion,
  type BulkWeightImportTargetSignal,
  type BulkWeightParseError,
  type PlannedBulkWeightGroupImport,
  normalizeBulkWeightOptionLabel,
} from '@/lib/admin/bulk-weight-import';
import { getDbPool } from '@/lib/server/db';

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

type TransactionClient = Queryable & {
  release(): void;
};

type BulkWeightImportDependencies = {
  connect(): Promise<TransactionClient>;
  revalidatePath(path: string): void;
};

type BulkWeightImportPreviewDependencies = {
  db: Queryable;
};

type AssessmentVersionRow = {
  assessment_key: string;
  assessment_version_id: string;
  lifecycle_status: BulkWeightImportTargetAssessmentVersion['lifecycleStatus'];
};

type ImportQuestionRow = {
  question_id: string;
  question_key: string;
  order_index: string | number;
};

type ImportOptionRow = {
  option_id: string;
  question_id: string;
  option_key: string;
  option_label: string | null;
  question_order_index: string | number;
};

type ImportSignalRow = {
  signal_id: string;
  signal_key: string;
};

type ImportWeightRow = {
  option_signal_weight_id: string;
  option_id: string;
};

type DeletedWeightRow = {
  id: string;
};

type InsertedWeightRow = {
  id: string;
};

export type BulkWeightImportCommand = {
  assessmentVersionId: string;
  rawInput: string;
  actorUserId?: string;
};

export type BulkWeightImportExecutionSummary = {
  assessmentVersionId: string;
  questionCountMatched: number;
  optionGroupCountMatched: number;
  optionGroupCountImported: number;
  weightsInserted: number;
  weightsDeleted: number;
};

export type BulkWeightImportPreviewSummary = {
  assessmentVersionId: string | null;
  optionGroupCount: number;
  questionCountMatched: number;
  optionGroupCountMatched: number;
  optionGroupCountImported: number;
  weightsInserted: number;
  weightsDeleted: number;
};

export type BulkWeightImportPreviewResult = {
  success: boolean;
  canImport: boolean;
  parseErrors: BulkWeightParseError[];
  groupErrors: BulkWeightGroupValidationError[];
  planErrors: BulkWeightImportPlanError[];
  warnings: BulkWeightGroupValidationWarning[];
  weightGroups: ReturnType<typeof buildBulkWeightImportPreview>['weightGroups'];
  plannedOptionGroups: readonly PlannedBulkWeightGroupImport[];
  summary: BulkWeightImportPreviewSummary;
  executionError: string | null;
};

export type BulkWeightImportExecutionResult = {
  success: boolean;
  canImport: boolean;
  parseErrors: BulkWeightParseError[];
  groupErrors: BulkWeightGroupValidationError[];
  planErrors: BulkWeightImportPlanError[];
  warnings: BulkWeightGroupValidationWarning[];
  weightGroups: ReturnType<typeof buildBulkWeightImportPreview>['weightGroups'];
  plannedOptionGroups: readonly PlannedBulkWeightGroupImport[];
  summary: BulkWeightImportExecutionSummary & {
    optionGroupCount: number;
  };
  importedOptionGroupCount: number;
  insertedWeightCount: number;
  deletedWeightCount: number;
  executionError: string | null;
};

function authoringPath(assessmentKey: string): string {
  return `/admin/assessments/${assessmentKey}`;
}

export async function previewBulkWeightsForAssessmentVersion(
  command: BulkWeightImportCommand,
): Promise<BulkWeightImportPreviewResult> {
  return previewBulkWeightsForAssessmentVersionWithDependencies(command, {
    db: getDbPool(),
  });
}

export async function previewBulkWeightsForAssessmentVersionWithDependencies(
  command: BulkWeightImportCommand,
  dependencies: BulkWeightImportPreviewDependencies,
): Promise<BulkWeightImportPreviewResult> {
  const preview = buildBulkWeightImportPreview(command.rawInput);

  if (preview.parseErrors.length > 0 || preview.groupErrors.length > 0) {
    return {
      success: false,
      canImport: false,
      parseErrors: preview.parseErrors,
      groupErrors: preview.groupErrors,
      planErrors: [],
      warnings: preview.warnings,
      weightGroups: preview.weightGroups,
      plannedOptionGroups: [],
      summary: {
        assessmentVersionId: command.assessmentVersionId,
        optionGroupCount: preview.weightGroups.length,
        questionCountMatched: 0,
        optionGroupCountMatched: 0,
        optionGroupCountImported: 0,
        weightsInserted: 0,
        weightsDeleted: 0,
      },
      executionError: null,
    };
  }

  const assessmentVersion = await loadAssessmentVersionForImport(
    dependencies.db,
    command.assessmentVersionId,
  );
  const questions = await loadTargetQuestionsForImport(dependencies.db, command.assessmentVersionId);
  const options = await loadTargetOptionsForImport(dependencies.db, command.assessmentVersionId);
  const signals = await loadTargetSignalsForImport(dependencies.db, command.assessmentVersionId);
  const plan = buildBulkWeightImportPlan({
    assessmentVersion,
    questions,
    options,
    signals,
    validatedWeightGroups: preview.weightGroups,
  });

  return {
    success: plan.success,
    canImport: plan.success,
    parseErrors: preview.parseErrors,
    groupErrors: preview.groupErrors,
    planErrors: plan.errors,
    warnings: preview.warnings,
    weightGroups: preview.weightGroups,
    plannedOptionGroups: plan.plannedOptionGroups,
    summary: {
      assessmentVersionId: plan.summary.assessmentVersionId,
      optionGroupCount: plan.summary.optionGroupCount,
      questionCountMatched: plan.summary.questionCountMatched,
      optionGroupCountMatched: plan.summary.optionGroupCountMatched,
      optionGroupCountImported: 0,
      weightsInserted: plan.summary.weightsToInsert,
      weightsDeleted: plan.summary.existingWeightsToDelete,
    },
    executionError: null,
  };
}

export async function importBulkWeightsForAssessmentVersion(
  command: BulkWeightImportCommand,
): Promise<BulkWeightImportExecutionResult> {
  return importBulkWeightsForAssessmentVersionWithDependencies(command, {
    connect: () => getDbPool().connect(),
    revalidatePath,
  });
}

export async function importBulkWeightsForAssessmentVersionWithDependencies(
  command: BulkWeightImportCommand,
  dependencies: BulkWeightImportDependencies,
): Promise<BulkWeightImportExecutionResult> {
  const preview = buildBulkWeightImportPreview(command.rawInput);

  if (preview.parseErrors.length > 0 || preview.groupErrors.length > 0) {
    return buildFailedExecutionResult({
      assessmentVersionId: command.assessmentVersionId,
      parseErrors: preview.parseErrors,
      groupErrors: preview.groupErrors,
      planErrors: [],
      warnings: preview.warnings,
      weightGroups: preview.weightGroups,
      plannedOptionGroups: [],
      optionGroupCount: preview.weightGroups.length,
      questionCountMatched: 0,
      executionError: null,
    });
  }

  let client: TransactionClient | null = null;

  try {
    client = await dependencies.connect();
    await client.query('BEGIN');

    const assessmentVersion = await loadAssessmentVersionForImport(client, command.assessmentVersionId);
    const questions = await loadTargetQuestionsForImport(client, command.assessmentVersionId);
    const options = await loadTargetOptionsForImport(client, command.assessmentVersionId);
    const signals = await loadTargetSignalsForImport(client, command.assessmentVersionId);
    const plan = buildBulkWeightImportPlan({
      assessmentVersion,
      questions,
      options,
      signals,
      validatedWeightGroups: preview.weightGroups,
    });

    if (!plan.success || !assessmentVersion) {
      await client.query('ROLLBACK');
      return buildFailedExecutionResult({
        assessmentVersionId: command.assessmentVersionId,
        parseErrors: preview.parseErrors,
        groupErrors: preview.groupErrors,
        planErrors: plan.errors,
        warnings: preview.warnings,
        weightGroups: preview.weightGroups,
        plannedOptionGroups: plan.plannedOptionGroups,
        optionGroupCount: plan.summary.optionGroupCount,
        questionCountMatched: plan.summary.questionCountMatched,
        executionError: null,
      });
    }

    const executionSummary = await executeBulkWeightImportPlan({
      db: client,
      assessmentVersionId: assessmentVersion.assessmentVersionId,
      plannedOptionGroups: plan.plannedOptionGroups,
    });

    await client.query('COMMIT');

    dependencies.revalidatePath('/admin/assessments');
    dependencies.revalidatePath(authoringPath(assessmentVersion.assessmentKey));

    return {
      success: true,
      canImport: false,
      parseErrors: [],
      groupErrors: [],
      planErrors: [],
      warnings: preview.warnings,
      weightGroups: preview.weightGroups,
      plannedOptionGroups: plan.plannedOptionGroups,
      summary: {
        ...executionSummary,
        optionGroupCount: plan.summary.optionGroupCount,
      },
      importedOptionGroupCount: executionSummary.optionGroupCountImported,
      insertedWeightCount: executionSummary.weightsInserted,
      deletedWeightCount: executionSummary.weightsDeleted,
      executionError: null,
    };
  } catch {
    if (client) {
      await client.query('ROLLBACK').catch(() => undefined);
    }

    return buildFailedExecutionResult({
      assessmentVersionId: command.assessmentVersionId,
      parseErrors: preview.parseErrors,
      groupErrors: preview.groupErrors,
      planErrors: [],
      warnings: preview.warnings,
      weightGroups: preview.weightGroups,
      plannedOptionGroups: [],
      optionGroupCount: preview.weightGroups.length,
      questionCountMatched: 0,
      executionError: 'Bulk weight import could not be saved. Try again.',
    });
  } finally {
    client?.release();
  }
}

async function loadAssessmentVersionForImport(
  db: Queryable,
  assessmentVersionId: string,
): Promise<BulkWeightImportTargetAssessmentVersion | null> {
  const result = await db.query<AssessmentVersionRow>(
    `
    SELECT
      a.assessment_key,
      av.id AS assessment_version_id,
      av.lifecycle_status
    FROM assessment_versions av
    INNER JOIN assessments a ON a.id = av.assessment_id
    WHERE av.id = $1
    `,
    [assessmentVersionId],
  );

  const row = result.rows[0] ?? null;
  if (!row) {
    return null;
  }

  return {
    assessmentVersionId: row.assessment_version_id,
    assessmentKey: row.assessment_key,
    lifecycleStatus: row.lifecycle_status,
  };
}

async function loadTargetQuestionsForImport(
  db: Queryable,
  assessmentVersionId: string,
): Promise<readonly BulkWeightImportTargetQuestion[]> {
  const result = await db.query<ImportQuestionRow>(
    `
    SELECT
      id AS question_id,
      question_key,
      order_index
    FROM questions
    WHERE assessment_version_id = $1
    ORDER BY order_index ASC, id ASC
    `,
    [assessmentVersionId],
  );

  return result.rows.map((row) => ({
    questionId: row.question_id,
    questionNumber: Number(row.order_index) + 1,
    questionKey: row.question_key,
  }));
}

async function loadTargetOptionsForImport(
  db: Queryable,
  assessmentVersionId: string,
): Promise<readonly BulkWeightImportTargetOption[]> {
  const optionsResult = await db.query<ImportOptionRow>(
    `
    SELECT
      o.id AS option_id,
      o.question_id,
      o.option_key,
      o.option_label,
      q.order_index AS question_order_index
    FROM options o
    INNER JOIN questions q ON q.id = o.question_id
    WHERE q.assessment_version_id = $1
    ORDER BY q.order_index ASC, o.order_index ASC, o.id ASC
    `,
    [assessmentVersionId],
  );

  const existingWeightsResult = await db.query<ImportWeightRow>(
    `
    SELECT
      osw.id AS option_signal_weight_id,
      osw.option_id
    FROM option_signal_weights osw
    INNER JOIN options o ON o.id = osw.option_id
    INNER JOIN questions q ON q.id = o.question_id
    WHERE q.assessment_version_id = $1
    ORDER BY osw.option_id ASC, osw.id ASC
    `,
    [assessmentVersionId],
  );

  const existingWeightIdsByOptionId = new Map<string, string[]>();
  for (const row of existingWeightsResult.rows) {
    const existing = existingWeightIdsByOptionId.get(row.option_id);
    if (existing) {
      existing.push(row.option_signal_weight_id);
      continue;
    }

    existingWeightIdsByOptionId.set(row.option_id, [row.option_signal_weight_id]);
  }

  return optionsResult.rows
    .map((row) => {
      const optionLabel = normalizeBulkWeightOptionLabel(row.option_label ?? '');
      if (!optionLabel) {
        return null;
      }

      return {
      optionId: row.option_id,
      questionId: row.question_id,
      questionNumber: Number(row.question_order_index) + 1,
      optionLabel,
      optionKey: row.option_key,
      existingWeightRowIds: [...(existingWeightIdsByOptionId.get(row.option_id) ?? [])],
      };
    })
    .filter((row): row is BulkWeightImportTargetOption => row !== null);
}

async function loadTargetSignalsForImport(
  db: Queryable,
  assessmentVersionId: string,
): Promise<readonly BulkWeightImportTargetSignal[]> {
  const result = await db.query<ImportSignalRow>(
    `
    SELECT
      id AS signal_id,
      signal_key
    FROM signals
    WHERE assessment_version_id = $1
    ORDER BY signal_key ASC, id ASC
    `,
    [assessmentVersionId],
  );

  return result.rows.map((row) => ({
    signalId: row.signal_id,
    signalKey: row.signal_key,
  }));
}

async function executeBulkWeightImportPlan(params: {
  db: Queryable;
  assessmentVersionId: string;
  plannedOptionGroups: readonly PlannedBulkWeightGroupImport[];
}): Promise<BulkWeightImportExecutionSummary> {
  let weightsDeleted = 0;
  let weightsInserted = 0;

  for (const optionGroup of params.plannedOptionGroups) {
    const deletedWeights = await params.db.query<DeletedWeightRow>(
      `
      DELETE FROM option_signal_weights
      WHERE option_id = $1
      RETURNING id
      `,
      [optionGroup.optionId],
    );

    weightsDeleted += deletedWeights.rows.length;

    for (const replacementWeight of optionGroup.replacementWeights) {
      const insertedWeight = await params.db.query<InsertedWeightRow>(
        `
        INSERT INTO option_signal_weights (
          option_id,
          signal_id,
          weight,
          source_weight_key
        )
        VALUES ($1, $2, $3::numeric(12, 4), $4)
        RETURNING id
        `,
        [
          optionGroup.optionId,
          replacementWeight.signalId,
          formatWeightForStorage(replacementWeight.weight),
          `${optionGroup.questionNumber}|${optionGroup.optionLabel}`,
        ],
      );

      if (!insertedWeight.rows[0]?.id) {
        throw new Error('WEIGHT_INSERT_FAILED');
      }

      weightsInserted += 1;
    }
  }

  return {
    assessmentVersionId: params.assessmentVersionId,
    questionCountMatched: new Set(params.plannedOptionGroups.map((group) => group.questionId)).size,
    optionGroupCountMatched: params.plannedOptionGroups.length,
    optionGroupCountImported: params.plannedOptionGroups.length,
    weightsInserted,
    weightsDeleted,
  };
}

function buildFailedExecutionResult(params: {
  assessmentVersionId: string;
  parseErrors: BulkWeightParseError[];
  groupErrors: BulkWeightGroupValidationError[];
  planErrors: BulkWeightImportPlanError[];
  warnings: BulkWeightGroupValidationWarning[];
  weightGroups: ReturnType<typeof buildBulkWeightImportPreview>['weightGroups'];
  plannedOptionGroups: readonly PlannedBulkWeightGroupImport[];
  optionGroupCount: number;
  questionCountMatched: number;
  executionError: string | null;
}): BulkWeightImportExecutionResult {
  return {
    success: false,
    canImport: false,
    parseErrors: params.parseErrors,
    groupErrors: params.groupErrors,
    planErrors: params.planErrors,
    warnings: params.warnings,
    weightGroups: params.weightGroups,
    plannedOptionGroups: params.plannedOptionGroups,
    summary: {
      assessmentVersionId: params.assessmentVersionId,
      optionGroupCount: params.optionGroupCount,
      questionCountMatched: params.questionCountMatched,
      optionGroupCountMatched: 0,
      optionGroupCountImported: 0,
      weightsInserted: 0,
      weightsDeleted: 0,
    },
    importedOptionGroupCount: 0,
    insertedWeightCount: 0,
    deletedWeightCount: 0,
    executionError: params.executionError,
  };
}

function formatWeightForStorage(value: number): string {
  return value.toFixed(4);
}
