import type { AssessmentVersionId, HeroProfileDomainKey, HeroRuleOperator, HeroTraitKey } from '@/lib/engine/types';
import type { Queryable } from '@/lib/engine/repository-sql';

type TransactionClient = Queryable & {
  release(): void;
};

type TransactionCapable = Queryable & {
  connect(): Promise<TransactionClient>;
};

type PairTraitWeightDbRow = {
  id: string;
  assessment_version_id: string;
  profile_domain_key: HeroProfileDomainKey;
  pair_key: string;
  trait_key: HeroTraitKey;
  weight: number;
  order_index: number;
  created_at: string;
  updated_at: string;
};

type HeroPatternRuleDbRow = {
  id: string;
  assessment_version_id: string;
  pattern_key: string;
  priority: number;
  rule_type: 'condition' | 'exclusion';
  trait_key: HeroTraitKey;
  operator: HeroRuleOperator;
  threshold_value: number;
  order_index: number;
  created_at: string;
  updated_at: string;
};

type HeroPatternLanguageDbRow = {
  id: string;
  assessment_version_id: string;
  pattern_key: string;
  headline: string;
  subheadline: string | null;
  summary: string | null;
  narrative: string | null;
  pressure_overlay: string | null;
  environment_overlay: string | null;
  created_at: string;
  updated_at: string;
};

export type AssessmentVersionPairTraitWeightRow = {
  id: string;
  assessmentVersionId: AssessmentVersionId;
  profileDomainKey: HeroProfileDomainKey;
  pairKey: string;
  traitKey: HeroTraitKey;
  weight: number;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
};

export type AssessmentVersionHeroPatternRuleRow = {
  id: string;
  assessmentVersionId: AssessmentVersionId;
  patternKey: string;
  priority: number;
  ruleType: 'condition' | 'exclusion';
  traitKey: HeroTraitKey;
  operator: HeroRuleOperator;
  thresholdValue: number;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
};

export type AssessmentVersionHeroPatternLanguageRow = {
  id: string;
  assessmentVersionId: AssessmentVersionId;
  patternKey: string;
  headline: string;
  subheadline: string | null;
  summary: string | null;
  narrative: string | null;
  pressureOverlay: string | null;
  environmentOverlay: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AssessmentVersionPairTraitWeightInput = Omit<AssessmentVersionPairTraitWeightRow, 'id' | 'assessmentVersionId' | 'createdAt' | 'updatedAt'>;
export type AssessmentVersionHeroPatternRuleInput = Omit<AssessmentVersionHeroPatternRuleRow, 'id' | 'assessmentVersionId' | 'createdAt' | 'updatedAt'>;
export type AssessmentVersionHeroPatternLanguageInput = Omit<AssessmentVersionHeroPatternLanguageRow, 'id' | 'assessmentVersionId' | 'createdAt' | 'updatedAt'>;

function requireTransactionCapable(db: Queryable | TransactionCapable): TransactionCapable {
  if (typeof (db as TransactionCapable).connect !== 'function') {
    throw new Error('HERO_REPOSITORY_TRANSACTION_SUPPORT_REQUIRED');
  }

  return db as TransactionCapable;
}

function mapPairTraitWeightRow(row: PairTraitWeightDbRow): AssessmentVersionPairTraitWeightRow {
  return {
    id: row.id,
    assessmentVersionId: row.assessment_version_id,
    profileDomainKey: row.profile_domain_key,
    pairKey: row.pair_key,
    traitKey: row.trait_key,
    weight: Number(row.weight),
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapHeroPatternRuleRow(row: HeroPatternRuleDbRow): AssessmentVersionHeroPatternRuleRow {
  return {
    id: row.id,
    assessmentVersionId: row.assessment_version_id,
    patternKey: row.pattern_key,
    priority: Number(row.priority),
    ruleType: row.rule_type,
    traitKey: row.trait_key,
    operator: row.operator,
    thresholdValue: Number(row.threshold_value),
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapHeroPatternLanguageRow(row: HeroPatternLanguageDbRow): AssessmentVersionHeroPatternLanguageRow {
  return {
    id: row.id,
    assessmentVersionId: row.assessment_version_id,
    patternKey: row.pattern_key,
    headline: row.headline,
    subheadline: row.subheadline,
    summary: row.summary,
    narrative: row.narrative,
    pressureOverlay: row.pressure_overlay,
    environmentOverlay: row.environment_overlay,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAssessmentVersionPairTraitWeights(
  db: Queryable,
  assessmentVersionId: AssessmentVersionId,
): Promise<readonly AssessmentVersionPairTraitWeightRow[]> {
  const result = await db.query<PairTraitWeightDbRow>(
    `
    SELECT
      id,
      assessment_version_id,
      profile_domain_key,
      pair_key,
      trait_key,
      weight,
      order_index,
      created_at,
      updated_at
    FROM assessment_version_pair_trait_weights
    WHERE assessment_version_id = $1
    ORDER BY profile_domain_key ASC, pair_key ASC, order_index ASC, id ASC
    `,
    [assessmentVersionId],
  );

  return Object.freeze(result.rows.map(mapPairTraitWeightRow));
}

export async function getAssessmentVersionHeroPatternRules(
  db: Queryable,
  assessmentVersionId: AssessmentVersionId,
): Promise<readonly AssessmentVersionHeroPatternRuleRow[]> {
  const result = await db.query<HeroPatternRuleDbRow>(
    `
    SELECT
      id,
      assessment_version_id,
      pattern_key,
      priority,
      rule_type,
      trait_key,
      operator,
      threshold_value,
      order_index,
      created_at,
      updated_at
    FROM assessment_version_hero_pattern_rules
    WHERE assessment_version_id = $1
    ORDER BY priority ASC, pattern_key ASC, rule_type ASC, order_index ASC, id ASC
    `,
    [assessmentVersionId],
  );

  return Object.freeze(result.rows.map(mapHeroPatternRuleRow));
}

export async function getAssessmentVersionHeroPatternLanguage(
  db: Queryable,
  assessmentVersionId: AssessmentVersionId,
): Promise<readonly AssessmentVersionHeroPatternLanguageRow[]> {
  const result = await db.query<HeroPatternLanguageDbRow>(
    `
    SELECT
      id,
      assessment_version_id,
      pattern_key,
      headline,
      subheadline,
      summary,
      narrative,
      pressure_overlay,
      environment_overlay,
      created_at,
      updated_at
    FROM assessment_version_hero_pattern_language
    WHERE assessment_version_id = $1
    ORDER BY pattern_key ASC, id ASC
    `,
    [assessmentVersionId],
  );

  return Object.freeze(result.rows.map(mapHeroPatternLanguageRow));
}

async function replaceDataset<TInput>(params: {
  db: Queryable | TransactionCapable;
  assessmentVersionId: AssessmentVersionId;
  deleteSql: string;
  insertSql: string;
  inputs: readonly TInput[];
  toInsertParams: (input: TInput) => unknown[];
}): Promise<void> {
  const client = await requireTransactionCapable(params.db).connect();

  try {
    await client.query('BEGIN');
    await client.query(params.deleteSql, [params.assessmentVersionId]);

    for (const input of params.inputs) {
      await client.query(params.insertSql, params.toInsertParams(input));
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function replaceAssessmentVersionPairTraitWeights(
  db: Queryable | TransactionCapable,
  params: {
    assessmentVersionId: AssessmentVersionId;
    inputs: readonly AssessmentVersionPairTraitWeightInput[];
  },
): Promise<void> {
  await replaceDataset({
    db,
    assessmentVersionId: params.assessmentVersionId,
    deleteSql: `
      DELETE FROM assessment_version_pair_trait_weights
      WHERE assessment_version_id = $1
    `,
    insertSql: `
      INSERT INTO assessment_version_pair_trait_weights (
        assessment_version_id,
        profile_domain_key,
        pair_key,
        trait_key,
        weight,
        order_index
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    inputs: params.inputs,
    toInsertParams: (input) => [
      params.assessmentVersionId,
      input.profileDomainKey,
      input.pairKey,
      input.traitKey,
      input.weight,
      input.orderIndex,
    ],
  });
}

export async function replaceAssessmentVersionHeroPatternRules(
  db: Queryable | TransactionCapable,
  params: {
    assessmentVersionId: AssessmentVersionId;
    inputs: readonly AssessmentVersionHeroPatternRuleInput[];
  },
): Promise<void> {
  await replaceDataset({
    db,
    assessmentVersionId: params.assessmentVersionId,
    deleteSql: `
      DELETE FROM assessment_version_hero_pattern_rules
      WHERE assessment_version_id = $1
    `,
    insertSql: `
      INSERT INTO assessment_version_hero_pattern_rules (
        assessment_version_id,
        pattern_key,
        priority,
        rule_type,
        trait_key,
        operator,
        threshold_value,
        order_index
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    inputs: params.inputs,
    toInsertParams: (input) => [
      params.assessmentVersionId,
      input.patternKey,
      input.priority,
      input.ruleType,
      input.traitKey,
      input.operator,
      input.thresholdValue,
      input.orderIndex,
    ],
  });
}

export async function replaceAssessmentVersionHeroPatternLanguage(
  db: Queryable | TransactionCapable,
  params: {
    assessmentVersionId: AssessmentVersionId;
    inputs: readonly AssessmentVersionHeroPatternLanguageInput[];
  },
): Promise<void> {
  await replaceDataset({
    db,
    assessmentVersionId: params.assessmentVersionId,
    deleteSql: `
      DELETE FROM assessment_version_hero_pattern_language
      WHERE assessment_version_id = $1
    `,
    insertSql: `
      INSERT INTO assessment_version_hero_pattern_language (
        assessment_version_id,
        pattern_key,
        headline,
        subheadline,
        summary,
        narrative,
        pressure_overlay,
        environment_overlay
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    inputs: params.inputs,
    toInsertParams: (input) => [
      params.assessmentVersionId,
      input.patternKey,
      input.headline,
      input.subheadline,
      input.summary,
      input.narrative,
      input.pressureOverlay,
      input.environmentOverlay,
    ],
  });
}
