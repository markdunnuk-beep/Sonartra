'use server';

import { revalidatePath } from 'next/cache';

import {
  buildBulkOptionImportPlan,
  buildBulkOptionImportPreview,
  type BulkOptionGroupValidationError,
  type BulkOptionGroupValidationWarning,
  type BulkOptionImportPlanError,
  type BulkOptionImportTargetAssessmentVersion,
  type BulkOptionImportTargetQuestion,
  type BulkOptionParseError,
  type PlannedBulkOptionQuestionImport,
} from '@/lib/admin/bulk-option-import';
import { getDbPool } from '@/lib/server/db';
import { generateOptionKey } from '@/lib/utils/key-generator';

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

type TransactionClient = Queryable & {
  release(): void;
};

type BulkOptionImportDependencies = {
  connect(): Promise<TransactionClient>;
  revalidatePath(path: string): void;
};

type BulkOptionImportPreviewDependencies = {
  db: Queryable;
};

type AssessmentVersionRow = {
  assessment_key: string;
  assessment_version_id: string;
  lifecycle_status: BulkOptionImportTargetAssessmentVersion['lifecycleStatus'];
};

type ImportQuestionRow = {
  question_id: string;
  question_key: string;
  order_index: string | number;
};

type ImportOptionRow = {
  option_id: string;
  question_id: string;
};

type DeletedOptionRow = {
  id: string;
};

type InsertedOptionRow = {
  id: string;
};

export type BulkOptionImportCommand = {
  assessmentVersionId: string;
  rawInput: string;
  actorUserId?: string;
};

export type BulkOptionImportExecutionSummary = {
  assessmentVersionId: string;
  questionsMatched: number;
  questionsImported: number;
  optionsInserted: number;
  existingOptionsDeleted: number;
};

export type BulkOptionImportPreviewSummary = {
  assessmentVersionId: string | null;
  questionGroupCount: number;
  questionsMatched: number;
  questionsImported: number;
  optionsInserted: number;
  existingOptionsDeleted: number;
};

export type BulkOptionImportPreviewResult = {
  success: boolean;
  canImport: boolean;
  parseErrors: BulkOptionParseError[];
  groupErrors: BulkOptionGroupValidationError[];
  planErrors: BulkOptionImportPlanError[];
  warnings: BulkOptionGroupValidationWarning[];
  questionGroups: ReturnType<typeof buildBulkOptionImportPreview>['questionGroups'];
  plannedQuestions: readonly PlannedBulkOptionQuestionImport[];
  summary: BulkOptionImportPreviewSummary;
  executionError: string | null;
};

export type BulkOptionImportExecutionResult = {
  success: boolean;
  canImport: boolean;
  parseErrors: BulkOptionParseError[];
  groupErrors: BulkOptionGroupValidationError[];
  planErrors: BulkOptionImportPlanError[];
  warnings: BulkOptionGroupValidationWarning[];
  questionGroups: ReturnType<typeof buildBulkOptionImportPreview>['questionGroups'];
  plannedQuestions: readonly PlannedBulkOptionQuestionImport[];
  summary: BulkOptionImportExecutionSummary & {
    questionGroupCount: number;
  };
  importedQuestionCount: number;
  importedOptionCount: number;
  skippedQuestionCount: number;
  executionError: string | null;
};

function authoringPath(assessmentKey: string): string {
  return `/admin/assessments/${assessmentKey}`;
}

function responsesAuthoringPath(assessmentKey: string): string {
  return `${authoringPath(assessmentKey)}/responses`;
}

export async function previewBulkOptionsForAssessmentVersion(
  command: BulkOptionImportCommand,
): Promise<BulkOptionImportPreviewResult> {
  return previewBulkOptionsForAssessmentVersionWithDependencies(command, {
    db: getDbPool(),
  });
}

export async function previewBulkOptionsForAssessmentVersionWithDependencies(
  command: BulkOptionImportCommand,
  dependencies: BulkOptionImportPreviewDependencies,
): Promise<BulkOptionImportPreviewResult> {
  const preview = buildBulkOptionImportPreview(command.rawInput);

  if (preview.parseErrors.length > 0 || preview.groupErrors.length > 0) {
    return buildPreviewResult({
      success: false,
      canImport: false,
      parseErrors: preview.parseErrors,
      groupErrors: preview.groupErrors,
      planErrors: [],
      warnings: preview.warnings,
      questionGroups: preview.questionGroups,
      plannedQuestions: [],
      summary: {
        assessmentVersionId: command.assessmentVersionId,
        questionGroupCount: preview.questionGroups.length,
        questionsMatched: 0,
        questionsImported: 0,
        optionsInserted: 0,
        existingOptionsDeleted: 0,
      },
      executionError: null,
    });
  }

  const assessmentVersion = await loadAssessmentVersionForImport(
    dependencies.db,
    command.assessmentVersionId,
  );
  const questions = await loadTargetQuestionsForImport(dependencies.db, command.assessmentVersionId);
  const plan = buildBulkOptionImportPlan({
    assessmentVersion,
    questions,
    validatedQuestionGroups: preview.questionGroups,
  });

  return buildPreviewResult({
    success: plan.success,
    canImport: plan.success,
    parseErrors: preview.parseErrors,
    groupErrors: preview.groupErrors,
    planErrors: plan.errors,
    warnings: preview.warnings,
    questionGroups: preview.questionGroups,
    plannedQuestions: plan.plannedQuestions,
    summary: {
      assessmentVersionId: plan.summary.assessmentVersionId,
      questionGroupCount: plan.summary.questionGroupCount,
      questionsMatched: plan.summary.questionsMatched,
      questionsImported: 0,
      optionsInserted: plan.summary.optionsToInsert,
      existingOptionsDeleted: plan.summary.existingOptionsToDelete,
    },
    executionError: null,
  });
}

export async function importBulkOptionsForAssessmentVersion(
  command: BulkOptionImportCommand,
): Promise<BulkOptionImportExecutionResult> {
  return importBulkOptionsForAssessmentVersionWithDependencies(command, {
    connect: () => getDbPool().connect(),
    revalidatePath,
  });
}

export async function importBulkOptionsForAssessmentVersionWithDependencies(
  command: BulkOptionImportCommand,
  dependencies: BulkOptionImportDependencies,
): Promise<BulkOptionImportExecutionResult> {
  const preview = buildBulkOptionImportPreview(command.rawInput);

  if (preview.parseErrors.length > 0 || preview.groupErrors.length > 0) {
    return buildFailedExecutionResult({
      assessmentVersionId: command.assessmentVersionId,
      parseErrors: preview.parseErrors,
      groupErrors: preview.groupErrors,
      planErrors: [],
      warnings: preview.warnings,
      questionGroups: preview.questionGroups,
      plannedQuestions: [],
      questionGroupCount: preview.questionGroups.length,
      questionsMatched: 0,
      executionError: null,
    });
  }

  let client: TransactionClient | null = null;

  try {
    client = await dependencies.connect();
    await client.query('BEGIN');

    const assessmentVersion = await loadAssessmentVersionForImport(client, command.assessmentVersionId);
    const questions = await loadTargetQuestionsForImport(client, command.assessmentVersionId);
    const plan = buildBulkOptionImportPlan({
      assessmentVersion,
      questions,
      validatedQuestionGroups: preview.questionGroups,
    });

    if (!plan.success || !assessmentVersion) {
      await client.query('ROLLBACK');
      return buildFailedExecutionResult({
        assessmentVersionId: command.assessmentVersionId,
        parseErrors: preview.parseErrors,
        groupErrors: preview.groupErrors,
        planErrors: plan.errors,
        warnings: preview.warnings,
        questionGroups: preview.questionGroups,
        plannedQuestions: plan.plannedQuestions,
        questionGroupCount: plan.summary.questionGroupCount,
        questionsMatched: plan.summary.questionsMatched,
        executionError: null,
      });
    }

    const executionSummary = await executeBulkOptionImportPlan({
      db: client,
      assessmentVersionId: assessmentVersion.assessmentVersionId,
      plannedQuestions: plan.plannedQuestions,
    });

    await client.query('COMMIT');

    dependencies.revalidatePath('/admin/assessments');
    dependencies.revalidatePath(authoringPath(assessmentVersion.assessmentKey));
    dependencies.revalidatePath(responsesAuthoringPath(assessmentVersion.assessmentKey));

    return {
      success: true,
      canImport: false,
      parseErrors: [],
      groupErrors: [],
      planErrors: [],
      warnings: preview.warnings,
      questionGroups: preview.questionGroups,
      plannedQuestions: plan.plannedQuestions,
      summary: {
        ...executionSummary,
        questionGroupCount: plan.summary.questionGroupCount,
      },
      importedQuestionCount: executionSummary.questionsImported,
      importedOptionCount: executionSummary.optionsInserted,
      skippedQuestionCount: 0,
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
      questionGroups: preview.questionGroups,
      plannedQuestions: [],
      questionGroupCount: preview.questionGroups.length,
      questionsMatched: 0,
      executionError: 'Bulk option import could not be saved. Try again.',
    });
  } finally {
    client?.release();
  }
}

async function loadAssessmentVersionForImport(
  db: Queryable,
  assessmentVersionId: string,
): Promise<BulkOptionImportTargetAssessmentVersion | null> {
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
): Promise<readonly BulkOptionImportTargetQuestion[]> {
  const questionsResult = await db.query<ImportQuestionRow>(
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

  const optionsResult = await db.query<ImportOptionRow>(
    `
    SELECT
      o.id AS option_id,
      o.question_id
    FROM options o
    INNER JOIN questions q ON q.id = o.question_id
    WHERE q.assessment_version_id = $1
    ORDER BY q.order_index ASC, o.order_index ASC, o.id ASC
    `,
    [assessmentVersionId],
  );

  const optionIdsByQuestionId = new Map<string, string[]>();
  for (const row of optionsResult.rows) {
    const existingOptionIds = optionIdsByQuestionId.get(row.question_id);
    if (existingOptionIds) {
      existingOptionIds.push(row.option_id);
      continue;
    }

    optionIdsByQuestionId.set(row.question_id, [row.option_id]);
  }

  return questionsResult.rows.map((row) => ({
    questionId: row.question_id,
    questionNumber: Number(row.order_index) + 1,
    questionKey: row.question_key,
    existingOptionIds: [...(optionIdsByQuestionId.get(row.question_id) ?? [])],
  }));
}

async function executeBulkOptionImportPlan(params: {
  db: Queryable;
  assessmentVersionId: string;
  plannedQuestions: readonly PlannedBulkOptionQuestionImport[];
}): Promise<BulkOptionImportExecutionSummary> {
  let existingOptionsDeleted = 0;
  let optionsInserted = 0;

  for (const question of params.plannedQuestions) {
    const deletedOptions = await params.db.query<DeletedOptionRow>(
      `
      DELETE FROM options
      WHERE question_id = $1
        AND assessment_version_id = $2
      RETURNING id
      `,
      [question.questionId, params.assessmentVersionId],
    );

    existingOptionsDeleted += deletedOptions.rows.length;

    for (const replacementOption of question.replacementOptions) {
      const insertedOption = await params.db.query<InsertedOptionRow>(
        `
        INSERT INTO options (
          assessment_version_id,
          question_id,
          option_key,
          option_label,
          option_text,
          order_index
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
        `,
        [
          params.assessmentVersionId,
          question.questionId,
          generateOptionKey(question.questionNumber, replacementOption.label.toLowerCase()),
          replacementOption.label,
          replacementOption.text,
          replacementOption.order,
        ],
      );

      if (!insertedOption.rows[0]?.id) {
        throw new Error('OPTION_INSERT_FAILED');
      }

      optionsInserted += 1;
    }
  }

  return {
    assessmentVersionId: params.assessmentVersionId,
    questionsMatched: params.plannedQuestions.length,
    questionsImported: params.plannedQuestions.length,
    optionsInserted,
    existingOptionsDeleted,
  };
}

function buildFailedExecutionResult(params: {
  assessmentVersionId: string;
  parseErrors: BulkOptionParseError[];
  groupErrors: BulkOptionGroupValidationError[];
  planErrors: BulkOptionImportPlanError[];
  warnings: BulkOptionGroupValidationWarning[];
  questionGroups: ReturnType<typeof buildBulkOptionImportPreview>['questionGroups'];
  plannedQuestions: readonly PlannedBulkOptionQuestionImport[];
  questionGroupCount: number;
  questionsMatched: number;
  executionError: string | null;
}): BulkOptionImportExecutionResult {
  return {
    success: false,
    canImport: false,
    parseErrors: params.parseErrors,
    groupErrors: params.groupErrors,
    planErrors: params.planErrors,
    warnings: params.warnings,
    questionGroups: params.questionGroups,
    plannedQuestions: params.plannedQuestions,
    summary: {
      assessmentVersionId: params.assessmentVersionId,
      questionGroupCount: params.questionGroupCount,
      questionsMatched: params.questionsMatched,
      questionsImported: 0,
      optionsInserted: 0,
      existingOptionsDeleted: 0,
    },
    importedQuestionCount: 0,
    importedOptionCount: 0,
    skippedQuestionCount: params.questionsMatched,
    executionError: params.executionError,
  };
}

function buildPreviewResult(
  result: BulkOptionImportPreviewResult,
): BulkOptionImportPreviewResult {
  return result;
}
