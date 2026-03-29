'use server';

import { revalidatePath } from 'next/cache';

import {
  type AdminBulkQuestionAuthoringFormState,
  type AdminBulkQuestionAuthoringFormValues,
  type AdminOptionAuthoringFormState,
  type AdminOptionAuthoringFormValues,
  type AdminQuestionAuthoringFormState,
  type AdminQuestionAuthoringFormValues,
  emptyAdminBulkQuestionAuthoringFormValues,
  emptyAdminOptionAuthoringFormValues,
  emptyAdminQuestionAuthoringFormValues,
  initialAdminBulkQuestionAuthoringFormState,
  initialAdminOptionAuthoringFormState,
  initialAdminQuestionAuthoringFormState,
  validateAdminBulkQuestionAuthoringValues,
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

function normalizeFormValue(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function authoringPath(assessmentKey: string): string {
  return `/admin/assessments/${assessmentKey}`;
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

async function getDefaultBulkQuestionDomainId(
  db: Queryable,
  assessmentVersionId: string,
): Promise<string | null> {
  const result = await db.query<{ id: string }>(
    `
    SELECT id
    FROM domains
    WHERE assessment_version_id = $1
    ORDER BY
      CASE WHEN domain_type = 'QUESTION_SECTION' THEN 0 ELSE 1 END ASC,
      order_index ASC,
      id ASC
    LIMIT 1
    `,
    [assessmentVersionId],
  );

  return result.rows[0]?.id ?? null;
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
  count: number;
}): Promise<readonly AdminCreatedQuestion[]> {
  if (!Number.isInteger(params.count) || params.count < 1) {
    throw new Error('INVALID_BULK_COUNT');
  }

  const domainId = await getDefaultBulkQuestionDomainId(params.db, params.assessmentVersionId);
  if (!domainId) {
    throw new Error('DOMAIN_NOT_FOUND');
  }

  const startOrderIndex = await getNextQuestionOrderIndex(params.db, params.assessmentVersionId);
  const questionValues: unknown[] = [];
  const questionPlaceholders = Array.from({ length: params.count }, (_, offset) => {
    const orderIndex = startOrderIndex + offset;
    const base = offset * 5;

    questionValues.push(
      params.assessmentVersionId,
      domainId,
      generateQuestionKey(orderIndex + 1),
      '',
      orderIndex,
    );

    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
  });

  const insertedQuestions = await params.db.query<BulkInsertedQuestionRow>(
    `
    INSERT INTO questions (
      assessment_version_id,
      domain_id,
      question_key,
      prompt,
      order_index
    )
    VALUES ${questionPlaceholders.join(', ')}
    RETURNING id, assessment_version_id, domain_id, question_key, prompt, order_index
    `,
    questionValues,
  );

  const orderedQuestions = insertedQuestions.rows
    .slice()
    .sort(
      (left, right) => Number(left.order_index) - Number(right.order_index) || left.id.localeCompare(right.id),
    );

  const optionValues: unknown[] = [];
  const optionPlaceholders: string[] = [];

  orderedQuestions.forEach((question, questionOffset) => {
    buildDefaultCreatedOptions({
      assessmentVersionId: question.assessment_version_id,
      questionId: question.id,
      questionIndex: Number(question.order_index) + 1,
    }).forEach((option, optionOffset) => {
      const base = (questionOffset * 4 + optionOffset) * 6;

      optionValues.push(
        option.assessmentVersionId,
        option.questionId,
        option.key,
        option.label,
        option.text,
        option.orderIndex,
      );

      optionPlaceholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`,
      );
    });
  });

  const insertedOptions = await params.db.query<BulkInsertedOptionRow>(
    `
    INSERT INTO options (
      assessment_version_id,
      question_id,
      option_key,
      option_label,
      option_text,
      order_index
    )
    VALUES ${optionPlaceholders.join(', ')}
    RETURNING id, assessment_version_id, question_id, option_key, option_label, option_text, order_index
    `,
    optionValues,
  );

  const optionsByQuestionId = new Map<string, AdminQuestionCreatedOption[]>();

  for (const option of insertedOptions.rows) {
    const questionOptions = optionsByQuestionId.get(option.question_id) ?? [];
    questionOptions.push({
      optionId: option.id,
      assessmentVersionId: option.assessment_version_id,
      questionId: option.question_id,
      key: option.option_key,
      label: option.option_label ?? '',
      text: option.option_text,
      orderIndex: Number(option.order_index),
    });
    optionsByQuestionId.set(option.question_id, questionOptions);
  }

  return Object.freeze(
    orderedQuestions.map((question) => ({
      questionId: question.id,
      assessmentVersionId: question.assessment_version_id,
      domainId: question.domain_id,
      key: question.question_key,
      prompt: question.prompt,
      orderIndex: Number(question.order_index),
      options: Object.freeze(
        (optionsByQuestionId.get(question.id) ?? []).sort(
          (left, right) => left.orderIndex - right.orderIndex || left.optionId.localeCompare(right.optionId),
        ),
      ),
    })),
  );
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
    count: normalizeFormValue(formData.get('count')),
  };
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

  const client = await dependencies.connect();

  try {
    await client.query('BEGIN');
    const createdQuestions = await createBulkQuestionRecords({
      db: client,
      assessmentVersionId: context.assessmentVersionId,
      count: Number(values.count),
    });
    await client.query('COMMIT');

    dependencies.revalidatePath(authoringPath(context.assessmentKey));

    return {
      ...initialAdminBulkQuestionAuthoringFormState,
      values: emptyAdminBulkQuestionAuthoringFormValues,
      createdQuestions,
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);

    if (error instanceof Error && error.message === 'DOMAIN_NOT_FOUND') {
      return {
        formError: 'Create at least one domain in this draft before generating questions.',
        fieldErrors: {},
        values,
      };
    }

    return {
      formError: 'Bulk question generation could not be saved. Try again.',
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
