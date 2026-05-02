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

type AssessmentRow = {
  id: string;
  assessment_key: string;
  mode: 'multi_domain' | 'single_domain' | null;
};

type AssessmentVersionRow = {
  id: string;
  assessment_id: string;
  mode: 'multi_domain' | 'single_domain' | null;
  version: string;
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

type DomainRow = {
  id: string;
  domain_key: string;
  label: string;
  description: string | null;
  domain_type: 'QUESTION_SECTION' | 'SIGNAL_GROUP';
  order_index: number;
};

type SignalRow = {
  id: string;
  domain_id: string;
  signal_key: string;
  label: string;
  description: string | null;
  order_index: number;
  is_overlay: boolean;
};

type QuestionRow = {
  id: string;
  domain_id: string;
  question_key: string;
  prompt: string;
  order_index: number;
};

type OptionRow = {
  id: string;
  question_id: string;
  option_key: string;
  option_label: string | null;
  option_text: string;
  order_index: number;
};

type WeightRow = {
  option_id: string;
  signal_id: string;
  weight: string;
  source_weight_key: string | null;
};

type CopyCounter =
  | 'domains'
  | 'signals'
  | 'questions'
  | 'options'
  | 'optionSignalWeights'
  | 'languageRows';

type CopyCounts = Record<CopyCounter, number>;

export type DraftVersionCreationResult =
  | {
      status: 'created';
      assessmentId: string;
      assessmentKey: string;
      sourceVersionId: string;
      sourceVersionTag: string;
      draftVersionId: string;
      draftVersionTag: string;
      copied: CopyCounts;
    }
  | {
      status: 'draft_exists';
      assessmentId: string;
      assessmentKey: string;
      draftVersionId: string;
      draftVersionTag: string;
    }
  | {
      status: 'assessment_not_found';
      assessmentKeyOrId: string;
    }
  | {
      status: 'published_source_not_found';
      assessmentId: string;
      assessmentKey: string;
    }
  | {
      status: 'persistence_error';
      stage: DraftVersionCreationPersistenceStage;
      message: string;
    };

type DraftVersionCreationPersistenceStage =
  | 'load_assessment'
  | 'load_existing_draft'
  | 'load_published_source'
  | 'insert_draft_version'
  | 'load_domains'
  | 'insert_domains'
  | 'load_signals'
  | 'insert_signals'
  | 'load_questions'
  | 'insert_questions'
  | 'load_options'
  | 'insert_options'
  | 'load_weights'
  | 'insert_weights'
  | 'copy_version_owned_table';

class DraftVersionCreationPersistenceError extends Error {
  readonly stage: DraftVersionCreationPersistenceStage;
  readonly cause: unknown;

  constructor(stage: DraftVersionCreationPersistenceStage, cause: unknown) {
    super('DRAFT_VERSION_CREATION_PERSISTENCE_FAILED');
    this.name = 'DraftVersionCreationPersistenceError';
    this.stage = stage;
    this.cause = cause;
  }
}

type VersionOwnedTableCopy = {
  tableName: string;
  columns: readonly string[];
  orderBy: readonly string[];
};

// Schema ownership assumptions:
// - assessments is the stable assessment-family row and is not duplicated.
// - assessment_versions plus the authoring graph below are version-owned editable rows.
// - attempts, responses, and results are runtime/read-model rows and must never be copied.
const VERSION_OWNED_TABLE_COPIES: readonly VersionOwnedTableCopy[] = Object.freeze([
  {
    tableName: 'assessment_version_language_assessment',
    columns: Object.freeze(['section', 'content']),
    orderBy: Object.freeze(['section', 'id']),
  },
  {
    tableName: 'assessment_version_intro',
    columns: Object.freeze([
      'intro_title',
      'intro_summary',
      'intro_how_it_works',
      'estimated_time_override',
      'instructions',
      'confidentiality_note',
    ]),
    orderBy: Object.freeze(['id']),
  },
  {
    tableName: 'assessment_version_language_signals',
    columns: Object.freeze(['signal_key', 'section', 'content']),
    orderBy: Object.freeze(['signal_key', 'section', 'id']),
  },
  {
    tableName: 'assessment_version_language_pairs',
    columns: Object.freeze(['signal_pair', 'section', 'content']),
    orderBy: Object.freeze(['signal_pair', 'section', 'id']),
  },
  {
    tableName: 'assessment_version_language_domains',
    columns: Object.freeze(['domain_key', 'section', 'content']),
    orderBy: Object.freeze(['domain_key', 'section', 'id']),
  },
  {
    tableName: 'assessment_version_language_overview',
    columns: Object.freeze(['pattern_key', 'section', 'content']),
    orderBy: Object.freeze(['pattern_key', 'section', 'id']),
  },
  {
    tableName: 'assessment_version_language_hero_headers',
    columns: Object.freeze(['pair_key', 'headline']),
    orderBy: Object.freeze(['pair_key', 'id']),
  },
  {
    tableName: 'assessment_version_pair_trait_weights',
    columns: Object.freeze(['profile_domain_key', 'pair_key', 'trait_key', 'weight', 'order_index']),
    orderBy: Object.freeze(['profile_domain_key', 'pair_key', 'order_index', 'id']),
  },
  {
    tableName: 'assessment_version_hero_pattern_rules',
    columns: Object.freeze([
      'pattern_key',
      'priority',
      'rule_type',
      'trait_key',
      'operator',
      'threshold_value',
      'order_index',
    ]),
    orderBy: Object.freeze(['priority', 'pattern_key', 'rule_type', 'order_index', 'id']),
  },
  {
    tableName: 'assessment_version_hero_pattern_language',
    columns: Object.freeze([
      'pattern_key',
      'headline',
      'subheadline',
      'summary',
      'narrative',
      'pressure_overlay',
      'environment_overlay',
    ]),
    orderBy: Object.freeze(['pattern_key', 'id']),
  },
  {
    tableName: 'assessment_version_application_thesis',
    columns: Object.freeze(['hero_pattern_key', 'headline', 'summary']),
    orderBy: Object.freeze(['hero_pattern_key', 'id']),
  },
  {
    tableName: 'assessment_version_application_contribution',
    columns: Object.freeze(['source_type', 'source_key', 'label', 'narrative', 'best_when', 'watch_for', 'priority']),
    orderBy: Object.freeze(['source_type', 'source_key', 'priority', 'id']),
  },
  {
    tableName: 'assessment_version_application_risk',
    columns: Object.freeze(['source_type', 'source_key', 'label', 'narrative', 'impact', 'early_warning', 'priority']),
    orderBy: Object.freeze(['source_type', 'source_key', 'priority', 'id']),
  },
  {
    tableName: 'assessment_version_application_development',
    columns: Object.freeze(['source_type', 'source_key', 'label', 'narrative', 'practice', 'success_marker', 'priority']),
    orderBy: Object.freeze(['source_type', 'source_key', 'priority', 'id']),
  },
  {
    tableName: 'assessment_version_application_action_prompts',
    columns: Object.freeze(['source_type', 'source_key', 'keep_doing', 'watch_for', 'practice_next', 'ask_others']),
    orderBy: Object.freeze(['source_type', 'source_key', 'id']),
  },
  {
    tableName: 'assessment_version_single_domain_framing',
    columns: Object.freeze([
      'domain_key',
      'section_title',
      'intro_paragraph',
      'meaning_paragraph',
      'bridge_to_signals',
      'blueprint_context_line',
    ]),
    orderBy: Object.freeze(['domain_key', 'id']),
  },
  {
    tableName: 'assessment_version_single_domain_hero_pairs',
    columns: Object.freeze([
      'pair_key',
      'hero_headline',
      'hero_subheadline',
      'hero_opening',
      'hero_strength_paragraph',
      'hero_tension_paragraph',
      'hero_close_paragraph',
    ]),
    orderBy: Object.freeze(['pair_key', 'id']),
  },
  {
    tableName: 'assessment_version_single_domain_signal_chapters',
    columns: Object.freeze([
      'signal_key',
      'position_primary_label',
      'position_secondary_label',
      'position_supporting_label',
      'position_underplayed_label',
      'chapter_intro_primary',
      'chapter_intro_secondary',
      'chapter_intro_supporting',
      'chapter_intro_underplayed',
      'chapter_how_it_shows_up',
      'chapter_value_outcome',
      'chapter_value_team_effect',
      'chapter_risk_behaviour',
      'chapter_risk_impact',
      'chapter_development',
    ]),
    orderBy: Object.freeze(['signal_key', 'id']),
  },
  {
    tableName: 'assessment_version_single_domain_balancing_sections',
    columns: Object.freeze([
      'pair_key',
      'balancing_section_title',
      'current_pattern_paragraph',
      'practical_meaning_paragraph',
      'system_risk_paragraph',
      'rebalance_intro',
      'rebalance_action_1',
      'rebalance_action_2',
      'rebalance_action_3',
    ]),
    orderBy: Object.freeze(['pair_key', 'id']),
  },
  {
    tableName: 'assessment_version_single_domain_pair_summaries',
    columns: Object.freeze([
      'pair_key',
      'pair_section_title',
      'pair_headline',
      'pair_opening_paragraph',
      'pair_strength_paragraph',
      'pair_tension_paragraph',
      'pair_close_paragraph',
    ]),
    orderBy: Object.freeze(['pair_key', 'id']),
  },
  {
    tableName: 'assessment_version_single_domain_application_statements',
    columns: Object.freeze([
      'signal_key',
      'strength_statement_1',
      'strength_statement_2',
      'watchout_statement_1',
      'watchout_statement_2',
      'development_statement_1',
      'development_statement_2',
      'domain_key',
      'pattern_key',
      'pair_key',
      'focus_area',
      'guidance_type',
      'driver_role',
      'priority',
      'guidance_text',
      'linked_claim_type',
    ]),
    orderBy: Object.freeze(['domain_key', 'pattern_key', 'focus_area', 'guidance_type', 'driver_role', 'priority', 'id']),
  },
  {
    tableName: 'assessment_version_single_domain_driver_claims',
    columns: Object.freeze([
      'domain_key',
      'pair_key',
      'signal_key',
      'driver_role',
      'claim_type',
      'claim_text',
      'materiality',
      'priority',
    ]),
    orderBy: Object.freeze(['domain_key', 'pair_key', 'signal_key', 'driver_role', 'priority', 'id']),
  },
]);

function createEmptyCopyCounts(): CopyCounts {
  return {
    domains: 0,
    signals: 0,
    questions: 0,
    options: 0,
    optionSignalWeights: 0,
    languageRows: 0,
  };
}

function persistenceResult(error: unknown): DraftVersionCreationResult {
  if (error instanceof DraftVersionCreationPersistenceError) {
    return {
      status: 'persistence_error',
      stage: error.stage,
      message: error.message,
    };
  }

  return {
    status: 'persistence_error',
    stage: 'copy_version_owned_table',
    message: 'DRAFT_VERSION_CREATION_PERSISTENCE_FAILED',
  };
}

export function getNextMajorAssessmentVersionTag(sourceVersionTag: string): string {
  const parts = sourceVersionTag.trim().split('.');
  const major = Number(parts[0]);

  if (!Number.isInteger(major) || major < 0) {
    throw new Error('INVALID_ASSESSMENT_VERSION_TAG');
  }

  return `${major + 1}.00`;
}

async function loadAssessment(db: Queryable, assessmentKeyOrId: string): Promise<AssessmentRow | null> {
  try {
    const result = await db.query<AssessmentRow>(
      `
      SELECT
        id,
        assessment_key,
        mode
      FROM assessments
      WHERE assessment_key = $1
        OR id::text = $1
      LIMIT 1
      `,
      [assessmentKeyOrId],
    );

    return result.rows[0] ?? null;
  } catch (error) {
    throw new DraftVersionCreationPersistenceError('load_assessment', error);
  }
}

async function loadVersionByLifecycle(
  db: Queryable,
  assessmentId: string,
  lifecycleStatus: 'DRAFT' | 'PUBLISHED',
): Promise<AssessmentVersionRow | null> {
  const stage = lifecycleStatus === 'DRAFT' ? 'load_existing_draft' : 'load_published_source';

  try {
    const result = await db.query<AssessmentVersionRow>(
      `
      SELECT
        id,
        assessment_id,
        mode,
        version,
        lifecycle_status,
        title_override,
        description_override,
        published_at,
        created_at,
        updated_at
      FROM assessment_versions
      WHERE assessment_id = $1
        AND lifecycle_status = $2
      ORDER BY published_at DESC NULLS LAST, created_at DESC, version DESC, id DESC
      LIMIT 1
      `,
      [assessmentId, lifecycleStatus],
    );

    return result.rows[0] ?? null;
  } catch (error) {
    throw new DraftVersionCreationPersistenceError(stage, error);
  }
}

async function insertDraftVersion(params: {
  db: Queryable;
  sourceVersion: AssessmentVersionRow;
  draftVersionTag: string;
}): Promise<string> {
  try {
    const result = await params.db.query<InsertedIdRow>(
      `
      INSERT INTO assessment_versions (
        assessment_id,
        mode,
        version,
        lifecycle_status,
        title_override,
        description_override,
        published_at
      )
      VALUES ($1, $2, $3, 'DRAFT', $4, $5, NULL)
      RETURNING id
      `,
      [
        params.sourceVersion.assessment_id,
        params.sourceVersion.mode ?? 'multi_domain',
        params.draftVersionTag,
        params.sourceVersion.title_override,
        params.sourceVersion.description_override,
      ],
    );

    const inserted = result.rows[0]?.id;
    if (!inserted) {
      throw new Error('DRAFT_VERSION_INSERT_RETURNED_NO_ID');
    }

    return inserted;
  } catch (error) {
    throw new DraftVersionCreationPersistenceError('insert_draft_version', error);
  }
}

async function loadSourceDomains(db: Queryable, sourceVersionId: string): Promise<readonly DomainRow[]> {
  try {
    const result = await db.query<DomainRow>(
      `
      SELECT
        id,
        domain_key,
        label,
        description,
        domain_type,
        order_index
      FROM domains
      WHERE assessment_version_id = $1
      ORDER BY domain_type ASC, order_index ASC, id ASC
      `,
      [sourceVersionId],
    );

    return result.rows;
  } catch (error) {
    throw new DraftVersionCreationPersistenceError('load_domains', error);
  }
}

async function copyDomains(params: {
  db: Queryable;
  draftVersionId: string;
  sourceVersionId: string;
}): Promise<Map<string, string>> {
  const sourceRows = await loadSourceDomains(params.db, params.sourceVersionId);
  const idMap = new Map<string, string>();

  for (const row of sourceRows) {
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
        [params.draftVersionId, row.domain_key, row.label, row.description, row.domain_type, row.order_index],
      );

      const inserted = result.rows[0]?.id;
      if (inserted) {
        idMap.set(row.id, inserted);
      }
    } catch (error) {
      throw new DraftVersionCreationPersistenceError('insert_domains', error);
    }
  }

  return idMap;
}

async function loadSourceSignals(db: Queryable, sourceVersionId: string): Promise<readonly SignalRow[]> {
  try {
    const result = await db.query<SignalRow>(
      `
      SELECT
        id,
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
      [sourceVersionId],
    );

    return result.rows;
  } catch (error) {
    throw new DraftVersionCreationPersistenceError('load_signals', error);
  }
}

async function copySignals(params: {
  db: Queryable;
  draftVersionId: string;
  sourceVersionId: string;
  domainIdMap: ReadonlyMap<string, string>;
}): Promise<Map<string, string>> {
  const sourceRows = await loadSourceSignals(params.db, params.sourceVersionId);
  const idMap = new Map<string, string>();

  for (const row of sourceRows) {
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
          params.draftVersionId,
          params.domainIdMap.get(row.domain_id) ?? '',
          row.signal_key,
          row.label,
          row.description,
          row.order_index,
          row.is_overlay,
        ],
      );

      const inserted = result.rows[0]?.id;
      if (inserted) {
        idMap.set(row.id, inserted);
      }
    } catch (error) {
      throw new DraftVersionCreationPersistenceError('insert_signals', error);
    }
  }

  return idMap;
}

async function loadSourceQuestions(db: Queryable, sourceVersionId: string): Promise<readonly QuestionRow[]> {
  try {
    const result = await db.query<QuestionRow>(
      `
      SELECT
        id,
        domain_id,
        question_key,
        prompt,
        order_index
      FROM questions
      WHERE assessment_version_id = $1
      ORDER BY order_index ASC, id ASC
      `,
      [sourceVersionId],
    );

    return result.rows;
  } catch (error) {
    throw new DraftVersionCreationPersistenceError('load_questions', error);
  }
}

async function copyQuestions(params: {
  db: Queryable;
  draftVersionId: string;
  sourceVersionId: string;
  domainIdMap: ReadonlyMap<string, string>;
}): Promise<Map<string, string>> {
  const sourceRows = await loadSourceQuestions(params.db, params.sourceVersionId);
  const idMap = new Map<string, string>();

  for (const row of sourceRows) {
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
          params.draftVersionId,
          params.domainIdMap.get(row.domain_id) ?? '',
          row.question_key,
          row.prompt,
          row.order_index,
        ],
      );

      const inserted = result.rows[0]?.id;
      if (inserted) {
        idMap.set(row.id, inserted);
      }
    } catch (error) {
      throw new DraftVersionCreationPersistenceError('insert_questions', error);
    }
  }

  return idMap;
}

async function loadSourceOptions(db: Queryable, sourceVersionId: string): Promise<readonly OptionRow[]> {
  try {
    const result = await db.query<OptionRow>(
      `
      SELECT
        id,
        question_id,
        option_key,
        option_label,
        option_text,
        order_index
      FROM options
      WHERE assessment_version_id = $1
      ORDER BY question_id ASC, order_index ASC, id ASC
      `,
      [sourceVersionId],
    );

    return result.rows;
  } catch (error) {
    throw new DraftVersionCreationPersistenceError('load_options', error);
  }
}

async function copyOptions(params: {
  db: Queryable;
  draftVersionId: string;
  sourceVersionId: string;
  questionIdMap: ReadonlyMap<string, string>;
}): Promise<Map<string, string>> {
  const sourceRows = await loadSourceOptions(params.db, params.sourceVersionId);
  const idMap = new Map<string, string>();

  for (const row of sourceRows) {
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
          params.draftVersionId,
          params.questionIdMap.get(row.question_id) ?? '',
          row.option_key,
          row.option_label,
          row.option_text,
          row.order_index,
        ],
      );

      const inserted = result.rows[0]?.id;
      if (inserted) {
        idMap.set(row.id, inserted);
      }
    } catch (error) {
      throw new DraftVersionCreationPersistenceError('insert_options', error);
    }
  }

  return idMap;
}

async function loadSourceWeights(db: Queryable, sourceVersionId: string): Promise<readonly WeightRow[]> {
  try {
    const result = await db.query<WeightRow>(
      `
      SELECT
        osw.option_id,
        osw.signal_id,
        osw.weight::text AS weight,
        osw.source_weight_key
      FROM option_signal_weights osw
      INNER JOIN options o ON o.id = osw.option_id
      WHERE o.assessment_version_id = $1
      ORDER BY osw.option_id ASC, osw.signal_id ASC, osw.id ASC
      `,
      [sourceVersionId],
    );

    return result.rows;
  } catch (error) {
    throw new DraftVersionCreationPersistenceError('load_weights', error);
  }
}

async function copyWeights(params: {
  db: Queryable;
  sourceVersionId: string;
  optionIdMap: ReadonlyMap<string, string>;
  signalIdMap: ReadonlyMap<string, string>;
}): Promise<number> {
  const sourceRows = await loadSourceWeights(params.db, params.sourceVersionId);

  for (const row of sourceRows) {
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
          params.optionIdMap.get(row.option_id) ?? '',
          params.signalIdMap.get(row.signal_id) ?? '',
          row.weight,
          row.source_weight_key,
        ],
      );
    } catch (error) {
      throw new DraftVersionCreationPersistenceError('insert_weights', error);
    }
  }

  return sourceRows.length;
}

async function copyVersionOwnedTable(params: {
  db: Queryable;
  sourceVersionId: string;
  draftVersionId: string;
  table: VersionOwnedTableCopy;
}): Promise<number> {
  try {
    const insertColumns = ['assessment_version_id', ...params.table.columns].join(', ');
    const selectColumns = ['$2::uuid', ...params.table.columns].join(', ');
    const orderBy = params.table.orderBy.join(', ');

    const result = await params.db.query<InsertedIdRow>(
      `
      INSERT INTO ${params.table.tableName} (
        ${insertColumns}
      )
      SELECT
        ${selectColumns}
      FROM ${params.table.tableName}
      WHERE assessment_version_id = $1
      ORDER BY ${orderBy}
      RETURNING id
      `,
      [params.sourceVersionId, params.draftVersionId],
    );

    return result.rows.length;
  } catch (error) {
    throw new DraftVersionCreationPersistenceError('copy_version_owned_table', error);
  }
}

export async function createDraftVersionFromLatestPublishedAssessmentRecords(params: {
  db: Queryable;
  assessmentKeyOrId: string;
}): Promise<DraftVersionCreationResult> {
  const assessment = await loadAssessment(params.db, params.assessmentKeyOrId);
  if (!assessment) {
    return {
      status: 'assessment_not_found',
      assessmentKeyOrId: params.assessmentKeyOrId,
    };
  }

  const existingDraft = await loadVersionByLifecycle(params.db, assessment.id, 'DRAFT');
  if (existingDraft) {
    return {
      status: 'draft_exists',
      assessmentId: assessment.id,
      assessmentKey: assessment.assessment_key,
      draftVersionId: existingDraft.id,
      draftVersionTag: existingDraft.version,
    };
  }

  const sourceVersion = await loadVersionByLifecycle(params.db, assessment.id, 'PUBLISHED');
  if (!sourceVersion) {
    return {
      status: 'published_source_not_found',
      assessmentId: assessment.id,
      assessmentKey: assessment.assessment_key,
    };
  }

  const draftVersionTag = getNextMajorAssessmentVersionTag(sourceVersion.version);
  const draftVersionId = await insertDraftVersion({
    db: params.db,
    sourceVersion,
    draftVersionTag,
  });

  const copied = createEmptyCopyCounts();
  const domainIdMap = await copyDomains({
    db: params.db,
    draftVersionId,
    sourceVersionId: sourceVersion.id,
  });
  copied.domains = domainIdMap.size;

  const signalIdMap = await copySignals({
    db: params.db,
    draftVersionId,
    sourceVersionId: sourceVersion.id,
    domainIdMap,
  });
  copied.signals = signalIdMap.size;

  const questionIdMap = await copyQuestions({
    db: params.db,
    draftVersionId,
    sourceVersionId: sourceVersion.id,
    domainIdMap,
  });
  copied.questions = questionIdMap.size;

  const optionIdMap = await copyOptions({
    db: params.db,
    draftVersionId,
    sourceVersionId: sourceVersion.id,
    questionIdMap,
  });
  copied.options = optionIdMap.size;

  copied.optionSignalWeights = await copyWeights({
    db: params.db,
    sourceVersionId: sourceVersion.id,
    optionIdMap,
    signalIdMap,
  });

  for (const table of VERSION_OWNED_TABLE_COPIES) {
    copied.languageRows += await copyVersionOwnedTable({
      db: params.db,
      sourceVersionId: sourceVersion.id,
      draftVersionId,
      table,
    });
  }

  return {
    status: 'created',
    assessmentId: assessment.id,
    assessmentKey: assessment.assessment_key,
    sourceVersionId: sourceVersion.id,
    sourceVersionTag: sourceVersion.version,
    draftVersionId,
    draftVersionTag,
    copied,
  };
}

export async function createDraftVersionFromLatestPublishedAssessment(
  assessmentKeyOrId: string,
  dependencies: { getDbPool(): DbPoolLike } = { getDbPool },
): Promise<DraftVersionCreationResult> {
  const client = await dependencies.getDbPool().connect();

  try {
    await client.query('BEGIN');

    const result = await createDraftVersionFromLatestPublishedAssessmentRecords({
      db: client,
      assessmentKeyOrId,
    });

    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    return persistenceResult(error);
  } finally {
    client.release();
  }
}
