'use server';

import { revalidatePath } from 'next/cache';

import {
  getNextAssessmentVersionTag,
  type AdminAssessmentVersionActionState,
} from '@/lib/admin/admin-assessment-versioning';
import { runFullDiagnostics } from '@/lib/engine/engine-diagnostics';
import { normalizeScoreResult } from '@/lib/engine/normalization';
import { createAssessmentDefinitionRepository } from '@/lib/engine/repository';
import { buildCanonicalResultPayload } from '@/lib/engine/result-builder';
import { loadRuntimeExecutionModel } from '@/lib/engine/runtime-loader';
import { scoreAssessmentResponses } from '@/lib/engine/scoring';
import type { EngineLanguageBundle, RuntimeAssessmentDefinition, RuntimeResponseSet } from '@/lib/engine/types';
import { validateLatestDraftAssessmentVersion } from '@/lib/server/admin-assessment-validation';
import { getDbPool } from '@/lib/server/db';

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

type TransactionClient = Queryable & {
  release(): void;
};

type DbPoolLike = {
  connect(): Promise<TransactionClient>;
};

type VersioningActionDependencies = {
  getDbPool(): DbPoolLike;
  revalidatePath(path: string): void;
};

type VersioningActionContext = {
  assessmentKey: string;
  assessmentVersionId?: string;
};

type AssessmentVersionLifecycleRow = {
  assessment_id: string;
  assessment_version_id: string;
  version_tag: string;
  lifecycle_status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  title_override: string | null;
  description_override: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type DomainRow = {
  domain_id: string;
  domain_key: string;
  label: string;
  description: string | null;
  domain_type: 'QUESTION_SECTION' | 'SIGNAL_GROUP';
  order_index: number;
};

type SignalRow = {
  signal_id: string;
  domain_id: string;
  signal_key: string;
  label: string;
  description: string | null;
  order_index: number;
  is_overlay: boolean;
};

type QuestionRow = {
  question_id: string;
  domain_id: string;
  question_key: string;
  prompt: string;
  order_index: number;
};

type OptionRow = {
  option_id: string;
  assessment_version_id: string;
  question_id: string;
  option_key: string;
  option_label: string | null;
  option_text: string;
  order_index: number;
};

type OptionSignalWeightRow = {
  option_signal_weight_id: string;
  option_id: string;
  signal_id: string;
  weight: string;
  source_weight_key: string | null;
};

type InsertedIdRow = {
  id: string;
};

type PublishDraftResult = {
  publishedVersionTag: string;
  diagnosticWarnings: readonly string[];
};

type CreateDraftVersionResult = {
  draftVersionId: string;
  draftVersionTag: string;
  sourceVersionTag: string;
};

type AssessmentVersioningFailureStage =
  | 'load_assessment_versions'
  | 'publish_existing_version'
  | 'publish_target_version'
  | 'insert_draft_version'
  | 'load_source_domains'
  | 'insert_domains'
  | 'load_source_signals'
  | 'insert_signals'
  | 'load_source_questions'
  | 'insert_questions'
  | 'load_source_options'
  | 'insert_options'
  | 'load_source_weights'
  | 'insert_weights';

class AssessmentVersioningPersistenceError extends Error {
  readonly stage: AssessmentVersioningFailureStage;
  readonly cause: unknown;

  constructor(stage: AssessmentVersioningFailureStage, cause: unknown) {
    super('ASSESSMENT_VERSIONING_PERSISTENCE_FAILED');
    this.name = 'AssessmentVersioningPersistenceError';
    this.stage = stage;
    this.cause = cause;
  }
}

class DraftVersionPublishDiagnosticsError extends Error {
  readonly errorMessages: readonly string[];
  readonly warningMessages: readonly string[];

  constructor(errorMessages: readonly string[], warningMessages: readonly string[]) {
    super('DRAFT_VERSION_ENGINE_DIAGNOSTICS_FAILED');
    this.name = 'DraftVersionPublishDiagnosticsError';
    this.errorMessages = errorMessages;
    this.warningMessages = warningMessages;
  }
}

function assessmentPath(assessmentKey: string): string {
  return `/admin/assessments/${assessmentKey}`;
}

function unwrapVersioningError(error: unknown): {
  cause: unknown;
  stage: AssessmentVersioningFailureStage | null;
} {
  if (error instanceof AssessmentVersioningPersistenceError) {
    return {
      cause: error.cause,
      stage: error.stage,
    };
  }

  return {
    cause: error,
    stage: null,
  };
}

function createEmptyLanguageBundle(): EngineLanguageBundle {
  return {
    signals: {},
    pairs: {},
    domains: {},
    overview: {},
  };
}

function isLanguageSchemaUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes('assessment_version_language_') && message.includes('does not exist');
}

function createDiagnosticsResponse(definition: RuntimeAssessmentDefinition): RuntimeResponseSet {
  return {
    attemptId: `diagnostic-${definition.version.id}`,
    assessmentKey: definition.assessment.key,
    versionTag: definition.version.versionTag,
    status: 'submitted',
    responsesByQuestionId: {},
    submittedAt: '1970-01-01T00:00:00.000Z',
  };
}

function dedupeMessages(messages: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(messages)]);
}

async function runDraftVersionDiagnostics(params: {
  db: Queryable;
  draftVersionId: string;
}): Promise<{
  errorMessages: readonly string[];
  warningMessages: readonly string[];
}> {
  const repository = createAssessmentDefinitionRepository({ db: params.db });
  const definition = await repository.getAssessmentDefinitionByVersion({
    assessmentVersionId: params.draftVersionId,
  });

  if (!definition) {
    return {
      errorMessages: Object.freeze([
        'The draft runtime definition could not be loaded for engine diagnostics.',
      ]),
      warningMessages: Object.freeze([]),
    };
  }

  let languageBundle = createEmptyLanguageBundle();
  const preflightWarnings: string[] = [];

  try {
    languageBundle = await repository.getAssessmentVersionLanguageBundle(params.draftVersionId);
  } catch (error) {
    if (!isLanguageSchemaUnavailable(error)) {
      throw error;
    }

    preflightWarnings.push(
      'Language datasets are unavailable in this environment. Diagnostics ran with fallback language only.',
    );
  }

  let runtimeModel;
  try {
    runtimeModel = loadRuntimeExecutionModel(definition);
  } catch (error) {
    return {
      errorMessages: Object.freeze([
        error instanceof Error ? error.message : 'Runtime execution model validation failed.',
      ]),
      warningMessages: Object.freeze(preflightWarnings),
    };
  }

  try {
    const responses = createDiagnosticsResponse(definition);
    const scoreResult = scoreAssessmentResponses({
      executionModel: runtimeModel,
      responses,
    });
    const normalizedResult = normalizeScoreResult({ scoreResult });
    const payload = buildCanonicalResultPayload({
      normalizedResult: {
        assessmentVersionId: definition.version.id,
        ...normalizedResult,
        metadata: {
          assessmentKey: definition.assessment.key,
          version: definition.version.versionTag,
          attemptId: responses.attemptId,
        },
        scoringDiagnostics: scoreResult.diagnostics,
        languageBundle,
      },
    });
    const diagnostics = runFullDiagnostics({
      runtimeModel,
      languageConfig: languageBundle,
      normalizationScores: payload.normalizedScores,
      result: payload,
    });

    return {
      errorMessages: dedupeMessages(diagnostics.errors.map((issue) => issue.message)),
      warningMessages: dedupeMessages([
        ...preflightWarnings,
        ...diagnostics.warnings.map((issue) => issue.message),
      ]),
    };
  } catch (error) {
    return {
      errorMessages: Object.freeze([
        error instanceof Error ? error.message : 'Engine diagnostics failed during scoring or payload generation.',
      ]),
      warningMessages: Object.freeze(preflightWarnings),
    };
  }
}

async function loadAssessmentVersionsForKey(
  db: Queryable,
  assessmentKey: string,
): Promise<readonly AssessmentVersionLifecycleRow[]> {
  try {
    const result = await db.query<AssessmentVersionLifecycleRow>(
      `
      SELECT
        a.id AS assessment_id,
        av.id AS assessment_version_id,
        av.version AS version_tag,
        av.lifecycle_status,
        av.title_override,
        av.description_override,
        av.published_at,
        av.created_at,
        av.updated_at
      FROM assessments a
      INNER JOIN assessment_versions av ON av.assessment_id = a.id
      WHERE a.assessment_key = $1
      ORDER BY av.updated_at DESC, av.created_at DESC, av.version DESC
      `,
      [assessmentKey],
    );

    return result.rows;
  } catch (error) {
    throw new AssessmentVersioningPersistenceError('load_assessment_versions', error);
  }
}

function mapVersioningErrorToState(error: unknown): AdminAssessmentVersionActionState | null {
  if (!(error instanceof Error)) {
    return null;
  }

  if (error instanceof DraftVersionPublishDiagnosticsError) {
    return {
      formError: 'The current draft failed engine diagnostics. Resolve the blocking engine issues before publishing.',
      formSuccess: null,
      formWarnings: error.warningMessages,
    };
  }

  switch (error.message) {
    case 'ASSESSMENT_NOT_FOUND':
      return {
        formError: 'This assessment could not be found anymore.',
        formSuccess: null,
        formWarnings: Object.freeze([]),
      };
    case 'DRAFT_VERSION_NOT_FOUND':
      return {
        formError: 'No editable draft version is currently available to publish.',
        formSuccess: null,
        formWarnings: Object.freeze([]),
      };
    case 'DRAFT_VERSION_REQUIRED':
      return {
        formError: 'The selected version is no longer an editable draft.',
        formSuccess: null,
        formWarnings: Object.freeze([]),
      };
    case 'DRAFT_VERSION_NOT_PUBLISH_READY':
      return {
        formError: 'The current draft is not publish-ready yet. Resolve the blocking validation issues before publishing.',
        formSuccess: null,
        formWarnings: Object.freeze([]),
      };
    case 'DRAFT_VERSION_ALREADY_EXISTS':
      return {
        formError: 'A draft version already exists. Continue authoring that draft instead of creating another one.',
        formSuccess: null,
        formWarnings: Object.freeze([]),
      };
    case 'SOURCE_VERSION_NOT_FOUND':
      return {
        formError: 'A source version could not be found for draft duplication.',
        formSuccess: null,
        formWarnings: Object.freeze([]),
      };
    case 'INVALID_ASSESSMENT_VERSION_TAG':
      return {
        formError: 'Existing version tags are not in the expected x.y.z format, so a deterministic next draft version cannot be created.',
        formSuccess: null,
        formWarnings: Object.freeze([]),
      };
    default:
      return null;
  }
}

function logVersioningFailure(params: {
  assessmentKey: string;
  action: 'publish_draft' | 'create_draft';
  stage: AssessmentVersioningFailureStage | null;
  error: unknown;
}): void {
  const message = params.error instanceof Error ? params.error.message : String(params.error);
  console.error('[admin-assessment-versioning] lifecycle mutation failure', {
    assessmentKey: params.assessmentKey,
    action: params.action,
    stage: params.stage,
    message,
  });
}

export async function publishDraftAssessmentVersionRecords(params: {
  db: Queryable;
  assessmentKey: string;
  draftVersionId: string;
}): Promise<PublishDraftResult> {
  const versions = await loadAssessmentVersionsForKey(params.db, params.assessmentKey);
  if (versions.length === 0) {
    throw new Error('ASSESSMENT_NOT_FOUND');
  }

  const draft = versions.find((version) => version.assessment_version_id === params.draftVersionId);
  if (!draft) {
    throw new Error('DRAFT_VERSION_NOT_FOUND');
  }

  if (draft.lifecycle_status !== 'DRAFT') {
    throw new Error('DRAFT_VERSION_REQUIRED');
  }

  const validation = await validateLatestDraftAssessmentVersion(params.db, params.assessmentKey);
  if (!validation.isPublishReady || validation.draftVersionId !== draft.assessment_version_id) {
    throw new Error('DRAFT_VERSION_NOT_PUBLISH_READY');
  }

  const diagnostics = await runDraftVersionDiagnostics({
    db: params.db,
    draftVersionId: draft.assessment_version_id,
  });
  if (diagnostics.errorMessages.length > 0) {
    throw new DraftVersionPublishDiagnosticsError(diagnostics.errorMessages, diagnostics.warningMessages);
  }

  try {
    await params.db.query(
      `
      UPDATE assessment_versions
      SET
        lifecycle_status = 'ARCHIVED',
        updated_at = NOW()
      WHERE assessment_id = $1
        AND lifecycle_status = 'PUBLISHED'
        AND id <> $2
      `,
      [draft.assessment_id, draft.assessment_version_id],
    );
  } catch (error) {
    throw new AssessmentVersioningPersistenceError('publish_existing_version', error);
  }

  try {
    const result = await params.db.query<InsertedIdRow>(
      `
      UPDATE assessment_versions
      SET
        lifecycle_status = 'PUBLISHED',
        published_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
        AND assessment_id = $2
        AND lifecycle_status = 'DRAFT'
      RETURNING id
      `,
      [draft.assessment_version_id, draft.assessment_id],
    );

    if (!result.rows[0]?.id) {
      throw new Error('DRAFT_VERSION_REQUIRED');
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'DRAFT_VERSION_REQUIRED') {
      throw error;
    }

    throw new AssessmentVersioningPersistenceError('publish_target_version', error);
  }

  return {
    publishedVersionTag: draft.version_tag,
    diagnosticWarnings: diagnostics.warningMessages,
  };
}

async function loadSourceDomains(
  db: Queryable,
  assessmentVersionId: string,
): Promise<readonly DomainRow[]> {
  try {
    const result = await db.query<DomainRow>(
      `
      SELECT
        id AS domain_id,
        domain_key,
        label,
        description,
        domain_type,
        order_index
      FROM domains
      WHERE assessment_version_id = $1
      ORDER BY domain_type ASC, order_index ASC, id ASC
      `,
      [assessmentVersionId],
    );

    return result.rows;
  } catch (error) {
    throw new AssessmentVersioningPersistenceError('load_source_domains', error);
  }
}

async function loadSourceSignals(
  db: Queryable,
  assessmentVersionId: string,
): Promise<readonly SignalRow[]> {
  try {
    const result = await db.query<SignalRow>(
      `
      SELECT
        id AS signal_id,
        domain_id,
        signal_key,
        label,
        description,
        order_index,
        is_overlay
      FROM signals
      WHERE assessment_version_id = $1
      ORDER BY domain_id ASC, order_index ASC, id ASC
      `,
      [assessmentVersionId],
    );

    return result.rows;
  } catch (error) {
    throw new AssessmentVersioningPersistenceError('load_source_signals', error);
  }
}

async function loadSourceQuestions(
  db: Queryable,
  assessmentVersionId: string,
): Promise<readonly QuestionRow[]> {
  try {
    const result = await db.query<QuestionRow>(
      `
      SELECT
        id AS question_id,
        domain_id,
        question_key,
        prompt,
        order_index
      FROM questions
      WHERE assessment_version_id = $1
      ORDER BY order_index ASC, id ASC
      `,
      [assessmentVersionId],
    );

    return result.rows;
  } catch (error) {
    throw new AssessmentVersioningPersistenceError('load_source_questions', error);
  }
}

async function loadSourceOptions(
  db: Queryable,
  assessmentVersionId: string,
): Promise<readonly OptionRow[]> {
  try {
    const result = await db.query<OptionRow>(
      `
      SELECT
        o.id AS option_id,
        q.assessment_version_id,
        o.question_id,
        o.option_key,
        o.option_label,
        o.option_text,
        o.order_index
      FROM options o
      INNER JOIN questions q ON q.id = o.question_id
      WHERE q.assessment_version_id = $1
      ORDER BY o.question_id ASC, o.order_index ASC, o.id ASC
      `,
      [assessmentVersionId],
    );

    return result.rows;
  } catch (error) {
    throw new AssessmentVersioningPersistenceError('load_source_options', error);
  }
}

async function loadSourceWeights(
  db: Queryable,
  assessmentVersionId: string,
): Promise<readonly OptionSignalWeightRow[]> {
  try {
    const result = await db.query<OptionSignalWeightRow>(
      `
      SELECT
        osw.id AS option_signal_weight_id,
        osw.option_id,
        osw.signal_id,
        osw.weight::text AS weight,
        osw.source_weight_key
      FROM option_signal_weights osw
      INNER JOIN options o ON o.id = osw.option_id
      INNER JOIN questions q ON q.id = o.question_id
      WHERE q.assessment_version_id = $1
      ORDER BY osw.option_id ASC, osw.signal_id ASC, osw.id ASC
      `,
      [assessmentVersionId],
    );

    return result.rows;
  } catch (error) {
    throw new AssessmentVersioningPersistenceError('load_source_weights', error);
  }
}

export async function createNextDraftAssessmentVersionRecords(params: {
  db: Queryable;
  assessmentKey: string;
}): Promise<CreateDraftVersionResult> {
  const versions = await loadAssessmentVersionsForKey(params.db, params.assessmentKey);
  if (versions.length === 0) {
    throw new Error('ASSESSMENT_NOT_FOUND');
  }

  const latestDraft = versions.find((version) => version.lifecycle_status === 'DRAFT') ?? null;
  if (latestDraft) {
    throw new Error('DRAFT_VERSION_ALREADY_EXISTS');
  }

  const sourceVersion =
    versions.find((version) => version.lifecycle_status === 'PUBLISHED') ?? versions[0] ?? null;
  if (!sourceVersion) {
    throw new Error('SOURCE_VERSION_NOT_FOUND');
  }

  const nextVersionTag = getNextAssessmentVersionTag(versions.map((version) => version.version_tag));

  let insertedDraft: InsertedIdRow | null = null;

  try {
    const result = await params.db.query<InsertedIdRow>(
      `
      INSERT INTO assessment_versions (
        assessment_id,
        version,
        lifecycle_status,
        title_override,
        description_override,
        published_at
      )
      VALUES ($1, $2, 'DRAFT', $3, $4, NULL)
      RETURNING id
      `,
      [
        sourceVersion.assessment_id,
        nextVersionTag,
        sourceVersion.title_override,
        sourceVersion.description_override,
      ],
    );

    insertedDraft = result.rows[0] ?? null;
  } catch (error) {
    throw new AssessmentVersioningPersistenceError('insert_draft_version', error);
  }

  if (!insertedDraft) {
    throw new Error('SOURCE_VERSION_NOT_FOUND');
  }

  const domains = await loadSourceDomains(params.db, sourceVersion.assessment_version_id);
  const domainIdMap = new Map<string, string>();

  for (const domain of domains) {
    try {
      const result = await params.db.query<InsertedIdRow>(
        `
        INSERT INTO domains (
          assessment_version_id,
          domain_key,
          label,
          description,
          domain_type,
          order_index
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
        `,
        [
          insertedDraft.id,
          domain.domain_key,
          domain.label,
          domain.description,
          domain.domain_type,
          domain.order_index,
        ],
      );

      const inserted = result.rows[0]?.id;
      if (inserted) {
        domainIdMap.set(domain.domain_id, inserted);
      }
    } catch (error) {
      throw new AssessmentVersioningPersistenceError('insert_domains', error);
    }
  }

  const signals = await loadSourceSignals(params.db, sourceVersion.assessment_version_id);
  const signalIdMap = new Map<string, string>();

  for (const signal of signals) {
    try {
      const result = await params.db.query<InsertedIdRow>(
        `
        INSERT INTO signals (
          assessment_version_id,
          domain_id,
          signal_key,
          label,
          description,
          order_index,
          is_overlay
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
        `,
        [
          insertedDraft.id,
          domainIdMap.get(signal.domain_id) ?? '',
          signal.signal_key,
          signal.label,
          signal.description,
          signal.order_index,
          signal.is_overlay,
        ],
      );

      const inserted = result.rows[0]?.id;
      if (inserted) {
        signalIdMap.set(signal.signal_id, inserted);
      }
    } catch (error) {
      throw new AssessmentVersioningPersistenceError('insert_signals', error);
    }
  }

  const questions = await loadSourceQuestions(params.db, sourceVersion.assessment_version_id);
  const questionIdMap = new Map<string, string>();

  for (const question of questions) {
    try {
      const result = await params.db.query<InsertedIdRow>(
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
          insertedDraft.id,
          domainIdMap.get(question.domain_id) ?? '',
          question.question_key,
          question.prompt,
          question.order_index,
        ],
      );

      const inserted = result.rows[0]?.id;
      if (inserted) {
        questionIdMap.set(question.question_id, inserted);
      }
    } catch (error) {
      throw new AssessmentVersioningPersistenceError('insert_questions', error);
    }
  }

  const options = await loadSourceOptions(params.db, sourceVersion.assessment_version_id);
  const optionIdMap = new Map<string, string>();

  for (const option of options) {
    try {
      const result = await params.db.query<InsertedIdRow>(
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
          insertedDraft.id,
          questionIdMap.get(option.question_id) ?? '',
          option.option_key,
          option.option_label,
          option.option_text,
          option.order_index,
        ],
      );

      const inserted = result.rows[0]?.id;
      if (inserted) {
        optionIdMap.set(option.option_id, inserted);
      }
    } catch (error) {
      throw new AssessmentVersioningPersistenceError('insert_options', error);
    }
  }

  const weights = await loadSourceWeights(params.db, sourceVersion.assessment_version_id);

  for (const weight of weights) {
    try {
      await params.db.query(
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
          optionIdMap.get(weight.option_id) ?? '',
          signalIdMap.get(weight.signal_id) ?? '',
          weight.weight,
          weight.source_weight_key,
        ],
      );
    } catch (error) {
      throw new AssessmentVersioningPersistenceError('insert_weights', error);
    }
  }

  return {
    draftVersionId: insertedDraft.id,
    draftVersionTag: nextVersionTag,
    sourceVersionTag: sourceVersion.version_tag,
  };
}

export async function publishDraftVersionAction(
  context: VersioningActionContext,
  _previousState: AdminAssessmentVersionActionState,
  _formData: FormData,
): Promise<AdminAssessmentVersionActionState> {
  return publishDraftVersionActionWithDependencies(context, _previousState, _formData);
}

export async function publishDraftVersionActionWithDependencies(
  context: VersioningActionContext,
  _previousState: AdminAssessmentVersionActionState,
  _formData: FormData,
  dependencies: VersioningActionDependencies = {
    getDbPool,
    revalidatePath,
  },
): Promise<AdminAssessmentVersionActionState> {
  const draftVersionId = context.assessmentVersionId ?? '';
  if (!draftVersionId) {
    return {
      formError: 'No editable draft version is currently available to publish.',
      formSuccess: null,
      formWarnings: Object.freeze([]),
    };
  }

  let client: TransactionClient | null = null;

  try {
    client = await dependencies.getDbPool().connect();
    await client.query('BEGIN');

    const published = await publishDraftAssessmentVersionRecords({
      db: client,
      assessmentKey: context.assessmentKey,
      draftVersionId,
    });

    await client.query('COMMIT');
    dependencies.revalidatePath('/admin/assessments');
    dependencies.revalidatePath(assessmentPath(context.assessmentKey));

    return {
      formError: null,
      formSuccess: `Draft ${published.publishedVersionTag} is now the active published version.`,
      formWarnings: published.diagnosticWarnings,
    };
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK').catch(() => undefined);
    }

    const { cause, stage } = unwrapVersioningError(error);
    const mapped = mapVersioningErrorToState(cause);
    if (mapped) {
      return mapped;
    }

    logVersioningFailure({
      assessmentKey: context.assessmentKey,
      action: 'publish_draft',
      stage,
      error: cause,
    });

    return {
      formError: 'The draft could not be published. Try again after refreshing the page.',
      formSuccess: null,
      formWarnings: Object.freeze([]),
    };
  } finally {
    client?.release();
  }
}

export async function createDraftVersionAction(
  context: VersioningActionContext,
  _previousState: AdminAssessmentVersionActionState,
  _formData: FormData,
): Promise<AdminAssessmentVersionActionState> {
  return createDraftVersionActionWithDependencies(context, _previousState, _formData);
}

export async function createDraftVersionActionWithDependencies(
  context: VersioningActionContext,
  _previousState: AdminAssessmentVersionActionState,
  _formData: FormData,
  dependencies: VersioningActionDependencies = {
    getDbPool,
    revalidatePath,
  },
): Promise<AdminAssessmentVersionActionState> {
  let client: TransactionClient | null = null;

  try {
    client = await dependencies.getDbPool().connect();
    await client.query('BEGIN');

    const created = await createNextDraftAssessmentVersionRecords({
      db: client,
      assessmentKey: context.assessmentKey,
    });

    await client.query('COMMIT');
    dependencies.revalidatePath('/admin/assessments');
    dependencies.revalidatePath(assessmentPath(context.assessmentKey));

    return {
      formError: null,
      formSuccess: `Draft ${created.draftVersionTag} was created from version ${created.sourceVersionTag}.`,
      formWarnings: Object.freeze([]),
    };
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK').catch(() => undefined);
    }

    const { cause, stage } = unwrapVersioningError(error);
    const mapped = mapVersioningErrorToState(cause);
    if (mapped) {
      return mapped;
    }

    logVersioningFailure({
      assessmentKey: context.assessmentKey,
      action: 'create_draft',
      stage,
      error: cause,
    });

    return {
      formError: 'A new draft version could not be created. Try again after refreshing the page.',
      formSuccess: null,
      formWarnings: Object.freeze([]),
    };
  } finally {
    client?.release();
  }
}







