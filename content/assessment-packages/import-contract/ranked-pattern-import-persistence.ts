import {
  buildPatternKeyFromRankedSignalKeys,
  rankedPatternAssessmentMode,
  rankedPatternRuntimeResultSheetKeys,
  rankedPatternResultModelKey,
  rankedPatternRuntimeDefinitionSheetKeys,
  rankedPatternSupportedRankPositions,
  rankedPatternSupportedScoreShapes,
  type RankedPatternImportSheetKey,
} from './ranked-pattern-import-manifest';
import type { RankedPatternImportDiagnostic } from './ranked-pattern-import-validation';
import type {
  NormalisedMetadataRecord,
  NormalisedOptionRecord,
  NormalisedPatternScoreShapeRecord,
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

function addDuplicateOptionDiagnostics(
  context: PlanContext,
  options: readonly NormalisedOptionRecord[],
): void {
  const seenOptions = new Map<string, NormalisedOptionRecord>();

  for (const option of options.filter(
    (item) => activeStatus(item.status) && requiredText(item.questionKey) && requiredText(item.optionKey),
  )) {
    const key = naturalOptionKey(option.questionKey, option.optionKey);
    const existing = seenOptions.get(key);
    if (!existing) {
      seenOptions.set(key, option);
      continue;
    }

    addDiagnostic(context, {
      code: 'DUPLICATE_QUESTION_OPTION_KEY',
      message: 'Active option_key values must be unique within each question_key.',
      sheetKey: '03_Options',
      rowNumber: option.sourceRowNumber,
      fieldKey: 'option_key',
      lookupKey: option.lookupKey,
    });
  }
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

  addDuplicateOptionDiagnostics(context, normalisedPackage.options);

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

async function deleteExistingOptionWeightsForVersion(params: {
  readonly db: RankedPatternPersistenceDbClient;
  readonly assessmentVersionId: string;
}): Promise<void> {
  await params.db.query(
    `
    DELETE FROM option_signal_weights osw
    USING options o
    WHERE osw.option_id = o.id
      AND o.assessment_version_id = $1
    `,
    [params.assessmentVersionId],
  );
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
    await deleteExistingOptionWeightsForVersion({
      db: client,
      assessmentVersionId,
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

export type RankedPatternResultLanguageTable =
  | 'assessment_ranked_patterns'
  | 'assessment_score_shape_rules'
  | 'assessment_result_section_definitions'
  | 'assessment_result_language_rows'
  | 'assessment_report_preview_cases';

export type RankedPatternResultLanguagePersistenceDiagnostic = RankedPatternImportDiagnostic;

export type RankedPatternResultLanguagePersistenceInput = {
  readonly normalisedPackage: NormalisedRankedPatternPackage;
  readonly assessmentVersionId: string;
  readonly assessmentId?: string;
  readonly importBatchId?: string;
  readonly dryRun?: boolean;
  readonly db?: RankedPatternPersistenceDbPool;
};

export type RankedPatternResultLanguagePersistenceOperation = {
  readonly table: RankedPatternResultLanguageTable;
  readonly action: 'upsert';
  readonly key: string;
  readonly sourceSheetKey: RankedPatternImportSheetKey;
  readonly sourceRowNumber: number;
  readonly values: Readonly<Record<string, unknown>>;
};

export type RankedPatternResultLanguagePersistencePlan = {
  readonly assessmentVersionId: string;
  readonly domainKey: string | null;
  readonly operations: readonly RankedPatternResultLanguagePersistenceOperation[];
  readonly operationCountsByTable: Readonly<Record<RankedPatternResultLanguageTable, number>>;
  readonly diagnostics: readonly RankedPatternResultLanguagePersistenceDiagnostic[];
};

export type RankedPatternResultLanguagePersistenceResult = {
  readonly dryRun: boolean;
  readonly assessmentVersionId: string;
  readonly importBatchId: string | null;
  readonly plan: RankedPatternResultLanguagePersistencePlan;
  readonly countsByTable: Readonly<Record<RankedPatternResultLanguageTable, number>>;
  readonly diagnostics: readonly RankedPatternResultLanguagePersistenceDiagnostic[];
};

const emptyResultLanguageCountsByTable: Readonly<
  Record<RankedPatternResultLanguageTable, number>
> = Object.freeze({
  assessment_ranked_patterns: 0,
  assessment_score_shape_rules: 0,
  assessment_result_section_definitions: 0,
  assessment_result_language_rows: 0,
  assessment_report_preview_cases: 0,
});

type ResultSectionDefinitionPlan = {
  readonly sourceSheetKey: RankedPatternImportSheetKey;
  readonly sectionKey: string;
  readonly sectionOrder: number;
  readonly lookupStrategy: string;
  readonly requiredCoverage: Readonly<Record<string, unknown>>;
};

const resultSectionDefinitions: readonly ResultSectionDefinitionPlan[] = Object.freeze([
  {
    sourceSheetKey: '05_Context',
    sectionKey: 'context',
    sectionOrder: 1,
    lookupStrategy: 'domain_key',
    requiredCoverage: { domain_rows: 1 },
  },
  {
    sourceSheetKey: '06_Orientation',
    sectionKey: 'orientation',
    sectionOrder: 2,
    lookupStrategy: 'pattern_key_score_shape',
    requiredCoverage: { pattern_score_shape: true },
  },
  {
    sourceSheetKey: '07_Recognition',
    sectionKey: 'recognition',
    sectionOrder: 3,
    lookupStrategy: 'pattern_key_score_shape',
    requiredCoverage: { pattern_score_shape: true },
  },
  {
    sourceSheetKey: '08_Signal_Roles',
    sectionKey: 'signal_roles',
    sectionOrder: 4,
    lookupStrategy: 'signal_key_rank_position',
    requiredCoverage: { signal_rank_position: true },
  },
  {
    sourceSheetKey: '09_Pattern_Mechanics',
    sectionKey: 'pattern_mechanics',
    sectionOrder: 5,
    lookupStrategy: 'pattern_key_score_shape',
    requiredCoverage: { pattern_score_shape: true },
  },
  {
    sourceSheetKey: '10_Pattern_Synthesis',
    sectionKey: 'pattern_synthesis',
    sectionOrder: 6,
    lookupStrategy: 'pattern_key_score_shape',
    requiredCoverage: { pattern_score_shape: true },
  },
  {
    sourceSheetKey: '11_Strengths',
    sectionKey: 'strengths',
    sectionOrder: 7,
    lookupStrategy: 'pattern_key_priority',
    requiredCoverage: { pattern_priority: true },
  },
  {
    sourceSheetKey: '12_Narrowing',
    sectionKey: 'narrowing',
    sectionOrder: 8,
    lookupStrategy: 'pattern_key_priority',
    requiredCoverage: { pattern_priority: true },
  },
  {
    sourceSheetKey: '13_Application',
    sectionKey: 'application',
    sectionOrder: 9,
    lookupStrategy: 'pattern_key_priority',
    requiredCoverage: { pattern_priority: true },
  },
  {
    sourceSheetKey: '14_Closing_Integration',
    sectionKey: 'closing_integration',
    sectionOrder: 10,
    lookupStrategy: 'pattern_key_score_shape',
    requiredCoverage: { pattern_score_shape: true },
  },
]);

function resultLanguageDiagnostic(params: {
  readonly code: string;
  readonly message: string;
  readonly severity?: 'error' | 'warning';
  readonly sheetKey?: RankedPatternImportSheetKey;
  readonly rowNumber?: number;
  readonly fieldKey?: string;
  readonly lookupKey?: string | null;
}): RankedPatternResultLanguagePersistenceDiagnostic {
  return {
    severity: params.severity ?? 'error',
    code: params.code,
    message: params.message,
    sheetKey: params.sheetKey,
    rowNumber: params.rowNumber,
    fieldKey: params.fieldKey,
    lookupKey: params.lookupKey ?? undefined,
  };
}

function buildResultLanguageCounts(
  operations: readonly RankedPatternResultLanguagePersistenceOperation[],
): Readonly<Record<RankedPatternResultLanguageTable, number>> {
  const counts = { ...emptyResultLanguageCountsByTable };
  for (const operation of operations) {
    counts[operation.table] += 1;
  }
  return Object.freeze(counts);
}

function resultLanguageOperation(
  params: RankedPatternResultLanguagePersistenceOperation,
): RankedPatternResultLanguagePersistenceOperation {
  return Object.freeze(params);
}

function resultStatus(status: string | null): string {
  return status === 'draft' || status === 'inactive' || status === 'active' ? status : 'active';
}

function metadataDomainKey(normalisedPackage: NormalisedRankedPatternPackage): string | null {
  return (
    normalisedPackage.metadata[0]?.domainKey ??
    normalisedPackage.context.find((row) => activeStatus(row.status))?.domainKey ??
    null
  );
}

function isSupportedScoreShapeValue(value: string | null): boolean {
  return !!value && rankedPatternSupportedScoreShapes.some((scoreShape) => scoreShape === value);
}

function hasSupportedRankPositionValue(value: number | null): boolean {
  return value !== null && rankedPatternSupportedRankPositions.some((rankPosition) => rankPosition === value);
}

function addResultLanguageDiagnostic(
  diagnostics: RankedPatternResultLanguagePersistenceDiagnostic[],
  params: Parameters<typeof resultLanguageDiagnostic>[0],
): void {
  diagnostics.push(resultLanguageDiagnostic(params));
}

function patternRows(
  normalisedPackage: NormalisedRankedPatternPackage,
): readonly NormalisedPatternScoreShapeRecord[] {
  return [
    ...normalisedPackage.orientation,
    ...normalisedPackage.recognition,
    ...normalisedPackage.patternMechanics,
    ...normalisedPackage.patternSynthesis,
  ];
}

function validatePatternTuple(
  row: NormalisedPatternScoreShapeRecord,
  diagnostics: RankedPatternResultLanguagePersistenceDiagnostic[],
): void {
  const ranks = [row.rank1SignalKey, row.rank2SignalKey, row.rank3SignalKey, row.rank4SignalKey];
  if (ranks.some((rank) => !rank)) {
    addResultLanguageDiagnostic(diagnostics, {
      code: 'MISSING_RANKED_PATTERN_SIGNAL',
      message: 'Ranked pattern rows must include rank_1 through rank_4 signal keys.',
      sheetKey: row.sourceSheetKey,
      rowNumber: row.sourceRowNumber,
      fieldKey: 'rank_1_signal_key',
      lookupKey: row.lookupKey,
    });
    return;
  }

  if (new Set(ranks).size !== 4) {
    addResultLanguageDiagnostic(diagnostics, {
      code: 'DUPLICATE_RANKED_PATTERN_SIGNAL',
      message: 'Ranked pattern rows must contain four distinct signal keys.',
      sheetKey: row.sourceSheetKey,
      rowNumber: row.sourceRowNumber,
      fieldKey: 'pattern_key',
      lookupKey: row.lookupKey,
    });
  }

  const expectedPatternKey = buildPatternKeyFromRankedSignalKeys(
    row.rank1SignalKey as string,
    row.rank2SignalKey as string,
    row.rank3SignalKey as string,
    row.rank4SignalKey as string,
  );
  if (row.patternKey !== expectedPatternKey) {
    addResultLanguageDiagnostic(diagnostics, {
      code: 'PATTERN_KEY_RANK_ORDER_MISMATCH',
      message: `pattern_key ${row.patternKey ?? ''} does not match ranked signal order ${expectedPatternKey}.`,
      sheetKey: row.sourceSheetKey,
      rowNumber: row.sourceRowNumber,
      fieldKey: 'pattern_key',
      lookupKey: row.lookupKey,
    });
  }
}

function planRankedPatterns(params: {
  readonly assessmentVersionId: string;
  readonly normalisedPackage: NormalisedRankedPatternPackage;
  readonly diagnostics: RankedPatternResultLanguagePersistenceDiagnostic[];
}): readonly RankedPatternResultLanguagePersistenceOperation[] {
  const operations = new Map<string, RankedPatternResultLanguagePersistenceOperation>();
  const rankTupleByPatternKey = new Map<string, string>();

  for (const row of patternRows(params.normalisedPackage)) {
    validatePatternTuple(row, params.diagnostics);
    if (!row.domainKey || !row.patternKey || !row.rank1SignalKey || !row.rank2SignalKey || !row.rank3SignalKey || !row.rank4SignalKey) {
      continue;
    }

    const key = `${row.domainKey}::${row.patternKey}`;
    const rankTuple = [
      row.rank1SignalKey,
      row.rank2SignalKey,
      row.rank3SignalKey,
      row.rank4SignalKey,
    ].join('::');
    const existingTuple = rankTupleByPatternKey.get(key);
    if (existingTuple && existingTuple !== rankTuple) {
      addResultLanguageDiagnostic(params.diagnostics, {
        code: 'CONFLICTING_RANKED_PATTERN_TUPLE',
        message: 'Duplicate pattern_key rows must agree on the same ranked signal tuple.',
        sheetKey: row.sourceSheetKey,
        rowNumber: row.sourceRowNumber,
        fieldKey: 'pattern_key',
        lookupKey: row.lookupKey,
      });
      continue;
    }
    rankTupleByPatternKey.set(key, rankTuple);
    const rowStatus = resultStatus(row.status);

    if (!operations.has(key)) {
      operations.set(
        key,
        resultLanguageOperation({
          table: 'assessment_ranked_patterns',
          action: 'upsert',
          key,
          sourceSheetKey: row.sourceSheetKey,
          sourceRowNumber: row.sourceRowNumber,
          values: {
            assessment_version_id: params.assessmentVersionId,
            domain_key: row.domainKey,
            pattern_key: row.patternKey,
            rank_1_signal_key: row.rank1SignalKey,
            rank_2_signal_key: row.rank2SignalKey,
            rank_3_signal_key: row.rank3SignalKey,
            rank_4_signal_key: row.rank4SignalKey,
            status: rowStatus,
          },
        }),
      );
    } else {
      const existingOperation = operations.get(key);
      if (existingOperation && existingOperation.values.status !== 'active' && rowStatus === 'active') {
        operations.set(
          key,
          resultLanguageOperation({
            ...existingOperation,
            sourceSheetKey: row.sourceSheetKey,
            sourceRowNumber: row.sourceRowNumber,
            values: {
              ...existingOperation.values,
              status: 'active',
            },
          }),
        );
      }
    }
  }

  return Object.freeze([...operations.values()]);
}

type PatternLanguageReferenceRow = {
  readonly sourceSheetKey: RankedPatternImportSheetKey;
  readonly sourceRowNumber: number;
  readonly status: string | null;
  readonly lookupKey: string | null;
  readonly domainKey: string | null;
  readonly patternKey: string | null;
};

function patternLanguageReferenceRows(
  normalisedPackage: NormalisedRankedPatternPackage,
): readonly PatternLanguageReferenceRow[] {
  return [
    ...normalisedPackage.orientation,
    ...normalisedPackage.recognition,
    ...normalisedPackage.patternMechanics,
    ...normalisedPackage.patternSynthesis,
    ...normalisedPackage.strengths,
    ...normalisedPackage.narrowing,
    ...normalisedPackage.application,
    ...normalisedPackage.closingIntegration,
  ];
}

function validateResultLanguagePatternReferences(params: {
  readonly normalisedPackage: NormalisedRankedPatternPackage;
  readonly activeRankedPatternKeys: ReadonlySet<string>;
  readonly diagnostics: RankedPatternResultLanguagePersistenceDiagnostic[];
}): void {
  for (const row of patternLanguageReferenceRows(params.normalisedPackage)) {
    if (resultStatus(row.status) !== 'active' || !row.domainKey || !row.patternKey) {
      continue;
    }

    const key = `${row.domainKey}::${row.patternKey}`;
    if (!params.activeRankedPatternKeys.has(key)) {
      addResultLanguageDiagnostic(params.diagnostics, {
        code: 'RESULT_LANGUAGE_UNKNOWN_PATTERN',
        message: `Runtime result language row references unknown active ranked pattern ${row.patternKey}.`,
        sheetKey: row.sourceSheetKey,
        rowNumber: row.sourceRowNumber,
        fieldKey: 'pattern_key',
        lookupKey: row.lookupKey,
      });
    }
  }
}

function fieldValuesPresent(values: Readonly<Record<string, unknown>>): boolean {
  return Object.keys(values).length > 0;
}

function languageRowOperation(params: {
  readonly assessmentVersionId: string;
  readonly sourceSheetKey: RankedPatternImportSheetKey;
  readonly sourceRowNumber: number;
  readonly sectionKey: string;
  readonly lookupKey: string | null;
  readonly domainKey: string | null;
  readonly patternKey?: string | null;
  readonly scoreShape?: string | null;
  readonly signalKey?: string | null;
  readonly rankPosition?: number | null;
  readonly itemKey?: string | null;
  readonly priority?: number | null;
  readonly fieldValues: Readonly<Record<string, unknown>>;
  readonly status: string | null;
}): RankedPatternResultLanguagePersistenceOperation {
  return resultLanguageOperation({
    table: 'assessment_result_language_rows',
    action: 'upsert',
    key: `${params.sectionKey}::${params.lookupKey ?? ''}`,
    sourceSheetKey: params.sourceSheetKey,
    sourceRowNumber: params.sourceRowNumber,
    values: {
      assessment_version_id: params.assessmentVersionId,
      section_key: params.sectionKey,
      lookup_key: params.lookupKey,
      domain_key: params.domainKey,
      pattern_key: params.patternKey ?? null,
      score_shape: params.scoreShape ?? null,
      signal_key: params.signalKey ?? null,
      rank_position: params.rankPosition ?? null,
      item_key: params.itemKey ?? null,
      priority: params.priority ?? null,
      field_values: params.fieldValues,
      status: resultStatus(params.status),
    },
  });
}

function addCommonLanguageDiagnostics(params: {
  readonly diagnostics: RankedPatternResultLanguagePersistenceDiagnostic[];
  readonly sourceSheetKey: RankedPatternImportSheetKey;
  readonly sourceRowNumber: number;
  readonly lookupKey: string | null;
  readonly domainKey: string | null;
  readonly fieldValues: Readonly<Record<string, unknown>>;
}): void {
  if (!params.lookupKey) {
    addResultLanguageDiagnostic(params.diagnostics, {
      code: 'MISSING_LOOKUP_KEY',
      message: 'Runtime result language rows require lookup_key.',
      sheetKey: params.sourceSheetKey,
      rowNumber: params.sourceRowNumber,
      fieldKey: 'lookup_key',
    });
  }
  if (!params.domainKey) {
    addResultLanguageDiagnostic(params.diagnostics, {
      code: 'MISSING_DOMAIN_KEY',
      message: 'Runtime result language rows require domain_key.',
      sheetKey: params.sourceSheetKey,
      rowNumber: params.sourceRowNumber,
      fieldKey: 'domain_key',
      lookupKey: params.lookupKey,
    });
  }
  if (!fieldValuesPresent(params.fieldValues)) {
    addResultLanguageDiagnostic(params.diagnostics, {
      code: 'EMPTY_FIELD_VALUES',
      message: 'Runtime result language rows require field_values.',
      sheetKey: params.sourceSheetKey,
      rowNumber: params.sourceRowNumber,
      fieldKey: 'field_values',
      lookupKey: params.lookupKey,
    });
  }
}

function planLanguageRows(params: {
  readonly assessmentVersionId: string;
  readonly normalisedPackage: NormalisedRankedPatternPackage;
  readonly diagnostics: RankedPatternResultLanguagePersistenceDiagnostic[];
}): readonly RankedPatternResultLanguagePersistenceOperation[] {
  const operations: RankedPatternResultLanguagePersistenceOperation[] = [];

  for (const row of params.normalisedPackage.context) {
    addCommonLanguageDiagnostics({
      diagnostics: params.diagnostics,
      sourceSheetKey: '05_Context',
      sourceRowNumber: row.sourceRowNumber,
      lookupKey: row.lookupKey,
      domainKey: row.domainKey,
      fieldValues: row.fieldValues,
    });
    if (!row.sectionKey) {
      addResultLanguageDiagnostic(params.diagnostics, {
        code: 'MISSING_SECTION_KEY',
        message: 'Context rows require section_key.',
        sheetKey: '05_Context',
        rowNumber: row.sourceRowNumber,
        fieldKey: 'section_key',
        lookupKey: row.lookupKey,
      });
    }
    operations.push(
      languageRowOperation({
        assessmentVersionId: params.assessmentVersionId,
        sourceSheetKey: '05_Context',
        sourceRowNumber: row.sourceRowNumber,
        sectionKey: 'context',
        lookupKey: row.lookupKey,
        domainKey: row.domainKey,
        fieldValues: row.fieldValues,
        status: row.status,
      }),
    );
  }

  for (const [sectionKey, rows] of [
    ['orientation', params.normalisedPackage.orientation],
    ['recognition', params.normalisedPackage.recognition],
    ['pattern_mechanics', params.normalisedPackage.patternMechanics],
    ['pattern_synthesis', params.normalisedPackage.patternSynthesis],
  ] as const) {
    for (const row of rows) {
      addCommonLanguageDiagnostics({
        diagnostics: params.diagnostics,
        sourceSheetKey: row.sourceSheetKey,
        sourceRowNumber: row.sourceRowNumber,
        lookupKey: row.lookupKey,
        domainKey: row.domainKey,
        fieldValues: row.fieldValues,
      });
      if (!isSupportedScoreShapeValue(row.scoreShape)) {
        addResultLanguageDiagnostic(params.diagnostics, {
          code: 'UNSUPPORTED_SCORE_SHAPE',
          message: `score_shape has unsupported value ${row.scoreShape ?? ''}.`,
          sheetKey: row.sourceSheetKey,
          rowNumber: row.sourceRowNumber,
          fieldKey: 'score_shape',
          lookupKey: row.lookupKey,
        });
      }
      operations.push(
        languageRowOperation({
          assessmentVersionId: params.assessmentVersionId,
          sourceSheetKey: row.sourceSheetKey,
          sourceRowNumber: row.sourceRowNumber,
          sectionKey,
          lookupKey: row.lookupKey,
          domainKey: row.domainKey,
          patternKey: row.patternKey,
          scoreShape: row.scoreShape,
          fieldValues: row.fieldValues,
          status: row.status,
        }),
      );
    }
  }

  for (const row of params.normalisedPackage.signalRoles) {
    addCommonLanguageDiagnostics({
      diagnostics: params.diagnostics,
      sourceSheetKey: '08_Signal_Roles',
      sourceRowNumber: row.sourceRowNumber,
      lookupKey: row.lookupKey,
      domainKey: row.domainKey,
      fieldValues: row.fieldValues,
    });
    if (!hasSupportedRankPositionValue(row.rankPosition)) {
      addResultLanguageDiagnostic(params.diagnostics, {
        code: 'UNSUPPORTED_RANK_POSITION',
        message: `rank_position has unsupported value ${row.rankPosition ?? ''}.`,
        sheetKey: '08_Signal_Roles',
        rowNumber: row.sourceRowNumber,
        fieldKey: 'rank_position',
        lookupKey: row.lookupKey,
      });
    }
    operations.push(
      languageRowOperation({
        assessmentVersionId: params.assessmentVersionId,
        sourceSheetKey: '08_Signal_Roles',
        sourceRowNumber: row.sourceRowNumber,
        sectionKey: 'signal_roles',
        lookupKey: row.lookupKey,
        domainKey: row.domainKey,
        signalKey: row.signalKey,
        rankPosition: row.rankPosition,
        fieldValues: row.fieldValues,
        status: row.status,
      }),
    );
  }

  for (const [sectionKey, rows] of [
    ['strengths', params.normalisedPackage.strengths],
    ['narrowing', params.normalisedPackage.narrowing],
    ['application', params.normalisedPackage.application],
  ] as const) {
    for (const row of rows) {
      addCommonLanguageDiagnostics({
        diagnostics: params.diagnostics,
        sourceSheetKey: row.sourceSheetKey,
        sourceRowNumber: row.sourceRowNumber,
        lookupKey: row.lookupKey,
        domainKey: row.domainKey,
        fieldValues: row.fieldValues,
      });
      operations.push(
        languageRowOperation({
          assessmentVersionId: params.assessmentVersionId,
          sourceSheetKey: row.sourceSheetKey,
          sourceRowNumber: row.sourceRowNumber,
          sectionKey,
          lookupKey: row.lookupKey,
          domainKey: row.domainKey,
          patternKey: row.patternKey,
          itemKey: row.itemKey,
          priority: row.priority,
          fieldValues: row.fieldValues,
          status: row.status,
        }),
      );
    }
  }

  for (const row of params.normalisedPackage.closingIntegration) {
    addCommonLanguageDiagnostics({
      diagnostics: params.diagnostics,
      sourceSheetKey: '14_Closing_Integration',
      sourceRowNumber: row.sourceRowNumber,
      lookupKey: row.lookupKey,
      domainKey: row.domainKey,
      fieldValues: row.fieldValues,
    });
    if (!isSupportedScoreShapeValue(row.scoreShape)) {
      addResultLanguageDiagnostic(params.diagnostics, {
        code: 'UNSUPPORTED_SCORE_SHAPE',
        message: `score_shape has unsupported value ${row.scoreShape ?? ''}.`,
        sheetKey: '14_Closing_Integration',
        rowNumber: row.sourceRowNumber,
        fieldKey: 'score_shape',
        lookupKey: row.lookupKey,
      });
    }
    operations.push(
      languageRowOperation({
        assessmentVersionId: params.assessmentVersionId,
        sourceSheetKey: '14_Closing_Integration',
        sourceRowNumber: row.sourceRowNumber,
        sectionKey: 'closing_integration',
        lookupKey: row.lookupKey,
        domainKey: row.domainKey,
        patternKey: row.patternKey,
        scoreShape: row.scoreShape,
        fieldValues: row.fieldValues,
        status: row.status,
      }),
    );
  }

  return Object.freeze(operations);
}

function planSectionDefinitions(
  assessmentVersionId: string,
): readonly RankedPatternResultLanguagePersistenceOperation[] {
  return Object.freeze(
    resultSectionDefinitions.map((definition) =>
      resultLanguageOperation({
        table: 'assessment_result_section_definitions',
        action: 'upsert',
        key: definition.sectionKey,
        sourceSheetKey: definition.sourceSheetKey,
        sourceRowNumber: 1,
        values: {
          assessment_version_id: assessmentVersionId,
          section_key: definition.sectionKey,
          section_order: definition.sectionOrder,
          source_sheet_key: definition.sourceSheetKey,
          runtime_category: 'runtime_result_content',
          lookup_strategy: definition.lookupStrategy,
          required_coverage: definition.requiredCoverage,
          status: 'active',
        },
      }),
    ),
  );
}

function planPreviewCases(params: {
  readonly assessmentVersionId: string;
  readonly normalisedPackage: NormalisedRankedPatternPackage;
  readonly diagnostics: RankedPatternResultLanguagePersistenceDiagnostic[];
}): readonly RankedPatternResultLanguagePersistenceOperation[] {
  return Object.freeze(
    params.normalisedPackage.reportPreviewCases.map((row) => {
      if (!row.previewCaseKey) {
        addResultLanguageDiagnostic(params.diagnostics, {
          code: 'MISSING_PREVIEW_CASE_KEY',
          message: 'Preview cases require preview_case_key.',
          sheetKey: '15_Report_Preview',
          rowNumber: row.sourceRowNumber,
          fieldKey: 'preview_case_key',
          lookupKey: row.lookupKey,
        });
      }
      if (!isSupportedScoreShapeValue(row.expectedScoreShape)) {
        addResultLanguageDiagnostic(params.diagnostics, {
          code: 'UNSUPPORTED_SCORE_SHAPE',
          message: `expected_score_shape has unsupported value ${row.expectedScoreShape ?? ''}.`,
          sheetKey: '15_Report_Preview',
          rowNumber: row.sourceRowNumber,
          fieldKey: 'expected_score_shape',
          lookupKey: row.lookupKey,
        });
      }

      return resultLanguageOperation({
        table: 'assessment_report_preview_cases',
        action: 'upsert',
        key: row.previewCaseKey ?? '',
        sourceSheetKey: '15_Report_Preview',
        sourceRowNumber: row.sourceRowNumber,
        values: {
          assessment_version_id: params.assessmentVersionId,
          preview_case_key: row.previewCaseKey,
          domain_key: row.domainKey,
          ranked_signal_keys: row.rankedSignalKeys,
          normalized_scores: row.normalisedScores,
          expected_score_shape: row.expectedScoreShape,
          expected_pattern_key: row.expectedPatternKey,
          expected_payload_snapshot: null,
          status: resultStatus(row.status),
        },
      });
    }),
  );
}

export function planRankedPatternResultLanguagePersistence(
  input: RankedPatternResultLanguagePersistenceInput,
): RankedPatternResultLanguagePersistencePlan {
  const diagnostics: RankedPatternResultLanguagePersistenceDiagnostic[] = [];
  const operations: RankedPatternResultLanguagePersistenceOperation[] = [];

  if (!input.assessmentVersionId.trim()) {
    addResultLanguageDiagnostic(diagnostics, {
      code: 'MISSING_ASSESSMENT_VERSION_ID',
      message: 'Result-language persistence requires a target assessment version id.',
    });
  }

  if (input.normalisedPackage.diagnostics.length > 0) {
    diagnostics.push(...input.normalisedPackage.diagnostics);
  }

  const domainKey = metadataDomainKey(input.normalisedPackage);
  if (!domainKey) {
    addResultLanguageDiagnostic(diagnostics, {
      code: 'MISSING_ACTIVE_DOMAIN',
      message: 'Result-language persistence requires a domain key from metadata or context.',
      sheetKey: '05_Context',
      fieldKey: 'domain_key',
    });
  }

  const rankedPatternOperations = planRankedPatterns({
    assessmentVersionId: input.assessmentVersionId,
    normalisedPackage: input.normalisedPackage,
    diagnostics,
  });
  operations.push(...rankedPatternOperations);
  validateResultLanguagePatternReferences({
    normalisedPackage: input.normalisedPackage,
    activeRankedPatternKeys: new Set(
      rankedPatternOperations
        .filter((operation) => operation.values.status === 'active')
        .map((operation) => `${operation.values.domain_key ?? ''}::${operation.values.pattern_key ?? ''}`),
    ),
    diagnostics,
  });
  operations.push(
    resultLanguageOperation({
      table: 'assessment_score_shape_rules',
      action: 'upsert',
      key: 'score-shape-rules-not-supplied',
      sourceSheetKey: '18_Lookups',
      sourceRowNumber: 1,
      values: {
        assessment_version_id: input.assessmentVersionId,
        planned: false,
      },
    }),
  );
  operations.pop();
  addResultLanguageDiagnostic(diagnostics, {
    code: 'SCORE_SHAPE_RULES_NOT_SUPPLIED',
    severity: 'warning',
    message: 'No explicit score-shape rule_config rows are supplied by this persistence step.',
  });
  operations.push(...planSectionDefinitions(input.assessmentVersionId));
  operations.push(...planLanguageRows({
    assessmentVersionId: input.assessmentVersionId,
    normalisedPackage: input.normalisedPackage,
    diagnostics,
  }));
  operations.push(...planPreviewCases({
    assessmentVersionId: input.assessmentVersionId,
    normalisedPackage: input.normalisedPackage,
    diagnostics,
  }));

  return Object.freeze({
    assessmentVersionId: input.assessmentVersionId,
    domainKey,
    operations: Object.freeze(operations),
    operationCountsByTable: buildResultLanguageCounts(operations),
    diagnostics: Object.freeze(diagnostics),
  });
}

function hasResultLanguageBlockingDiagnostics(
  diagnostics: readonly RankedPatternResultLanguagePersistenceDiagnostic[],
): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === 'error');
}

function resultTableCount(
  plan: RankedPatternResultLanguagePersistencePlan,
  table: RankedPatternResultLanguageTable,
): number {
  return plan.operationCountsByTable[table] ?? 0;
}

async function upsertRankedPattern(
  db: RankedPatternPersistenceDbClient,
  operation: RankedPatternResultLanguagePersistenceOperation,
): Promise<void> {
  await db.query(
    `
    INSERT INTO assessment_ranked_patterns (
      assessment_version_id,
      domain_key,
      pattern_key,
      rank_1_signal_key,
      rank_2_signal_key,
      rank_3_signal_key,
      rank_4_signal_key,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (assessment_version_id, domain_key, pattern_key)
    DO UPDATE SET
      rank_1_signal_key = EXCLUDED.rank_1_signal_key,
      rank_2_signal_key = EXCLUDED.rank_2_signal_key,
      rank_3_signal_key = EXCLUDED.rank_3_signal_key,
      rank_4_signal_key = EXCLUDED.rank_4_signal_key,
      status = EXCLUDED.status,
      updated_at = NOW()
    `,
    [
      operation.values.assessment_version_id,
      operation.values.domain_key,
      operation.values.pattern_key,
      operation.values.rank_1_signal_key,
      operation.values.rank_2_signal_key,
      operation.values.rank_3_signal_key,
      operation.values.rank_4_signal_key,
      operation.values.status,
    ],
  );
}

async function upsertSectionDefinition(
  db: RankedPatternPersistenceDbClient,
  operation: RankedPatternResultLanguagePersistenceOperation,
): Promise<string> {
  const result = await db.query<IdRow>(
    `
    INSERT INTO assessment_result_section_definitions (
      assessment_version_id,
      section_key,
      section_order,
      source_sheet_key,
      runtime_category,
      lookup_strategy,
      required_coverage,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
    ON CONFLICT (assessment_version_id, section_key)
    DO UPDATE SET
      section_order = EXCLUDED.section_order,
      source_sheet_key = EXCLUDED.source_sheet_key,
      runtime_category = EXCLUDED.runtime_category,
      lookup_strategy = EXCLUDED.lookup_strategy,
      required_coverage = EXCLUDED.required_coverage,
      status = EXCLUDED.status,
      updated_at = NOW()
    RETURNING id
    `,
    [
      operation.values.assessment_version_id,
      operation.values.section_key,
      operation.values.section_order,
      operation.values.source_sheet_key,
      operation.values.runtime_category,
      operation.values.lookup_strategy,
      JSON.stringify(operation.values.required_coverage),
      operation.values.status,
    ],
  );
  const id = result.rows[0]?.id;
  if (!id) {
    throw new Error('RANKED_PATTERN_SECTION_DEFINITION_UPSERT_FAILED');
  }
  return id;
}

async function upsertLanguageRow(params: {
  readonly db: RankedPatternPersistenceDbClient;
  readonly operation: RankedPatternResultLanguagePersistenceOperation;
  readonly sectionDefinitionIds: ReadonlyMap<string, string>;
}): Promise<void> {
  const sectionKey = String(params.operation.values.section_key);
  await params.db.query(
    `
    INSERT INTO assessment_result_language_rows (
      assessment_version_id,
      result_section_definition_id,
      section_key,
      lookup_key,
      domain_key,
      pattern_key,
      score_shape,
      signal_key,
      rank_position,
      item_key,
      priority,
      field_values,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13)
    ON CONFLICT (assessment_version_id, section_key, lookup_key)
    DO UPDATE SET
      result_section_definition_id = EXCLUDED.result_section_definition_id,
      domain_key = EXCLUDED.domain_key,
      pattern_key = EXCLUDED.pattern_key,
      score_shape = EXCLUDED.score_shape,
      signal_key = EXCLUDED.signal_key,
      rank_position = EXCLUDED.rank_position,
      item_key = EXCLUDED.item_key,
      priority = EXCLUDED.priority,
      field_values = EXCLUDED.field_values,
      status = EXCLUDED.status,
      updated_at = NOW()
    `,
    [
      params.operation.values.assessment_version_id,
      params.sectionDefinitionIds.get(sectionKey),
      sectionKey,
      params.operation.values.lookup_key,
      params.operation.values.domain_key,
      params.operation.values.pattern_key,
      params.operation.values.score_shape,
      params.operation.values.signal_key,
      params.operation.values.rank_position,
      params.operation.values.item_key,
      params.operation.values.priority,
      JSON.stringify(params.operation.values.field_values),
      params.operation.values.status,
    ],
  );
}

async function upsertPreviewCase(
  db: RankedPatternPersistenceDbClient,
  operation: RankedPatternResultLanguagePersistenceOperation,
): Promise<void> {
  await db.query(
    `
    INSERT INTO assessment_report_preview_cases (
      assessment_version_id,
      preview_case_key,
      domain_key,
      ranked_signal_keys,
      normalized_scores,
      expected_score_shape,
      expected_pattern_key,
      expected_payload_snapshot,
      status
    )
    VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8::jsonb, $9)
    ON CONFLICT (assessment_version_id, preview_case_key)
    DO UPDATE SET
      domain_key = EXCLUDED.domain_key,
      ranked_signal_keys = EXCLUDED.ranked_signal_keys,
      normalized_scores = EXCLUDED.normalized_scores,
      expected_score_shape = EXCLUDED.expected_score_shape,
      expected_pattern_key = EXCLUDED.expected_pattern_key,
      expected_payload_snapshot = EXCLUDED.expected_payload_snapshot,
      status = EXCLUDED.status,
      updated_at = NOW()
    `,
    [
      operation.values.assessment_version_id,
      operation.values.preview_case_key,
      operation.values.domain_key,
      JSON.stringify(operation.values.ranked_signal_keys),
      JSON.stringify(operation.values.normalized_scores),
      operation.values.expected_score_shape,
      operation.values.expected_pattern_key,
      operation.values.expected_payload_snapshot === null
        ? null
        : JSON.stringify(operation.values.expected_payload_snapshot),
      operation.values.status,
    ],
  );
}

export async function persistRankedPatternResultLanguage(
  input: RankedPatternResultLanguagePersistenceInput,
): Promise<RankedPatternResultLanguagePersistenceResult> {
  const plan = planRankedPatternResultLanguagePersistence(input);
  const dryRun = input.dryRun !== false;

  if (dryRun || hasResultLanguageBlockingDiagnostics(plan.diagnostics)) {
    return Object.freeze({
      dryRun,
      assessmentVersionId: input.assessmentVersionId,
      importBatchId: input.importBatchId ?? null,
      plan,
      countsByTable: emptyResultLanguageCountsByTable,
      diagnostics: plan.diagnostics,
    });
  }

  if (!input.db) {
    throw new Error('RANKED_PATTERN_RESULT_LANGUAGE_DB_REQUIRED_FOR_APPLY');
  }

  const client = await input.db.connect();
  try {
    await client.query('BEGIN');

    for (const operation of plan.operations.filter((item) => item.table === 'assessment_ranked_patterns')) {
      await upsertRankedPattern(client, operation);
    }

    const sectionDefinitionIds = new Map<string, string>();
    for (const operation of plan.operations.filter(
      (item) => item.table === 'assessment_result_section_definitions',
    )) {
      sectionDefinitionIds.set(String(operation.values.section_key), await upsertSectionDefinition(client, operation));
    }

    for (const operation of plan.operations.filter(
      (item) => item.table === 'assessment_result_language_rows',
    )) {
      await upsertLanguageRow({ db: client, operation, sectionDefinitionIds });
    }

    for (const operation of plan.operations.filter((item) => item.table === 'assessment_report_preview_cases')) {
      await upsertPreviewCase(client, operation);
    }

    await client.query('COMMIT');

    return Object.freeze({
      dryRun: false,
      assessmentVersionId: input.assessmentVersionId,
      importBatchId: input.importBatchId ?? null,
      plan,
      countsByTable: Object.freeze({
        assessment_ranked_patterns: resultTableCount(plan, 'assessment_ranked_patterns'),
        assessment_score_shape_rules: resultTableCount(plan, 'assessment_score_shape_rules'),
        assessment_result_section_definitions: resultTableCount(
          plan,
          'assessment_result_section_definitions',
        ),
        assessment_result_language_rows: resultTableCount(plan, 'assessment_result_language_rows'),
        assessment_report_preview_cases: resultTableCount(plan, 'assessment_report_preview_cases'),
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

export function getRankedPatternResultLanguageSheetKeys(): readonly RankedPatternImportSheetKey[] {
  return rankedPatternRuntimeResultSheetKeys;
}
