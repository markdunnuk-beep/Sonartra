import type { AssessmentVersionId } from '@/lib/engine/types';
import type { Queryable } from '@/lib/engine/repository-sql';
import type {
  AssessmentVersionLanguageBundle,
  AssessmentVersionLanguageDomainInput,
  AssessmentVersionLanguageDomainRow,
  AssessmentVersionLanguageDomainSection,
  AssessmentVersionLanguageStoredDomainSection,
  AssessmentVersionLanguageDomainsByKey,
  AssessmentVersionLanguageHeroHeaderInput,
  AssessmentVersionLanguageHeroHeaderRow,
  AssessmentVersionLanguageHeroHeadersByKey,
  AssessmentVersionLanguageOverviewByKey,
  AssessmentVersionLanguageOverviewInput,
  AssessmentVersionLanguageOverviewRow,
  AssessmentVersionLanguageOverviewSection,
  AssessmentVersionLanguagePairInput,
  AssessmentVersionLanguagePairRow,
  AssessmentVersionLanguagePairSection,
  AssessmentVersionLanguagePairsByKey,
  AssessmentVersionLanguageSectionMap,
  AssessmentVersionLanguageSignalInput,
  AssessmentVersionLanguageSignalRow,
  AssessmentVersionLanguageSignalSection,
  AssessmentVersionLanguageStoredSignalSection,
  AssessmentVersionLanguageSignalsByKey,
} from '@/lib/server/assessment-version-language-types';

type TransactionClient = Queryable & {
  release(): void;
};

type TransactionCapable = Queryable & {
  connect(): Promise<TransactionClient>;
};

type AssessmentVersionLanguageSignalDbRow = {
  id: string;
  assessment_version_id: string;
  signal_key: string;
  section: AssessmentVersionLanguageStoredSignalSection;
  content: string;
  created_at: string;
  updated_at: string;
};

type AssessmentVersionLanguagePairDbRow = {
  id: string;
  assessment_version_id: string;
  signal_pair: string;
  section: AssessmentVersionLanguagePairSection;
  content: string;
  created_at: string;
  updated_at: string;
};

type AssessmentVersionLanguageDomainDbRow = {
  id: string;
  assessment_version_id: string;
  domain_key: string;
  section: AssessmentVersionLanguageStoredDomainSection;
  content: string;
  created_at: string;
  updated_at: string;
};

type AssessmentVersionLanguageOverviewDbRow = {
  id: string;
  assessment_version_id: string;
  pattern_key: string;
  section: AssessmentVersionLanguageOverviewSection;
  content: string;
  created_at: string;
  updated_at: string;
};

type AssessmentVersionLanguageHeroHeaderDbRow = {
  id: string;
  assessment_version_id: string;
  pair_key: string;
  headline: string;
  created_at: string;
  updated_at: string;
};

const SIGNAL_SECTION_ORDER: readonly AssessmentVersionLanguageSignalSection[] = Object.freeze([
  'chapterSummary',
  'strength',
  'watchout',
  'development',
]);

const PAIR_SECTION_ORDER: readonly AssessmentVersionLanguagePairSection[] = Object.freeze([
  'summary',
  'strength',
  'watchout',
]);

const DOMAIN_SECTION_ORDER: readonly AssessmentVersionLanguageDomainSection[] = Object.freeze([
  'chapterOpening',
]);

const OVERVIEW_SECTION_ORDER: readonly AssessmentVersionLanguageOverviewSection[] = Object.freeze([
  'headline',
  'summary',
  'strengths',
  'watchouts',
  'development',
]);

export class DuplicateAssessmentVersionLanguageEntryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateAssessmentVersionLanguageEntryError';
  }
}

function requireTransactionCapable(db: Queryable | TransactionCapable): TransactionCapable {
  if (typeof (db as TransactionCapable).connect !== 'function') {
    throw new Error('LANGUAGE_REPOSITORY_TRANSACTION_SUPPORT_REQUIRED');
  }

  return db as TransactionCapable;
}

function normalizeLanguageKey(value: string): string {
  return value.trim();
}

function normalizeLanguageContent(value: string): string {
  return value.trim();
}

function sortInputsByKeyAndSection<TInput extends { section: TSection }, TSection extends string>(
  inputs: readonly TInput[],
  getKey: (input: TInput) => string,
  sectionOrder: readonly TSection[],
): readonly TInput[] {
  const sectionRank = new Map(sectionOrder.map((section, index) => [section, index] as const));

  return Object.freeze(
    [...inputs].sort((left, right) => {
      const keyComparison = getKey(left).localeCompare(getKey(right));
      if (keyComparison !== 0) {
        return keyComparison;
      }

      const leftRank = sectionRank.get(left.section) ?? Number.MAX_SAFE_INTEGER;
      const rightRank = sectionRank.get(right.section) ?? Number.MAX_SAFE_INTEGER;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return 0;
    }),
  );
}

export function normalizeAssessmentVersionLanguageSignalInputs(
  inputs: readonly AssessmentVersionLanguageSignalInput[],
): readonly AssessmentVersionLanguageSignalInput[] {
  return sortInputsByKeyAndSection(
    inputs.map((input) => ({
      signalKey: normalizeLanguageKey(input.signalKey),
      section: input.section,
      content: normalizeLanguageContent(input.content),
    })),
    (input) => input.signalKey,
    SIGNAL_SECTION_ORDER,
  );
}

export function normalizeAssessmentVersionLanguagePairInputs(
  inputs: readonly AssessmentVersionLanguagePairInput[],
): readonly AssessmentVersionLanguagePairInput[] {
  return sortInputsByKeyAndSection(
    inputs.map((input) => ({
      signalPair: normalizeLanguageKey(input.signalPair),
      section: input.section,
      content: normalizeLanguageContent(input.content),
    })),
    (input) => input.signalPair,
    PAIR_SECTION_ORDER,
  );
}

export function normalizeAssessmentVersionLanguageDomainInputs(
  inputs: readonly AssessmentVersionLanguageDomainInput[],
): readonly AssessmentVersionLanguageDomainInput[] {
  return sortInputsByKeyAndSection(
    inputs.map((input) => ({
      domainKey: normalizeLanguageKey(input.domainKey),
      section: input.section,
      content: normalizeLanguageContent(input.content),
    })),
    (input) => input.domainKey,
    DOMAIN_SECTION_ORDER,
  );
}

export function normalizeAssessmentVersionLanguageOverviewInputs(
  inputs: readonly AssessmentVersionLanguageOverviewInput[],
): readonly AssessmentVersionLanguageOverviewInput[] {
  return sortInputsByKeyAndSection(
    inputs.map((input) => ({
      patternKey: normalizeLanguageKey(input.patternKey),
      section: input.section,
      content: normalizeLanguageContent(input.content),
    })),
    (input) => input.patternKey,
    OVERVIEW_SECTION_ORDER,
  );
}

export function normalizeAssessmentVersionLanguageHeroHeaderInputs(
  inputs: readonly AssessmentVersionLanguageHeroHeaderInput[],
): readonly AssessmentVersionLanguageHeroHeaderInput[] {
  return Object.freeze(
    [...inputs]
      .map((input) => ({
        pairKey: normalizeLanguageKey(input.pairKey),
        headline: normalizeLanguageContent(input.headline),
      }))
      .sort((left, right) => left.pairKey.localeCompare(right.pairKey)),
  );
}

function mapSignalRow(row: AssessmentVersionLanguageSignalDbRow): AssessmentVersionLanguageSignalRow {
  return {
    id: row.id,
    assessmentVersionId: row.assessment_version_id,
    signalKey: row.signal_key,
    section: row.section === 'summary' ? 'chapterSummary' : row.section,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPairRow(row: AssessmentVersionLanguagePairDbRow): AssessmentVersionLanguagePairRow {
  return {
    id: row.id,
    assessmentVersionId: row.assessment_version_id,
    signalPair: row.signal_pair,
    section: row.section,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDomainRow(row: AssessmentVersionLanguageDomainDbRow): AssessmentVersionLanguageDomainRow {
  return {
    id: row.id,
    assessmentVersionId: row.assessment_version_id,
    domainKey: row.domain_key,
    section: row.section,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toBundleDomainSection(
  section: AssessmentVersionLanguageStoredDomainSection,
): AssessmentVersionLanguageStoredDomainSection {
  return section === 'summary' ? 'chapterOpening' : section;
}

function mapOverviewRow(row: AssessmentVersionLanguageOverviewDbRow): AssessmentVersionLanguageOverviewRow {
  return {
    id: row.id,
    assessmentVersionId: row.assessment_version_id,
    patternKey: row.pattern_key,
    section: row.section,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapHeroHeaderRow(row: AssessmentVersionLanguageHeroHeaderDbRow): AssessmentVersionLanguageHeroHeaderRow {
  return {
    id: row.id,
    assessmentVersionId: row.assessment_version_id,
    pairKey: row.pair_key,
    headline: row.headline,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildSectionBundle<TRow extends { section: TSection; content: string }, TSection extends string>(
  rows: readonly TRow[],
  getKey: (row: TRow) => string,
  datasetName: string,
): Readonly<Record<string, AssessmentVersionLanguageSectionMap<TSection>>> {
  const grouped: Record<string, Partial<Record<TSection, string>>> = {};

  for (const row of rows) {
    const key = getKey(row);
    const sectionMap = grouped[key] ?? {};

    if (sectionMap[row.section] !== undefined) {
      throw new DuplicateAssessmentVersionLanguageEntryError(
        `Duplicate ${datasetName} language entry detected for key "${key}" and section "${row.section}"`,
      );
    }

    sectionMap[row.section] = row.content;
    grouped[key] = sectionMap;
  }

  const result: Record<string, AssessmentVersionLanguageSectionMap<TSection>> = {};
  for (const key of Object.keys(grouped)) {
    result[key] = Object.freeze({ ...grouped[key] });
  }

  return Object.freeze(result);
}

export function buildAssessmentVersionLanguageSignalsBundle(
  rows: readonly AssessmentVersionLanguageSignalRow[],
): AssessmentVersionLanguageSignalsByKey {
  const grouped: Record<string, Partial<Record<AssessmentVersionLanguageSignalSection, string>>> = {};

  for (const row of rows) {
    const key = row.signalKey;
    const section = row.section === 'summary' ? 'chapterSummary' : row.section;
    const sectionMap = grouped[key] ?? {};

    if (section === 'chapterSummary' && row.section === 'summary' && sectionMap.chapterSummary !== undefined) {
      grouped[key] = sectionMap;
      continue;
    }

    if (section === 'chapterSummary' && row.section === 'chapterSummary' && sectionMap.chapterSummary !== undefined) {
      sectionMap.chapterSummary = row.content;
      grouped[key] = sectionMap;
      continue;
    }

    if (sectionMap[section] !== undefined) {
      throw new DuplicateAssessmentVersionLanguageEntryError(
        `Duplicate signal language entry detected for key "${key}" and section "${section}"`,
      );
    }

    sectionMap[section] = row.content;
    grouped[key] = sectionMap;
  }

  const result: Record<string, AssessmentVersionLanguageSectionMap<AssessmentVersionLanguageSignalSection>> = {};
  for (const key of Object.keys(grouped)) {
    result[key] = Object.freeze({ ...grouped[key] });
  }

  return Object.freeze(result);
}

export function buildAssessmentVersionLanguagePairsBundle(
  rows: readonly AssessmentVersionLanguagePairRow[],
): AssessmentVersionLanguagePairsByKey {
  return buildSectionBundle(rows, (row) => row.signalPair, 'pair');
}

export function buildAssessmentVersionLanguageDomainsBundle(
  rows: readonly AssessmentVersionLanguageDomainRow[],
): AssessmentVersionLanguageDomainsByKey {
  const grouped: Record<string, Partial<Record<AssessmentVersionLanguageStoredDomainSection, string>>> = {};

  for (const row of rows) {
    const key = row.domainKey;
    const section = toBundleDomainSection(row.section);
    const sectionMap = grouped[key] ?? {};

    if (section === 'chapterOpening' && row.section === 'summary' && sectionMap.chapterOpening !== undefined) {
      grouped[key] = sectionMap;
      continue;
    }

    if (section === 'chapterOpening' && row.section === 'chapterOpening' && sectionMap.chapterOpening !== undefined) {
      sectionMap.chapterOpening = row.content;
      grouped[key] = sectionMap;
      continue;
    }

    if (sectionMap[section] !== undefined) {
      throw new DuplicateAssessmentVersionLanguageEntryError(
        `Duplicate domain language entry detected for key "${key}" and section "${section}"`,
      );
    }

    sectionMap[section] = row.content;
    grouped[key] = sectionMap;
  }

  const result: Record<string, AssessmentVersionLanguageSectionMap<AssessmentVersionLanguageStoredDomainSection>> = {};
  for (const key of Object.keys(grouped)) {
    result[key] = Object.freeze({ ...grouped[key] });
  }

  return Object.freeze(result);
}

export function buildAssessmentVersionLanguageOverviewBundle(
  rows: readonly AssessmentVersionLanguageOverviewRow[],
): AssessmentVersionLanguageOverviewByKey {
  return buildSectionBundle(rows, (row) => row.patternKey, 'overview');
}

export function buildAssessmentVersionLanguageHeroHeadersBundle(
  rows: readonly AssessmentVersionLanguageHeroHeaderRow[],
): AssessmentVersionLanguageHeroHeadersByKey {
  const result: Record<string, Readonly<{ headline: string }>> = {};

  for (const row of rows) {
    if (result[row.pairKey] !== undefined) {
      throw new DuplicateAssessmentVersionLanguageEntryError(
        `Duplicate hero header language entry detected for pair "${row.pairKey}"`,
      );
    }

    result[row.pairKey] = Object.freeze({ headline: row.headline });
  }

  return Object.freeze(result);
}

function isMissingRelationError(error: unknown, tableName: string): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes(tableName) && error.message.includes('does not exist');
}

export async function getAssessmentVersionLanguageSignals(
  db: Queryable,
  assessmentVersionId: AssessmentVersionId,
): Promise<readonly AssessmentVersionLanguageSignalRow[]> {
  const result = await db.query<AssessmentVersionLanguageSignalDbRow>(
    `
    SELECT
      id,
      assessment_version_id,
      signal_key,
      section,
      content,
      created_at,
      updated_at
    FROM assessment_version_language_signals
    WHERE assessment_version_id = $1
    ORDER BY
      signal_key ASC,
      CASE section
        WHEN 'chapterSummary' THEN 0
        WHEN 'summary' THEN 0
        WHEN 'strength' THEN 1
        WHEN 'watchout' THEN 2
        WHEN 'development' THEN 3
        ELSE 99
      END ASC,
      id ASC
    `,
    [assessmentVersionId],
  );

  return Object.freeze(result.rows.map(mapSignalRow));
}

export async function getAssessmentVersionLanguagePairs(
  db: Queryable,
  assessmentVersionId: AssessmentVersionId,
): Promise<readonly AssessmentVersionLanguagePairRow[]> {
  const result = await db.query<AssessmentVersionLanguagePairDbRow>(
    `
    SELECT
      id,
      assessment_version_id,
      signal_pair,
      section,
      content,
      created_at,
      updated_at
    FROM assessment_version_language_pairs
    WHERE assessment_version_id = $1
    ORDER BY
      signal_pair ASC,
      CASE section
        WHEN 'summary' THEN 0
        WHEN 'strength' THEN 1
        WHEN 'watchout' THEN 2
        ELSE 99
      END ASC,
      id ASC
    `,
    [assessmentVersionId],
  );

  return Object.freeze(result.rows.map(mapPairRow));
}

export async function getAssessmentVersionLanguageDomains(
  db: Queryable,
  assessmentVersionId: AssessmentVersionId,
): Promise<readonly AssessmentVersionLanguageDomainRow[]> {
  const result = await db.query<AssessmentVersionLanguageDomainDbRow>(
    `
    SELECT
      id,
      assessment_version_id,
      domain_key,
      section,
      content,
      created_at,
      updated_at
    FROM assessment_version_language_domains
    WHERE assessment_version_id = $1
    ORDER BY
      domain_key ASC,
      CASE section
        WHEN 'chapterOpening' THEN 0
        WHEN 'summary' THEN 0
        WHEN 'focus' THEN 1
        WHEN 'pressure' THEN 2
        WHEN 'environment' THEN 3
        ELSE 99
      END ASC,
      id ASC
    `,
    [assessmentVersionId],
  );

  return Object.freeze(result.rows.map(mapDomainRow));
}

export async function getAssessmentVersionLanguageOverview(
  db: Queryable,
  assessmentVersionId: AssessmentVersionId,
): Promise<readonly AssessmentVersionLanguageOverviewRow[]> {
  const result = await db.query<AssessmentVersionLanguageOverviewDbRow>(
    `
    SELECT
      id,
      assessment_version_id,
      pattern_key,
      section,
      content,
      created_at,
      updated_at
    FROM assessment_version_language_overview
    WHERE assessment_version_id = $1
    ORDER BY
      pattern_key ASC,
      CASE section
        WHEN 'headline' THEN 0
        WHEN 'summary' THEN 1
        WHEN 'strengths' THEN 2
        WHEN 'watchouts' THEN 3
        WHEN 'development' THEN 4
        ELSE 99
      END ASC,
      id ASC
    `,
    [assessmentVersionId],
  );

  return Object.freeze(result.rows.map(mapOverviewRow));
}

export async function getAssessmentVersionLanguageHeroHeaders(
  db: Queryable,
  assessmentVersionId: AssessmentVersionId,
): Promise<readonly AssessmentVersionLanguageHeroHeaderRow[]> {
  try {
    const result = await db.query<AssessmentVersionLanguageHeroHeaderDbRow>(
      `
      SELECT
        id,
        assessment_version_id,
        pair_key,
        headline,
        created_at,
        updated_at
      FROM assessment_version_language_hero_headers
      WHERE assessment_version_id = $1
      ORDER BY
        pair_key ASC,
        id ASC
      `,
      [assessmentVersionId],
    );

    return Object.freeze(result.rows.map(mapHeroHeaderRow));
  } catch (error) {
    if (isMissingRelationError(error, 'assessment_version_language_hero_headers')) {
      return Object.freeze([]);
    }

    throw error;
  }
}

export async function getAssessmentVersionLanguageBundle(
  db: Queryable,
  assessmentVersionId: AssessmentVersionId,
): Promise<AssessmentVersionLanguageBundle> {
  const [signals, pairs, domains, overview, heroHeaders] = await Promise.all([
    getAssessmentVersionLanguageSignals(db, assessmentVersionId),
    getAssessmentVersionLanguagePairs(db, assessmentVersionId),
    getAssessmentVersionLanguageDomains(db, assessmentVersionId),
    getAssessmentVersionLanguageOverview(db, assessmentVersionId),
    getAssessmentVersionLanguageHeroHeaders(db, assessmentVersionId),
  ]);

  return Object.freeze({
    signals: buildAssessmentVersionLanguageSignalsBundle(signals),
    pairs: buildAssessmentVersionLanguagePairsBundle(pairs),
    domains: buildAssessmentVersionLanguageDomainsBundle(domains),
    overview: buildAssessmentVersionLanguageOverviewBundle(overview),
    heroHeaders: buildAssessmentVersionLanguageHeroHeadersBundle(heroHeaders),
  });
}

async function replaceLanguageDataset<TInput>(params: {
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

export async function replaceAssessmentVersionLanguageSignals(
  db: Queryable | TransactionCapable,
  params: {
    assessmentVersionId: AssessmentVersionId;
    inputs: readonly AssessmentVersionLanguageSignalInput[];
  },
): Promise<void> {
  const inputs = normalizeAssessmentVersionLanguageSignalInputs(params.inputs);

  await replaceLanguageDataset({
    db,
    assessmentVersionId: params.assessmentVersionId,
    deleteSql: `
      DELETE FROM assessment_version_language_signals
      WHERE assessment_version_id = $1
    `,
    insertSql: `
      INSERT INTO assessment_version_language_signals (
        assessment_version_id,
        signal_key,
        section,
        content
      )
      VALUES ($1, $2, $3, $4)
    `,
    inputs,
    toInsertParams: (input) => [
      params.assessmentVersionId,
      input.signalKey,
      input.section,
      input.content,
    ],
  });
}

export async function replaceAssessmentVersionLanguagePairs(
  db: Queryable | TransactionCapable,
  params: {
    assessmentVersionId: AssessmentVersionId;
    inputs: readonly AssessmentVersionLanguagePairInput[];
  },
): Promise<void> {
  const inputs = normalizeAssessmentVersionLanguagePairInputs(params.inputs);

  await replaceLanguageDataset({
    db,
    assessmentVersionId: params.assessmentVersionId,
    deleteSql: `
      DELETE FROM assessment_version_language_pairs
      WHERE assessment_version_id = $1
    `,
    insertSql: `
      INSERT INTO assessment_version_language_pairs (
        assessment_version_id,
        signal_pair,
        section,
        content
      )
      VALUES ($1, $2, $3, $4)
    `,
    inputs,
    toInsertParams: (input) => [
      params.assessmentVersionId,
      input.signalPair,
      input.section,
      input.content,
    ],
  });
}

export async function replaceAssessmentVersionLanguageDomains(
  db: Queryable | TransactionCapable,
  params: {
    assessmentVersionId: AssessmentVersionId;
    inputs: readonly AssessmentVersionLanguageDomainInput[];
  },
): Promise<void> {
  const inputs = normalizeAssessmentVersionLanguageDomainInputs(params.inputs);

  await replaceLanguageDataset({
    db,
    assessmentVersionId: params.assessmentVersionId,
    deleteSql: `
      DELETE FROM assessment_version_language_domains
      WHERE assessment_version_id = $1
    `,
    insertSql: `
      INSERT INTO assessment_version_language_domains (
        assessment_version_id,
        domain_key,
        section,
        content
      )
      VALUES ($1, $2, $3, $4)
    `,
    inputs,
    toInsertParams: (input) => [
      params.assessmentVersionId,
      input.domainKey,
      input.section,
      input.content,
    ],
  });
}

export async function replaceAssessmentVersionLanguageOverview(
  db: Queryable | TransactionCapable,
  params: {
    assessmentVersionId: AssessmentVersionId;
    inputs: readonly AssessmentVersionLanguageOverviewInput[];
  },
): Promise<void> {
  const inputs = normalizeAssessmentVersionLanguageOverviewInputs(params.inputs);

  await replaceLanguageDataset({
    db,
    assessmentVersionId: params.assessmentVersionId,
    deleteSql: `
      DELETE FROM assessment_version_language_overview
      WHERE assessment_version_id = $1
    `,
    insertSql: `
      INSERT INTO assessment_version_language_overview (
        assessment_version_id,
        pattern_key,
        section,
        content
      )
      VALUES ($1, $2, $3, $4)
    `,
    inputs,
    toInsertParams: (input) => [
      params.assessmentVersionId,
      input.patternKey,
      input.section,
      input.content,
    ],
  });
}

export async function replaceAssessmentVersionLanguageHeroHeaders(
  db: Queryable | TransactionCapable,
  params: {
    assessmentVersionId: AssessmentVersionId;
    inputs: readonly AssessmentVersionLanguageHeroHeaderInput[];
  },
): Promise<void> {
  const inputs = normalizeAssessmentVersionLanguageHeroHeaderInputs(params.inputs);

  await replaceLanguageDataset({
    db,
    assessmentVersionId: params.assessmentVersionId,
    deleteSql: `
      DELETE FROM assessment_version_language_hero_headers
      WHERE assessment_version_id = $1
    `,
    insertSql: `
      INSERT INTO assessment_version_language_hero_headers (
        assessment_version_id,
        pair_key,
        headline
      )
      VALUES ($1, $2, $3)
    `,
    inputs,
    toInsertParams: (input) => [
      params.assessmentVersionId,
      input.pairKey,
      input.headline,
    ],
  });
}
