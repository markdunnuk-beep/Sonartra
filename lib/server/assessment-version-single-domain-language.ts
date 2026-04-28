import type { Queryable } from '@/lib/engine/repository-sql';
import type { AssessmentVersionId } from '@/lib/engine/types';
import type { SingleDomainLanguageBundle } from '@/lib/server/assessment-version-single-domain-language-types';
import type {
  ApplicationStatementsRow,
  BalancingSectionsRow,
  DriverClaimsRow,
  DomainFramingRow,
  HeroPairsRow,
  PairSummariesRow,
  SignalChaptersRow,
  SingleDomainLanguageDatasetKey,
  SingleDomainLanguageDatasetRowMap,
} from '@/lib/types/single-domain-language';
import { isSingleDomain } from '@/lib/utils/assessment-mode';

type TransactionClient = Queryable & {
  release(): void;
};

type TransactionCapable = Queryable & {
  connect(): Promise<TransactionClient>;
};

type AssessmentModeRow = {
  assessment_mode: string | null;
};

export class SingleDomainLanguageModeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SingleDomainLanguageModeError';
  }
}

function requireTransactionCapable(db: Queryable | TransactionCapable): TransactionCapable {
  if (typeof (db as TransactionCapable).connect !== 'function') {
    throw new Error('SINGLE_DOMAIN_LANGUAGE_TRANSACTION_SUPPORT_REQUIRED');
  }

  return db as TransactionCapable;
}

function isMissingRelationError(error: unknown, tableName: string): boolean {
  return error instanceof Error
    && error.message.includes(tableName)
    && error.message.includes('does not exist');
}

function isMissingModeColumnError(error: unknown): boolean {
  return error instanceof Error
    && (
      error.message.includes('column av.mode does not exist')
      || error.message.includes('column a.mode does not exist')
      || error.message.includes('column "mode" does not exist')
    );
}

async function loadAssessmentVersionModeIfAvailable(
  db: Queryable,
  assessmentVersionId: AssessmentVersionId,
): Promise<string | null> {
  try {
    const result = await db.query<AssessmentModeRow>(
      `
      SELECT
        COALESCE(av.mode, a.mode) AS assessment_mode
      FROM assessment_versions av
      INNER JOIN assessments a ON a.id = av.assessment_id
      WHERE av.id = $1
      `,
      [assessmentVersionId],
    );

    return result.rows[0]?.assessment_mode ?? null;
  } catch (error) {
    if (isMissingModeColumnError(error)) {
      return null;
    }

    throw error;
  }
}

async function allowSingleDomainAccess(params: {
  db: Queryable;
  assessmentVersionId: AssessmentVersionId;
  action: 'read' | 'write';
}): Promise<boolean> {
  const mode = await loadAssessmentVersionModeIfAvailable(params.db, params.assessmentVersionId);

  if (mode === null || isSingleDomain(mode)) {
    return true;
  }

  if (params.action === 'read') {
    return false;
  }

  throw new SingleDomainLanguageModeError(
    `Single-domain language storage requires a single_domain assessment version. Received "${mode}".`,
  );
}

function freezeRows<TRow>(rows: readonly TRow[]): readonly TRow[] {
  return Object.freeze([...rows]);
}

function emptySingleDomainLanguageBundle(): SingleDomainLanguageBundle {
  return Object.freeze({
    DOMAIN_FRAMING: Object.freeze([]),
    HERO_PAIRS: Object.freeze([]),
    DRIVER_CLAIMS: Object.freeze([]),
    SIGNAL_CHAPTERS: Object.freeze([]),
    BALANCING_SECTIONS: Object.freeze([]),
    PAIR_SUMMARIES: Object.freeze([]),
    APPLICATION_STATEMENTS: Object.freeze([]),
  });
}

async function getDatasetRows<TRow>(params: {
  db: Queryable;
  assessmentVersionId: AssessmentVersionId;
  tableName: string;
  selectColumns: string;
  orderBy: string;
}): Promise<readonly TRow[]> {
  const allowed = await allowSingleDomainAccess({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    action: 'read',
  });

  if (!allowed) {
    return Object.freeze([]);
  }

  try {
    const result = await params.db.query<TRow>(
      `
      SELECT
        ${params.selectColumns}
      FROM ${params.tableName}
      WHERE assessment_version_id = $1
      ORDER BY ${params.orderBy}
      `,
      [params.assessmentVersionId],
    );

    return freezeRows(result.rows);
  } catch (error) {
    if (isMissingRelationError(error, params.tableName)) {
      return Object.freeze([]);
    }

    throw error;
  }
}

async function replaceDatasetRows<TKey extends SingleDomainLanguageDatasetKey>(params: {
  db: Queryable | TransactionCapable;
  assessmentVersionId: AssessmentVersionId;
  tableName: string;
  columns: readonly string[];
  rows: readonly SingleDomainLanguageDatasetRowMap[TKey][];
}): Promise<void> {
  await allowSingleDomainAccess({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    action: 'write',
  });

  const client = await requireTransactionCapable(params.db).connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `
      DELETE FROM ${params.tableName}
      WHERE assessment_version_id = $1
      `,
      [params.assessmentVersionId],
    );

    const insertColumns = ['assessment_version_id', ...params.columns];
    const placeholders = insertColumns.map((_, index) => `$${index + 1}`).join(', ');

    for (const row of params.rows) {
      await client.query(
        `
        INSERT INTO ${params.tableName} (
          ${insertColumns.join(', ')}
        )
        VALUES (${placeholders})
        `,
        [
          params.assessmentVersionId,
          ...params.columns.map((column) => row[column as keyof typeof row]),
        ],
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function getSingleDomainFramingRows(
  db: Queryable,
  assessmentVersionId: AssessmentVersionId,
): Promise<readonly DomainFramingRow[]> {
  return getDatasetRows<DomainFramingRow>({
    db,
    assessmentVersionId,
    tableName: 'assessment_version_single_domain_framing',
    selectColumns: `
      domain_key,
      section_title,
      intro_paragraph,
      meaning_paragraph,
      bridge_to_signals,
      blueprint_context_line
    `,
    orderBy: 'domain_key ASC',
  });
}

export async function getSingleDomainHeroPairRows(
  db: Queryable,
  assessmentVersionId: AssessmentVersionId,
): Promise<readonly HeroPairsRow[]> {
  return getDatasetRows<HeroPairsRow>({
    db,
    assessmentVersionId,
    tableName: 'assessment_version_single_domain_hero_pairs',
    selectColumns: `
      pair_key,
      hero_headline,
      hero_subheadline,
      hero_opening,
      hero_strength_paragraph,
      hero_tension_paragraph,
      hero_close_paragraph
    `,
    orderBy: 'pair_key ASC',
  });
}

export async function getSingleDomainDriverClaimRows(
  db: Queryable,
  assessmentVersionId: AssessmentVersionId,
): Promise<readonly DriverClaimsRow[]> {
  return getDatasetRows<DriverClaimsRow>({
    db,
    assessmentVersionId,
    tableName: 'assessment_version_single_domain_driver_claims',
    selectColumns: `
      domain_key,
      pair_key,
      signal_key,
      driver_role,
      claim_type,
      claim_text,
      materiality,
      priority
    `,
    orderBy: 'domain_key ASC, pair_key ASC, driver_role ASC, priority ASC, signal_key ASC',
  });
}

export async function getSingleDomainSignalChapterRows(
  db: Queryable,
  assessmentVersionId: AssessmentVersionId,
): Promise<readonly SignalChaptersRow[]> {
  return getDatasetRows<SignalChaptersRow>({
    db,
    assessmentVersionId,
    tableName: 'assessment_version_single_domain_signal_chapters',
    selectColumns: `
      signal_key,
      position_primary_label,
      position_secondary_label,
      position_supporting_label,
      position_underplayed_label,
      chapter_intro_primary,
      chapter_intro_secondary,
      chapter_intro_supporting,
      chapter_intro_underplayed,
      chapter_how_it_shows_up,
      chapter_value_outcome,
      chapter_value_team_effect,
      chapter_risk_behaviour,
      chapter_risk_impact,
      chapter_development
    `,
    orderBy: 'signal_key ASC',
  });
}

export async function getSingleDomainBalancingSectionRows(
  db: Queryable,
  assessmentVersionId: AssessmentVersionId,
): Promise<readonly BalancingSectionsRow[]> {
  return getDatasetRows<BalancingSectionsRow>({
    db,
    assessmentVersionId,
    tableName: 'assessment_version_single_domain_balancing_sections',
    selectColumns: `
      pair_key,
      balancing_section_title,
      current_pattern_paragraph,
      practical_meaning_paragraph,
      system_risk_paragraph,
      rebalance_intro,
      rebalance_action_1,
      rebalance_action_2,
      rebalance_action_3
    `,
    orderBy: 'pair_key ASC',
  });
}

export async function getSingleDomainPairSummaryRows(
  db: Queryable,
  assessmentVersionId: AssessmentVersionId,
): Promise<readonly PairSummariesRow[]> {
  return getDatasetRows<PairSummariesRow>({
    db,
    assessmentVersionId,
    tableName: 'assessment_version_single_domain_pair_summaries',
    selectColumns: `
      pair_key,
      pair_section_title,
      pair_headline,
      pair_opening_paragraph,
      pair_strength_paragraph,
      pair_tension_paragraph,
      pair_close_paragraph
    `,
    orderBy: 'pair_key ASC',
  });
}

export async function getSingleDomainApplicationStatementRows(
  db: Queryable,
  assessmentVersionId: AssessmentVersionId,
): Promise<readonly ApplicationStatementsRow[]> {
  return getDatasetRows<ApplicationStatementsRow>({
    db,
    assessmentVersionId,
    tableName: 'assessment_version_single_domain_application_statements',
    selectColumns: `
      signal_key,
      strength_statement_1,
      strength_statement_2,
      watchout_statement_1,
      watchout_statement_2,
      development_statement_1,
      development_statement_2
    `,
    orderBy: 'signal_key ASC',
  });
}

export async function getSingleDomainLanguageBundle(
  db: Queryable,
  assessmentVersionId: AssessmentVersionId,
  options?: {
    includeSignalChapters?: boolean;
  },
): Promise<SingleDomainLanguageBundle> {
  const allowed = await allowSingleDomainAccess({
    db,
    assessmentVersionId,
    action: 'read',
  });

  if (!allowed) {
    return emptySingleDomainLanguageBundle();
  }

  const [
    DOMAIN_FRAMING,
    HERO_PAIRS,
    DRIVER_CLAIMS,
    SIGNAL_CHAPTERS,
    BALANCING_SECTIONS,
    PAIR_SUMMARIES,
    APPLICATION_STATEMENTS,
  ] = await Promise.all([
    getSingleDomainFramingRows(db, assessmentVersionId),
    getSingleDomainHeroPairRows(db, assessmentVersionId),
    getSingleDomainDriverClaimRows(db, assessmentVersionId),
    options?.includeSignalChapters === false
      ? Promise.resolve(Object.freeze([]) as readonly SignalChaptersRow[])
      : getSingleDomainSignalChapterRows(db, assessmentVersionId),
    getSingleDomainBalancingSectionRows(db, assessmentVersionId),
    getSingleDomainPairSummaryRows(db, assessmentVersionId),
    getSingleDomainApplicationStatementRows(db, assessmentVersionId),
  ]);

  return Object.freeze({
    DOMAIN_FRAMING,
    HERO_PAIRS,
    DRIVER_CLAIMS,
    SIGNAL_CHAPTERS,
    BALANCING_SECTIONS,
    PAIR_SUMMARIES,
    APPLICATION_STATEMENTS,
  });
}

export async function replaceSingleDomainFramingRows(
  db: Queryable | TransactionCapable,
  params: {
    assessmentVersionId: AssessmentVersionId;
    rows: readonly DomainFramingRow[];
  },
): Promise<void> {
  await replaceDatasetRows({
    db,
    assessmentVersionId: params.assessmentVersionId,
    tableName: 'assessment_version_single_domain_framing',
    columns: [
      'domain_key',
      'section_title',
      'intro_paragraph',
      'meaning_paragraph',
      'bridge_to_signals',
      'blueprint_context_line',
    ],
    rows: params.rows,
  });
}

export async function replaceSingleDomainHeroPairRows(
  db: Queryable | TransactionCapable,
  params: {
    assessmentVersionId: AssessmentVersionId;
    rows: readonly HeroPairsRow[];
  },
): Promise<void> {
  await replaceDatasetRows({
    db,
    assessmentVersionId: params.assessmentVersionId,
    tableName: 'assessment_version_single_domain_hero_pairs',
    columns: [
      'pair_key',
      'hero_headline',
      'hero_subheadline',
      'hero_opening',
      'hero_strength_paragraph',
      'hero_tension_paragraph',
      'hero_close_paragraph',
    ],
    rows: params.rows,
  });
}

export async function replaceSingleDomainDriverClaimRows(
  db: Queryable | TransactionCapable,
  params: {
    assessmentVersionId: AssessmentVersionId;
    rows: readonly DriverClaimsRow[];
  },
): Promise<void> {
  await replaceDatasetRows({
    db,
    assessmentVersionId: params.assessmentVersionId,
    tableName: 'assessment_version_single_domain_driver_claims',
    columns: [
      'domain_key',
      'pair_key',
      'signal_key',
      'driver_role',
      'claim_type',
      'claim_text',
      'materiality',
      'priority',
    ],
    rows: params.rows,
  });
}

export async function replaceSingleDomainSignalChapterRows(
  db: Queryable | TransactionCapable,
  params: {
    assessmentVersionId: AssessmentVersionId;
    rows: readonly SignalChaptersRow[];
  },
): Promise<void> {
  await replaceDatasetRows({
    db,
    assessmentVersionId: params.assessmentVersionId,
    tableName: 'assessment_version_single_domain_signal_chapters',
    columns: [
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
    ],
    rows: params.rows,
  });
}

export async function replaceSingleDomainBalancingSectionRows(
  db: Queryable | TransactionCapable,
  params: {
    assessmentVersionId: AssessmentVersionId;
    rows: readonly BalancingSectionsRow[];
  },
): Promise<void> {
  await replaceDatasetRows({
    db,
    assessmentVersionId: params.assessmentVersionId,
    tableName: 'assessment_version_single_domain_balancing_sections',
    columns: [
      'pair_key',
      'balancing_section_title',
      'current_pattern_paragraph',
      'practical_meaning_paragraph',
      'system_risk_paragraph',
      'rebalance_intro',
      'rebalance_action_1',
      'rebalance_action_2',
      'rebalance_action_3',
    ],
    rows: params.rows,
  });
}

export async function replaceSingleDomainPairSummaryRows(
  db: Queryable | TransactionCapable,
  params: {
    assessmentVersionId: AssessmentVersionId;
    rows: readonly PairSummariesRow[];
  },
): Promise<void> {
  await replaceDatasetRows({
    db,
    assessmentVersionId: params.assessmentVersionId,
    tableName: 'assessment_version_single_domain_pair_summaries',
    columns: [
      'pair_key',
      'pair_section_title',
      'pair_headline',
      'pair_opening_paragraph',
      'pair_strength_paragraph',
      'pair_tension_paragraph',
      'pair_close_paragraph',
    ],
    rows: params.rows,
  });
}

export async function replaceSingleDomainApplicationStatementRows(
  db: Queryable | TransactionCapable,
  params: {
    assessmentVersionId: AssessmentVersionId;
    rows: readonly ApplicationStatementsRow[];
  },
): Promise<void> {
  await replaceDatasetRows({
    db,
    assessmentVersionId: params.assessmentVersionId,
    tableName: 'assessment_version_single_domain_application_statements',
    columns: [
      'signal_key',
      'strength_statement_1',
      'strength_statement_2',
      'watchout_statement_1',
      'watchout_statement_2',
      'development_statement_1',
      'development_statement_2',
    ],
    rows: params.rows,
  });
}

export async function saveSingleDomainLanguageDataset<TKey extends SingleDomainLanguageDatasetKey>(
  db: Queryable | TransactionCapable,
  params: {
    assessmentVersionId: AssessmentVersionId;
    datasetKey: TKey;
    rows: readonly SingleDomainLanguageDatasetRowMap[TKey][];
  },
): Promise<void> {
  switch (params.datasetKey) {
    case 'DOMAIN_FRAMING':
      return replaceSingleDomainFramingRows(db, params as {
        assessmentVersionId: AssessmentVersionId;
        rows: readonly DomainFramingRow[];
      });
    case 'HERO_PAIRS':
      return replaceSingleDomainHeroPairRows(db, params as {
        assessmentVersionId: AssessmentVersionId;
        rows: readonly HeroPairsRow[];
      });
    case 'DRIVER_CLAIMS':
      return replaceSingleDomainDriverClaimRows(db, params as {
        assessmentVersionId: AssessmentVersionId;
        rows: readonly DriverClaimsRow[];
      });
    case 'SIGNAL_CHAPTERS':
      return replaceSingleDomainSignalChapterRows(db, params as {
        assessmentVersionId: AssessmentVersionId;
        rows: readonly SignalChaptersRow[];
      });
    case 'BALANCING_SECTIONS':
      return replaceSingleDomainBalancingSectionRows(db, params as {
        assessmentVersionId: AssessmentVersionId;
        rows: readonly BalancingSectionsRow[];
      });
    case 'PAIR_SUMMARIES':
      return replaceSingleDomainPairSummaryRows(db, params as {
        assessmentVersionId: AssessmentVersionId;
        rows: readonly PairSummariesRow[];
      });
    case 'APPLICATION_STATEMENTS':
      return replaceSingleDomainApplicationStatementRows(db, params as {
        assessmentVersionId: AssessmentVersionId;
        rows: readonly ApplicationStatementsRow[];
      });
  }
}
