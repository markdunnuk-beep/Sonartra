import { rankedPatternSupportedScoreShapes } from '@/content/assessment-packages/import-contract/ranked-pattern-import-manifest';
import type { RankedPatternScoreShape } from '@/content/assessment-packages/import-contract/ranked-pattern-import-manifest';
import type { Queryable } from '@/lib/engine/repository-sql';
import type {
  RankedPatternResultPayloadSections,
  SingleDomainResultSignal,
  SingleDomainResultScoreShape,
} from '@/lib/types/single-domain-result';

export class RankedPatternResultLanguageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RankedPatternResultLanguageError';
  }
}

export type RankedPatternRuntimeLanguageRow = {
  readonly id: string;
  readonly section_key: string;
  readonly lookup_key: string;
  readonly domain_key: string;
  readonly pattern_key: string | null;
  readonly score_shape: string | null;
  readonly signal_key: string | null;
  readonly rank_position: number | null;
  readonly item_key: string | null;
  readonly priority: number | null;
  readonly field_values: unknown;
};

export type RankedPatternRuntimeRankedPatternRow = {
  readonly pattern_key: string;
};

export type RankedPatternLanguageLookupInput = {
  readonly db: Queryable;
  readonly assessmentVersionId: string;
  readonly domainKey: string;
  readonly patternKey: string;
  readonly scoreShape: RankedPatternScoreShape;
  readonly rankedSignals: readonly Pick<SingleDomainResultSignal, 'signal_key' | 'rank'>[];
};

export type RankedPatternLoadedResultLanguage = {
  readonly context: RankedPatternRuntimeLanguageRow;
  readonly orientation: RankedPatternRuntimeLanguageRow;
  readonly recognition: RankedPatternRuntimeLanguageRow;
  readonly signalRoles: readonly RankedPatternRuntimeLanguageRow[];
  readonly patternMechanics: RankedPatternRuntimeLanguageRow;
  readonly patternSynthesis: RankedPatternRuntimeLanguageRow;
  readonly strengths: readonly RankedPatternRuntimeLanguageRow[];
  readonly narrowing: readonly RankedPatternRuntimeLanguageRow[];
  readonly application: readonly RankedPatternRuntimeLanguageRow[];
  readonly closingIntegration: RankedPatternRuntimeLanguageRow;
  readonly lookupKeys: readonly string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireFieldValues(row: RankedPatternRuntimeLanguageRow): void {
  if (!isRecord(row.field_values) || Object.keys(row.field_values).length === 0) {
    throw new RankedPatternResultLanguageError(
      `Ranked-pattern result language row "${row.lookup_key}" has missing field_values.`,
    );
  }
}

function singleton(
  rows: readonly RankedPatternRuntimeLanguageRow[],
  description: string,
): RankedPatternRuntimeLanguageRow {
  if (rows.length !== 1) {
    throw new RankedPatternResultLanguageError(
      `Expected exactly one ranked-pattern result language row for ${description}; found ${rows.length}.`,
    );
  }
  const row = rows[0]!;
  requireFieldValues(row);
  return row;
}

function listRows(
  rows: readonly RankedPatternRuntimeLanguageRow[],
  description: string,
): readonly RankedPatternRuntimeLanguageRow[] {
  if (rows.length === 0) {
    throw new RankedPatternResultLanguageError(
      `Expected at least one ranked-pattern result language row for ${description}; found 0.`,
    );
  }
  rows.forEach(requireFieldValues);
  return Object.freeze(
    [...rows].sort((left, right) =>
      (left.priority ?? Number.MAX_SAFE_INTEGER) - (right.priority ?? Number.MAX_SAFE_INTEGER)
      || (left.item_key ?? '').localeCompare(right.item_key ?? '')
      || left.lookup_key.localeCompare(right.lookup_key),
    ),
  );
}

async function loadRows(
  input: RankedPatternLanguageLookupInput,
): Promise<readonly RankedPatternRuntimeLanguageRow[]> {
  const result = await input.db.query<RankedPatternRuntimeLanguageRow>(
    `
    SELECT
      id,
      section_key,
      lookup_key,
      domain_key,
      pattern_key,
      score_shape,
      signal_key,
      rank_position,
      item_key,
      priority,
      field_values
    FROM assessment_result_language_rows
    WHERE assessment_version_id = $1
      AND domain_key = $2
      AND status = 'active'
      AND section_key IN (
        'context',
        'orientation',
        'recognition',
        'signal_roles',
        'pattern_mechanics',
        'pattern_synthesis',
        'strengths',
        'narrowing',
        'application',
        'closing_integration'
      )
    ORDER BY section_key ASC, priority ASC NULLS LAST, item_key ASC NULLS LAST, lookup_key ASC
    `,
    [input.assessmentVersionId, input.domainKey],
  );
  return Object.freeze(result.rows);
}

async function assertRankedPatternExists(input: RankedPatternLanguageLookupInput): Promise<void> {
  const result = await input.db.query<RankedPatternRuntimeRankedPatternRow>(
    `
    SELECT pattern_key
    FROM assessment_ranked_patterns
    WHERE assessment_version_id = $1
      AND domain_key = $2
      AND pattern_key = $3
      AND status = 'active'
    `,
    [input.assessmentVersionId, input.domainKey, input.patternKey],
  );

  if (result.rows.length !== 1) {
    throw new RankedPatternResultLanguageError(
      `Ranked-pattern result language lookup could not resolve active pattern_key "${input.patternKey}".`,
    );
  }
}

function sectionRows(
  rows: readonly RankedPatternRuntimeLanguageRow[],
  sectionKey: string,
): readonly RankedPatternRuntimeLanguageRow[] {
  return rows.filter((row) => row.section_key === sectionKey);
}

function patternShapeRows(
  rows: readonly RankedPatternRuntimeLanguageRow[],
  sectionKey: string,
  input: RankedPatternLanguageLookupInput,
): readonly RankedPatternRuntimeLanguageRow[] {
  return sectionRows(rows, sectionKey).filter((row) =>
    row.pattern_key === input.patternKey && row.score_shape === input.scoreShape,
  );
}

function patternRows(
  rows: readonly RankedPatternRuntimeLanguageRow[],
  sectionKey: string,
  input: RankedPatternLanguageLookupInput,
): readonly RankedPatternRuntimeLanguageRow[] {
  return sectionRows(rows, sectionKey).filter((row) => row.pattern_key === input.patternKey);
}

export async function loadRankedPatternResultLanguage(
  input: RankedPatternLanguageLookupInput,
): Promise<RankedPatternLoadedResultLanguage> {
  if (!rankedPatternSupportedScoreShapes.includes(input.scoreShape)) {
    throw new RankedPatternResultLanguageError(`Unsupported ranked-pattern scoreShape "${input.scoreShape}".`);
  }

  await assertRankedPatternExists(input);
  const rows = await loadRows(input);
  const signalRoleRows = input.rankedSignals.map((signal) =>
    singleton(
      sectionRows(rows, 'signal_roles').filter((row) =>
        row.signal_key === signal.signal_key && row.rank_position === signal.rank,
      ),
      `08_Signal_Roles ${signal.signal_key} rank ${signal.rank}`,
    ),
  );

  const loaded = {
    context: singleton(
      sectionRows(rows, 'context').filter((row) => row.domain_key === input.domainKey),
      `05_Context ${input.domainKey}`,
    ),
    orientation: singleton(patternShapeRows(rows, 'orientation', input), '06_Orientation'),
    recognition: singleton(patternShapeRows(rows, 'recognition', input), '07_Recognition'),
    signalRoles: Object.freeze(signalRoleRows),
    patternMechanics: singleton(patternShapeRows(rows, 'pattern_mechanics', input), '09_Pattern_Mechanics'),
    patternSynthesis: singleton(patternShapeRows(rows, 'pattern_synthesis', input), '10_Pattern_Synthesis'),
    strengths: listRows(patternRows(rows, 'strengths', input), '11_Strengths'),
    narrowing: listRows(patternRows(rows, 'narrowing', input), '12_Narrowing'),
    application: listRows(patternRows(rows, 'application', input), '13_Application'),
    closingIntegration: singleton(patternShapeRows(rows, 'closing_integration', input), '14_Closing_Integration'),
  } satisfies Omit<RankedPatternLoadedResultLanguage, 'lookupKeys'>;

  return Object.freeze({
    ...loaded,
    lookupKeys: Object.freeze([
      loaded.context.lookup_key,
      loaded.orientation.lookup_key,
      loaded.recognition.lookup_key,
      ...loaded.signalRoles.map((row) => row.lookup_key),
      loaded.patternMechanics.lookup_key,
      loaded.patternSynthesis.lookup_key,
      ...loaded.strengths.map((row) => row.lookup_key),
      ...loaded.narrowing.map((row) => row.lookup_key),
      ...loaded.application.map((row) => row.lookup_key),
      loaded.closingIntegration.lookup_key,
    ]),
  });
}

function payloadRow(row: RankedPatternRuntimeLanguageRow): Record<string, unknown> {
  return Object.freeze({
    lookupKey: row.lookup_key,
    itemKey: row.item_key,
    signalKey: row.signal_key,
    rankPosition: row.rank_position,
    priority: row.priority,
    fieldValues: row.field_values,
  });
}

function singletonPayload(row: RankedPatternRuntimeLanguageRow): Record<string, unknown> {
  return Object.freeze({
    lookupKey: row.lookup_key,
    fieldValues: row.field_values,
  });
}

export function buildRankedPatternCanonicalResultSections(input: {
  readonly language: RankedPatternLoadedResultLanguage;
  readonly rankedSignals: readonly SingleDomainResultSignal[];
  readonly scoreShape: SingleDomainResultScoreShape;
  readonly patternKey: string;
}): RankedPatternResultPayloadSections {
  return Object.freeze({
    assessment: undefined,
    attempt: undefined,
    domain: undefined,
    topSignal: undefined,
    rankedSignals: Object.freeze(
      input.rankedSignals.map((signal) => Object.freeze({
        signalKey: signal.signal_key,
        signalLabel: signal.signal_label,
        rank: signal.rank,
        rawScore: signal.raw_score,
        normalizedPercentage: signal.normalized_score,
      })),
    ),
    normalizedScores: Object.freeze(
      input.rankedSignals.map((signal) => Object.freeze({
        signalKey: signal.signal_key,
        rawScore: signal.raw_score,
        normalizedPercentage: signal.normalized_score,
      })),
    ),
    scoreShape: input.scoreShape,
    patternKey: input.patternKey,
    context: singletonPayload(input.language.context),
    orientation: singletonPayload(input.language.orientation),
    recognition: singletonPayload(input.language.recognition),
    signalRoles: Object.freeze(input.language.signalRoles.map(payloadRow)),
    patternMechanics: singletonPayload(input.language.patternMechanics),
    patternSynthesis: singletonPayload(input.language.patternSynthesis),
    strengths: Object.freeze(input.language.strengths.map(payloadRow)),
    narrowing: Object.freeze(input.language.narrowing.map(payloadRow)),
    application: Object.freeze(input.language.application.map(payloadRow)),
    closingIntegration: singletonPayload(input.language.closingIntegration),
    lookupKeys: input.language.lookupKeys,
  });
}
