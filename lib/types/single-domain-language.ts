export const SINGLE_DOMAIN_LANGUAGE_DATASET_KEYS = [
  'DOMAIN_FRAMING',
  'HERO_PAIRS',
  'SIGNAL_CHAPTERS',
  'BALANCING_SECTIONS',
  'PAIR_SUMMARIES',
  'APPLICATION_STATEMENTS',
] as const;

export type SingleDomainLanguageDatasetKey =
  typeof SINGLE_DOMAIN_LANGUAGE_DATASET_KEYS[number];

export interface DomainFramingRow {
  domain_key: string;
  section_title: string;
  intro_paragraph: string;
  meaning_paragraph: string;
  bridge_to_signals: string;
  blueprint_context_line: string;
}

export interface HeroPairsRow {
  pair_key: string;
  hero_headline: string;
  hero_subheadline: string;
  hero_opening: string;
  hero_strength_paragraph: string;
  hero_tension_paragraph: string;
  hero_close_paragraph: string;
}

export interface SignalChaptersRow {
  signal_key: string;
  position_primary_label: string;
  position_secondary_label: string;
  position_supporting_label: string;
  position_underplayed_label: string;
  chapter_intro_primary: string;
  chapter_intro_secondary: string;
  chapter_intro_supporting: string;
  chapter_intro_underplayed: string;
  chapter_how_it_shows_up: string;
  chapter_value_outcome: string;
  chapter_value_team_effect: string;
  chapter_risk_behaviour: string;
  chapter_risk_impact: string;
  chapter_development: string;
}

export interface BalancingSectionsRow {
  pair_key: string;
  balancing_section_title: string;
  current_pattern_paragraph: string;
  practical_meaning_paragraph: string;
  system_risk_paragraph: string;
  rebalance_intro: string;
  rebalance_action_1: string;
  rebalance_action_2: string;
  rebalance_action_3: string;
}

export interface PairSummariesRow {
  pair_key: string;
  pair_section_title: string;
  pair_headline: string;
  pair_opening_paragraph: string;
  pair_strength_paragraph: string;
  pair_tension_paragraph: string;
  pair_close_paragraph: string;
}

export interface ApplicationStatementsRow {
  signal_key: string;
  strength_statement_1: string;
  strength_statement_2: string;
  watchout_statement_1: string;
  watchout_statement_2: string;
  development_statement_1: string;
  development_statement_2: string;
}

export const DOMAIN_FRAMING_COLUMNS = [
  'domain_key',
  'section_title',
  'intro_paragraph',
  'meaning_paragraph',
  'bridge_to_signals',
  'blueprint_context_line',
] as const;

export const HERO_PAIRS_COLUMNS = [
  'pair_key',
  'hero_headline',
  'hero_subheadline',
  'hero_opening',
  'hero_strength_paragraph',
  'hero_tension_paragraph',
  'hero_close_paragraph',
] as const;

export const SIGNAL_CHAPTERS_COLUMNS = [
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
] as const;

export const BALANCING_SECTIONS_COLUMNS = [
  'pair_key',
  'balancing_section_title',
  'current_pattern_paragraph',
  'practical_meaning_paragraph',
  'system_risk_paragraph',
  'rebalance_intro',
  'rebalance_action_1',
  'rebalance_action_2',
  'rebalance_action_3',
] as const;

export const PAIR_SUMMARIES_COLUMNS = [
  'pair_key',
  'pair_section_title',
  'pair_headline',
  'pair_opening_paragraph',
  'pair_strength_paragraph',
  'pair_tension_paragraph',
  'pair_close_paragraph',
] as const;

export const APPLICATION_STATEMENTS_COLUMNS = [
  'signal_key',
  'strength_statement_1',
  'strength_statement_2',
  'watchout_statement_1',
  'watchout_statement_2',
  'development_statement_1',
  'development_statement_2',
] as const;

export type SingleDomainLanguageDatasetRowMap = {
  DOMAIN_FRAMING: DomainFramingRow;
  HERO_PAIRS: HeroPairsRow;
  SIGNAL_CHAPTERS: SignalChaptersRow;
  BALANCING_SECTIONS: BalancingSectionsRow;
  PAIR_SUMMARIES: PairSummariesRow;
  APPLICATION_STATEMENTS: ApplicationStatementsRow;
};

export type SingleDomainLanguageDatasetColumnsMap = {
  DOMAIN_FRAMING: typeof DOMAIN_FRAMING_COLUMNS;
  HERO_PAIRS: typeof HERO_PAIRS_COLUMNS;
  SIGNAL_CHAPTERS: typeof SIGNAL_CHAPTERS_COLUMNS;
  BALANCING_SECTIONS: typeof BALANCING_SECTIONS_COLUMNS;
  PAIR_SUMMARIES: typeof PAIR_SUMMARIES_COLUMNS;
  APPLICATION_STATEMENTS: typeof APPLICATION_STATEMENTS_COLUMNS;
};

export const SINGLE_DOMAIN_LANGUAGE_DATASET_COLUMNS = {
  DOMAIN_FRAMING: DOMAIN_FRAMING_COLUMNS,
  HERO_PAIRS: HERO_PAIRS_COLUMNS,
  SIGNAL_CHAPTERS: SIGNAL_CHAPTERS_COLUMNS,
  BALANCING_SECTIONS: BALANCING_SECTIONS_COLUMNS,
  PAIR_SUMMARIES: PAIR_SUMMARIES_COLUMNS,
  APPLICATION_STATEMENTS: APPLICATION_STATEMENTS_COLUMNS,
} as const satisfies SingleDomainLanguageDatasetColumnsMap;
