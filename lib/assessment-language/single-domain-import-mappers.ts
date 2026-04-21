import type {
  SingleDomainApplicationImportRow,
  SingleDomainDriversImportRow,
  SingleDomainHeroImportRow,
  SingleDomainIntroImportRow,
  SingleDomainLimitationImportRow,
  SingleDomainNarrativeDatasetKey,
  SingleDomainNarrativeImportRowMap,
  SingleDomainPairImportRow,
} from '@/lib/assessment-language/single-domain-narrative-types';
import type {
  ApplicationStatementsRow,
  BalancingSectionsRow,
  DomainFramingRow,
  HeroPairsRow,
  PairSummariesRow,
  SignalChaptersRow,
  SingleDomainLanguageDatasetKey,
  SingleDomainLanguageDatasetRowMap,
} from '@/lib/types/single-domain-language';

type LegacyDatasetMap = {
  SINGLE_DOMAIN_INTRO: 'DOMAIN_FRAMING';
  SINGLE_DOMAIN_HERO: 'HERO_PAIRS';
  SINGLE_DOMAIN_DRIVERS: 'SIGNAL_CHAPTERS';
  SINGLE_DOMAIN_PAIR: 'PAIR_SUMMARIES';
  SINGLE_DOMAIN_LIMITATION: 'BALANCING_SECTIONS';
  SINGLE_DOMAIN_APPLICATION: 'APPLICATION_STATEMENTS';
};

export const SINGLE_DOMAIN_NARRATIVE_TO_LEGACY_DATASET_MAP: LegacyDatasetMap = {
  SINGLE_DOMAIN_INTRO: 'DOMAIN_FRAMING',
  SINGLE_DOMAIN_HERO: 'HERO_PAIRS',
  SINGLE_DOMAIN_DRIVERS: 'SIGNAL_CHAPTERS',
  SINGLE_DOMAIN_PAIR: 'PAIR_SUMMARIES',
  SINGLE_DOMAIN_LIMITATION: 'BALANCING_SECTIONS',
  SINGLE_DOMAIN_APPLICATION: 'APPLICATION_STATEMENTS',
};

function mapIntroRows(rows: readonly SingleDomainIntroImportRow[]): readonly DomainFramingRow[] {
  return rows.map((row) => ({
    domain_key: row.domain_key,
    section_title: row.domain_title,
    intro_paragraph: row.domain_definition,
    meaning_paragraph: row.domain_scope,
    bridge_to_signals: row.interpretation_guidance,
    blueprint_context_line: row.intro_note,
  }));
}

function mapHeroRows(rows: readonly SingleDomainHeroImportRow[]): readonly HeroPairsRow[] {
  return rows.map((row) => ({
    pair_key: row.pair_key,
    hero_headline: row.pattern_label,
    hero_subheadline: row.hero_strength,
    hero_opening: row.hero_statement,
    hero_strength_paragraph: row.hero_expansion,
    hero_tension_paragraph: row.hero_strength,
    hero_close_paragraph: row.hero_expansion,
  }));
}

function joinClaimTexts(
  rows: readonly SingleDomainDriversImportRow[],
  driverRole: SingleDomainDriversImportRow['driver_role'],
): string {
  return rows
    .filter((row) => row.driver_role === driverRole)
    .sort((left, right) => Number(left.priority) - Number(right.priority))
    .map((row) => row.claim_text)
    .join('\n');
}

function mapDriversRows(rows: readonly SingleDomainDriversImportRow[]): readonly SignalChaptersRow[] {
  const bySignal = new Map<string, SingleDomainDriversImportRow[]>();

  rows.forEach((row) => {
    const existing = bySignal.get(row.signal_key) ?? [];
    existing.push(row);
    bySignal.set(row.signal_key, existing);
  });

  return [...bySignal.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([signal_key, signalRows]) => {
      const primaryClaim = joinClaimTexts(signalRows, 'primary_driver');
      const secondaryClaim = joinClaimTexts(signalRows, 'secondary_driver');
      const supportingClaim = joinClaimTexts(signalRows, 'supporting_context');
      const limitationClaim = joinClaimTexts(signalRows, 'range_limitation');

      return {
        signal_key,
        position_primary_label: 'Primary driver',
        position_secondary_label: 'Secondary driver',
        position_supporting_label: 'Supporting context',
        position_underplayed_label: 'Range limitation',
        chapter_intro_primary: primaryClaim,
        chapter_intro_secondary: secondaryClaim,
        chapter_intro_supporting: supportingClaim,
        chapter_intro_underplayed: limitationClaim,
        chapter_how_it_shows_up: primaryClaim || secondaryClaim || supportingClaim,
        chapter_value_outcome: supportingClaim || secondaryClaim || primaryClaim,
        chapter_value_team_effect: supportingClaim || secondaryClaim || primaryClaim,
        chapter_risk_behaviour: limitationClaim,
        chapter_risk_impact: limitationClaim,
        chapter_development: limitationClaim,
      };
    });
}

function mapPairRows(rows: readonly SingleDomainPairImportRow[]): readonly PairSummariesRow[] {
  return rows.map((row) => ({
    pair_key: row.pair_key,
    pair_section_title: row.pair_label,
    pair_headline: row.pair_label,
    pair_opening_paragraph: row.interaction_claim,
    pair_strength_paragraph: row.synergy_claim,
    pair_tension_paragraph: row.tension_claim,
    pair_close_paragraph: row.pair_outcome,
  }));
}

function mapLimitationRows(
  rows: readonly SingleDomainLimitationImportRow[],
): readonly BalancingSectionsRow[] {
  return rows.map((row) => ({
    pair_key: row.pair_key,
    balancing_section_title: row.limitation_label,
    current_pattern_paragraph: row.pattern_cost,
    practical_meaning_paragraph: row.range_narrowing,
    system_risk_paragraph: row.weaker_signal_link,
    rebalance_intro: row.weaker_signal_key
      ? `${row.weaker_signal_key}: ${row.weaker_signal_link}`
      : row.range_narrowing,
    rebalance_action_1: row.weaker_signal_link,
    rebalance_action_2: '',
    rebalance_action_3: '',
  }));
}

function takeFirstTwoTexts(
  rows: readonly SingleDomainApplicationImportRow[],
  matcher: (row: SingleDomainApplicationImportRow) => boolean,
): readonly [string, string] {
  const matches = rows
    .filter(matcher)
    .sort((left, right) => Number(left.priority) - Number(right.priority))
    .map((row) => row.guidance_text);

  return [matches[0] ?? '', matches[1] ?? ''];
}

function mapApplicationRows(
  rows: readonly SingleDomainApplicationImportRow[],
): readonly ApplicationStatementsRow[] {
  const bySignal = new Map<string, SingleDomainApplicationImportRow[]>();

  rows.forEach((row) => {
    const existing = bySignal.get(row.signal_key) ?? [];
    existing.push(row);
    bySignal.set(row.signal_key, existing);
  });

  return [...bySignal.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([signal_key, signalRows]) => {
      const [strength1, strength2] = takeFirstTwoTexts(
        signalRows,
        (row) => row.focus_area === 'rely_on' || row.guidance_type === 'applied_strength',
      );
      const [watchout1, watchout2] = takeFirstTwoTexts(
        signalRows,
        (row) => row.focus_area === 'notice'
          || row.guidance_type === 'watchout'
          || row.guidance_type === 'range_recovery_action',
      );
      const [development1, development2] = takeFirstTwoTexts(
        signalRows,
        (row) => row.focus_area === 'develop'
          || row.guidance_type === 'development_focus'
          || row.guidance_type === 'range_recovery_action',
      );

      return {
        signal_key,
        strength_statement_1: strength1,
        strength_statement_2: strength2,
        watchout_statement_1: watchout1,
        watchout_statement_2: watchout2,
        development_statement_1: development1,
        development_statement_2: development2,
      };
    });
}

export function mapSingleDomainNarrativeRowsToLegacyDataset<TKey extends SingleDomainNarrativeDatasetKey>(
  datasetKey: TKey,
  rows: readonly SingleDomainNarrativeImportRowMap[TKey][],
): {
  datasetKey: LegacyDatasetMap[TKey];
  rows: readonly SingleDomainLanguageDatasetRowMap[LegacyDatasetMap[TKey]][];
} {
  switch (datasetKey) {
    case 'SINGLE_DOMAIN_INTRO':
      return {
        datasetKey: 'DOMAIN_FRAMING',
        rows: mapIntroRows(rows as readonly SingleDomainIntroImportRow[]),
      } as {
        datasetKey: LegacyDatasetMap[TKey];
        rows: readonly SingleDomainLanguageDatasetRowMap[LegacyDatasetMap[TKey]][];
      };
    case 'SINGLE_DOMAIN_HERO':
      return {
        datasetKey: 'HERO_PAIRS',
        rows: mapHeroRows(rows as readonly SingleDomainHeroImportRow[]),
      } as {
        datasetKey: LegacyDatasetMap[TKey];
        rows: readonly SingleDomainLanguageDatasetRowMap[LegacyDatasetMap[TKey]][];
      };
    case 'SINGLE_DOMAIN_DRIVERS':
      return {
        datasetKey: 'SIGNAL_CHAPTERS',
        rows: mapDriversRows(rows as readonly SingleDomainDriversImportRow[]),
      } as {
        datasetKey: LegacyDatasetMap[TKey];
        rows: readonly SingleDomainLanguageDatasetRowMap[LegacyDatasetMap[TKey]][];
      };
    case 'SINGLE_DOMAIN_PAIR':
      return {
        datasetKey: 'PAIR_SUMMARIES',
        rows: mapPairRows(rows as readonly SingleDomainPairImportRow[]),
      } as {
        datasetKey: LegacyDatasetMap[TKey];
        rows: readonly SingleDomainLanguageDatasetRowMap[LegacyDatasetMap[TKey]][];
      };
    case 'SINGLE_DOMAIN_LIMITATION':
      return {
        datasetKey: 'BALANCING_SECTIONS',
        rows: mapLimitationRows(rows as readonly SingleDomainLimitationImportRow[]),
      } as {
        datasetKey: LegacyDatasetMap[TKey];
        rows: readonly SingleDomainLanguageDatasetRowMap[LegacyDatasetMap[TKey]][];
      };
    case 'SINGLE_DOMAIN_APPLICATION':
      return {
        datasetKey: 'APPLICATION_STATEMENTS',
        rows: mapApplicationRows(rows as readonly SingleDomainApplicationImportRow[]),
      } as {
        datasetKey: LegacyDatasetMap[TKey];
        rows: readonly SingleDomainLanguageDatasetRowMap[LegacyDatasetMap[TKey]][];
      };
  }
}

export function getLegacyDatasetKeyForNarrativeDataset(
  datasetKey: SingleDomainNarrativeDatasetKey,
): SingleDomainLanguageDatasetKey {
  return SINGLE_DOMAIN_NARRATIVE_TO_LEGACY_DATASET_MAP[datasetKey];
}
