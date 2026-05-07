import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRankedPatternCanonicalResultSections,
  loadRankedPatternResultLanguage,
} from '@/lib/server/ranked-pattern-result-language';
import type { RankedPatternRuntimeLanguageRow } from '@/lib/server/ranked-pattern-result-language';
import type { Queryable } from '@/lib/engine/repository-sql';
import type { SingleDomainResultSignal, SingleDomainResultScoreShape } from '@/lib/types/single-domain-result';

const assessmentVersionId = 'version-1';
const domainKey = 'domain-key';
const patternKey = 'alpha_beta_gamma_delta';
const scoreShape: SingleDomainResultScoreShape = {
  value: 'graduated',
  policyKey: 'fixed_gap_v1',
  policyVersion: '1.0.0',
};
const rankedSignals: readonly SingleDomainResultSignal[] = Object.freeze([
  signal('alpha', 'Alpha', 1, 40, 4),
  signal('beta', 'Beta', 2, 30, 3),
  signal('gamma', 'Gamma', 3, 20, 2),
  signal('delta', 'Delta', 4, 10, 1),
]);

function signal(
  signalKey: string,
  signalLabel: string,
  rank: number,
  normalizedScore: number,
  rawScore: number,
): SingleDomainResultSignal {
  return {
    signal_key: signalKey,
    signal_label: signalLabel,
    rank,
    normalized_score: normalizedScore,
    raw_score: rawScore,
    position: rank === 1 ? 'primary' : rank === 2 ? 'secondary' : rank === 4 ? 'underplayed' : 'supporting',
    position_label: `Rank ${rank}`,
    chapter_intro: '',
    chapter_how_it_shows_up: '',
    chapter_value_outcome: '',
    chapter_value_team_effect: '',
    chapter_risk_behaviour: '',
    chapter_risk_impact: '',
    chapter_development: '',
  };
}

function row(params: {
  sectionKey: string;
  lookupKey: string;
  fieldValues?: Record<string, unknown>;
  pattern?: boolean;
  shape?: boolean;
  signalKey?: string | null;
  rankPosition?: number | null;
  itemKey?: string | null;
  priority?: number | null;
}): RankedPatternRuntimeLanguageRow {
  return {
    id: params.lookupKey,
    section_key: params.sectionKey,
    lookup_key: params.lookupKey,
    domain_key: domainKey,
    pattern_key: params.pattern ? patternKey : null,
    score_shape: params.shape ? scoreShape.value : null,
    signal_key: params.signalKey ?? null,
    rank_position: params.rankPosition ?? null,
    item_key: params.itemKey ?? null,
    priority: params.priority ?? null,
    field_values: params.fieldValues ?? { text: params.lookupKey },
  };
}

function completeRows(): RankedPatternRuntimeLanguageRow[] {
  return [
    row({ sectionKey: 'context', lookupKey: 'context' }),
    row({ sectionKey: 'orientation', lookupKey: 'orientation', pattern: true, shape: true }),
    row({ sectionKey: 'recognition', lookupKey: 'recognition', pattern: true, shape: true }),
    ...rankedSignals.map((entry) =>
      row({
        sectionKey: 'signal_roles',
        lookupKey: `role-${entry.signal_key}-${entry.rank}`,
        signalKey: entry.signal_key,
        rankPosition: entry.rank,
      }),
    ),
    row({ sectionKey: 'pattern_mechanics', lookupKey: 'mechanics', pattern: true, shape: true }),
    row({ sectionKey: 'pattern_synthesis', lookupKey: 'synthesis', pattern: true, shape: true }),
    row({ sectionKey: 'strengths', lookupKey: 'strength-2', pattern: true, itemKey: 'strength_b', priority: 2 }),
    row({ sectionKey: 'strengths', lookupKey: 'strength-1', pattern: true, itemKey: 'strength_a', priority: 1 }),
    row({ sectionKey: 'narrowing', lookupKey: 'narrowing-1', pattern: true, itemKey: 'narrowing_a', priority: 1 }),
    row({ sectionKey: 'application', lookupKey: 'application-1', pattern: true, itemKey: 'application_a', priority: 1 }),
    row({ sectionKey: 'closing_integration', lookupKey: 'closing', pattern: true, shape: true }),
  ];
}

function dbForRows(rows: readonly RankedPatternRuntimeLanguageRow[]): Queryable {
  return {
    async query<T>(text: string) {
      if (text.includes('FROM assessment_ranked_patterns')) {
        return { rows: [{ pattern_key: patternKey }] as T[] };
      }
      if (text.includes('FROM assessment_result_language_rows')) {
        return { rows: rows as T[] };
      }
      throw new Error(`Unexpected SQL: ${text}`);
    },
  };
}

async function load(rows = completeRows()) {
  return loadRankedPatternResultLanguage({
    db: dbForRows(rows),
    assessmentVersionId,
    domainKey,
    patternKey,
    scoreShape: scoreShape.value,
    rankedSignals,
  });
}

test('ranked-pattern lookup resolves 05 through 14 rows and assembles canonical sections', async () => {
  const language = await load();
  const sections = buildRankedPatternCanonicalResultSections({
    language,
    rankedSignals,
    scoreShape,
    patternKey,
  });

  assert.equal(sections.patternKey, patternKey);
  assert.equal(sections.scoreShape?.value, 'graduated');
  assert.equal((sections.orientation as { lookupKey: string }).lookupKey, 'orientation');
  assert.equal((sections.signalRoles as readonly unknown[]).length, 4);
  assert.deepEqual(
    (sections.strengths as readonly { lookupKey: string }[]).map((entry) => entry.lookupKey),
    ['strength-1', 'strength-2'],
  );
  assert.deepEqual(
    (sections.rankedSignals as readonly { signalKey: string; normalizedPercentage: number }[]).map((entry) => [
      entry.signalKey,
      entry.normalizedPercentage,
    ]),
    [['alpha', 40], ['beta', 30], ['gamma', 20], ['delta', 10]],
  );
  assert.equal(sections.lookupKeys?.includes('closing'), true);
});

test('ranked-pattern lookup fails for missing and duplicate singleton rows', async () => {
  await assert.rejects(() => load(completeRows().filter((entry) => entry.section_key !== 'orientation')), /06_Orientation/);
  await assert.rejects(
    () => load([...completeRows(), row({ sectionKey: 'orientation', lookupKey: 'orientation-copy', pattern: true, shape: true })]),
    /06_Orientation/,
  );
});

test('ranked-pattern lookup fails for missing signal role, missing list rows, and missing field values', async () => {
  await assert.rejects(
    () => load(completeRows().filter((entry) => entry.lookup_key !== 'role-delta-4')),
    /08_Signal_Roles delta rank 4/,
  );
  await assert.rejects(
    () => load(completeRows().filter((entry) => entry.section_key !== 'strengths')),
    /11_Strengths/,
  );
  await assert.rejects(
    () => load(completeRows().map((entry) => entry.lookup_key === 'closing' ? { ...entry, field_values: {} } : entry)),
    /missing field_values/,
  );
});

test('ranked-pattern lookup fails for unsupported score shape and unresolved pattern key', async () => {
  await assert.rejects(
    () => loadRankedPatternResultLanguage({
      db: dbForRows(completeRows()),
      assessmentVersionId,
      domainKey,
      patternKey,
      scoreShape: 'unsupported' as 'graduated',
      rankedSignals,
    }),
    /Unsupported ranked-pattern scoreShape/,
  );
  await assert.rejects(
    () => loadRankedPatternResultLanguage({
      db: {
        async query<T>(text: string) {
          return { rows: text.includes('FROM assessment_ranked_patterns') ? [] : completeRows() as T[] };
        },
      },
      assessmentVersionId,
      domainKey,
      patternKey,
      scoreShape: scoreShape.value,
      rankedSignals,
    }),
    /could not resolve active pattern_key/,
  );
});
