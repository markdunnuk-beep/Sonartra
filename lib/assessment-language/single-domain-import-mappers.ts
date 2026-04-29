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
  DriverClaimsRow,
  DomainFramingRow,
  HeroPairsRow,
  PairSummariesRow,
  SingleDomainLanguageDatasetKey,
  SingleDomainLanguageDatasetRowMap,
} from '@/lib/types/single-domain-language';

type LegacyDatasetMap = {
  SINGLE_DOMAIN_INTRO: 'DOMAIN_FRAMING';
  SINGLE_DOMAIN_HERO: 'HERO_PAIRS';
  SINGLE_DOMAIN_DRIVERS: 'DRIVER_CLAIMS';
  SINGLE_DOMAIN_PAIR: 'PAIR_SUMMARIES';
  SINGLE_DOMAIN_LIMITATION: 'BALANCING_SECTIONS';
  SINGLE_DOMAIN_APPLICATION: 'APPLICATION_STATEMENTS';
};

export const SINGLE_DOMAIN_NARRATIVE_TO_LEGACY_DATASET_MAP: LegacyDatasetMap = {
  SINGLE_DOMAIN_INTRO: 'DOMAIN_FRAMING',
  SINGLE_DOMAIN_HERO: 'HERO_PAIRS',
  SINGLE_DOMAIN_DRIVERS: 'DRIVER_CLAIMS',
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

function mapDriversRows(rows: readonly SingleDomainDriversImportRow[]): readonly DriverClaimsRow[] {
  return rows.map((row) => ({
    domain_key: row.domain_key,
    pair_key: row.pair_key,
    signal_key: row.signal_key,
    driver_role: row.driver_role,
    claim_type: row.claim_type,
    claim_text: row.claim_text,
    materiality: row.materiality,
    priority: Number(row.priority),
  }));
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

function mapApplicationRows(
  rows: readonly SingleDomainApplicationImportRow[],
): readonly ApplicationStatementsRow[] {
  return rows.map((row) => {
    if (!row.pattern_key) {
      throw new Error('SINGLE_DOMAIN_APPLICATION persistence requires pattern_key.');
    }

    if (!row.driver_role) {
      throw new Error('SINGLE_DOMAIN_APPLICATION persistence requires driver_role.');
    }

    if (row.guidance_type === 'range_recovery_action') {
      throw new Error('SINGLE_DOMAIN_APPLICATION persistence no longer supports range_recovery_action.');
    }

    return {
      domain_key: row.domain_key,
      pattern_key: row.pattern_key,
      pair_key: row.pair_key,
      focus_area: row.focus_area,
      guidance_type: row.guidance_type,
      driver_role: row.driver_role,
      signal_key: row.signal_key,
      priority: Number(row.priority),
      guidance_text: row.guidance_text,
      linked_claim_type: row.linked_claim_type,
      strength_statement_1: '',
      strength_statement_2: '',
      watchout_statement_1: '',
      watchout_statement_2: '',
      development_statement_1: '',
      development_statement_2: '',
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
        datasetKey: 'DRIVER_CLAIMS',
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
