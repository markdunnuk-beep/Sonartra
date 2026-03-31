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

export type BulkOptionImportExecutionResult = {
  success: boolean;
  parseErrors: BulkOptionParseError[];
  groupErrors: BulkOptionGroupValidationError[];
  planErrors: BulkOptionImportPlanError[];
  warnings: BulkOptionGroupValidationWarning[];
  summary: BulkOptionImportExecutionSummary;
  importedQuestionCount: number;
  importedOptionCount: number;
  skippedQuestionCount: number;
  executionError: string | null;
};

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
    dependencies.revalidatePath(`/admin/assessments/${assessmentVersion.assessmentKey}`);

    return {
      success: true,
      parseErrors: [],
      groupErrors: [],
      planErrors: [],
      warnings: preview.warnings,
      summary: executionSummary,
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
  questionsMatched: number;
  executionError: string | null;
}): BulkOptionImportExecutionResult {
  return {
    success: false,
    parseErrors: params.parseErrors,
    groupErrors: params.groupErrors,
    planErrors: params.planErrors,
    warnings: params.warnings,
    summary: {
      assessmentVersionId: params.assessmentVersionId,
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
