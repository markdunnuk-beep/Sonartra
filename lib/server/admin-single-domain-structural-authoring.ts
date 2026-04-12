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
  emptyAdminWeightingAuthoringFormValues,
  initialAdminWeightingAuthoringFormState,
  type AdminWeightingAuthoringFormState,
  type AdminWeightingAuthoringFormValues,
  validateAdminWeightingAuthoringValues,
} from '@/lib/admin/admin-weighting-authoring';
import {
  emptyAdminAuthoringFormValues,
  initialAdminAuthoringFormState,
  type AdminAuthoringFormState,
  type AdminAuthoringFormValues,
  validateAdminAuthoringValues,
} from '@/lib/admin/admin-domain-signal-authoring';
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
};

type QuestionScopeRow = {
  question_id: string;
  domain_id: string;
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
  const values = getDomainValuesFromFormData(formData);
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
  const values = getDomainValuesFromFormData(formData);
  const validation = validateAdminAuthoringValues(values);
  if (Object.keys(validation.fieldErrors).length > 0) {
    return validation;
  }

  return runDomainSignalWriteAction({
    context,
    values,
    action: async (db) => {
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
  const values = getDomainValuesFromFormData(formData);
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
  const values = getDomainValuesFromFormData(formData);
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
