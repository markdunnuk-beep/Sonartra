'use server';

import { revalidatePath } from 'next/cache';

import {
  type AdminBulkQuestionAuthoringFormState,
  type AdminBulkQuestionAuthoringFormValues,
  type AdminBulkQuestionByDomainAuthoringFormState,
  type AdminBulkQuestionByDomainAuthoringFormValues,
  type AdminOptionAuthoringFormState,
  type AdminOptionAuthoringFormValues,
  type AdminQuestionAuthoringFormState,
  type AdminQuestionAuthoringFormValues,
  emptyAdminBulkQuestionAuthoringFormValues,
  emptyAdminBulkQuestionByDomainAuthoringFormValues,
  emptyAdminOptionAuthoringFormValues,
  emptyAdminQuestionAuthoringFormValues,
  initialAdminBulkQuestionAuthoringFormState,
  initialAdminBulkQuestionByDomainAuthoringFormState,
  initialAdminOptionAuthoringFormState,
  initialAdminQuestionAuthoringFormState,
  validateAdminBulkQuestionAuthoringValues,
  validateAdminBulkQuestionByDomainAuthoringValues,
  validateAdminOptionAuthoringValues,
  validateAdminQuestionAuthoringValues,
} from '@/lib/admin/admin-question-option-authoring';
import { getDbPool } from '@/lib/server/db';
import { generateOptionKey, generateQuestionKey } from '@/lib/utils/key-generator';

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

type TransactionClient = Queryable & {
  release(): void;
};

type ActionContext = {
  assessmentKey: string;
  assessmentVersionId: string;
  questionId?: string;
  optionId?: string;
};

export type InlineQuestionTextUpdateResult =
  | {
      ok: true;
      record: {
        questionId: string;
        prompt: string;
        questionKey: string;
      };
    }
  | {
      ok: false;
      error: string;
    };

export type InlineOptionTextUpdateResult =
  | {
      ok: true;
      record: {
        optionId: string;
        optionText: string;
        optionKey: string;
      };
    }
  | {
      ok: false;
      error: string;
    };

type PostgresErrorLike = {
  code?: string;
  constraint?: string;
  detail?: string;
  message?: string;
};

type AdminQuestionCreatedOption = {
  optionId: string;
  assessmentVersionId: string;
  questionId: string;
  key: string;
  label: string;
  text: string;
  orderIndex: number;
};

type AdminCreatedQuestion = {
  questionId: string;
  assessmentVersionId: string;
  domainId: string;
  key: string;
  prompt: string;
  orderIndex: number;
  options: readonly AdminQuestionCreatedOption[];
};

type BulkQuestionActionState = AdminBulkQuestionAuthoringFormState & {
  createdQuestions?: readonly AdminCreatedQuestion[];
};

type BulkQuestionByDomainActionState = AdminBulkQuestionByDomainAuthoringFormState & {
  createdQuestions?: readonly AdminCreatedQuestion[];
};

type BulkQuestionActionDependencies = {
  connect(): Promise<TransactionClient>;
  revalidatePath(path: string): void;
};

type InsertedQuestionRow = {
  id: string;
};

type InsertedOptionRow = {
  id: string;
};

type ScopedQuestionRow = {
  id: string;
  assessment_version_id: string;
  domain_id: string;
  prompt: string;
  order_index: string | number;
};

type ScopedOptionRow = {
  id: string;
  assessment_version_id: string;
  question_id: string;
  option_label: string | null;
  option_text: string;
  order_index: string | number;
};

type ScopedOptionWeightRow = {
  option_id: string;
  signal_id: string;
  weight: string;
};

type RekeyedQuestionRow = {
  id: string;
  order_index: string | number;
};

type RekeyedOptionRow = {
  id: string;
  option_label: string | null;
  order_index: string | number;
};

type BulkInsertedQuestionRow = {
  id: string;
  assessment_version_id: string;
  domain_id: string;
  question_key: string;
  prompt: string;
  order_index: string | number;
};

type BulkInsertedOptionRow = {
  id: string;
  assessment_version_id: string;
  question_id: string;
  option_key: string;
  option_label: string | null;
  option_text: string;
  order_index: string | number;
};

type DomainResolutionRow = {
  id: string;
  domain_key: string;
  label: string;
  semantic_key: string | null;
};

type ParsedBulkQuestionByDomainLine = {
  lineNumber: number;
  domainToken: string;
  prompt: string;
};

type ResolvedBulkQuestionByDomainLine = ParsedBulkQuestionByDomainLine & {
  domainId: string;
};

const MAX_BULK_QUESTION_IMPORT_COUNT = 200;

function logBulkQuestionImport(event: string, payload: Record<string, unknown>): void {
  console.info(
    '[admin-question-bulk-import]',
    JSON.stringify({
      event,
      ...payload,
    }),
  );
}

function normalizeFormValue(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeTextAreaValue(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value : '';
}

function authoringPath(assessmentKey: string): string {
  return `/admin/assessments/${assessmentKey}`;
}

function normalizeInlineText(value: string): string {
  return value.trim();
}

function toPostgresErrorLike(error: unknown): PostgresErrorLike | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const candidate = error as PostgresErrorLike;
  if (
    typeof candidate.code !== 'string' &&
    typeof candidate.constraint !== 'string' &&
    typeof candidate.detail !== 'string' &&
    typeof candidate.message !== 'string'
  ) {
    return null;
  }

  return candidate;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && typeof error.message === 'string' && error.message.trim().length > 0) {
    return error.message;
  }

  const postgresError = toPostgresErrorLike(error);
  if (typeof postgresError?.detail === 'string' && postgresError.detail.trim().length > 0) {
    return postgresError.detail;
  }

  if (typeof postgresError?.message === 'string' && postgresError.message.trim().length > 0) {
    return postgresError.message;
  }

  return 'Unknown server error.';
}

function formatBulkQuestionByDomainSaveError(error: unknown): string {
  const formattedDomainError =
    error instanceof Error ? formatBulkQuestionByDomainError(error.message) : null;
  if (formattedDomainError) {
    return formattedDomainError;
  }

  if (error instanceof Error) {
    switch (error.message) {
      case 'DOMAIN_NOT_FOUND':
        return 'The selected question domain is no longer available in this draft version.';
      case 'QUESTION_KEY_EXISTS':
        return 'A generated question key already exists in this draft version. Try the import again.';
      case 'QUESTION_CREATE_FAILED':
        return 'The question row could not be created.';
      case 'OPTION_CREATE_FAILED':
        return 'The default response options could not be created for an imported question.';
      default:
        break;
    }
  }

  return getErrorMessage(error);
}

function isQuestionKeyExistsError(error: unknown): boolean {
  if (error instanceof Error && error.message === 'QUESTION_KEY_EXISTS') {
    return true;
  }

  const candidate = toPostgresErrorLike(error);
  if (!candidate || candidate.code !== '23505') {
    return false;
  }

  return (
    candidate.constraint?.includes('question') === true ||
    candidate.message?.includes('question_key') === true ||
    candidate.detail?.includes('(assessment_version_id, question_key)') === true
  );
}

function isOptionKeyExistsError(error: unknown): boolean {
  if (error instanceof Error && error.message === 'OPTION_KEY_EXISTS') {
    return true;
  }

  const candidate = toPostgresErrorLike(error);
  if (!candidate || candidate.code !== '23505') {
    return false;
  }

  return (
    candidate.constraint?.includes('option') === true ||
    candidate.message?.includes('option_key') === true ||
    candidate.detail?.includes('(question_id, option_key)') === true ||
    candidate.detail?.includes('(assessment_version_id, option_key)') === true
  );
}

async function domainExists(params: {
  db: Queryable;
  assessmentVersionId: string;
  domainId: string;
}): Promise<boolean> {
  const result = await params.db.query<{ id: string }>(
    `
    SELECT id
    FROM domains
    WHERE id = $1
      AND assessment_version_id = $2
    `,
    [params.domainId, params.assessmentVersionId],
  );

  return result.rows.length > 0;
}

async function getDomainsForAssessmentVersion(params: {
  db: Queryable;
  assessmentVersionId: string;
}): Promise<readonly DomainResolutionRow[]> {
  try {
    const result = await params.db.query<DomainResolutionRow>(
      `
      SELECT id, domain_key, label, semantic_key
      FROM domains
      WHERE assessment_version_id = $1
      ORDER BY order_index ASC, id ASC
      `,
      [params.assessmentVersionId],
    );

    return result.rows.map((row) => ({
      ...row,
      semantic_key: typeof row.semantic_key === 'string' ? row.semantic_key : null,
    }));
  } catch (error) {
    const postgresError = toPostgresErrorLike(error);
    if (postgresError?.code !== '42703' || !postgresError.message?.includes('semantic_key')) {
      throw error;
    }

    const result = await params.db.query<Omit<DomainResolutionRow, 'semantic_key'>>(
      `
      SELECT id, domain_key, label
      FROM domains
      WHERE assessment_version_id = $1
      ORDER BY order_index ASC, id ASC
      `,
      [params.assessmentVersionId],
    );

    return result.rows.map((row) => ({
      ...row,
      semantic_key: null,
    }));
  }
}

async function getLatestDraftAssessmentVersionId(params: {
  db: Queryable;
  assessmentKey: string;
}): Promise<string | null> {
  const result = await params.db.query<{ assessment_version_id: string }>(
    `
    SELECT av.id AS assessment_version_id
    FROM assessments a
    INNER JOIN assessment_versions av
      ON av.assessment_id = a.id
    WHERE a.assessment_key = $1
      AND av.lifecycle_status = 'DRAFT'
    ORDER BY av.updated_at DESC, av.created_at DESC, av.version DESC
    LIMIT 1
    `,
    [params.assessmentKey],
  );

  const latestDraftVersionId = result.rows[0]?.assessment_version_id ?? null;
  logBulkQuestionImport('latest-draft-lookup', {
    assessmentKey: params.assessmentKey,
    latestDraftVersionId,
  });

  return latestDraftVersionId;
}

function parseBulkQuestionByDomainLines(questionLines: string): readonly ParsedBulkQuestionByDomainLine[] {
  const parsedLines: ParsedBulkQuestionByDomainLine[] = [];
  const rows = questionLines.split(/\r?\n/);

  for (let index = 0; index < rows.length; index += 1) {
    const rawLine = rows[index] ?? '';
    const trimmedLine = rawLine.trim();
    if (!trimmedLine) {
      continue;
    }

    const firstPipeIndex = rawLine.indexOf('|');
    const lastPipeIndex = rawLine.lastIndexOf('|');
    const lineNumber = index + 1;

    if (firstPipeIndex < 0 || firstPipeIndex !== lastPipeIndex) {
      throw new Error(`BULK_IMPORT_LINE_${lineNumber}_INVALID_FORMAT`);
    }

    const domainToken = rawLine.slice(0, firstPipeIndex).trim();
    const prompt = rawLine.slice(firstPipeIndex + 1).trim();

    if (!domainToken) {
      throw new Error(`BULK_IMPORT_LINE_${lineNumber}_DOMAIN_REQUIRED`);
    }

    if (!prompt) {
      throw new Error(`BULK_IMPORT_LINE_${lineNumber}_QUESTION_REQUIRED`);
    }

    parsedLines.push({
      lineNumber,
      domainToken,
      prompt,
    });
  }

  return Object.freeze(parsedLines);
}

async function resolveBulkQuestionByDomainLines(params: {
  db: Queryable;
  assessmentVersionId: string;
  questionLines: string;
}): Promise<readonly ResolvedBulkQuestionByDomainLine[]> {
  const parsedLines = parseBulkQuestionByDomainLines(params.questionLines);

  if (parsedLines.length < 1) {
    throw new Error('INVALID_BULK_IMPORT');
  }

  if (parsedLines.length > MAX_BULK_QUESTION_IMPORT_COUNT) {
    throw new Error('BULK_IMPORT_LIMIT_EXCEEDED');
  }

  const domains = await getDomainsForAssessmentVersion({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
  });

  const domainByKey = new Map(domains.map((domain) => [domain.domain_key, domain]));
  const domainByLabel = new Map(domains.map((domain) => [domain.label, domain]));
  const domainBySemanticKey = new Map(
    domains
      .filter((domain) => typeof domain.semantic_key === 'string' && domain.semantic_key.length > 0)
      .map((domain) => [domain.semantic_key, domain]),
  );

  const resolvedLines = parsedLines.map((line) => {
    const resolvedDomain =
      domainByKey.get(line.domainToken) ??
      domainByLabel.get(line.domainToken) ??
      domainBySemanticKey.get(line.domainToken);
    if (!resolvedDomain) {
      throw new Error(`BULK_IMPORT_LINE_${line.lineNumber}_UNKNOWN_DOMAIN`);
    }

    return {
      ...line,
      domainId: resolvedDomain.id,
    };
  });

  logBulkQuestionImport('domain-resolution', {
    assessmentVersionId: params.assessmentVersionId,
    parsedLineCount: parsedLines.length,
    resolvedLineCount: resolvedLines.length,
    resolvedLines: resolvedLines.map((line) => ({
      lineNumber: line.lineNumber,
      domainToken: line.domainToken,
      domainId: line.domainId,
      prompt: line.prompt,
    })),
  });

  return Object.freeze(resolvedLines);
}

async function questionExists(params: {
  db: Queryable;
  assessmentVersionId: string;
  questionId: string;
}): Promise<boolean> {
  const result = await params.db.query<{ id: string }>(
    `
    SELECT id
    FROM questions
    WHERE id = $1
      AND assessment_version_id = $2
    `,
    [params.questionId, params.assessmentVersionId],
  );

  return result.rows.length > 0;
}

async function optionExists(params: {
  db: Queryable;
  questionId: string;
  optionId: string;
}): Promise<boolean> {
  const result = await params.db.query<{ id: string }>(
    `
    SELECT id
    FROM options
    WHERE id = $1
      AND question_id = $2
    `,
    [params.optionId, params.questionId],
  );

  return result.rows.length > 0;
}

async function duplicateQuestionKeyExists(params: {
  db: Queryable;
  assessmentVersionId: string;
  questionKey: string;
  excludedQuestionId?: string;
}): Promise<boolean> {
  const result = await params.db.query<{ id: string }>(
    `
    SELECT id
    FROM questions
    WHERE assessment_version_id = $1
      AND question_key = $2
      AND ($3::uuid IS NULL OR id <> $3::uuid)
    `,
    [params.assessmentVersionId, params.questionKey, params.excludedQuestionId ?? null],
  );

  return result.rows.length > 0;
}

async function duplicateOptionKeyExists(params: {
  db: Queryable;
  assessmentVersionId: string;
  optionKey: string;
  excludedOptionId?: string;
}): Promise<boolean> {
  const result = await params.db.query<{ id: string }>(
    `
    SELECT o.id
    FROM options o
    WHERE o.assessment_version_id = $1
      AND o.option_key = $2
      AND ($3::uuid IS NULL OR o.id <> $3::uuid)
    `,
    [params.assessmentVersionId, params.optionKey, params.excludedOptionId ?? null],
  );

  return result.rows.length > 0;
}

async function getNextQuestionOrderIndex(
  db: Queryable,
  assessmentVersionId: string,
): Promise<number> {
  const result = await db.query<{ next_order_index: string | number }>(
    `
    SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order_index
    FROM questions
    WHERE assessment_version_id = $1
    `,
    [assessmentVersionId],
  );

  return Number(result.rows[0]?.next_order_index ?? 0);
}

async function getNextOptionOrderIndex(db: Queryable, questionId: string): Promise<number> {
  const result = await db.query<{ next_order_index: string | number }>(
    `
    SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order_index
    FROM options
    WHERE question_id = $1
    `,
    [questionId],
  );

  return Number(result.rows[0]?.next_order_index ?? 0);
}

async function getQuestionOrderIndex(params: {
  db: Queryable;
  assessmentVersionId: string;
  questionId: string;
}): Promise<number | null> {
  const result = await params.db.query<{ order_index: string | number }>(
    `
    SELECT order_index
    FROM questions
    WHERE id = $1
      AND assessment_version_id = $2
    `,
    [params.questionId, params.assessmentVersionId],
  );

  const orderIndex = result.rows[0]?.order_index;
  return orderIndex === undefined ? null : Number(orderIndex);
}

async function getScopedQuestion(params: {
  db: Queryable;
  assessmentVersionId: string;
  questionId: string;
}): Promise<ScopedQuestionRow | null> {
  const result = await params.db.query<ScopedQuestionRow>(
    `
    SELECT
      id,
      assessment_version_id,
      domain_id,
      prompt,
      order_index
    FROM questions
    WHERE id = $1
      AND assessment_version_id = $2
    `,
    [params.questionId, params.assessmentVersionId],
  );

  return result.rows[0] ?? null;
}

async function getQuestionOptions(params: {
  db: Queryable;
  assessmentVersionId: string;
  questionId: string;
}): Promise<readonly ScopedOptionRow[]> {
  const result = await params.db.query<ScopedOptionRow>(
    `
    SELECT
      o.id,
      o.assessment_version_id,
      o.question_id,
      o.option_label,
      o.option_text,
      o.order_index
    FROM options o
    INNER JOIN questions q ON q.id = o.question_id
    WHERE o.question_id = $1
      AND o.assessment_version_id = $2
      AND q.assessment_version_id = $2
    ORDER BY o.order_index ASC, o.id ASC
    `,
    [params.questionId, params.assessmentVersionId],
  );

  return result.rows;
}

async function getOptionSignalWeightsForQuestion(params: {
  db: Queryable;
  assessmentVersionId: string;
  questionId: string;
}): Promise<readonly ScopedOptionWeightRow[]> {
  const result = await params.db.query<ScopedOptionWeightRow>(
    `
    SELECT
      osw.option_id,
      osw.signal_id,
      osw.weight::text AS weight
    FROM option_signal_weights osw
    INNER JOIN options o ON o.id = osw.option_id
    INNER JOIN questions q ON q.id = o.question_id
    INNER JOIN signals s ON s.id = osw.signal_id
    WHERE q.id = $1
      AND q.assessment_version_id = $2
      AND o.assessment_version_id = $2
      AND s.assessment_version_id = $2
    ORDER BY o.order_index ASC, osw.id ASC
    `,
    [params.questionId, params.assessmentVersionId],
  );

  return result.rows;
}

function getCanonicalOptionLetter(optionOrderIndex: number): string {
  const normalizedIndex = Math.max(0, optionOrderIndex - 1);
  return String.fromCharCode('a'.charCodeAt(0) + normalizedIndex);
}

async function rekeyQuestionOptions(params: {
  db: Queryable;
  assessmentVersionId: string;
  questionId: string;
  questionIndex: number;
}): Promise<void> {
  const options = await params.db.query<RekeyedOptionRow>(
    `
    SELECT id, option_label, order_index
    FROM options
    WHERE question_id = $1
      AND assessment_version_id = $2
    ORDER BY order_index ASC, id ASC
    `,
    [params.questionId, params.assessmentVersionId],
  );

  for (const option of options.rows) {
    const optionOrderIndex = Number(option.order_index);
    const optionKey = generateOptionKey(
      params.questionIndex,
      getCanonicalOptionLetter(optionOrderIndex),
    );

    await params.db.query(
      `
      UPDATE options
      SET
        option_key = $3,
        updated_at = NOW()
      WHERE id = $1
        AND question_id = $2
      `,
      [option.id, params.questionId, optionKey],
    );
  }
}

async function rekeyQuestionsFromOrderIndex(params: {
  db: Queryable;
  assessmentVersionId: string;
  startingOrderIndex: number;
}): Promise<void> {
  const questions = await params.db.query<RekeyedQuestionRow>(
    `
    SELECT id, order_index
    FROM questions
    WHERE assessment_version_id = $1
      AND order_index >= $2
    ORDER BY order_index ASC, id ASC
    `,
    [params.assessmentVersionId, params.startingOrderIndex],
  );

  for (const question of questions.rows) {
    const questionIndex = Number(question.order_index) + 1;
    const questionKey = generateQuestionKey(questionIndex);

    await params.db.query(
      `
      UPDATE questions
      SET
        question_key = $3,
        updated_at = NOW()
      WHERE id = $1
        AND assessment_version_id = $2
      `,
      [question.id, params.assessmentVersionId, questionKey],
    );

    await rekeyQuestionOptions({
      db: params.db,
      assessmentVersionId: params.assessmentVersionId,
      questionId: question.id,
      questionIndex,
    });
  }
}

function buildDefaultCreatedOptions(params: {
  assessmentVersionId: string;
  questionId: string;
  questionIndex: number;
}): readonly Omit<AdminQuestionCreatedOption, 'optionId'>[] {
  return Object.freeze(
    ['A', 'B', 'C', 'D'].map((label, index) => ({
      assessmentVersionId: params.assessmentVersionId,
      questionId: params.questionId,
      key: generateOptionKey(params.questionIndex, label.toLowerCase()),
      label,
      text: '',
      orderIndex: index + 1,
    })),
  );
}

export async function createQuestionRecord(params: {
  db: Queryable;
  assessmentVersionId: string;
  values: AdminQuestionAuthoringFormValues;
}): Promise<AdminCreatedQuestion> {
  const domainPresent = await domainExists({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    domainId: params.values.domainId,
  });
  if (!domainPresent) {
    throw new Error('DOMAIN_NOT_FOUND');
  }

  const orderIndex = await getNextQuestionOrderIndex(params.db, params.assessmentVersionId);
  const questionKey = generateQuestionKey(orderIndex + 1);

  logBulkQuestionImport('question-row-construction', {
    assessmentVersionId: params.assessmentVersionId,
    domainId: params.values.domainId,
    prompt: params.values.prompt,
    orderIndex,
    questionKey,
  });

  if (
    await duplicateQuestionKeyExists({
      db: params.db,
      assessmentVersionId: params.assessmentVersionId,
      questionKey,
    })
  ) {
    throw new Error('QUESTION_KEY_EXISTS');
  }

  const insertedQuestion = await params.db.query<InsertedQuestionRow>(
    `
    INSERT INTO questions (
      assessment_version_id,
      domain_id,
      question_key,
      prompt,
      order_index
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
    `,
    [
      params.assessmentVersionId,
      params.values.domainId,
      questionKey,
      params.values.prompt,
      orderIndex,
    ],
  );

  const questionId = insertedQuestion.rows[0]?.id;
  if (!questionId) {
    throw new Error('QUESTION_CREATE_FAILED');
  }

  logBulkQuestionImport('question-inserted', {
    assessmentVersionId: params.assessmentVersionId,
    questionId,
    domainId: params.values.domainId,
    questionKey,
    orderIndex,
  });

  const questionIndex = orderIndex + 1;
  const defaultOptions = buildDefaultCreatedOptions({
    assessmentVersionId: params.assessmentVersionId,
    questionId,
    questionIndex,
  });

  const createdOptions: AdminQuestionCreatedOption[] = [];

  for (const option of defaultOptions) {
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
        option.assessmentVersionId,
        option.questionId,
        option.key,
        option.label,
        option.text,
        option.orderIndex,
      ],
    );

    const optionId = insertedOption.rows[0]?.id;
    if (!optionId) {
      throw new Error('OPTION_CREATE_FAILED');
    }

    logBulkQuestionImport('default-option-inserted', {
      assessmentVersionId: params.assessmentVersionId,
      questionId,
      optionId,
      optionKey: option.key,
      optionLabel: option.label,
      orderIndex: option.orderIndex,
    });

    createdOptions.push({
      optionId,
      ...option,
    });
  }

  return {
    questionId,
    assessmentVersionId: params.assessmentVersionId,
    domainId: params.values.domainId,
    key: questionKey,
    prompt: params.values.prompt,
    orderIndex,
    options: Object.freeze(createdOptions),
  };
}

export async function createBulkQuestionRecords(params: {
  db: Queryable;
  assessmentVersionId: string;
  prompts: readonly string[];
  domainId: string;
}): Promise<readonly AdminCreatedQuestion[]> {
  if (params.prompts.length < 1) {
    throw new Error('INVALID_BULK_IMPORT');
  }

  if (params.prompts.length > MAX_BULK_QUESTION_IMPORT_COUNT) {
    throw new Error('BULK_IMPORT_LIMIT_EXCEEDED');
  }

  const domainPresent = await domainExists({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    domainId: params.domainId,
  });
  if (!domainPresent) {
    throw new Error('DOMAIN_NOT_FOUND');
  }

  const createdQuestions: AdminCreatedQuestion[] = [];

  for (const prompt of params.prompts) {
    createdQuestions.push(
      await createQuestionRecord({
        db: params.db,
        assessmentVersionId: params.assessmentVersionId,
        values: {
          prompt,
          key: '',
          domainId: params.domainId,
        },
      }),
    );
  }

  return Object.freeze(createdQuestions);
}

export async function createBulkQuestionsByDomainRecord(params: {
  db: Queryable;
  assessmentVersionId: string;
  questionLines: string;
}): Promise<readonly AdminCreatedQuestion[]> {
  const resolvedLines = await resolveBulkQuestionByDomainLines({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    questionLines: params.questionLines,
  });

  logBulkQuestionImport('bulk-save-start', {
    assessmentVersionId: params.assessmentVersionId,
    questionCount: resolvedLines.length,
  });

  const createdQuestions: AdminCreatedQuestion[] = [];

  for (const line of resolvedLines) {
    createdQuestions.push(
      await createQuestionRecord({
        db: params.db,
        assessmentVersionId: params.assessmentVersionId,
        values: {
          prompt: line.prompt,
          key: '',
          domainId: line.domainId,
        },
      }),
    );
  }

  return Object.freeze(createdQuestions);
}

export async function duplicateQuestionRecord(params: {
  db: Queryable;
  assessmentVersionId: string;
  sourceQuestionId: string;
}): Promise<AdminCreatedQuestion> {
  const sourceQuestion = await getScopedQuestion({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    questionId: params.sourceQuestionId,
  });
  if (!sourceQuestion) {
    throw new Error('QUESTION_NOT_FOUND');
  }

  const sourceOptions = await getQuestionOptions({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    questionId: params.sourceQuestionId,
  });
  const sourceWeights = await getOptionSignalWeightsForQuestion({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    questionId: params.sourceQuestionId,
  });

  const duplicateOrderIndex = Number(sourceQuestion.order_index) + 1;

  await params.db.query(
    `
    UPDATE questions
    SET
      order_index = order_index + 1,
      updated_at = NOW()
    WHERE assessment_version_id = $1
      AND order_index > $2
    `,
    [params.assessmentVersionId, Number(sourceQuestion.order_index)],
  );

  const insertedQuestion = await params.db.query<InsertedQuestionRow>(
    `
    INSERT INTO questions (
      assessment_version_id,
      domain_id,
      question_key,
      prompt,
      order_index
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
    `,
    [
      params.assessmentVersionId,
      sourceQuestion.domain_id,
      generateQuestionKey(duplicateOrderIndex + 1),
      sourceQuestion.prompt,
      duplicateOrderIndex,
    ],
  );

  const duplicatedQuestionId = insertedQuestion.rows[0]?.id;
  if (!duplicatedQuestionId) {
    throw new Error('QUESTION_CREATE_FAILED');
  }

  const duplicatedOptions: AdminQuestionCreatedOption[] = [];
  const optionIdMap = new Map<string, string>();

  for (const sourceOption of sourceOptions) {
    const optionOrderIndex = Number(sourceOption.order_index);
    const duplicatedOption = await params.db.query<InsertedOptionRow>(
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
        duplicatedQuestionId,
        generateOptionKey(duplicateOrderIndex + 1, getCanonicalOptionLetter(optionOrderIndex)),
        sourceOption.option_label,
        sourceOption.option_text,
        optionOrderIndex,
      ],
    );

    const duplicatedOptionId = duplicatedOption.rows[0]?.id;
    if (!duplicatedOptionId) {
      throw new Error('OPTION_CREATE_FAILED');
    }

    optionIdMap.set(sourceOption.id, duplicatedOptionId);
    duplicatedOptions.push({
      optionId: duplicatedOptionId,
      assessmentVersionId: params.assessmentVersionId,
      questionId: duplicatedQuestionId,
      key: generateOptionKey(duplicateOrderIndex + 1, getCanonicalOptionLetter(optionOrderIndex)),
      label: sourceOption.option_label ?? '',
      text: sourceOption.option_text,
      orderIndex: optionOrderIndex,
    });
  }

  for (const sourceWeight of sourceWeights) {
    const duplicatedOptionId = optionIdMap.get(sourceWeight.option_id);
    if (!duplicatedOptionId) {
      throw new Error('OPTION_NOT_FOUND');
    }

    await params.db.query(
      `
      INSERT INTO option_signal_weights (
        option_id,
        signal_id,
        weight
      )
      VALUES ($1, $2, $3::numeric(12, 4))
      `,
      [duplicatedOptionId, sourceWeight.signal_id, sourceWeight.weight],
    );
  }

  await rekeyQuestionsFromOrderIndex({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    startingOrderIndex: duplicateOrderIndex + 1,
  });

  return {
    questionId: duplicatedQuestionId,
    assessmentVersionId: params.assessmentVersionId,
    domainId: sourceQuestion.domain_id,
    key: generateQuestionKey(duplicateOrderIndex + 1),
    prompt: sourceQuestion.prompt,
    orderIndex: duplicateOrderIndex,
    options: Object.freeze(
      duplicatedOptions.sort(
        (left, right) => left.orderIndex - right.orderIndex || left.optionId.localeCompare(right.optionId),
      ),
    ),
  };
}

export async function updateQuestionRecord(params: {
  db: Queryable;
  assessmentVersionId: string;
  questionId: string;
  values: AdminQuestionAuthoringFormValues;
}): Promise<void> {
  const questionPresent = await questionExists({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    questionId: params.questionId,
  });
  if (!questionPresent) {
    throw new Error('QUESTION_NOT_FOUND');
  }

  const domainPresent = await domainExists({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    domainId: params.values.domainId,
  });
  if (!domainPresent) {
    throw new Error('DOMAIN_NOT_FOUND');
  }

  if (
    await duplicateQuestionKeyExists({
      db: params.db,
      assessmentVersionId: params.assessmentVersionId,
      questionKey: params.values.key,
      excludedQuestionId: params.questionId,
    })
  ) {
    throw new Error('QUESTION_KEY_EXISTS');
  }

  await params.db.query(
    `
    UPDATE questions
    SET
      domain_id = $3,
      question_key = $4,
      prompt = $5,
      updated_at = NOW()
    WHERE id = $1
      AND assessment_version_id = $2
    `,
    [
      params.questionId,
      params.assessmentVersionId,
      params.values.domainId,
      params.values.key,
      params.values.prompt,
    ],
  );
}

export async function updateQuestionText(params: {
  db: Queryable;
  assessmentVersionId: string;
  questionId: string;
  prompt: string;
}): Promise<{ questionId: string; prompt: string; questionKey: string }> {
  const prompt = normalizeInlineText(params.prompt);

  if (!params.assessmentVersionId || !params.questionId) {
    throw new Error('QUESTION_NOT_FOUND');
  }

  if (!prompt) {
    throw new Error('QUESTION_PROMPT_REQUIRED');
  }

  const result = await params.db.query<{ id: string; prompt: string; question_key: string }>(
    `
    UPDATE questions
    SET
      prompt = $3,
      updated_at = NOW()
    WHERE id = $1
      AND assessment_version_id = $2
    RETURNING id, prompt, question_key
    `,
    [params.questionId, params.assessmentVersionId, prompt],
  );

  const updatedQuestion = result.rows[0];
  if (!updatedQuestion) {
    throw new Error('QUESTION_NOT_FOUND');
  }

  return {
    questionId: updatedQuestion.id,
    prompt: updatedQuestion.prompt,
    questionKey: updatedQuestion.question_key,
  };
}

export async function deleteQuestionRecord(params: {
  db: Queryable;
  assessmentVersionId: string;
  questionId: string;
}): Promise<void> {
  const questionPresent = await questionExists({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    questionId: params.questionId,
  });
  if (!questionPresent) {
    throw new Error('QUESTION_NOT_FOUND');
  }

  await params.db.query(
    `
    DELETE FROM questions
    WHERE id = $1
      AND assessment_version_id = $2
    `,
    [params.questionId, params.assessmentVersionId],
  );
}

export async function createOptionRecord(params: {
  db: Queryable;
  assessmentVersionId: string;
  questionId: string;
  values: AdminOptionAuthoringFormValues;
}): Promise<void> {
  const questionPresent = await questionExists({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    questionId: params.questionId,
  });
  if (!questionPresent) {
    throw new Error('QUESTION_NOT_FOUND');
  }

  const questionOrderIndex = await getQuestionOrderIndex({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    questionId: params.questionId,
  });
  if (questionOrderIndex === null) {
    throw new Error('QUESTION_NOT_FOUND');
  }

  const orderIndex = await getNextOptionOrderIndex(params.db, params.questionId);
  const optionLetter = params.values.label || String.fromCharCode('A'.charCodeAt(0) + orderIndex);
  const optionKey = generateOptionKey(questionOrderIndex + 1, optionLetter);

  if (
    await duplicateOptionKeyExists({
      db: params.db,
      assessmentVersionId: params.assessmentVersionId,
      optionKey,
    })
  ) {
    throw new Error('OPTION_KEY_EXISTS');
  }

  await params.db.query(
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
    `,
    [
      params.assessmentVersionId,
      params.questionId,
      optionKey,
      params.values.label || null,
      params.values.text,
      orderIndex,
    ],
  );
}

export async function updateOptionRecord(params: {
  db: Queryable;
  assessmentVersionId: string;
  questionId: string;
  optionId: string;
  values: AdminOptionAuthoringFormValues;
}): Promise<void> {
  const questionPresent = await questionExists({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    questionId: params.questionId,
  });
  if (!questionPresent) {
    throw new Error('QUESTION_NOT_FOUND');
  }

  const optionPresent = await optionExists({
    db: params.db,
    questionId: params.questionId,
    optionId: params.optionId,
  });
  if (!optionPresent) {
    throw new Error('OPTION_NOT_FOUND');
  }

  if (
    await duplicateOptionKeyExists({
      db: params.db,
      assessmentVersionId: params.assessmentVersionId,
      optionKey: params.values.key,
      excludedOptionId: params.optionId,
    })
  ) {
    throw new Error('OPTION_KEY_EXISTS');
  }

  await params.db.query(
    `
    UPDATE options
    SET
      option_key = $3,
      option_label = $4,
      option_text = $5,
      updated_at = NOW()
    WHERE id = $1
      AND question_id = $2
    `,
    [
      params.optionId,
      params.questionId,
      params.values.key,
      params.values.label || null,
      params.values.text,
    ],
  );
}

export async function updateOptionText(params: {
  db: Queryable;
  assessmentVersionId: string;
  questionId: string;
  optionId: string;
  text: string;
}): Promise<{ optionId: string; optionText: string; optionKey: string }> {
  const text = normalizeInlineText(params.text);

  if (!params.assessmentVersionId || !params.questionId || !params.optionId) {
    throw new Error('OPTION_NOT_FOUND');
  }

  if (!text) {
    throw new Error('OPTION_TEXT_REQUIRED');
  }

  const result = await params.db.query<{ id: string; option_text: string; option_key: string }>(
    `
    UPDATE options
    SET
      option_text = $3,
      updated_at = NOW()
    WHERE id = $1
      AND question_id = $2
    RETURNING id, option_text, option_key
    `,
    [params.optionId, params.questionId, text],
  );

  const updatedOption = result.rows[0];
  if (!updatedOption) {
    throw new Error('OPTION_NOT_FOUND');
  }

  return {
    optionId: updatedOption.id,
    optionText: updatedOption.option_text,
    optionKey: updatedOption.option_key,
  };
}

export async function deleteOptionRecord(params: {
  db: Queryable;
  assessmentVersionId: string;
  questionId: string;
  optionId: string;
}): Promise<void> {
  const questionPresent = await questionExists({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    questionId: params.questionId,
  });
  if (!questionPresent) {
    throw new Error('QUESTION_NOT_FOUND');
  }

  const optionPresent = await optionExists({
    db: params.db,
    questionId: params.questionId,
    optionId: params.optionId,
  });
  if (!optionPresent) {
    throw new Error('OPTION_NOT_FOUND');
  }

  await params.db.query(
    `
    DELETE FROM options
    WHERE id = $1
      AND question_id = $2
    `,
    [params.optionId, params.questionId],
  );
}

function getQuestionValuesFromFormData(formData: FormData): AdminQuestionAuthoringFormValues {
  return {
    prompt: normalizeFormValue(formData.get('prompt')),
    key: normalizeKey(normalizeFormValue(formData.get('key'))),
    domainId: normalizeFormValue(formData.get('domainId')),
  };
}

function getOptionValuesFromFormData(formData: FormData): AdminOptionAuthoringFormValues {
  return {
    key: normalizeKey(normalizeFormValue(formData.get('key'))),
    label: normalizeFormValue(formData.get('label')),
    text: normalizeFormValue(formData.get('text')),
  };
}

function getBulkQuestionValuesFromFormData(formData: FormData): AdminBulkQuestionAuthoringFormValues {
  return {
    questionLines: normalizeTextAreaValue(formData.get('questionLines')),
    domainId: normalizeFormValue(formData.get('domainId')),
  };
}

function getBulkQuestionByDomainValuesFromFormData(
  formData: FormData,
): AdminBulkQuestionByDomainAuthoringFormValues {
  return {
    questionLines: normalizeTextAreaValue(formData.get('questionLines')),
  };
}

function formatBulkQuestionByDomainError(message: string): string | null {
  const invalidFormatMatch = /^BULK_IMPORT_LINE_(\d+)_INVALID_FORMAT$/.exec(message);
  if (invalidFormatMatch) {
    return `Line ${invalidFormatMatch[1]} must use exactly one | separator in the format domain|question text.`;
  }

  const domainRequiredMatch = /^BULK_IMPORT_LINE_(\d+)_DOMAIN_REQUIRED$/.exec(message);
  if (domainRequiredMatch) {
    return `Line ${domainRequiredMatch[1]} must include a domain token before the | separator.`;
  }

  const questionRequiredMatch = /^BULK_IMPORT_LINE_(\d+)_QUESTION_REQUIRED$/.exec(message);
  if (questionRequiredMatch) {
    return `Line ${questionRequiredMatch[1]} must include question text after the | separator.`;
  }

  const unknownDomainMatch = /^BULK_IMPORT_LINE_(\d+)_UNKNOWN_DOMAIN$/.exec(message);
  if (unknownDomainMatch) {
    return `Line ${unknownDomainMatch[1]} uses a domain that does not exist in this assessment version.`;
  }

  return null;
}

function parseBulkQuestionPrompts(questionLines: string): readonly string[] {
  return questionLines
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

async function runQuestionWriteAction(params: {
  assessmentKey: string;
  values: AdminQuestionAuthoringFormValues;
  action: (db: Queryable) => Promise<AdminCreatedQuestion | null>;
}): Promise<AdminQuestionAuthoringFormState> {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const createdQuestion = await params.action(client);
    await client.query('COMMIT');

    revalidatePath(authoringPath(params.assessmentKey));

    return {
      ...initialAdminQuestionAuthoringFormState,
      createdQuestion,
    } as AdminQuestionAuthoringFormState;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);

    if (isQuestionKeyExistsError(error)) {
      return {
        formError: null,
        fieldErrors: {
          key: 'That question key already exists in this draft version.',
        },
        values: params.values,
      };
    }

    if (error instanceof Error && error.message === 'DOMAIN_NOT_FOUND') {
      return {
        formError: 'The selected question domain is no longer available in this draft version.',
        fieldErrors: {},
        values: params.values,
      };
    }

    if (error instanceof Error && error.message === 'QUESTION_NOT_FOUND') {
      return {
        formError: 'The selected question is no longer available in this draft version.',
        fieldErrors: {},
        values: params.values,
        createdQuestion: null,
      } as AdminQuestionAuthoringFormState;
    }

    return {
      formError: 'Question changes could not be saved. Review the inputs and try again.',
      fieldErrors: {},
      values: params.values,
      createdQuestion: null,
    } as AdminQuestionAuthoringFormState;
  } finally {
    client.release();
  }
}

async function runOptionWriteAction(params: {
  assessmentKey: string;
  values: AdminOptionAuthoringFormValues;
  action: (db: Queryable) => Promise<void>;
}): Promise<AdminOptionAuthoringFormState> {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await params.action(client);
    await client.query('COMMIT');

    revalidatePath(authoringPath(params.assessmentKey));

    return initialAdminOptionAuthoringFormState;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);

    if (isOptionKeyExistsError(error)) {
      return {
        formError: null,
        fieldErrors: {
          key: 'That option key already exists on this question.',
        },
        values: params.values,
      };
    }

    if (error instanceof Error && error.message === 'QUESTION_NOT_FOUND') {
      return {
        formError: 'The selected question is no longer available in this draft version.',
        fieldErrors: {},
        values: params.values,
      };
    }

    if (error instanceof Error && error.message === 'OPTION_NOT_FOUND') {
      return {
        formError: 'The selected option is no longer available on this question.',
        fieldErrors: {},
        values: params.values,
      };
    }

    return {
      formError: 'Option changes could not be saved. Review the inputs and try again.',
      fieldErrors: {},
      values: params.values,
    };
  } finally {
    client.release();
  }
}

export async function createBulkQuestionsActionWithDependencies(
  context: ActionContext,
  _previousState: BulkQuestionActionState,
  formData: FormData,
  dependencies: BulkQuestionActionDependencies,
): Promise<BulkQuestionActionState> {
  const values = getBulkQuestionValuesFromFormData(formData);
  const validation = validateAdminBulkQuestionAuthoringValues(values);
  if (Object.keys(validation.fieldErrors).length > 0) {
    return validation;
  }

  const prompts = parseBulkQuestionPrompts(values.questionLines);
  if (prompts.length < 1) {
    return {
      formError: null,
      fieldErrors: {
        questionLines: 'Paste at least one question.',
      },
      values,
    };
  }

  if (prompts.length > MAX_BULK_QUESTION_IMPORT_COUNT) {
    return {
      formError: null,
      fieldErrors: {
        questionLines: `Import at most ${MAX_BULK_QUESTION_IMPORT_COUNT} questions at a time.`,
      },
      values,
    };
  }

  const client = await dependencies.connect();

  try {
    await client.query('BEGIN');
    const createdQuestions = await createBulkQuestionRecords({
      db: client,
      assessmentVersionId: context.assessmentVersionId,
      prompts,
      domainId: values.domainId,
    });
    await client.query('COMMIT');

    dependencies.revalidatePath(authoringPath(context.assessmentKey));

    return {
      ...initialAdminBulkQuestionAuthoringFormState,
      values: {
        ...emptyAdminBulkQuestionAuthoringFormValues,
        domainId: values.domainId,
      },
      createdQuestions,
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);

    if (error instanceof Error && error.message === 'DOMAIN_NOT_FOUND') {
      return {
        formError: 'Select a valid question domain before importing questions.',
        fieldErrors: {},
        values,
      };
    }

    return {
      formError: 'Bulk question import could not be saved. Try again.',
      fieldErrors: {},
      values,
    };
  } finally {
    client.release();
  }
}

export async function createBulkQuestions(
  context: ActionContext,
  previousState: BulkQuestionActionState,
  formData: FormData,
): Promise<BulkQuestionActionState> {
  return createBulkQuestionsActionWithDependencies(context, previousState, formData, {
    connect: () => getDbPool().connect(),
    revalidatePath,
  });
}

export async function createBulkQuestionsByDomainActionWithDependencies(
  context: ActionContext,
  _previousState: BulkQuestionByDomainActionState,
  formData: FormData,
  dependencies: BulkQuestionActionDependencies,
): Promise<BulkQuestionByDomainActionState> {
  const values = getBulkQuestionByDomainValuesFromFormData(formData);
  const validation = validateAdminBulkQuestionByDomainAuthoringValues(values);
  if (Object.keys(validation.fieldErrors).length > 0) {
    return validation;
  }

  let parsedLines: readonly ParsedBulkQuestionByDomainLine[] = [];

  try {
    parsedLines = parseBulkQuestionByDomainLines(values.questionLines);
  } catch (error) {
    const formattedError = error instanceof Error ? formatBulkQuestionByDomainError(error.message) : null;
    return {
      formError: formattedError ?? 'Bulk question import by domain could not be saved. Try again.',
      fieldErrors: {},
      values,
    };
  }

  if (parsedLines.length < 1) {
    return {
      formError: null,
      fieldErrors: {
        questionLines: 'Paste at least one question.',
      },
      values,
    };
  }

  if (parsedLines.length > MAX_BULK_QUESTION_IMPORT_COUNT) {
    return {
      formError: null,
      fieldErrors: {
        questionLines: `Import at most ${MAX_BULK_QUESTION_IMPORT_COUNT} questions at a time.`,
      },
      values,
    };
  }

  const client = await dependencies.connect();

  try {
    const latestDraftVersionId = await getLatestDraftAssessmentVersionId({
      db: client,
      assessmentKey: context.assessmentKey,
    });
    if (!latestDraftVersionId || latestDraftVersionId !== context.assessmentVersionId) {
      logBulkQuestionImport('latest-draft-rejected', {
        assessmentKey: context.assessmentKey,
        requestedAssessmentVersionId: context.assessmentVersionId,
        latestDraftVersionId,
      });
      return {
        formError: 'The latest draft version is no longer available for question imports.',
        fieldErrors: {},
        values,
      };
    }

    await client.query('BEGIN');
    const createdQuestions = await createBulkQuestionsByDomainRecord({
      db: client,
      assessmentVersionId: context.assessmentVersionId,
      questionLines: values.questionLines,
    });
    await client.query('COMMIT');

    dependencies.revalidatePath(authoringPath(context.assessmentKey));

    return {
      ...initialAdminBulkQuestionByDomainAuthoringFormState,
      values: emptyAdminBulkQuestionByDomainAuthoringFormValues,
      createdQuestions,
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    logBulkQuestionImport('bulk-save-error', {
      assessmentKey: context.assessmentKey,
      assessmentVersionId: context.assessmentVersionId,
      values,
      errorMessage: getErrorMessage(error),
      postgres: toPostgresErrorLike(error),
    });

    return {
      formError: formatBulkQuestionByDomainSaveError(error),
      fieldErrors: {},
      values,
    };
  } finally {
    client.release();
  }
}

export async function createBulkQuestionsByDomain(
  context: ActionContext,
  previousState: BulkQuestionByDomainActionState,
  formData: FormData,
): Promise<BulkQuestionByDomainActionState> {
  return createBulkQuestionsByDomainActionWithDependencies(context, previousState, formData, {
    connect: () => getDbPool().connect(),
    revalidatePath,
  });
}

export async function createQuestionAction(
  context: ActionContext,
  _previousState: AdminQuestionAuthoringFormState,
  formData: FormData,
): Promise<AdminQuestionAuthoringFormState> {
  const values = getQuestionValuesFromFormData(formData);
  const validation = validateAdminQuestionAuthoringValues(values);
  delete validation.fieldErrors.key;
  if (Object.keys(validation.fieldErrors).length > 0) {
    return validation;
  }

  return runQuestionWriteAction({
    assessmentKey: context.assessmentKey,
    values,
    action: (db) =>
      createQuestionRecord({
        db,
        assessmentVersionId: context.assessmentVersionId,
        values,
      }),
  });
}

export async function updateQuestionAction(
  context: ActionContext,
  _previousState: AdminQuestionAuthoringFormState,
  formData: FormData,
): Promise<AdminQuestionAuthoringFormState> {
  const values = getQuestionValuesFromFormData(formData);
  const validation = validateAdminQuestionAuthoringValues(values);
  if (Object.keys(validation.fieldErrors).length > 0) {
    return validation;
  }

  return runQuestionWriteAction({
    assessmentKey: context.assessmentKey,
    values,
    action: (db) =>
      updateQuestionRecord({
        db,
        assessmentVersionId: context.assessmentVersionId,
        questionId: context.questionId ?? '',
        values,
      }).then(() => null),
  });
}

export async function deleteQuestionAction(
  context: ActionContext,
  _previousState: AdminQuestionAuthoringFormState,
  _formData: FormData,
): Promise<AdminQuestionAuthoringFormState> {
  return runQuestionWriteAction({
    assessmentKey: context.assessmentKey,
    values: emptyAdminQuestionAuthoringFormValues,
    action: (db) =>
      deleteQuestionRecord({
        db,
        assessmentVersionId: context.assessmentVersionId,
        questionId: context.questionId ?? '',
      }).then(() => null),
  });
}

export async function duplicateQuestionAction(
  context: ActionContext,
  _previousState: AdminQuestionAuthoringFormState,
  _formData: FormData,
): Promise<AdminQuestionAuthoringFormState> {
  return runQuestionWriteAction({
    assessmentKey: context.assessmentKey,
    values: emptyAdminQuestionAuthoringFormValues,
    action: (db) =>
      duplicateQuestionRecord({
        db,
        assessmentVersionId: context.assessmentVersionId,
        sourceQuestionId: context.questionId ?? '',
      }),
  });
}

export async function createOptionAction(
  context: ActionContext,
  _previousState: AdminOptionAuthoringFormState,
  formData: FormData,
): Promise<AdminOptionAuthoringFormState> {
  const values = getOptionValuesFromFormData(formData);
  const validation = validateAdminOptionAuthoringValues(values);
  delete validation.fieldErrors.key;
  if (Object.keys(validation.fieldErrors).length > 0) {
    return validation;
  }

  return runOptionWriteAction({
    assessmentKey: context.assessmentKey,
    values,
    action: (db) =>
      createOptionRecord({
        db,
        assessmentVersionId: context.assessmentVersionId,
        questionId: context.questionId ?? '',
        values,
      }),
  });
}

export async function updateOptionAction(
  context: ActionContext,
  _previousState: AdminOptionAuthoringFormState,
  formData: FormData,
): Promise<AdminOptionAuthoringFormState> {
  const values = getOptionValuesFromFormData(formData);
  const validation = validateAdminOptionAuthoringValues(values);
  if (Object.keys(validation.fieldErrors).length > 0) {
    return validation;
  }

  return runOptionWriteAction({
    assessmentKey: context.assessmentKey,
    values,
    action: (db) =>
      updateOptionRecord({
        db,
        assessmentVersionId: context.assessmentVersionId,
        questionId: context.questionId ?? '',
        optionId: context.optionId ?? '',
        values,
      }),
  });
}

export async function deleteOptionAction(
  context: ActionContext,
  _previousState: AdminOptionAuthoringFormState,
  _formData: FormData,
): Promise<AdminOptionAuthoringFormState> {
  return runOptionWriteAction({
    assessmentKey: context.assessmentKey,
    values: emptyAdminOptionAuthoringFormValues,
    action: (db) =>
      deleteOptionRecord({
        db,
        assessmentVersionId: context.assessmentVersionId,
        questionId: context.questionId ?? '',
        optionId: context.optionId ?? '',
      }),
  });
}

export async function updateQuestionTextAction(params: {
  assessmentKey: string;
  assessmentVersionId: string;
  questionId: string;
  prompt: string;
}): Promise<InlineQuestionTextUpdateResult> {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const record = await updateQuestionText({
      db: client,
      assessmentVersionId: params.assessmentVersionId,
      questionId: params.questionId,
      prompt: params.prompt,
    });
    await client.query('COMMIT');
    revalidatePath(authoringPath(params.assessmentKey));
    return { ok: true, record };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);

    if (error instanceof Error) {
      if (error.message === 'QUESTION_PROMPT_REQUIRED') {
        return { ok: false, error: 'Question text is required.' };
      }

      if (error.message === 'QUESTION_NOT_FOUND') {
        return { ok: false, error: 'The selected question is no longer available in this draft version.' };
      }
    }

    return { ok: false, error: 'Question text could not be saved. Try again.' };
  } finally {
    client.release();
  }
}

export async function updateOptionTextAction(params: {
  assessmentKey: string;
  assessmentVersionId: string;
  questionId: string;
  optionId: string;
  text: string;
}): Promise<InlineOptionTextUpdateResult> {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const record = await updateOptionText({
      db: client,
      assessmentVersionId: params.assessmentVersionId,
      questionId: params.questionId,
      optionId: params.optionId,
      text: params.text,
    });
    await client.query('COMMIT');
    revalidatePath(authoringPath(params.assessmentKey));
    return { ok: true, record };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);

    if (error instanceof Error) {
      if (error.message === 'OPTION_TEXT_REQUIRED') {
        return { ok: false, error: 'Option text is required.' };
      }

      if (error.message === 'OPTION_NOT_FOUND') {
        return { ok: false, error: 'The selected option is no longer available on this question.' };
      }
    }

    return { ok: false, error: 'Option text could not be saved. Try again.' };
  } finally {
    client.release();
  }
}
