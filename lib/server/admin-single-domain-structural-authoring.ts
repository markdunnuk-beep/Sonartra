'use server';

import { revalidatePath } from 'next/cache';

import {
  emptyAdminOptionAuthoringFormValues,
  emptyAdminQuestionAuthoringFormValues,
  initialAdminOptionAuthoringFormState,
  initialAdminQuestionAuthoringFormState,
  type AdminOptionAuthoringFormState,
  type AdminOptionAuthoringFormValues,
  type AdminQuestionAuthoringFormState,
  type AdminQuestionAuthoringFormValues,
  validateAdminOptionAuthoringValues,
  validateAdminQuestionAuthoringValues,
} from '@/lib/admin/admin-question-option-authoring';
import {
  emptySingleDomainQuestionImportValues,
  formatSingleDomainQuestionImportError,
  initialSingleDomainQuestionImportState,
  buildSingleDomainQuestionImportPlan,
  parseSingleDomainQuestionImport,
  validateSingleDomainQuestionImportValues,
  type SingleDomainQuestionImportState,
  type SingleDomainQuestionImportValues,
} from '@/lib/admin/single-domain-question-import';
import {
  emptySingleDomainResponseImportValues,
  formatSingleDomainResponseImportError,
  initialSingleDomainResponseImportState,
  parseSingleDomainResponseImport,
  validateSingleDomainResponseImportValues,
  type SingleDomainResponseImportState,
  type SingleDomainResponseImportValues,
} from '@/lib/admin/single-domain-response-import';
import {
  emptyAdminWeightingAuthoringFormValues,
  initialAdminWeightingAuthoringFormState,
  type AdminWeightingAuthoringFormState,
  type AdminWeightingAuthoringFormValues,
  validateAdminWeightingAuthoringValues,
} from '@/lib/admin/admin-weighting-authoring';
import {
  emptySingleDomainWeightingsImportValues,
  formatSingleDomainWeightingsImportError,
  initialSingleDomainWeightingsImportState,
  parseSingleDomainWeightingsImport,
  validateSingleDomainWeightingsImportValues,
  type SingleDomainWeightingsImportState,
  type SingleDomainWeightingsImportValues,
} from '@/lib/admin/single-domain-weightings-import';
import {
  emptyAdminAuthoringFormValues,
  initialAdminAuthoringFormState,
  type AdminAuthoringFormState,
  type AdminAuthoringFormValues,
  validateAdminAuthoringValues,
} from '@/lib/admin/admin-domain-signal-authoring';
import {
  buildSingleDomainCreateDomainValues,
  buildSingleDomainCreateSignalValues,
  buildSingleDomainLockedDomainValues,
  buildSingleDomainLockedSignalValues,
} from '@/lib/admin/single-domain-safe-authoring';
import {
  createDomainRecord,
  createSignalRecord,
  deleteSignalRecord,
  updateDomainRecord,
  updateSignalRecord,
} from '@/lib/server/admin-domain-signal-authoring';
import { getDbPool } from '@/lib/server/db';
import {
  createOptionRecord,
  createQuestionRecord,
  deleteOptionRecord,
  deleteQuestionRecord,
  updateOptionText,
  updateQuestionText,
} from '@/lib/server/admin-question-option-authoring';
import {
  createOptionSignalWeightRecord,
  deleteOptionSignalWeightRecord,
  updateOptionSignalWeightRecord,
} from '@/lib/server/admin-weighting-authoring';
import { generateOptionKey, generateQuestionKey } from '@/lib/utils/key-generator';
import { isSingleDomain } from '@/lib/utils/assessment-mode';

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

type VersionScopeRow = {
  assessment_key: string;
  resolved_mode: string | null;
};

type DomainScopeRow = {
  domain_id: string;
  domain_key?: string;
};

type QuestionScopeRow = {
  question_id: string;
  domain_id: string;
};

type ExistingQuestionOrderRow = {
  question_id: string;
  order_index: string | number;
};

type InsertedQuestionIdRow = {
  id: string;
};

type InsertedOptionIdRow = {
  id: string;
};

type SignalScopeRow = {
  signal_id: string;
  signal_key: string;
};

type ImportQuestionOptionRow = {
  question_id: string;
  question_order_index: string | number;
  option_id: string;
  option_label: string | null;
};

type ActionContext = {
  assessmentKey: string;
  assessmentVersionId: string;
  domainId?: string;
  signalId?: string;
  questionId?: string;
  optionId?: string;
  optionSignalWeightId?: string;
};

type TransactionClient = Queryable & {
  release(): void;
};

type ImportDependencies = {
  connect(): Promise<TransactionClient>;
  revalidatePath(path: string): void;
};

type SingleDomainDraftScope = {
  domainIds: readonly string[];
  singleDomainId: string | null;
};

function singleDomainPath(assessmentKey: string): string {
  return `/admin/assessments/single-domain/${assessmentKey}`;
}

async function loadVersionScope(
  db: Queryable,
  assessmentKey: string,
  assessmentVersionId: string,
): Promise<VersionScopeRow | null> {
  const result = await db.query<VersionScopeRow>(
    `
    SELECT
      a.assessment_key,
      COALESCE(av.mode, a.mode) AS resolved_mode
    FROM assessments a
    INNER JOIN assessment_versions av
      ON av.assessment_id = a.id
    WHERE a.assessment_key = $1
      AND av.id = $2
      AND av.lifecycle_status = 'DRAFT'
    `,
    [assessmentKey, assessmentVersionId],
  );

  return result.rows[0] ?? null;
}

async function loadSingleDomainDraftScope(
  db: Queryable,
  context: Pick<ActionContext, 'assessmentKey' | 'assessmentVersionId'>,
): Promise<SingleDomainDraftScope> {
  const versionScope = await loadVersionScope(db, context.assessmentKey, context.assessmentVersionId);
  if (!versionScope) {
    throw new Error('DRAFT_VERSION_NOT_FOUND');
  }

  if (!isSingleDomain(versionScope.resolved_mode)) {
    throw new Error('SINGLE_DOMAIN_MODE_REQUIRED');
  }

  const domainsResult = await db.query<DomainScopeRow>(
    `
    SELECT id AS domain_id
    FROM domains
    WHERE assessment_version_id = $1
      AND domain_type = 'SIGNAL_GROUP'
    ORDER BY order_index ASC, id ASC
    `,
    [context.assessmentVersionId],
  );

  const domainIds = domainsResult.rows.map((row) => row.domain_id);

  return {
    domainIds: Object.freeze(domainIds),
    singleDomainId: domainIds[0] ?? null,
  };
}

async function assertSingleDomainQuestionScope(
  db: Queryable,
  context: Pick<ActionContext, 'assessmentVersionId' | 'questionId'>,
): Promise<QuestionScopeRow | null> {
  const result = await db.query<QuestionScopeRow>(
    `
    SELECT id AS question_id, domain_id
    FROM questions
    WHERE id = $1
      AND assessment_version_id = $2
    `,
    [context.questionId, context.assessmentVersionId],
  );

  return result.rows[0] ?? null;
}

async function loadSingleDomainDomainScope(
  db: Queryable,
  context: Pick<ActionContext, 'assessmentVersionId' | 'domainId'>,
): Promise<DomainScopeRow | null> {
  const result = await db.query<DomainScopeRow>(
    `
    SELECT id AS domain_id, domain_key
    FROM domains
    WHERE id = $1
      AND assessment_version_id = $2
      AND domain_type = 'SIGNAL_GROUP'
    `,
    [context.domainId, context.assessmentVersionId],
  );

  return result.rows[0] ?? null;
}

async function loadSingleDomainSignalScope(
  db: Queryable,
  context: Pick<ActionContext, 'assessmentVersionId' | 'domainId' | 'signalId'>,
): Promise<SignalScopeRow | null> {
  const result = await db.query<SignalScopeRow>(
    `
    SELECT id AS signal_id, signal_key
    FROM signals
    WHERE id = $1
      AND domain_id = $2
      AND assessment_version_id = $3
    `,
    [context.signalId, context.domainId, context.assessmentVersionId],
  );

  return result.rows[0] ?? null;
}

function normalizeFormValue(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getDomainValuesFromFormData(formData: FormData): AdminAuthoringFormValues {
  return {
    label: normalizeFormValue(formData.get('label')),
    key: normalizeFormValue(formData.get('key')).toLowerCase(),
    description: normalizeFormValue(formData.get('description')),
  };
}

function getQuestionValuesFromFormData(formData: FormData): AdminQuestionAuthoringFormValues {
  return {
    prompt: normalizeFormValue(formData.get('prompt')),
    key: '',
    domainId: normalizeFormValue(formData.get('domainId')),
  };
}

function getOptionValuesFromFormData(formData: FormData): AdminOptionAuthoringFormValues {
  return {
    key: '',
    label: normalizeFormValue(formData.get('label')),
    text: normalizeFormValue(formData.get('text')),
  };
}

function getWeightValuesFromFormData(formData: FormData): AdminWeightingAuthoringFormValues {
  return {
    signalId: normalizeFormValue(formData.get('signalId')),
    weight: normalizeFormValue(formData.get('weight')),
  };
}

function getSingleDomainQuestionImportValuesFromFormData(
  formData: FormData,
): SingleDomainQuestionImportValues {
  return {
    questionLines: typeof formData.get('questionLines') === 'string'
      ? (formData.get('questionLines') as string)
      : '',
  };
}

function getSingleDomainResponseImportValuesFromFormData(
  formData: FormData,
): SingleDomainResponseImportValues {
  return {
    responseLines: typeof formData.get('responseLines') === 'string'
      ? (formData.get('responseLines') as string)
      : '',
  };
}

function getSingleDomainWeightingsImportValuesFromFormData(
  formData: FormData,
): SingleDomainWeightingsImportValues {
  return {
    weightingLines: typeof formData.get('weightingLines') === 'string'
      ? (formData.get('weightingLines') as string)
      : '',
  };
}

function buildTemporaryQuestionKey(lineNumber: number, orderIndex: number): string {
  return `single-domain-import-q-${lineNumber}-${orderIndex + 1}`;
}

function buildTemporaryOptionKey(lineNumber: number, orderIndex: number, optionLabel: string): string {
  return `single-domain-import-o-${lineNumber}-${orderIndex + 1}-${optionLabel.toLowerCase()}`;
}

function getCanonicalOptionLetter(optionOrderIndex: number): string {
  const normalizedIndex = Math.max(0, optionOrderIndex - 1);
  return String.fromCharCode('a'.charCodeAt(0) + normalizedIndex);
}

async function loadExistingSingleDomainQuestions(
  db: Queryable,
  assessmentVersionId: string,
): Promise<readonly ExistingQuestionOrderRow[]> {
  const result = await db.query<ExistingQuestionOrderRow>(
    `
    SELECT id AS question_id, order_index
    FROM questions
    WHERE assessment_version_id = $1
    ORDER BY order_index ASC, id ASC
    `,
    [assessmentVersionId],
  );

  return Object.freeze(result.rows);
}

async function loadSingleDomainQuestionOptionsForImport(
  db: Queryable,
  assessmentVersionId: string,
  domainId: string,
): Promise<readonly ImportQuestionOptionRow[]> {
  const result = await db.query<ImportQuestionOptionRow>(
    `
    SELECT
      q.id AS question_id,
      q.order_index AS question_order_index,
      o.id AS option_id,
      o.option_label
    FROM questions q
    INNER JOIN options o ON o.question_id = q.id
    WHERE q.assessment_version_id = $1
      AND q.domain_id = $2
    ORDER BY q.order_index ASC, q.id ASC, o.order_index ASC, o.id ASC
    `,
    [assessmentVersionId, domainId],
  );

  return Object.freeze(result.rows);
}

async function loadSingleDomainSignalsForImport(
  db: Queryable,
  assessmentVersionId: string,
  domainId: string,
): Promise<readonly SignalScopeRow[]> {
  const result = await db.query<SignalScopeRow>(
    `
    SELECT id AS signal_id, signal_key
    FROM signals
    WHERE assessment_version_id = $1
      AND domain_id = $2
    ORDER BY order_index ASC, id ASC
    `,
    [assessmentVersionId, domainId],
  );

  return Object.freeze(result.rows);
}

async function rekeySingleDomainQuestionOptions(params: {
  db: Queryable;
  assessmentVersionId: string;
  questionId: string;
  questionIndex: number;
}): Promise<void> {
  const options = await params.db.query<{ id: string; order_index: string | number }>(
    `
    SELECT id, order_index
    FROM options
    WHERE question_id = $1
      AND assessment_version_id = $2
    ORDER BY order_index ASC, id ASC
    `,
    [params.questionId, params.assessmentVersionId],
  );

  for (const option of options.rows) {
    const optionOrderIndex = Number(option.order_index);
    await params.db.query(
      `
      UPDATE options
      SET
        option_key = $3,
        updated_at = NOW()
      WHERE id = $1
        AND assessment_version_id = $2
      `,
      [
        option.id,
        params.assessmentVersionId,
        generateOptionKey(params.questionIndex, getCanonicalOptionLetter(optionOrderIndex)),
      ],
    );
  }
}

async function rekeySingleDomainQuestions(
  db: Queryable,
  assessmentVersionId: string,
): Promise<void> {
  const questions = await db.query<ExistingQuestionOrderRow>(
    `
    SELECT id AS question_id, order_index
    FROM questions
    WHERE assessment_version_id = $1
    ORDER BY order_index ASC, id ASC
    `,
    [assessmentVersionId],
  );

  for (const question of questions.rows) {
    const questionIndex = Number(question.order_index) + 1;
    await db.query(
      `
      UPDATE questions
      SET
        question_key = $3,
        updated_at = NOW()
      WHERE id = $1
        AND assessment_version_id = $2
      `,
      [question.question_id, assessmentVersionId, generateQuestionKey(questionIndex)],
    );

    await rekeySingleDomainQuestionOptions({
      db,
      assessmentVersionId,
      questionId: question.question_id,
      questionIndex,
    });
  }
}

async function runDomainSignalWriteAction(params: {
  context: ActionContext;
  values: AdminAuthoringFormValues;
  action: (db: Queryable, scope: SingleDomainDraftScope) => Promise<void>;
}): Promise<AdminAuthoringFormState> {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const scope = await loadSingleDomainDraftScope(client, params.context);
    await params.action(client, scope);
    await client.query('COMMIT');

    revalidatePath(singleDomainPath(params.context.assessmentKey));

    return initialAdminAuthoringFormState;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);

    if (error instanceof Error) {
      if (error.message === 'DRAFT_VERSION_NOT_FOUND') {
        return {
          formError: 'The editable draft version is no longer available.',
          fieldErrors: {},
          values: params.values,
        };
      }

      if (error.message === 'SINGLE_DOMAIN_MODE_REQUIRED') {
        return {
          formError: 'Single-domain structural edits are only available on single-domain drafts.',
          fieldErrors: {},
          values: params.values,
        };
      }

      if (error.message === 'SINGLE_DOMAIN_DOMAIN_LIMIT') {
        return {
          formError: 'This builder supports one domain only. Edit the existing domain instead of creating another.',
          fieldErrors: {},
          values: params.values,
        };
      }

      if (error.message === 'DOMAIN_NOT_FOUND') {
        return {
          formError: 'The selected domain is no longer available in this draft version.',
          fieldErrors: {},
          values: params.values,
        };
      }

      if (error.message === 'SIGNAL_NOT_FOUND') {
        return {
          formError: 'The selected signal is no longer available in this draft version.',
          fieldErrors: {},
          values: params.values,
        };
      }

      if (error.message === 'DOMAIN_KEY_EXISTS') {
        return {
          formError: null,
          fieldErrors: {
            key: 'That domain key already exists in this draft version.',
          },
          values: params.values,
        };
      }

      if (error.message === 'SIGNAL_KEY_EXISTS') {
        return {
          formError: null,
          fieldErrors: {
            key: 'That signal key already exists in this draft version.',
          },
          values: params.values,
        };
      }
    }

    return {
      formError: 'Changes could not be saved. Review the inputs and try again.',
      fieldErrors: {},
      values: params.values,
    };
  } finally {
    client.release();
  }
}

async function runQuestionWriteAction(params: {
  context: ActionContext;
  values: AdminQuestionAuthoringFormValues;
  action: (db: Queryable, scope: SingleDomainDraftScope) => Promise<void>;
}): Promise<AdminQuestionAuthoringFormState> {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const scope = await loadSingleDomainDraftScope(client, params.context);
    await params.action(client, scope);
    await client.query('COMMIT');

    revalidatePath(singleDomainPath(params.context.assessmentKey));

    return initialAdminQuestionAuthoringFormState;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);

    if (error instanceof Error) {
      if (error.message === 'DRAFT_VERSION_NOT_FOUND') {
        return {
          formError: 'The editable draft version is no longer available.',
          fieldErrors: {},
          values: params.values,
        };
      }

      if (error.message === 'SINGLE_DOMAIN_MODE_REQUIRED') {
        return {
          formError: 'Single-domain question authoring is only available on single-domain drafts.',
          fieldErrors: {},
          values: params.values,
        };
      }

      if (error.message === 'SINGLE_DOMAIN_DOMAIN_REQUIRED') {
        return {
          formError: 'Create the single domain first before adding questions.',
          fieldErrors: {},
          values: params.values,
        };
      }

      if (error.message === 'SINGLE_DOMAIN_QUESTION_DOMAIN_MISMATCH') {
        return {
          formError: 'Questions in this builder must belong to the single authored domain.',
          fieldErrors: {
            domainId: 'Questions must stay on the single authored domain.',
          },
          values: params.values,
        };
      }

      if (error.message === 'QUESTION_NOT_FOUND') {
        return {
          formError: 'The selected question is no longer available in this draft version.',
          fieldErrors: {},
          values: params.values,
        };
      }
    }

    return {
      formError: 'Question changes could not be saved. Review the inputs and try again.',
      fieldErrors: {},
      values: params.values,
    };
  } finally {
    client.release();
  }
}

async function runQuestionImportAction(params: {
  context: ActionContext;
  values: SingleDomainQuestionImportValues;
  dependencies: ImportDependencies;
  action: (
    db: Queryable,
    scope: SingleDomainDraftScope,
  ) => Promise<SingleDomainQuestionImportState & {
    createdQuestions?: readonly {
      questionId: string;
      assessmentVersionId: string;
      domainId: string;
      key: string;
      prompt: string;
      orderIndex: number;
      options: readonly {
        optionId: string;
        key: string;
        label: string;
        text: string;
        orderIndex: number;
      }[];
    }[];
  }>;
}): Promise<SingleDomainQuestionImportState & {
  createdQuestions?: readonly {
    questionId: string;
    assessmentVersionId: string;
    domainId: string;
    key: string;
    prompt: string;
    orderIndex: number;
    options: readonly {
      optionId: string;
      key: string;
      label: string;
      text: string;
      orderIndex: number;
    }[];
  }[];
}> {
  const client = await params.dependencies.connect();

  try {
    await client.query('BEGIN');
    const scope = await loadSingleDomainDraftScope(client, params.context);
    const result = await params.action(client, scope);
    await client.query('COMMIT');
    params.dependencies.revalidatePath(singleDomainPath(params.context.assessmentKey));
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);

    if (error instanceof Error) {
      if (error.message === 'DRAFT_VERSION_NOT_FOUND') {
        return {
          formError: 'The editable draft version is no longer available.',
          fieldErrors: {},
          values: params.values,
        };
      }

      if (error.message === 'SINGLE_DOMAIN_MODE_REQUIRED') {
        return {
          formError: 'Single-domain question import is only available on single-domain drafts.',
          fieldErrors: {},
          values: params.values,
        };
      }

      if (error.message === 'SINGLE_DOMAIN_DOMAIN_REQUIRED') {
        return {
          formError: 'Create the single domain first before importing questions.',
          fieldErrors: {},
          values: params.values,
        };
      }

      const formattedImportError = formatSingleDomainQuestionImportError(error.message);
      if (formattedImportError) {
        return {
          formError: formattedImportError,
          fieldErrors: {},
          values: params.values,
        };
      }
    }

    return {
      formError: 'Question import could not be saved. Try again.',
      fieldErrors: {},
      values: params.values,
    };
  } finally {
    client.release();
  }
}

async function runResponseImportAction(params: {
  context: ActionContext;
  values: SingleDomainResponseImportValues;
  dependencies: ImportDependencies;
  action: (
    db: Queryable,
    scope: SingleDomainDraftScope,
  ) => Promise<SingleDomainResponseImportState>;
}): Promise<SingleDomainResponseImportState> {
  const client = await params.dependencies.connect();

  try {
    await client.query('BEGIN');
    const scope = await loadSingleDomainDraftScope(client, params.context);
    const result = await params.action(client, scope);
    await client.query('COMMIT');
    params.dependencies.revalidatePath(singleDomainPath(params.context.assessmentKey));
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);

    if (error instanceof Error) {
      if (error.message === 'DRAFT_VERSION_NOT_FOUND') {
        return {
          formError: 'The editable draft version is no longer available.',
          fieldErrors: {},
          values: params.values,
        };
      }

      if (error.message === 'SINGLE_DOMAIN_MODE_REQUIRED') {
        return {
          formError: 'Single-domain responses import is only available on single-domain drafts.',
          fieldErrors: {},
          values: params.values,
        };
      }

      if (error.message === 'SINGLE_DOMAIN_DOMAIN_REQUIRED') {
        return {
          formError: 'Create the single domain first before importing responses.',
          fieldErrors: {},
          values: params.values,
        };
      }

      const formattedImportError = formatSingleDomainResponseImportError(error.message);
      if (formattedImportError) {
        return {
          formError: formattedImportError,
          fieldErrors: {},
          values: params.values,
        };
      }
    }

    return {
      formError: 'Responses import could not be saved. Try again.',
      fieldErrors: {},
      values: params.values,
    };
  } finally {
    client.release();
  }
}

async function runWeightingsImportAction(params: {
  context: ActionContext;
  values: SingleDomainWeightingsImportValues;
  dependencies: ImportDependencies;
  action: (
    db: Queryable,
    scope: SingleDomainDraftScope,
  ) => Promise<SingleDomainWeightingsImportState>;
}): Promise<SingleDomainWeightingsImportState> {
  const client = await params.dependencies.connect();

  try {
    await client.query('BEGIN');
    const scope = await loadSingleDomainDraftScope(client, params.context);
    const result = await params.action(client, scope);
    await client.query('COMMIT');
    params.dependencies.revalidatePath(singleDomainPath(params.context.assessmentKey));
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);

    if (error instanceof Error) {
      if (error.message === 'DRAFT_VERSION_NOT_FOUND') {
        return {
          formError: 'The editable draft version is no longer available.',
          fieldErrors: {},
          values: params.values,
        };
      }

      if (error.message === 'SINGLE_DOMAIN_MODE_REQUIRED') {
        return {
          formError: 'Single-domain weightings import is only available on single-domain drafts.',
          fieldErrors: {},
          values: params.values,
        };
      }

      if (error.message === 'SINGLE_DOMAIN_DOMAIN_REQUIRED') {
        return {
          formError: 'Create the single domain first before importing weightings.',
          fieldErrors: {},
          values: params.values,
        };
      }

      const formattedImportError = formatSingleDomainWeightingsImportError(error.message);
      if (formattedImportError) {
        return {
          formError: formattedImportError,
          fieldErrors: {},
          values: params.values,
        };
      }
    }

    return {
      formError: 'Weightings import could not be saved. Try again.',
      fieldErrors: {},
      values: params.values,
    };
  } finally {
    client.release();
  }
}

async function runOptionWriteAction(params: {
  context: ActionContext;
  values: AdminOptionAuthoringFormValues;
  action: (db: Queryable, scope: SingleDomainDraftScope) => Promise<void>;
}): Promise<AdminOptionAuthoringFormState> {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const scope = await loadSingleDomainDraftScope(client, params.context);
    await params.action(client, scope);
    await client.query('COMMIT');

    revalidatePath(singleDomainPath(params.context.assessmentKey));

    return initialAdminOptionAuthoringFormState;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);

    if (error instanceof Error) {
      if (error.message === 'DRAFT_VERSION_NOT_FOUND') {
        return {
          formError: 'The editable draft version is no longer available.',
          fieldErrors: {},
          values: params.values,
        };
      }

      if (error.message === 'SINGLE_DOMAIN_MODE_REQUIRED') {
        return {
          formError: 'Single-domain response authoring is only available on single-domain drafts.',
          fieldErrors: {},
          values: params.values,
        };
      }

      if (error.message === 'QUESTION_NOT_FOUND') {
        return {
          formError: 'The selected question is no longer available in this draft version.',
          fieldErrors: {},
          values: params.values,
        };
      }

      if (error.message === 'OPTION_NOT_FOUND') {
        return {
          formError: 'The selected option is no longer available on this question.',
          fieldErrors: {},
          values: params.values,
        };
      }
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

async function runWeightWriteAction(params: {
  context: ActionContext;
  values: AdminWeightingAuthoringFormValues;
  action: (db: Queryable, scope: SingleDomainDraftScope) => Promise<void>;
}): Promise<AdminWeightingAuthoringFormState> {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const scope = await loadSingleDomainDraftScope(client, params.context);
    await params.action(client, scope);
    await client.query('COMMIT');

    revalidatePath(singleDomainPath(params.context.assessmentKey));

    return initialAdminWeightingAuthoringFormState;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);

    if (error instanceof Error) {
      if (error.message === 'DRAFT_VERSION_NOT_FOUND') {
        return {
          formError: 'The editable draft version is no longer available.',
          fieldErrors: {},
          values: params.values,
        };
      }

      if (error.message === 'SINGLE_DOMAIN_MODE_REQUIRED') {
        return {
          formError: 'Single-domain weighting edits are only available on single-domain drafts.',
          fieldErrors: {},
          values: params.values,
        };
      }

      if (error.message === 'OPTION_NOT_FOUND') {
        return {
          formError: 'The selected option is no longer available in this draft version.',
          fieldErrors: {},
          values: params.values,
        };
      }

      if (error.message === 'SIGNAL_NOT_FOUND') {
        return {
          formError: 'The selected signal is no longer available in this draft version.',
          fieldErrors: {},
          values: params.values,
        };
      }

      if (error.message === 'OPTION_SIGNAL_MAPPING_NOT_FOUND') {
        return {
          formError: 'The selected weighting row is no longer available in this draft version.',
          fieldErrors: {},
          values: params.values,
        };
      }

      if (error.message === 'OPTION_SIGNAL_MAPPING_EXISTS') {
        return {
          formError: null,
          fieldErrors: {
            signalId: 'That signal is already mapped to this option.',
          },
          values: params.values,
        };
      }
    }

    return {
      formError: 'Weighting changes could not be saved. Review the inputs and try again.',
      fieldErrors: {},
      values: params.values,
    };
  } finally {
    client.release();
  }
}

export async function createSingleDomainDomainAction(
  context: ActionContext,
  _previousState: AdminAuthoringFormState,
  formData: FormData,
): Promise<AdminAuthoringFormState> {
  const values = buildSingleDomainCreateDomainValues(getDomainValuesFromFormData(formData));
  const validation = validateAdminAuthoringValues(values);
  if (Object.keys(validation.fieldErrors).length > 0) {
    return validation;
  }

  return runDomainSignalWriteAction({
    context,
    values,
    action: async (db, scope) => {
      if (scope.domainIds.length > 0) {
        throw new Error('SINGLE_DOMAIN_DOMAIN_LIMIT');
      }

      await createDomainRecord({
        db,
        assessmentVersionId: context.assessmentVersionId,
        values,
      });
    },
  });
}

export async function updateSingleDomainDomainAction(
  context: ActionContext,
  _previousState: AdminAuthoringFormState,
  formData: FormData,
): Promise<AdminAuthoringFormState> {
  const submittedValues = getDomainValuesFromFormData(formData);
  const submittedValidation = validateAdminAuthoringValues(submittedValues);
  if (Object.keys(submittedValidation.fieldErrors).length > 0) {
    return submittedValidation;
  }

  return runDomainSignalWriteAction({
    context,
    values: submittedValues,
    action: async (db) => {
      const currentDomain = await loadSingleDomainDomainScope(db, context);
      if (!currentDomain?.domain_key) {
        throw new Error('DOMAIN_NOT_FOUND');
      }

      const values = buildSingleDomainLockedDomainValues(
        submittedValues,
        currentDomain.domain_key,
      );

      await updateDomainRecord({
        db,
        assessmentVersionId: context.assessmentVersionId,
        domainId: context.domainId ?? '',
        values,
      });
    },
  });
}

export async function createSingleDomainSignalAction(
  context: ActionContext,
  _previousState: AdminAuthoringFormState,
  formData: FormData,
): Promise<AdminAuthoringFormState> {
  const values = buildSingleDomainCreateSignalValues(getDomainValuesFromFormData(formData));
  const validation = validateAdminAuthoringValues(values);
  if (Object.keys(validation.fieldErrors).length > 0) {
    return validation;
  }

  return runDomainSignalWriteAction({
    context,
    values,
    action: async (db, scope) => {
      if (!scope.domainIds.includes(context.domainId ?? '')) {
        throw new Error('DOMAIN_NOT_FOUND');
      }

      await createSignalRecord({
        db,
        assessmentVersionId: context.assessmentVersionId,
        domainId: context.domainId ?? '',
        values,
      });
    },
  });
}

export async function updateSingleDomainSignalAction(
  context: ActionContext,
  _previousState: AdminAuthoringFormState,
  formData: FormData,
): Promise<AdminAuthoringFormState> {
  const submittedValues = getDomainValuesFromFormData(formData);
  const submittedValidation = validateAdminAuthoringValues(submittedValues);
  if (Object.keys(submittedValidation.fieldErrors).length > 0) {
    return submittedValidation;
  }

  return runDomainSignalWriteAction({
    context,
    values: submittedValues,
    action: async (db, scope) => {
      if (!scope.domainIds.includes(context.domainId ?? '')) {
        throw new Error('DOMAIN_NOT_FOUND');
      }

      const currentSignal = await loadSingleDomainSignalScope(db, context);
      if (!currentSignal?.signal_key) {
        throw new Error('SIGNAL_NOT_FOUND');
      }

      const values = buildSingleDomainLockedSignalValues(
        submittedValues,
        currentSignal.signal_key,
      );

      await updateSignalRecord({
        db,
        assessmentVersionId: context.assessmentVersionId,
        domainId: context.domainId ?? '',
        signalId: context.signalId ?? '',
        values,
      });
    },
  });
}

export async function deleteSingleDomainSignalAction(
  context: ActionContext,
  _previousState: AdminAuthoringFormState,
  _formData: FormData,
): Promise<AdminAuthoringFormState> {
  return runDomainSignalWriteAction({
    context,
    values: emptyAdminAuthoringFormValues,
    action: async (db, scope) => {
      if (!scope.domainIds.includes(context.domainId ?? '')) {
        throw new Error('DOMAIN_NOT_FOUND');
      }

      await deleteSignalRecord({
        db,
        assessmentVersionId: context.assessmentVersionId,
        domainId: context.domainId ?? '',
        signalId: context.signalId ?? '',
      });
    },
  });
}

export async function createSingleDomainQuestionAction(
  context: ActionContext,
  _previousState: AdminQuestionAuthoringFormState,
  formData: FormData,
): Promise<AdminQuestionAuthoringFormState> {
  const values = getQuestionValuesFromFormData(formData);
  const validation = validateAdminQuestionAuthoringValues({ ...values, key: 'q01' });
  delete validation.fieldErrors.key;
  if (Object.keys(validation.fieldErrors).length > 0) {
    return {
      ...validation,
      values,
    };
  }

  return runQuestionWriteAction({
    context,
    values,
    action: async (db, scope) => {
      if (!scope.singleDomainId) {
        throw new Error('SINGLE_DOMAIN_DOMAIN_REQUIRED');
      }

      if (values.domainId !== scope.singleDomainId || scope.domainIds.length !== 1) {
        throw new Error('SINGLE_DOMAIN_QUESTION_DOMAIN_MISMATCH');
      }

      await createQuestionRecord({
        db,
        assessmentVersionId: context.assessmentVersionId,
        values,
      });
    },
  });
}

export async function importSingleDomainQuestionsActionWithDependencies(
  context: ActionContext,
  _previousState: SingleDomainQuestionImportState,
  formData: FormData,
  dependencies: ImportDependencies,
): Promise<SingleDomainQuestionImportState & {
  createdQuestions?: readonly {
    questionId: string;
    assessmentVersionId: string;
    domainId: string;
    key: string;
    prompt: string;
    orderIndex: number;
    options: readonly {
      optionId: string;
      key: string;
      label: string;
      text: string;
      orderIndex: number;
    }[];
  }[];
}> {
  const values = getSingleDomainQuestionImportValuesFromFormData(formData);
  const validation = validateSingleDomainQuestionImportValues(values);
  if (Object.keys(validation.fieldErrors).length > 0) {
    return validation;
  }

  return runQuestionImportAction({
    context,
    values,
    dependencies,
    action: async (db, scope) => {
      if (!scope.singleDomainId || scope.domainIds.length !== 1) {
        throw new Error('SINGLE_DOMAIN_DOMAIN_REQUIRED');
      }

      const parsedRows = parseSingleDomainQuestionImport(values.questionLines);
      const existingQuestions = await loadExistingSingleDomainQuestions(db, context.assessmentVersionId);
      const plan = buildSingleDomainQuestionImportPlan({
        existingQuestions: existingQuestions.map((question) => ({
          questionId: question.question_id,
          orderIndex: Number(question.order_index),
        })),
        rows: parsedRows,
      });

      for (const slot of plan) {
        if (slot.type !== 'existing') {
          continue;
        }

        await db.query(
          `
          UPDATE questions
          SET
            order_index = $3,
            updated_at = NOW()
          WHERE id = $1
            AND assessment_version_id = $2
          `,
          [slot.questionId, context.assessmentVersionId, slot.orderIndex],
        );
      }

      const createdQuestions: {
        questionId: string;
        assessmentVersionId: string;
        domainId: string;
        key: string;
        prompt: string;
        orderIndex: number;
        options: {
          optionId: string;
          key: string;
          label: string;
          text: string;
          orderIndex: number;
        }[];
      }[] = [];

      for (const slot of plan) {
        if (slot.type !== 'new') {
          continue;
        }

        const temporaryQuestionKey = buildTemporaryQuestionKey(slot.lineNumber, slot.orderIndex);
        const insertedQuestion = await db.query<InsertedQuestionIdRow>(
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
            context.assessmentVersionId,
            scope.singleDomainId,
            temporaryQuestionKey,
            slot.prompt,
            slot.orderIndex,
          ],
        );

        const questionId = insertedQuestion.rows[0]?.id;
        if (!questionId) {
          throw new Error('QUESTION_CREATE_FAILED');
        }

        const createdOptions: {
          optionId: string;
          key: string;
          label: string;
          text: string;
          orderIndex: number;
        }[] = [];

        for (const [index, label] of ['A', 'B', 'C', 'D'].entries()) {
          const optionOrderIndex = index + 1;
          const insertedOption = await db.query<InsertedOptionIdRow>(
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
              context.assessmentVersionId,
              questionId,
              buildTemporaryOptionKey(slot.lineNumber, slot.orderIndex, label),
              label,
              '',
              optionOrderIndex,
            ],
          );

          const optionId = insertedOption.rows[0]?.id;
          if (!optionId) {
            throw new Error('OPTION_CREATE_FAILED');
          }

          createdOptions.push({
            optionId,
            key: '',
            label,
            text: '',
            orderIndex: optionOrderIndex,
          });
        }

        createdQuestions.push({
          questionId,
          assessmentVersionId: context.assessmentVersionId,
          domainId: scope.singleDomainId,
          key: '',
          prompt: slot.prompt,
          orderIndex: slot.orderIndex,
          options: createdOptions,
        });
      }

      await rekeySingleDomainQuestions(db, context.assessmentVersionId);

      for (const createdQuestion of createdQuestions) {
        const questionIndex = createdQuestion.orderIndex + 1;
        createdQuestion.key = generateQuestionKey(questionIndex);
        createdQuestion.options = createdQuestion.options.map((option) => ({
          ...option,
          key: generateOptionKey(questionIndex, getCanonicalOptionLetter(option.orderIndex)),
        }));
      }

      return {
        ...initialSingleDomainQuestionImportState,
        values: emptySingleDomainQuestionImportValues,
        createdQuestions: Object.freeze(
          createdQuestions
            .sort((left, right) => left.orderIndex - right.orderIndex || left.questionId.localeCompare(right.questionId))
            .map((question) => ({
              ...question,
              options: Object.freeze(question.options),
            })),
        ),
      };
    },
  });
}

export async function importSingleDomainQuestionsAction(
  context: ActionContext,
  previousState: SingleDomainQuestionImportState,
  formData: FormData,
): Promise<SingleDomainQuestionImportState & {
  createdQuestions?: readonly {
    questionId: string;
    assessmentVersionId: string;
    domainId: string;
    key: string;
    prompt: string;
    orderIndex: number;
    options: readonly {
      optionId: string;
      key: string;
      label: string;
      text: string;
      orderIndex: number;
    }[];
  }[];
}> {
  return importSingleDomainQuestionsActionWithDependencies(
    context,
    previousState,
    formData,
    {
      connect: () => getDbPool().connect(),
      revalidatePath,
    },
  );
}

export async function importSingleDomainResponsesActionWithDependencies(
  context: ActionContext,
  _previousState: SingleDomainResponseImportState,
  formData: FormData,
  dependencies: ImportDependencies,
): Promise<SingleDomainResponseImportState> {
  const values = getSingleDomainResponseImportValuesFromFormData(formData);
  const validation = validateSingleDomainResponseImportValues(values);
  if (Object.keys(validation.fieldErrors).length > 0) {
    return validation;
  }

  return runResponseImportAction({
    context,
    values,
    dependencies,
    action: async (db, scope) => {
      if (!scope.singleDomainId || scope.domainIds.length !== 1) {
        throw new Error('SINGLE_DOMAIN_DOMAIN_REQUIRED');
      }

      const parsedRows = parseSingleDomainResponseImport(values.responseLines);
      const questionOptions = await loadSingleDomainQuestionOptionsForImport(
        db,
        context.assessmentVersionId,
        scope.singleDomainId,
      );

      const questionMap = new Map<number, Map<string, { questionId: string; optionId: string }[]>>();

      for (const row of questionOptions) {
        const questionOrder = Number(row.question_order_index) + 1;
        const optionLabel = row.option_label?.trim().toUpperCase() ?? '';
        const optionEntry = {
          questionId: row.question_id,
          optionId: row.option_id,
        };
        const optionsByLabel = questionMap.get(questionOrder) ?? new Map<string, { questionId: string; optionId: string }[]>();
        const existingOptions = optionsByLabel.get(optionLabel) ?? [];
        existingOptions.push(optionEntry);
        optionsByLabel.set(optionLabel, existingOptions);
        questionMap.set(questionOrder, optionsByLabel);
      }

      const updates: { questionId: string; optionId: string; responseText: string }[] = [];

      for (const row of parsedRows) {
        const questionOptionsByLabel = questionMap.get(row.questionOrder);
        if (!questionOptionsByLabel) {
          throw new Error(
            `SINGLE_DOMAIN_RESPONSES_IMPORT_LINE_${row.lineNumber}_QUESTION_ORDER_NOT_FOUND_${row.questionOrder}`,
          );
        }

        const matchedOptions = questionOptionsByLabel.get(row.optionLabel) ?? [];
        if (matchedOptions.length !== 1) {
          throw new Error(
            `SINGLE_DOMAIN_RESPONSES_IMPORT_LINE_${row.lineNumber}_OPTION_LABEL_NOT_FOUND_${row.questionOrder}_${row.optionLabel}`,
          );
        }

        updates.push({
          questionId: matchedOptions[0].questionId,
          optionId: matchedOptions[0].optionId,
          responseText: row.responseText,
        });
      }

      for (const update of updates) {
        await updateOptionText({
          db,
          assessmentVersionId: context.assessmentVersionId,
          questionId: update.questionId,
          optionId: update.optionId,
          text: update.responseText,
        });
      }

      return {
        ...initialSingleDomainResponseImportState,
        values: emptySingleDomainResponseImportValues,
        updatedQuestionCount: new Set(updates.map((update) => update.questionId)).size,
        updatedOptionCount: updates.length,
      };
    },
  });
}

export async function importSingleDomainResponsesAction(
  context: ActionContext,
  previousState: SingleDomainResponseImportState,
  formData: FormData,
): Promise<SingleDomainResponseImportState> {
  return importSingleDomainResponsesActionWithDependencies(
    context,
    previousState,
    formData,
    {
      connect: () => getDbPool().connect(),
      revalidatePath,
    },
  );
}

export async function importSingleDomainWeightingsActionWithDependencies(
  context: ActionContext,
  _previousState: SingleDomainWeightingsImportState,
  formData: FormData,
  dependencies: ImportDependencies,
): Promise<SingleDomainWeightingsImportState> {
  const values = getSingleDomainWeightingsImportValuesFromFormData(formData);
  const validation = validateSingleDomainWeightingsImportValues(values);
  if (Object.keys(validation.fieldErrors).length > 0) {
    return validation;
  }

  return runWeightingsImportAction({
    context,
    values,
    dependencies,
    action: async (db, scope) => {
      if (!scope.singleDomainId || scope.domainIds.length !== 1) {
        throw new Error('SINGLE_DOMAIN_DOMAIN_REQUIRED');
      }

      const parsedRows = parseSingleDomainWeightingsImport(values.weightingLines);
      const [questionOptions, signals] = await Promise.all([
        loadSingleDomainQuestionOptionsForImport(
          db,
          context.assessmentVersionId,
          scope.singleDomainId,
        ),
        loadSingleDomainSignalsForImport(
          db,
          context.assessmentVersionId,
          scope.singleDomainId,
        ),
      ]);

      const questionMap = new Map<number, Map<string, { optionId: string }[]>>();
      for (const row of questionOptions) {
        const questionOrder = Number(row.question_order_index) + 1;
        const optionLabel = row.option_label?.trim().toUpperCase() ?? '';
        const optionsByLabel = questionMap.get(questionOrder) ?? new Map<string, { optionId: string }[]>();
        const existingOptions = optionsByLabel.get(optionLabel) ?? [];
        existingOptions.push({ optionId: row.option_id });
        optionsByLabel.set(optionLabel, existingOptions);
        questionMap.set(questionOrder, optionsByLabel);
      }

      const signalsByKey = new Map<string, SignalScopeRow[]>();
      for (const signal of signals) {
        const existingSignals = signalsByKey.get(signal.signal_key) ?? [];
        existingSignals.push(signal);
        signalsByKey.set(signal.signal_key, existingSignals);
      }

      const groupedByOptionId = new Map<string, {
        questionOrder: number;
        optionLabel: string;
        optionId: string;
        rows: { signalId: string; signalKey: string; weight: number }[];
      }>();

      for (const row of parsedRows) {
        const questionOptionsByLabel = questionMap.get(row.questionOrder);
        if (!questionOptionsByLabel) {
          throw new Error(
            `SINGLE_DOMAIN_WEIGHTINGS_IMPORT_LINE_${row.lineNumber}_QUESTION_ORDER_NOT_FOUND_${row.questionOrder}`,
          );
        }

        const matchedOptions = questionOptionsByLabel.get(row.optionLabel) ?? [];
        if (matchedOptions.length !== 1) {
          throw new Error(
            `SINGLE_DOMAIN_WEIGHTINGS_IMPORT_LINE_${row.lineNumber}_OPTION_LABEL_NOT_FOUND_${row.questionOrder}_${row.optionLabel}`,
          );
        }

        const matchedSignals = signalsByKey.get(row.signalKey) ?? [];
        if (matchedSignals.length !== 1) {
          throw new Error(
            `SINGLE_DOMAIN_WEIGHTINGS_IMPORT_LINE_${row.lineNumber}_SIGNAL_KEY_NOT_FOUND_${row.signalKey}`,
          );
        }

        const optionId = matchedOptions[0].optionId;
        const currentGroup = groupedByOptionId.get(optionId) ?? {
          questionOrder: row.questionOrder,
          optionLabel: row.optionLabel,
          optionId,
          rows: [],
        };
        currentGroup.rows.push({
          signalId: matchedSignals[0].signal_id,
          signalKey: matchedSignals[0].signal_key,
          weight: row.weight,
        });
        groupedByOptionId.set(optionId, currentGroup);
      }

      for (const group of groupedByOptionId.values()) {
        await db.query(
          `
          DELETE FROM option_signal_weights
          WHERE option_id = $1
          `,
          [group.optionId],
        );

        for (const row of group.rows) {
          await db.query(
            `
            INSERT INTO option_signal_weights (
              option_id,
              signal_id,
              weight,
              source_weight_key
            )
            VALUES ($1, $2, $3::numeric(12, 4), $4)
            `,
            [
              group.optionId,
              row.signalId,
              String(row.weight),
              `${group.questionOrder}|${group.optionLabel}|${row.signalKey}`,
            ],
          );
        }
      }

      return {
        ...initialSingleDomainWeightingsImportState,
        values: emptySingleDomainWeightingsImportValues,
        updatedOptionGroupCount: groupedByOptionId.size,
        updatedWeightCount: [...groupedByOptionId.values()].reduce(
          (count, group) => count + group.rows.length,
          0,
        ),
      };
    },
  });
}

export async function importSingleDomainWeightingsAction(
  context: ActionContext,
  previousState: SingleDomainWeightingsImportState,
  formData: FormData,
): Promise<SingleDomainWeightingsImportState> {
  return importSingleDomainWeightingsActionWithDependencies(
    context,
    previousState,
    formData,
    {
      connect: () => getDbPool().connect(),
      revalidatePath,
    },
  );
}

export async function updateSingleDomainQuestionAction(
  context: ActionContext,
  _previousState: AdminQuestionAuthoringFormState,
  formData: FormData,
): Promise<AdminQuestionAuthoringFormState> {
  const values = getQuestionValuesFromFormData(formData);
  const validation = validateAdminQuestionAuthoringValues({ ...values, key: 'q01' });
  delete validation.fieldErrors.key;
  if (Object.keys(validation.fieldErrors).length > 0) {
    return {
      ...validation,
      values,
    };
  }

  return runQuestionWriteAction({
    context,
    values,
    action: async (db, scope) => {
      if (!scope.singleDomainId || values.domainId !== scope.singleDomainId || scope.domainIds.length !== 1) {
        throw new Error('SINGLE_DOMAIN_QUESTION_DOMAIN_MISMATCH');
      }

      await updateQuestionText({
        db,
        assessmentVersionId: context.assessmentVersionId,
        questionId: context.questionId ?? '',
        prompt: values.prompt,
      });
    },
  });
}

export async function deleteSingleDomainQuestionAction(
  context: ActionContext,
  _previousState: AdminQuestionAuthoringFormState,
  _formData: FormData,
): Promise<AdminQuestionAuthoringFormState> {
  return runQuestionWriteAction({
    context,
    values: emptyAdminQuestionAuthoringFormValues,
    action: async (db) => {
      await deleteQuestionRecord({
        db,
        assessmentVersionId: context.assessmentVersionId,
        questionId: context.questionId ?? '',
      });
    },
  });
}

export async function createSingleDomainOptionAction(
  context: ActionContext,
  _previousState: AdminOptionAuthoringFormState,
  formData: FormData,
): Promise<AdminOptionAuthoringFormState> {
  const values = getOptionValuesFromFormData(formData);
  const validation = validateAdminOptionAuthoringValues({ ...values, key: 'q01_a' });
  delete validation.fieldErrors.key;
  if (Object.keys(validation.fieldErrors).length > 0) {
    return {
      ...validation,
      values,
    };
  }

  return runOptionWriteAction({
    context,
    values,
    action: async (db) => {
      await createOptionRecord({
        db,
        assessmentVersionId: context.assessmentVersionId,
        questionId: context.questionId ?? '',
        values,
      });
    },
  });
}

export async function updateSingleDomainOptionAction(
  context: ActionContext,
  _previousState: AdminOptionAuthoringFormState,
  formData: FormData,
): Promise<AdminOptionAuthoringFormState> {
  const values = getOptionValuesFromFormData(formData);
  const validation = validateAdminOptionAuthoringValues({ ...values, key: 'q01_a' });
  delete validation.fieldErrors.key;
  if (Object.keys(validation.fieldErrors).length > 0) {
    return {
      ...validation,
      values,
    };
  }

  return runOptionWriteAction({
    context,
    values,
    action: async (db) => {
      await updateOptionText({
        db,
        assessmentVersionId: context.assessmentVersionId,
        questionId: context.questionId ?? '',
        optionId: context.optionId ?? '',
        text: values.text,
      });
    },
  });
}

export async function deleteSingleDomainOptionAction(
  context: ActionContext,
  _previousState: AdminOptionAuthoringFormState,
  _formData: FormData,
): Promise<AdminOptionAuthoringFormState> {
  return runOptionWriteAction({
    context,
    values: emptyAdminOptionAuthoringFormValues,
    action: async (db) => {
      await deleteOptionRecord({
        db,
        assessmentVersionId: context.assessmentVersionId,
        questionId: context.questionId ?? '',
        optionId: context.optionId ?? '',
      });
    },
  });
}

export async function createSingleDomainWeightAction(
  context: ActionContext,
  _previousState: AdminWeightingAuthoringFormState,
  formData: FormData,
): Promise<AdminWeightingAuthoringFormState> {
  const values = getWeightValuesFromFormData(formData);
  const validation = validateAdminWeightingAuthoringValues(values);
  if (Object.keys(validation.fieldErrors).length > 0) {
    return validation;
  }

  return runWeightWriteAction({
    context,
    values,
    action: async (db) => {
      await createOptionSignalWeightRecord({
        db,
        assessmentVersionId: context.assessmentVersionId,
        optionId: context.optionId ?? '',
        values,
      });
    },
  });
}

export async function updateSingleDomainWeightAction(
  context: ActionContext,
  _previousState: AdminWeightingAuthoringFormState,
  formData: FormData,
): Promise<AdminWeightingAuthoringFormState> {
  const values = getWeightValuesFromFormData(formData);
  const validation = validateAdminWeightingAuthoringValues(values);
  if (Object.keys(validation.fieldErrors).length > 0) {
    return validation;
  }

  return runWeightWriteAction({
    context,
    values,
    action: async (db) => {
      await updateOptionSignalWeightRecord({
        db,
        assessmentVersionId: context.assessmentVersionId,
        optionId: context.optionId ?? '',
        optionSignalWeightId: context.optionSignalWeightId ?? '',
        values,
      });
    },
  });
}

export async function deleteSingleDomainWeightAction(
  context: ActionContext,
  _previousState: AdminWeightingAuthoringFormState,
  _formData: FormData,
): Promise<AdminWeightingAuthoringFormState> {
  return runWeightWriteAction({
    context,
    values: emptyAdminWeightingAuthoringFormValues,
    action: async (db) => {
      await deleteOptionSignalWeightRecord({
        db,
        assessmentVersionId: context.assessmentVersionId,
        optionId: context.optionId ?? '',
        optionSignalWeightId: context.optionSignalWeightId ?? '',
      });
    },
  });
}

export async function resolveSingleDomainQuestionId(
  context: Pick<ActionContext, 'assessmentKey' | 'assessmentVersionId' | 'questionId'>,
): Promise<QuestionScopeRow | null> {
  const scope = await loadSingleDomainDraftScope(getDbPool(), context);
  if (!scope.singleDomainId || !context.questionId) {
    return null;
  }

  const question = await assertSingleDomainQuestionScope(getDbPool(), context);
  if (!question || question.domain_id !== scope.singleDomainId) {
    return null;
  }

  return question;
}
