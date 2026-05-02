'use server';

import { revalidatePath } from 'next/cache';

import type { AdminAssessmentVersionActionState } from '@/lib/admin/admin-assessment-versioning';
import { runFullDiagnostics } from '@/lib/engine/engine-diagnostics';
import { normalizeScoreResult } from '@/lib/engine/normalization';
import { createAssessmentDefinitionRepository } from '@/lib/engine/repository';
import { buildCanonicalResultPayload } from '@/lib/engine/result-builder';
import { loadRuntimeExecutionModel } from '@/lib/engine/runtime-loader';
import { scoreAssessmentResponses } from '@/lib/engine/scoring';
import type { EngineLanguageBundle, RuntimeAssessmentDefinition, RuntimeResponseSet } from '@/lib/engine/types';
import { validateLatestDraftAssessmentVersion } from '@/lib/server/admin-assessment-validation';
import { createDraftVersionFromLatestPublishedAssessmentRecords } from '@/lib/server/admin-assessment-draft-version-service';
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
  | 'insert_weights'
  | 'load_source_pair_trait_weights'
  | 'insert_pair_trait_weights'
  | 'load_source_hero_pattern_rules'
  | 'insert_hero_pattern_rules'
  | 'load_source_hero_pattern_language'
  | 'insert_hero_pattern_language';

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

function singleDomainAssessmentPath(assessmentKey: string): string {
  return `/admin/assessments/single-domain/${assessmentKey}`;
}

function getAssessmentRevalidationPaths(assessmentKey: string): readonly string[] {
  return Object.freeze([
    '/admin/assessments',
    assessmentPath(assessmentKey),
    `${assessmentPath(assessmentKey)}/overview`,
    `${assessmentPath(assessmentKey)}/review`,
    singleDomainAssessmentPath(assessmentKey),
    `${singleDomainAssessmentPath(assessmentKey)}/overview`,
    `${singleDomainAssessmentPath(assessmentKey)}/review`,
    '/app/assessments',
    `/app/assessments/${assessmentKey}`,
    '/app/workspace',
  ]);
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
          assessmentTitle: definition.assessment.title,
          version: definition.version.versionTag,
          attemptId: responses.attemptId,
          completedAt: responses.submittedAt ?? null,
        },
        scoringDiagnostics: scoreResult.diagnostics,
        languageBundle,
      },
    });
    const diagnostics = runFullDiagnostics({
      runtimeModel,
      languageConfig: languageBundle,
      normalizationScores: normalizedResult.signalScores,
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

export async function createNextDraftAssessmentVersionRecords(params: {
  db: Queryable;
  assessmentKey: string;
}): Promise<CreateDraftVersionResult> {
  const result = await createDraftVersionFromLatestPublishedAssessmentRecords({
    db: params.db,
    assessmentKeyOrId: params.assessmentKey,
  });

  switch (result.status) {
    case 'created':
      return {
        draftVersionId: result.draftVersionId,
        draftVersionTag: result.draftVersionTag,
        sourceVersionTag: result.sourceVersionTag,
      };
    case 'assessment_not_found':
      throw new Error('ASSESSMENT_NOT_FOUND');
    case 'draft_exists':
      throw new Error('DRAFT_VERSION_ALREADY_EXISTS');
    case 'published_source_not_found':
      throw new Error('SOURCE_VERSION_NOT_FOUND');
    case 'persistence_error':
      throw new AssessmentVersioningPersistenceError('insert_draft_version', result.message);
  }
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
    for (const path of getAssessmentRevalidationPaths(context.assessmentKey)) {
      dependencies.revalidatePath(path);
    }

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
    for (const path of getAssessmentRevalidationPaths(context.assessmentKey)) {
      dependencies.revalidatePath(path);
    }

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







