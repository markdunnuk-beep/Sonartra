import type { AssessmentVersionId } from '@/lib/engine/types';

export type Queryable = {
  query<T>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
};

export type AssessmentRow = {
  id: string;
  assessment_key: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type AssessmentVersionRow = {
  id: string;
  assessment_id: string;
  version: string;
  lifecycle_status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DomainRow = {
  id: string;
  assessment_version_id: string;
  domain_key: string;
  label: string;
  description: string | null;
  domain_type: 'QUESTION_SECTION' | 'SIGNAL_GROUP';
  order_index: number;
  created_at: string;
  updated_at: string;
};

export type SignalRow = {
  id: string;
  assessment_version_id: string;
  domain_id: string;
  signal_key: string;
  label: string;
  description: string | null;
  order_index: number;
  is_overlay: boolean;
  created_at: string;
  updated_at: string;
};

export type QuestionRow = {
  id: string;
  assessment_version_id: string;
  domain_id: string;
  question_key: string;
  prompt: string;
  order_index: number;
  created_at: string;
  updated_at: string;
};

export type OptionRow = {
  id: string;
  assessment_version_id: string;
  question_id: string;
  option_key: string;
  option_label: string | null;
  option_text: string;
  order_index: number;
  created_at: string;
  updated_at: string;
};

export type OptionSignalWeightRow = {
  id: string;
  option_id: string;
  signal_id: string;
  weight: string | number;
  source_weight_key: string | null;
  created_at: string;
  updated_at: string;
};

export type AssessmentIntroRow = {
  assessment_version_id: string;
  intro_title: string;
  intro_summary: string;
  intro_how_it_works: string;
  estimated_time_override: string | null;
  instructions: string | null;
  confidentiality_note: string | null;
};

export type PairTraitWeightRow = {
  id: string;
  assessment_version_id: string;
  profile_domain_key: string;
  pair_key: string;
  trait_key: string;
  weight: number;
  order_index: number;
  created_at: string;
  updated_at: string;
};

export type HeroPatternRuleRow = {
  id: string;
  assessment_version_id: string;
  pattern_key: string;
  priority: number;
  rule_type: 'condition' | 'exclusion';
  trait_key: string;
  operator: string;
  threshold_value: number;
  order_index: number;
  created_at: string;
  updated_at: string;
};

export type HeroPatternLanguageRow = {
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

export type DefinitionGraphRows = {
  assessment: AssessmentRow;
  version: AssessmentVersionRow;
  assessmentIntro: AssessmentIntroRow | null;
  pairTraitWeights: PairTraitWeightRow[];
  heroPatternRules: HeroPatternRuleRow[];
  heroPatternLanguage: HeroPatternLanguageRow[];
  domains: DomainRow[];
  signals: SignalRow[];
  questions: QuestionRow[];
  options: OptionRow[];
  optionSignalWeights: OptionSignalWeightRow[];
};

export async function getAssessmentByKey(db: Queryable, assessmentKey: string): Promise<AssessmentRow | null> {
  const result = await db.query<AssessmentRow>(
    `
    SELECT
      id,
      assessment_key,
      title,
      description,
      created_at,
      updated_at
    FROM assessments
    WHERE assessment_key = $1
    `,
    [assessmentKey],
  );

  return result.rows[0] ?? null;
}

export async function getPublishedVersionForAssessment(
  db: Queryable,
  assessmentId: string,
): Promise<AssessmentVersionRow | null> {
  const result = await db.query<AssessmentVersionRow>(
    `
    SELECT
      id,
      assessment_id,
      version,
      lifecycle_status,
      published_at,
      created_at,
      updated_at
    FROM assessment_versions
    WHERE assessment_id = $1
      AND lifecycle_status = 'PUBLISHED'
    `,
    [assessmentId],
  );

  return result.rows[0] ?? null;
}

export async function getVersionById(
  db: Queryable,
  assessmentVersionId: AssessmentVersionId,
): Promise<AssessmentVersionRow | null> {
  const result = await db.query<AssessmentVersionRow>(
    `
    SELECT
      id,
      assessment_id,
      version,
      lifecycle_status,
      published_at,
      created_at,
      updated_at
    FROM assessment_versions
    WHERE id = $1
    `,
    [assessmentVersionId],
  );

  return result.rows[0] ?? null;
}

export async function getVersionByAssessmentKeyAndVersion(
  db: Queryable,
  assessmentKey: string,
  version: string,
): Promise<AssessmentVersionRow | null> {
  const result = await db.query<AssessmentVersionRow>(
    `
    SELECT
      av.id,
      av.assessment_id,
      av.version,
      av.lifecycle_status,
      av.published_at,
      av.created_at,
      av.updated_at
    FROM assessment_versions av
    INNER JOIN assessments a ON a.id = av.assessment_id
    WHERE a.assessment_key = $1
      AND av.version = $2
    `,
    [assessmentKey, version],
  );

  return result.rows[0] ?? null;
}

export async function loadDefinitionGraphByVersionId(
  db: Queryable,
  assessmentVersionId: AssessmentVersionId,
): Promise<DefinitionGraphRows | null> {
  const meta = await db.query<{ a: AssessmentRow; v: AssessmentVersionRow }>(
    `
    SELECT
      row_to_json(a.*) AS a,
      row_to_json(av.*) AS v
    FROM assessment_versions av
    INNER JOIN assessments a ON a.id = av.assessment_id
    WHERE av.id = $1
    `,
    [assessmentVersionId],
  );

  const metadata = meta.rows[0];
  if (!metadata) {
    return null;
  }

  const [assessmentIntro, pairTraitWeights, heroPatternRules, heroPatternLanguage, domains, signals, questions, options, optionSignalWeights] = await Promise.all([
    db.query<AssessmentIntroRow>(
      `
      SELECT
        assessment_version_id,
        intro_title,
        intro_summary,
        intro_how_it_works,
        estimated_time_override,
        instructions,
        confidentiality_note
      FROM assessment_version_intro
      WHERE assessment_version_id = $1
      `,
      [assessmentVersionId],
    ),
    db.query<PairTraitWeightRow>(
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
    ),
    db.query<HeroPatternRuleRow>(
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
    ),
    db.query<HeroPatternLanguageRow>(
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
    ),
    db.query<DomainRow>(
      `
      SELECT
        id,
        assessment_version_id,
        domain_key,
        label,
        description,
        domain_type,
        order_index,
        created_at,
        updated_at
      FROM domains
      WHERE assessment_version_id = $1
      ORDER BY order_index ASC, id ASC
      `,
      [assessmentVersionId],
    ),
    db.query<SignalRow>(
      `
      SELECT
        id,
        assessment_version_id,
        domain_id,
        signal_key,
        label,
        description,
        order_index,
        is_overlay,
        created_at,
        updated_at
      FROM signals
      WHERE assessment_version_id = $1
      ORDER BY order_index ASC, id ASC
      `,
      [assessmentVersionId],
    ),
    db.query<QuestionRow>(
      `
      SELECT
        id,
        assessment_version_id,
        domain_id,
        question_key,
        prompt,
        order_index,
        created_at,
        updated_at
      FROM questions
      WHERE assessment_version_id = $1
      ORDER BY order_index ASC, id ASC
      `,
      [assessmentVersionId],
    ),
    db.query<OptionRow>(
      `
      SELECT
        o.id,
        q.assessment_version_id,
        o.question_id,
        o.option_key,
        o.option_label,
        o.option_text,
        o.order_index,
        o.created_at,
        o.updated_at
      FROM options o
      INNER JOIN questions q ON q.id = o.question_id
      WHERE q.assessment_version_id = $1
      ORDER BY q.order_index ASC, o.order_index ASC, o.id ASC
      `,
      [assessmentVersionId],
    ),
    db.query<OptionSignalWeightRow>(
      `
      SELECT
        osw.id,
        osw.option_id,
        osw.signal_id,
        osw.weight,
        osw.source_weight_key,
        osw.created_at,
        osw.updated_at
      FROM option_signal_weights osw
      INNER JOIN options o ON o.id = osw.option_id
      INNER JOIN questions q ON q.id = o.question_id
      WHERE q.assessment_version_id = $1
      ORDER BY osw.id ASC
      `,
      [assessmentVersionId],
    ),
  ]);

  return {
    assessment: metadata.a,
    version: metadata.v,
    assessmentIntro: assessmentIntro.rows[0] ?? null,
    pairTraitWeights: pairTraitWeights.rows,
    heroPatternRules: heroPatternRules.rows,
    heroPatternLanguage: heroPatternLanguage.rows,
    domains: domains.rows,
    signals: signals.rows,
    questions: questions.rows,
    options: options.rows,
    optionSignalWeights: optionSignalWeights.rows,
  };
}
