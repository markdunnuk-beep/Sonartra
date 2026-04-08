import type { Queryable } from '@/lib/engine/repository-sql';
import type { AssessmentVersionId } from '@/lib/engine/types';
import type {
  AssessmentVersionApplicationActionPromptsInput,
  AssessmentVersionApplicationActionPromptsRow,
  AssessmentVersionApplicationContributionInput,
  AssessmentVersionApplicationContributionRow,
  AssessmentVersionApplicationDevelopmentInput,
  AssessmentVersionApplicationDevelopmentRow,
  AssessmentVersionApplicationLanguageBundle,
  AssessmentVersionApplicationRiskInput,
  AssessmentVersionApplicationRiskRow,
  AssessmentVersionApplicationThesisInput,
  AssessmentVersionApplicationThesisRow,
} from '@/lib/server/assessment-version-application-language-types';

function emptyApplicationLanguageBundle(): AssessmentVersionApplicationLanguageBundle {
  return Object.freeze({
    thesis: Object.freeze([]),
    contribution: Object.freeze([]),
    risk: Object.freeze([]),
    development: Object.freeze([]),
    prompts: Object.freeze([]),
  });
}

function isMissingRelationError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('does not exist');
}

type ApplicationThesisDbRow = {
  id: string;
  assessment_version_id: string;
  hero_pattern_key: string;
  headline: string;
  summary: string;
  created_at: string;
  updated_at: string;
};

type ApplicationContributionDbRow = {
  id: string;
  assessment_version_id: string;
  source_type: 'pair' | 'signal';
  source_key: string;
  priority: number;
  label: string;
  narrative: string;
  best_when: string;
  watch_for: string | null;
  created_at: string;
  updated_at: string;
};

type ApplicationRiskDbRow = {
  id: string;
  assessment_version_id: string;
  source_type: 'pair' | 'signal';
  source_key: string;
  priority: number;
  label: string;
  narrative: string;
  impact: string;
  early_warning: string | null;
  created_at: string;
  updated_at: string;
};

type ApplicationDevelopmentDbRow = {
  id: string;
  assessment_version_id: string;
  source_type: 'pair' | 'signal';
  source_key: string;
  priority: number;
  label: string;
  narrative: string;
  practice: string;
  success_marker: string | null;
  created_at: string;
  updated_at: string;
};

type ApplicationActionPromptsDbRow = {
  id: string;
  assessment_version_id: string;
  source_type: 'hero_pattern';
  source_key: string;
  keep_doing: string;
  watch_for: string;
  practice_next: string;
  ask_others: string;
  created_at: string;
  updated_at: string;
};

function mapThesisRow(row: ApplicationThesisDbRow): AssessmentVersionApplicationThesisRow {
  return {
    id: row.id,
    assessmentVersionId: row.assessment_version_id,
    heroPatternKey: row.hero_pattern_key,
    headline: row.headline,
    summary: row.summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapContributionRow(row: ApplicationContributionDbRow): AssessmentVersionApplicationContributionRow {
  return {
    id: row.id,
    assessmentVersionId: row.assessment_version_id,
    sourceType: row.source_type,
    sourceKey: row.source_key,
    priority: row.priority,
    label: row.label,
    narrative: row.narrative,
    bestWhen: row.best_when,
    watchFor: row.watch_for,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRiskRow(row: ApplicationRiskDbRow): AssessmentVersionApplicationRiskRow {
  return {
    id: row.id,
    assessmentVersionId: row.assessment_version_id,
    sourceType: row.source_type,
    sourceKey: row.source_key,
    priority: row.priority,
    label: row.label,
    narrative: row.narrative,
    impact: row.impact,
    earlyWarning: row.early_warning,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDevelopmentRow(row: ApplicationDevelopmentDbRow): AssessmentVersionApplicationDevelopmentRow {
  return {
    id: row.id,
    assessmentVersionId: row.assessment_version_id,
    sourceType: row.source_type,
    sourceKey: row.source_key,
    priority: row.priority,
    label: row.label,
    narrative: row.narrative,
    practice: row.practice,
    successMarker: row.success_marker,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapActionPromptsRow(row: ApplicationActionPromptsDbRow): AssessmentVersionApplicationActionPromptsRow {
  return {
    id: row.id,
    assessmentVersionId: row.assessment_version_id,
    sourceType: row.source_type,
    sourceKey: row.source_key,
    keepDoing: row.keep_doing,
    watchFor: row.watch_for,
    practiceNext: row.practice_next,
    askOthers: row.ask_others,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type TransactionClient = Queryable & {
  release(): void;
};

type TransactionCapable = Queryable & {
  connect(): Promise<TransactionClient>;
};

function requireTransactionCapable(db: Queryable | TransactionCapable): TransactionCapable {
  if (typeof (db as TransactionCapable).connect !== 'function') {
    throw new Error('APPLICATION_LANGUAGE_TRANSACTION_SUPPORT_REQUIRED');
  }

  return db as TransactionCapable;
}

function trimRequired(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${field} is required.`);
  }

  return trimmed;
}

function trimOptional(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function assertValidPairOrSignalSourceType(
  value: string,
  field: string,
): asserts value is 'pair' | 'signal' {
  if (value !== 'pair' && value !== 'signal') {
    throw new Error(`${field} must be pair or signal.`);
  }
}

function assertValidHeroPatternSourceType(value: string, field: string): asserts value is 'hero_pattern' {
  if (value !== 'hero_pattern') {
    throw new Error(`${field} must be hero_pattern.`);
  }
}

function normalizeThesisInputs(
  rows: readonly AssessmentVersionApplicationThesisInput[],
): readonly AssessmentVersionApplicationThesisInput[] {
  const duplicateKeys = new Set<string>();
  const normalized = rows.map((row) => ({
    heroPatternKey: trimRequired(row.heroPatternKey, 'hero_pattern_key'),
    headline: trimRequired(row.headline, 'headline'),
    summary: trimRequired(row.summary, 'summary'),
  })).sort((left, right) => left.heroPatternKey.localeCompare(right.heroPatternKey));

  for (const row of normalized) {
    if (duplicateKeys.has(row.heroPatternKey)) {
      throw new Error(`Duplicate hero_pattern_key row detected for ${row.heroPatternKey}.`);
    }

    duplicateKeys.add(row.heroPatternKey);
  }

  return Object.freeze(normalized);
}

function normalizeContributionInputs(
  rows: readonly AssessmentVersionApplicationContributionInput[],
): readonly AssessmentVersionApplicationContributionInput[] {
  const duplicateKeys = new Set<string>();
  const normalized = rows.map((row) => {
    assertValidPairOrSignalSourceType(row.sourceType, 'source_type');
    return {
      sourceType: row.sourceType,
      sourceKey: trimRequired(row.sourceKey, 'source_key'),
      priority: Number.parseInt(String(row.priority), 10),
      label: trimRequired(row.label, 'label'),
      narrative: trimRequired(row.narrative, 'narrative'),
      bestWhen: trimRequired(row.bestWhen, 'best_when'),
      watchFor: trimOptional(row.watchFor),
    };
  }).sort((left, right) =>
    left.sourceType.localeCompare(right.sourceType)
    || left.sourceKey.localeCompare(right.sourceKey)
    || left.priority - right.priority,
  );

  for (const row of normalized) {
    if (!Number.isInteger(row.priority)) {
      throw new Error(`priority must be an integer for ${row.sourceType}:${row.sourceKey}.`);
    }

    const duplicateKey = `${row.sourceType}|${row.sourceKey}|${row.priority}`;
    if (duplicateKeys.has(duplicateKey)) {
      throw new Error(`Duplicate contribution row detected for ${duplicateKey}.`);
    }

    duplicateKeys.add(duplicateKey);
  }

  return Object.freeze(normalized);
}

function normalizeRiskInputs(
  rows: readonly AssessmentVersionApplicationRiskInput[],
): readonly AssessmentVersionApplicationRiskInput[] {
  const duplicateKeys = new Set<string>();
  const normalized = rows.map((row) => {
    assertValidPairOrSignalSourceType(row.sourceType, 'source_type');
    return {
      sourceType: row.sourceType,
      sourceKey: trimRequired(row.sourceKey, 'source_key'),
      priority: Number.parseInt(String(row.priority), 10),
      label: trimRequired(row.label, 'label'),
      narrative: trimRequired(row.narrative, 'narrative'),
      impact: trimRequired(row.impact, 'impact'),
      earlyWarning: trimOptional(row.earlyWarning),
    };
  }).sort((left, right) =>
    left.sourceType.localeCompare(right.sourceType)
    || left.sourceKey.localeCompare(right.sourceKey)
    || left.priority - right.priority,
  );

  for (const row of normalized) {
    if (!Number.isInteger(row.priority)) {
      throw new Error(`priority must be an integer for ${row.sourceType}:${row.sourceKey}.`);
    }

    const duplicateKey = `${row.sourceType}|${row.sourceKey}|${row.priority}`;
    if (duplicateKeys.has(duplicateKey)) {
      throw new Error(`Duplicate risk row detected for ${duplicateKey}.`);
    }

    duplicateKeys.add(duplicateKey);
  }

  return Object.freeze(normalized);
}

function normalizeDevelopmentInputs(
  rows: readonly AssessmentVersionApplicationDevelopmentInput[],
): readonly AssessmentVersionApplicationDevelopmentInput[] {
  const duplicateKeys = new Set<string>();
  const normalized = rows.map((row) => {
    assertValidPairOrSignalSourceType(row.sourceType, 'source_type');
    return {
      sourceType: row.sourceType,
      sourceKey: trimRequired(row.sourceKey, 'source_key'),
      priority: Number.parseInt(String(row.priority), 10),
      label: trimRequired(row.label, 'label'),
      narrative: trimRequired(row.narrative, 'narrative'),
      practice: trimRequired(row.practice, 'practice'),
      successMarker: trimOptional(row.successMarker),
    };
  }).sort((left, right) =>
    left.sourceType.localeCompare(right.sourceType)
    || left.sourceKey.localeCompare(right.sourceKey)
    || left.priority - right.priority,
  );

  for (const row of normalized) {
    if (!Number.isInteger(row.priority)) {
      throw new Error(`priority must be an integer for ${row.sourceType}:${row.sourceKey}.`);
    }

    const duplicateKey = `${row.sourceType}|${row.sourceKey}|${row.priority}`;
    if (duplicateKeys.has(duplicateKey)) {
      throw new Error(`Duplicate development row detected for ${duplicateKey}.`);
    }

    duplicateKeys.add(duplicateKey);
  }

  return Object.freeze(normalized);
}

function normalizeActionPromptInputs(
  rows: readonly AssessmentVersionApplicationActionPromptsInput[],
): readonly AssessmentVersionApplicationActionPromptsInput[] {
  const duplicateKeys = new Set<string>();
  const normalized = rows.map((row) => {
    assertValidHeroPatternSourceType(row.sourceType, 'source_type');
    return {
      sourceType: row.sourceType,
      sourceKey: trimRequired(row.sourceKey, 'source_key'),
      keepDoing: trimRequired(row.keepDoing, 'keep_doing'),
      watchFor: trimRequired(row.watchFor, 'watch_for'),
      practiceNext: trimRequired(row.practiceNext, 'practice_next'),
      askOthers: trimRequired(row.askOthers, 'ask_others'),
    };
  }).sort((left, right) =>
    left.sourceType.localeCompare(right.sourceType) || left.sourceKey.localeCompare(right.sourceKey),
  );

  for (const row of normalized) {
    const duplicateKey = `${row.sourceType}|${row.sourceKey}`;
    if (duplicateKeys.has(duplicateKey)) {
      throw new Error(`Duplicate action prompt row detected for ${duplicateKey}.`);
    }

    duplicateKeys.add(duplicateKey);
  }

  return Object.freeze(normalized);
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

export async function getAssessmentVersionApplicationLanguage(
  db: Queryable,
  assessmentVersionId: AssessmentVersionId,
): Promise<AssessmentVersionApplicationLanguageBundle> {
  try {
    const [thesis, contribution, risk, development, prompts] = await Promise.all([
      db.query<ApplicationThesisDbRow>(
        `
        SELECT
          id,
          assessment_version_id,
          hero_pattern_key,
          headline,
          summary,
          created_at,
          updated_at
        FROM assessment_version_application_thesis
        WHERE assessment_version_id = $1
        ORDER BY hero_pattern_key ASC, id ASC
        `,
        [assessmentVersionId],
      ),
      db.query<ApplicationContributionDbRow>(
        `
        SELECT
          id,
          assessment_version_id,
          source_type,
          source_key,
          priority,
          label,
          narrative,
          best_when,
          watch_for,
          created_at,
          updated_at
        FROM assessment_version_application_contribution
        WHERE assessment_version_id = $1
        ORDER BY source_type ASC, source_key ASC, priority ASC, id ASC
        `,
        [assessmentVersionId],
      ),
      db.query<ApplicationRiskDbRow>(
        `
        SELECT
          id,
          assessment_version_id,
          source_type,
          source_key,
          priority,
          label,
          narrative,
          impact,
          early_warning,
          created_at,
          updated_at
        FROM assessment_version_application_risk
        WHERE assessment_version_id = $1
        ORDER BY source_type ASC, source_key ASC, priority ASC, id ASC
        `,
        [assessmentVersionId],
      ),
      db.query<ApplicationDevelopmentDbRow>(
        `
        SELECT
          id,
          assessment_version_id,
          source_type,
          source_key,
          priority,
          label,
          narrative,
          practice,
          success_marker,
          created_at,
          updated_at
        FROM assessment_version_application_development
        WHERE assessment_version_id = $1
        ORDER BY source_type ASC, source_key ASC, priority ASC, id ASC
        `,
        [assessmentVersionId],
      ),
      db.query<ApplicationActionPromptsDbRow>(
        `
        SELECT
          id,
          assessment_version_id,
          source_type,
          source_key,
          keep_doing,
          watch_for,
          practice_next,
          ask_others,
          created_at,
          updated_at
        FROM assessment_version_application_action_prompts
        WHERE assessment_version_id = $1
        ORDER BY source_type ASC, source_key ASC, id ASC
        `,
        [assessmentVersionId],
      ),
    ]);

    return Object.freeze({
      thesis: Object.freeze(thesis.rows.map(mapThesisRow)),
      contribution: Object.freeze(contribution.rows.map(mapContributionRow)),
      risk: Object.freeze(risk.rows.map(mapRiskRow)),
      development: Object.freeze(development.rows.map(mapDevelopmentRow)),
      prompts: Object.freeze(prompts.rows.map(mapActionPromptsRow)),
    });
  } catch (error) {
    if (isMissingRelationError(error)) {
      return emptyApplicationLanguageBundle();
    }

    throw error;
  }
}

export async function replaceAssessmentVersionApplicationThesis(
  db: Queryable | TransactionCapable,
  params: {
    assessmentVersionId: AssessmentVersionId;
    rows: readonly AssessmentVersionApplicationThesisInput[];
  },
): Promise<void> {
  const rows = normalizeThesisInputs(params.rows);

  await replaceDataset({
    db,
    assessmentVersionId: params.assessmentVersionId,
    deleteSql: `
      DELETE FROM assessment_version_application_thesis
      WHERE assessment_version_id = $1
    `,
    insertSql: `
      INSERT INTO assessment_version_application_thesis (
        assessment_version_id,
        hero_pattern_key,
        headline,
        summary
      )
      VALUES ($1, $2, $3, $4)
    `,
    inputs: rows,
    toInsertParams: (row) => [
      params.assessmentVersionId,
      row.heroPatternKey,
      row.headline,
      row.summary,
    ],
  });
}

export async function replaceAssessmentVersionApplicationContribution(
  db: Queryable | TransactionCapable,
  params: {
    assessmentVersionId: AssessmentVersionId;
    rows: readonly AssessmentVersionApplicationContributionInput[];
  },
): Promise<void> {
  const rows = normalizeContributionInputs(params.rows);

  await replaceDataset({
    db,
    assessmentVersionId: params.assessmentVersionId,
    deleteSql: `
      DELETE FROM assessment_version_application_contribution
      WHERE assessment_version_id = $1
    `,
    insertSql: `
      INSERT INTO assessment_version_application_contribution (
        assessment_version_id,
        source_type,
        source_key,
        priority,
        label,
        narrative,
        best_when,
        watch_for
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    inputs: rows,
    toInsertParams: (row) => [
      params.assessmentVersionId,
      row.sourceType,
      row.sourceKey,
      row.priority,
      row.label,
      row.narrative,
      row.bestWhen,
      row.watchFor,
    ],
  });
}

export async function replaceAssessmentVersionApplicationRisk(
  db: Queryable | TransactionCapable,
  params: {
    assessmentVersionId: AssessmentVersionId;
    rows: readonly AssessmentVersionApplicationRiskInput[];
  },
): Promise<void> {
  const rows = normalizeRiskInputs(params.rows);

  await replaceDataset({
    db,
    assessmentVersionId: params.assessmentVersionId,
    deleteSql: `
      DELETE FROM assessment_version_application_risk
      WHERE assessment_version_id = $1
    `,
    insertSql: `
      INSERT INTO assessment_version_application_risk (
        assessment_version_id,
        source_type,
        source_key,
        priority,
        label,
        narrative,
        impact,
        early_warning
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    inputs: rows,
    toInsertParams: (row) => [
      params.assessmentVersionId,
      row.sourceType,
      row.sourceKey,
      row.priority,
      row.label,
      row.narrative,
      row.impact,
      row.earlyWarning,
    ],
  });
}

export async function replaceAssessmentVersionApplicationDevelopment(
  db: Queryable | TransactionCapable,
  params: {
    assessmentVersionId: AssessmentVersionId;
    rows: readonly AssessmentVersionApplicationDevelopmentInput[];
  },
): Promise<void> {
  const rows = normalizeDevelopmentInputs(params.rows);

  await replaceDataset({
    db,
    assessmentVersionId: params.assessmentVersionId,
    deleteSql: `
      DELETE FROM assessment_version_application_development
      WHERE assessment_version_id = $1
    `,
    insertSql: `
      INSERT INTO assessment_version_application_development (
        assessment_version_id,
        source_type,
        source_key,
        priority,
        label,
        narrative,
        practice,
        success_marker
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    inputs: rows,
    toInsertParams: (row) => [
      params.assessmentVersionId,
      row.sourceType,
      row.sourceKey,
      row.priority,
      row.label,
      row.narrative,
      row.practice,
      row.successMarker,
    ],
  });
}

export async function replaceAssessmentVersionApplicationActionPrompts(
  db: Queryable | TransactionCapable,
  params: {
    assessmentVersionId: AssessmentVersionId;
    rows: readonly AssessmentVersionApplicationActionPromptsInput[];
  },
): Promise<void> {
  const rows = normalizeActionPromptInputs(params.rows);

  await replaceDataset({
    db,
    assessmentVersionId: params.assessmentVersionId,
    deleteSql: `
      DELETE FROM assessment_version_application_action_prompts
      WHERE assessment_version_id = $1
    `,
    insertSql: `
      INSERT INTO assessment_version_application_action_prompts (
        assessment_version_id,
        source_type,
        source_key,
        keep_doing,
        watch_for,
        practice_next,
        ask_others
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    inputs: rows,
    toInsertParams: (row) => [
      params.assessmentVersionId,
      row.sourceType,
      row.sourceKey,
      row.keepDoing,
      row.watchFor,
      row.practiceNext,
      row.askOthers,
    ],
  });
}
