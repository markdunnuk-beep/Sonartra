import {
  rankedPatternAssessmentMode,
  rankedPatternResultModelKey,
  rankedPatternRuntimeDefinitionSheetKeys,
  type RankedPatternImportSheetKey,
} from './ranked-pattern-import-manifest';
import type { RankedPatternImportDiagnostic } from './ranked-pattern-import-validation';
import type {
  NormalisedMetadataRecord,
  NormalisedOptionRecord,
  NormalisedQuestionRecord,
  NormalisedRankedPatternPackage,
  NormalisedSignalRecord,
} from './ranked-pattern-import-normalise';

export type RankedPatternRuntimeDefinitionTable =
  | 'assessments'
  | 'assessment_versions'
  | 'domains'
  | 'signals'
  | 'questions'
  | 'options'
  | 'option_signal_weights';

export type RankedPatternRuntimeDefinitionPersistenceDiagnostic =
  RankedPatternImportDiagnostic;

export type RankedPatternRuntimeDefinitionPersistenceInput = {
  readonly normalisedPackage: NormalisedRankedPatternPackage;
  readonly sourceName?: string;
  readonly sourceHash?: string;
  readonly dryRun?: boolean;
  readonly db?: RankedPatternPersistenceDbPool;
};

export type RankedPatternRuntimeDefinitionPersistenceOperation = {
  readonly table: RankedPatternRuntimeDefinitionTable;
  readonly action: 'upsert';
  readonly key: string;
  readonly sourceSheetKey: RankedPatternImportSheetKey;
  readonly sourceRowNumber: number;
  readonly values: Readonly<Record<string, string | number | boolean | null>>;
};

export type RankedPatternRuntimeDefinitionPersistencePlan = {
  readonly assessmentKey: string | null;
  readonly version: string | null;
  readonly domainKey: string | null;
  readonly operations: readonly RankedPatternRuntimeDefinitionPersistenceOperation[];
  readonly operationCountsByTable: Readonly<Record<RankedPatternRuntimeDefinitionTable, number>>;
  readonly diagnostics: readonly RankedPatternRuntimeDefinitionPersistenceDiagnostic[];
};

export type RankedPatternRuntimeDefinitionPersistenceResult = {
  readonly dryRun: boolean;
  readonly plan: RankedPatternRuntimeDefinitionPersistencePlan;
  readonly assessmentId: string | null;
  readonly assessmentVersionId: string | null;
  readonly importBatchId: string | null;
  readonly countsByTable: Readonly<Record<RankedPatternRuntimeDefinitionTable, number>>;
  readonly diagnostics: readonly RankedPatternRuntimeDefinitionPersistenceDiagnostic[];
};

export type QueryResult<T> = {
  readonly rows: readonly T[];
};

export type RankedPatternPersistenceDbClient = {
  query<T>(text: string, params?: readonly unknown[]): Promise<QueryResult<T>>;
  release?(): void;
};

export type RankedPatternPersistenceDbPool = {
  connect(): Promise<RankedPatternPersistenceDbClient>;
};

type IdRow = {
  readonly id: string;
};

type PlanContext = {
  readonly diagnostics: RankedPatternRuntimeDefinitionPersistenceDiagnostic[];
};

const emptyCountsByTable: Readonly<Record<RankedPatternRuntimeDefinitionTable, number>> = Object.freeze({
  assessments: 0,
  assessment_versions: 0,
  domains: 0,
  signals: 0,
  questions: 0,
  options: 0,
  option_signal_weights: 0,
});

function activeStatus(status: string | null): boolean {
  return status === 'active';
}

function requiredText(value: string | null | undefined): string | null {
  return value && value.trim().length > 0 ? value.trim() : null;
}

function diagnostic(params: {
  readonly code: string;
  readonly message: string;
  readonly sheetKey?: RankedPatternImportSheetKey;
  readonly rowNumber?: number;
  readonly fieldKey?: string;
  readonly lookupKey?: string | null;
}): RankedPatternRuntimeDefinitionPersistenceDiagnostic {
  return {
    severity: 'error',
    code: params.code,
    message: params.message,
    sheetKey: params.sheetKey,
    rowNumber: params.rowNumber,
    fieldKey: params.fieldKey,
    lookupKey: params.lookupKey ?? undefined,
  };
}

function addDiagnostic(
  context: PlanContext,
  params: Parameters<typeof diagnostic>[0],
): void {
  context.diagnostics.push(diagnostic(params));
}

function operation(params: RankedPatternRuntimeDefinitionPersistenceOperation) {
  return Object.freeze(params);
}

function buildCounts(
  operations: readonly RankedPatternRuntimeDefinitionPersistenceOperation[],
): Readonly<Record<RankedPatternRuntimeDefinitionTable, number>> {
  const counts = { ...emptyCountsByTable };
  for (const item of operations) {
    counts[item.table] += 1;
  }
  return Object.freeze(counts);
}

function naturalOptionKey(questionKey: string | null, optionKey: string | null): string {
  return `${questionKey ?? ''}::${optionKey ?? ''}`;
}

function activeQuestionsByKey(
  questions: readonly NormalisedQuestionRecord[],
): ReadonlyMap<string, NormalisedQuestionRecord> {
  return new Map(
    questions
      .filter((question) => activeStatus(question.status) && requiredText(question.questionKey))
      .map((question) => [question.questionKey as string, question]),
  );
}

function activeOptionsByQuestionOptionKey(
  options: readonly NormalisedOptionRecord[],
): ReadonlyMap<string, NormalisedOptionRecord> {
  return new Map(
    options
      .filter((option) => activeStatus(option.status) && requiredText(option.questionKey) && requiredText(option.optionKey))
      .map((option) => [naturalOptionKey(option.questionKey, option.optionKey), option]),
  );
}

function activeSignalsByKey(
  signals: readonly NormalisedSignalRecord[],
): ReadonlyMap<string, NormalisedSignalRecord> {
  return new Map(
    signals
      .filter((signal) => activeStatus(signal.status) && signal.scored === true && requiredText(signal.signalKey))
      .map((signal) => [signal.signalKey as string, signal]),
  );
}

export function planRankedPatternRuntimeDefinitionPersistence(
  normalisedPackage: NormalisedRankedPatternPackage,
): RankedPatternRuntimeDefinitionPersistencePlan {
  const context: PlanContext = { diagnostics: [] };
  const operations: RankedPatternRuntimeDefinitionPersistenceOperation[] = [];
  const metadataRows = normalisedPackage.metadata;
  const metadata = metadataRows[0] ?? null;

  if (metadataRows.length !== 1) {
    addDiagnostic(context, {
      code: 'INVALID_METADATA_ROW_COUNT',
      message: 'Exactly one metadata row is required for runtime definition persistence.',
      sheetKey: '00_Metadata',
    });
  }

  if (normalisedPackage.diagnostics.length > 0) {
    context.diagnostics.push(...normalisedPackage.diagnostics);
  }

  if (!metadata) {
    return Object.freeze({
      assessmentKey: null,
      version: null,
      domainKey: null,
      operations: Object.freeze(operations),
      operationCountsByTable: buildCounts(operations),
      diagnostics: Object.freeze(context.diagnostics),
    });
  }

  if (metadata.mode !== rankedPatternAssessmentMode) {
    addDiagnostic(context, {
      code: 'UNSUPPORTED_ASSESSMENT_MODE',
      message: `assessment_versions.mode must be ${rankedPatternAssessmentMode}.`,
      sheetKey: '00_Metadata',
      rowNumber: metadata.sourceRowNumber,
      fieldKey: 'mode',
      lookupKey: metadata.lookupKey,
    });
  }

  const hasCompatibleLegacyModel =
    metadata.resultModelKey === null && metadata.model === 'single_domain_ranked_pattern';
  if (metadata.resultModelKey !== rankedPatternResultModelKey && !hasCompatibleLegacyModel) {
    addDiagnostic(context, {
      code: 'UNSUPPORTED_RESULT_MODEL',
      message: `assessment_versions.result_model_key must be ${rankedPatternResultModelKey}.`,
      sheetKey: '00_Metadata',
      rowNumber: metadata.sourceRowNumber,
      fieldKey: 'result_model_key',
      lookupKey: metadata.lookupKey,
    });
  }

  for (const [fieldKey, value] of [
    ['assessment_key', metadata.assessmentKey],
    ['version', metadata.version],
    ['domain_key', metadata.domainKey],
  ] as const) {
    if (!requiredText(value)) {
      addDiagnostic(context, {
        code: 'MISSING_REQUIRED_RUNTIME_DEFINITION_VALUE',
        message: `${fieldKey} is required for runtime definition persistence.`,
        sheetKey: '00_Metadata',
        rowNumber: metadata.sourceRowNumber,
        fieldKey,
        lookupKey: metadata.lookupKey,
      });
    }
  }

  const domainKey = metadata.domainKey;
  const activeSignals = normalisedPackage.signals.filter(
    (signal) => activeStatus(signal.status) && signal.scored === true,
  );
  if (activeSignals.length !== 4) {
    addDiagnostic(context, {
      code: 'INVALID_ACTIVE_SIGNAL_COUNT',
      message: 'Exactly four active scored signals are required.',
      sheetKey: '01_Signals',
    });
  }

  for (const signal of activeSignals) {
    if (signal.domainKey !== domainKey) {
      addDiagnostic(context, {
        code: 'SIGNAL_DOMAIN_MISMATCH',
        message: 'Active signal must belong to the metadata domain.',
        sheetKey: '01_Signals',
        rowNumber: signal.sourceRowNumber,
        fieldKey: 'domain_key',
        lookupKey: signal.lookupKey,
      });
    }
  }

  const signalsByKey = activeSignalsByKey(normalisedPackage.signals);
  const questionsByKey = activeQuestionsByKey(normalisedPackage.questions);
  const optionsByKey = activeOptionsByQuestionOptionKey(normalisedPackage.options);
  const activeQuestions = [...questionsByKey.values()];
  const activeOptions = [...optionsByKey.values()];
  const activeWeights = normalisedPackage.optionWeights.filter((weight) => activeStatus(weight.status));

  for (const question of activeQuestions) {
    if (question.domainKey !== domainKey) {
      addDiagnostic(context, {
        code: 'QUESTION_DOMAIN_MISMATCH',
        message: 'Active question must belong to the metadata domain.',
        sheetKey: '02_Questions',
        rowNumber: question.sourceRowNumber,
        fieldKey: 'domain_key',
        lookupKey: question.lookupKey,
      });
    }
  }

  for (const option of activeOptions) {
    if (option.domainKey !== domainKey) {
      addDiagnostic(context, {
        code: 'OPTION_DOMAIN_MISMATCH',
        message: 'Active option must belong to the metadata domain.',
        sheetKey: '03_Options',
        rowNumber: option.sourceRowNumber,
        fieldKey: 'domain_key',
        lookupKey: option.lookupKey,
      });
    }
    if (!option.questionKey || !questionsByKey.has(option.questionKey)) {
      addDiagnostic(context, {
        code: 'OPTION_UNKNOWN_QUESTION',
        message: 'Active option references an unknown active question.',
        sheetKey: '03_Options',
        rowNumber: option.sourceRowNumber,
        fieldKey: 'question_key',
        lookupKey: option.lookupKey,
      });
    }
  }

  for (const weight of activeWeights) {
    if (weight.weight === null) {
      addDiagnostic(context, {
        code: 'INVALID_OPTION_SIGNAL_WEIGHT',
        message: 'Active option weight must be numeric.',
        sheetKey: '04_Option_Weights',
        rowNumber: weight.sourceRowNumber,
        fieldKey: 'weight',
        lookupKey: weight.lookupKey,
      });
    }

    if (!optionsByKey.has(naturalOptionKey(weight.questionKey, weight.optionKey))) {
      addDiagnostic(context, {
        code: 'WEIGHT_UNKNOWN_OPTION',
        message: 'Active option weight references an unknown active option.',
        sheetKey: '04_Option_Weights',
        rowNumber: weight.sourceRowNumber,
        fieldKey: 'option_key',
        lookupKey: weight.lookupKey,
      });
    }

    if (!weight.signalKey || !signalsByKey.has(weight.signalKey)) {
      addDiagnostic(context, {
        code: 'WEIGHT_UNKNOWN_SIGNAL',
        message: 'Active option weight references an unknown active scored signal.',
        sheetKey: '04_Option_Weights',
        rowNumber: weight.sourceRowNumber,
        fieldKey: 'signal_key',
        lookupKey: weight.lookupKey,
      });
    }
  }

  operations.push(
    operation({
      table: 'assessments',
      action: 'upsert',
      key: metadata.assessmentKey ?? '',
      sourceSheetKey: '00_Metadata',
      sourceRowNumber: metadata.sourceRowNumber,
      values: {
        assessment_key: metadata.assessmentKey,
        mode: rankedPatternAssessmentMode,
        title: metadata.assessmentTitle,
        description: metadata.assessmentDescription,
        is_active: true,
      },
    }),
    operation({
      table: 'assessment_versions',
      action: 'upsert',
      key: `${metadata.assessmentKey ?? ''}::${metadata.version ?? ''}`,
      sourceSheetKey: '00_Metadata',
      sourceRowNumber: metadata.sourceRowNumber,
      values: {
        assessment_key: metadata.assessmentKey,
        version: metadata.version,
        mode: rankedPatternAssessmentMode,
        result_model_key: rankedPatternResultModelKey,
        lifecycle_status: (metadata.lifecycleStatus ?? 'draft').toUpperCase(),
      },
    }),
    operation({
      table: 'domains',
      action: 'upsert',
      key: domainKey ?? '',
      sourceSheetKey: '00_Metadata',
      sourceRowNumber: metadata.sourceRowNumber,
      values: {
        domain_key: domainKey,
        label: metadata.domainTitle ?? domainKey,
        description: metadata.assessmentDescription,
        order_index: 0,
      },
    }),
  );

  for (const signal of activeSignals) {
    operations.push(
      operation({
        table: 'signals',
        action: 'upsert',
        key: signal.signalKey ?? '',
        sourceSheetKey: '01_Signals',
        sourceRowNumber: signal.sourceRowNumber,
        values: {
          signal_key: signal.signalKey,
          label: signal.signalLabel,
          description: signal.signalDescription,
          order_index: signal.signalOrder,
          is_overlay: false,
        },
      }),
    );
  }

  for (const question of activeQuestions) {
    operations.push(
      operation({
        table: 'questions',
        action: 'upsert',
        key: question.questionKey ?? '',
        sourceSheetKey: '02_Questions',
        sourceRowNumber: question.sourceRowNumber,
        values: {
          question_key: question.questionKey,
          prompt: question.questionText,
          order_index: question.questionOrder,
        },
      }),
    );
  }

  for (const option of activeOptions) {
    operations.push(
      operation({
        table: 'options',
        action: 'upsert',
        key: naturalOptionKey(option.questionKey, option.optionKey),
        sourceSheetKey: '03_Options',
        sourceRowNumber: option.sourceRowNumber,
        values: {
          question_key: option.questionKey,
          option_key: option.optionKey,
          option_label: option.optionKey,
          option_text: option.optionText,
          order_index: option.optionOrder,
        },
      }),
    );
  }

  for (const weight of activeWeights) {
    operations.push(
      operation({
        table: 'option_signal_weights',
        action: 'upsert',
        key: `${naturalOptionKey(weight.questionKey, weight.optionKey)}::${weight.signalKey ?? ''}`,
        sourceSheetKey: '04_Option_Weights',
        sourceRowNumber: weight.sourceRowNumber,
        values: {
          question_key: weight.questionKey,
          option_key: weight.optionKey,
          signal_key: weight.signalKey,
          weight: weight.weight,
          source_weight_key: weight.lookupKey,
        },
      }),
    );
  }

  return Object.freeze({
    assessmentKey: metadata.assessmentKey,
    version: metadata.version,
    domainKey,
    operations: Object.freeze(operations),
    operationCountsByTable: buildCounts(operations),
    diagnostics: Object.freeze(context.diagnostics),
  });
}

function hasBlockingDiagnostics(
  diagnostics: readonly RankedPatternRuntimeDefinitionPersistenceDiagnostic[],
): boolean {
  return diagnostics.some((item) => item.severity === 'error');
}

function tableCount(
  plan: RankedPatternRuntimeDefinitionPersistencePlan,
  table: RankedPatternRuntimeDefinitionTable,
): number {
  return plan.operationCountsByTable[table] ?? 0;
}

async function upsertAssessment(
  db: RankedPatternPersistenceDbClient,
  metadata: NormalisedMetadataRecord,
): Promise<string> {
  const result = await db.query<IdRow>(
    `
    INSERT INTO assessments (
      assessment_key,
      mode,
      title,
      description,
      is_active
    )
    VALUES ($1, $2, $3, $4, TRUE)
    ON CONFLICT (assessment_key)
    DO UPDATE SET
      mode = EXCLUDED.mode,
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      is_active = EXCLUDED.is_active,
      updated_at = NOW()
    RETURNING id
    `,
    [
      metadata.assessmentKey,
      rankedPatternAssessmentMode,
      metadata.assessmentTitle,
      metadata.assessmentDescription,
    ],
  );
  const id = result.rows[0]?.id;
  if (!id) {
    throw new Error('RANKED_PATTERN_ASSESSMENT_UPSERT_FAILED');
  }
  return id;
}

async function upsertAssessmentVersion(params: {
  readonly db: RankedPatternPersistenceDbClient;
  readonly assessmentId: string;
  readonly metadata: NormalisedMetadataRecord;
}): Promise<string> {
  const result = await params.db.query<IdRow>(
    `
    INSERT INTO assessment_versions (
      assessment_id,
      version,
      lifecycle_status,
      mode,
      result_model_key,
      title_override,
      description_override
    )
    VALUES ($1, $2, $3, $4, $5, NULL, NULL)
    ON CONFLICT (assessment_id, version)
    DO UPDATE SET
      lifecycle_status = EXCLUDED.lifecycle_status,
      mode = EXCLUDED.mode,
      result_model_key = EXCLUDED.result_model_key,
      updated_at = NOW()
    RETURNING id
    `,
    [
      params.assessmentId,
      params.metadata.version,
      (params.metadata.lifecycleStatus ?? 'draft').toUpperCase(),
      rankedPatternAssessmentMode,
      rankedPatternResultModelKey,
    ],
  );
  const id = result.rows[0]?.id;
  if (!id) {
    throw new Error('RANKED_PATTERN_ASSESSMENT_VERSION_UPSERT_FAILED');
  }
  return id;
}

async function upsertDomain(params: {
  readonly db: RankedPatternPersistenceDbClient;
  readonly assessmentVersionId: string;
  readonly metadata: NormalisedMetadataRecord;
}): Promise<string> {
  const result = await params.db.query<IdRow>(
    `
    INSERT INTO domains (
      assessment_version_id,
      domain_key,
      label,
      description,
      domain_type,
      order_index
    )
    VALUES ($1, $2, $3, $4, 'SIGNAL_GROUP', 0)
    ON CONFLICT (assessment_version_id, domain_key)
    DO UPDATE SET
      label = EXCLUDED.label,
      description = EXCLUDED.description,
      domain_type = EXCLUDED.domain_type,
      order_index = EXCLUDED.order_index,
      updated_at = NOW()
    RETURNING id
    `,
    [
      params.assessmentVersionId,
      params.metadata.domainKey,
      params.metadata.domainTitle ?? params.metadata.domainKey,
      params.metadata.assessmentDescription,
    ],
  );
  const id = result.rows[0]?.id;
  if (!id) {
    throw new Error('RANKED_PATTERN_DOMAIN_UPSERT_FAILED');
  }
  return id;
}

async function upsertSignals(params: {
  readonly db: RankedPatternPersistenceDbClient;
  readonly assessmentVersionId: string;
  readonly domainId: string;
  readonly signals: readonly NormalisedSignalRecord[];
}): Promise<Map<string, string>> {
  const signalIds = new Map<string, string>();
  for (const signal of params.signals.filter((item) => activeStatus(item.status) && item.scored === true)) {
    const result = await params.db.query<IdRow>(
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
      VALUES ($1, $2, $3, $4, $5, $6, FALSE)
      ON CONFLICT (assessment_version_id, signal_key)
      DO UPDATE SET
        domain_id = EXCLUDED.domain_id,
        label = EXCLUDED.label,
        description = EXCLUDED.description,
        order_index = EXCLUDED.order_index,
        is_overlay = EXCLUDED.is_overlay,
        updated_at = NOW()
      RETURNING id
      `,
      [
        params.assessmentVersionId,
        params.domainId,
        signal.signalKey,
        signal.signalLabel,
        signal.signalDescription,
        signal.signalOrder,
      ],
    );
    const id = result.rows[0]?.id;
    if (id && signal.signalKey) {
      signalIds.set(signal.signalKey, id);
    }
  }
  return signalIds;
}

async function upsertQuestions(params: {
  readonly db: RankedPatternPersistenceDbClient;
  readonly assessmentVersionId: string;
  readonly domainId: string;
  readonly questions: readonly NormalisedQuestionRecord[];
}): Promise<Map<string, string>> {
  const questionIds = new Map<string, string>();
  for (const question of params.questions.filter((item) => activeStatus(item.status))) {
    const result = await params.db.query<IdRow>(
      `
      INSERT INTO questions (
        assessment_version_id,
        domain_id,
        question_key,
        prompt,
        order_index
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (assessment_version_id, question_key)
      DO UPDATE SET
        domain_id = EXCLUDED.domain_id,
        prompt = EXCLUDED.prompt,
        order_index = EXCLUDED.order_index,
        updated_at = NOW()
      RETURNING id
      `,
      [
        params.assessmentVersionId,
        params.domainId,
        question.questionKey,
        question.questionText,
        question.questionOrder,
      ],
    );
    const id = result.rows[0]?.id;
    if (id && question.questionKey) {
      questionIds.set(question.questionKey, id);
    }
  }
  return questionIds;
}

async function upsertOptions(params: {
  readonly db: RankedPatternPersistenceDbClient;
  readonly assessmentVersionId: string;
  readonly questionIds: ReadonlyMap<string, string>;
  readonly options: readonly NormalisedOptionRecord[];
}): Promise<Map<string, string>> {
  const optionIds = new Map<string, string>();
  for (const option of params.options.filter((item) => activeStatus(item.status))) {
    const questionId = option.questionKey ? params.questionIds.get(option.questionKey) : undefined;
    if (!questionId) {
      continue;
    }
    const result = await params.db.query<IdRow>(
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
      ON CONFLICT (question_id, option_key)
      DO UPDATE SET
        assessment_version_id = EXCLUDED.assessment_version_id,
        option_label = EXCLUDED.option_label,
        option_text = EXCLUDED.option_text,
        order_index = EXCLUDED.order_index,
        updated_at = NOW()
      RETURNING id
      `,
      [
        params.assessmentVersionId,
        questionId,
        option.optionKey,
        option.optionKey,
        option.optionText,
        option.optionOrder,
      ],
    );
    const id = result.rows[0]?.id;
    if (id) {
      optionIds.set(naturalOptionKey(option.questionKey, option.optionKey), id);
    }
  }
  return optionIds;
}

async function upsertOptionWeights(params: {
  readonly db: RankedPatternPersistenceDbClient;
  readonly optionIds: ReadonlyMap<string, string>;
  readonly signalIds: ReadonlyMap<string, string>;
  readonly normalisedPackage: NormalisedRankedPatternPackage;
}): Promise<void> {
  for (const weight of params.normalisedPackage.optionWeights.filter((item) => activeStatus(item.status))) {
    const optionId = params.optionIds.get(naturalOptionKey(weight.questionKey, weight.optionKey));
    const signalId = weight.signalKey ? params.signalIds.get(weight.signalKey) : undefined;
    if (!optionId || !signalId || weight.weight === null) {
      continue;
    }
    await params.db.query(
      `
      INSERT INTO option_signal_weights (
        option_id,
        signal_id,
        weight,
        source_weight_key
      )
      VALUES ($1, $2, $3::numeric(12, 4), $4)
      ON CONFLICT (option_id, signal_id)
      DO UPDATE SET
        weight = EXCLUDED.weight,
        source_weight_key = EXCLUDED.source_weight_key,
        updated_at = NOW()
      `,
      [optionId, signalId, String(weight.weight), weight.lookupKey],
    );
  }
}

export async function persistRankedPatternRuntimeDefinition(
  input: RankedPatternRuntimeDefinitionPersistenceInput,
): Promise<RankedPatternRuntimeDefinitionPersistenceResult> {
  const plan = planRankedPatternRuntimeDefinitionPersistence(input.normalisedPackage);
  const dryRun = input.dryRun !== false;

  if (dryRun || hasBlockingDiagnostics(plan.diagnostics)) {
    return Object.freeze({
      dryRun,
      plan,
      assessmentId: null,
      assessmentVersionId: null,
      importBatchId: null,
      countsByTable: emptyCountsByTable,
      diagnostics: plan.diagnostics,
    });
  }

  if (!input.db) {
    throw new Error('RANKED_PATTERN_IMPORT_DB_REQUIRED_FOR_APPLY');
  }

  const metadata = input.normalisedPackage.metadata[0];
  if (!metadata) {
    throw new Error('RANKED_PATTERN_IMPORT_METADATA_REQUIRED');
  }

  const client = await input.db.connect();
  try {
    await client.query('BEGIN');
    const assessmentId = await upsertAssessment(client, metadata);
    const assessmentVersionId = await upsertAssessmentVersion({
      db: client,
      assessmentId,
      metadata,
    });
    const domainId = await upsertDomain({
      db: client,
      assessmentVersionId,
      metadata,
    });
    const signalIds = await upsertSignals({
      db: client,
      assessmentVersionId,
      domainId,
      signals: input.normalisedPackage.signals,
    });
    const questionIds = await upsertQuestions({
      db: client,
      assessmentVersionId,
      domainId,
      questions: input.normalisedPackage.questions,
    });
    const optionIds = await upsertOptions({
      db: client,
      assessmentVersionId,
      questionIds,
      options: input.normalisedPackage.options,
    });
    await upsertOptionWeights({
      db: client,
      optionIds,
      signalIds,
      normalisedPackage: input.normalisedPackage,
    });
    await client.query('COMMIT');

    return Object.freeze({
      dryRun: false,
      plan,
      assessmentId,
      assessmentVersionId,
      importBatchId: null,
      countsByTable: Object.freeze({
        assessments: tableCount(plan, 'assessments'),
        assessment_versions: tableCount(plan, 'assessment_versions'),
        domains: tableCount(plan, 'domains'),
        signals: tableCount(plan, 'signals'),
        questions: tableCount(plan, 'questions'),
        options: tableCount(plan, 'options'),
        option_signal_weights: tableCount(plan, 'option_signal_weights'),
      }),
      diagnostics: plan.diagnostics,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release?.();
  }
}

export function getRankedPatternRuntimeDefinitionSheetKeys(): readonly RankedPatternImportSheetKey[] {
  return rankedPatternRuntimeDefinitionSheetKeys;
}
