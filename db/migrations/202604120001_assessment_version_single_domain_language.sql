BEGIN;

CREATE TABLE assessment_version_single_domain_framing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  domain_key TEXT NOT NULL,
  section_title TEXT NOT NULL,
  intro_paragraph TEXT NOT NULL,
  meaning_paragraph TEXT NOT NULL,
  bridge_to_signals TEXT NOT NULL,
  blueprint_context_line TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assessment_version_single_domain_framing_unique_version_domain
    UNIQUE (assessment_version_id, domain_key)
);

CREATE TABLE assessment_version_single_domain_hero_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  pair_key TEXT NOT NULL,
  hero_headline TEXT NOT NULL,
  hero_subheadline TEXT NOT NULL,
  hero_opening TEXT NOT NULL,
  hero_strength_paragraph TEXT NOT NULL,
  hero_tension_paragraph TEXT NOT NULL,
  hero_close_paragraph TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assessment_version_single_domain_hero_pairs_unique_version_pair
    UNIQUE (assessment_version_id, pair_key)
);

CREATE TABLE assessment_version_single_domain_signal_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  signal_key TEXT NOT NULL,
  position_primary_label TEXT NOT NULL,
  position_secondary_label TEXT NOT NULL,
  position_supporting_label TEXT NOT NULL,
  position_underplayed_label TEXT NOT NULL,
  chapter_intro_primary TEXT NOT NULL,
  chapter_intro_secondary TEXT NOT NULL,
  chapter_intro_supporting TEXT NOT NULL,
  chapter_intro_underplayed TEXT NOT NULL,
  chapter_how_it_shows_up TEXT NOT NULL,
  chapter_value_outcome TEXT NOT NULL,
  chapter_value_team_effect TEXT NOT NULL,
  chapter_risk_behaviour TEXT NOT NULL,
  chapter_risk_impact TEXT NOT NULL,
  chapter_development TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assessment_version_single_domain_signal_chapters_unique_version_signal
    UNIQUE (assessment_version_id, signal_key)
);

CREATE TABLE assessment_version_single_domain_balancing_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  pair_key TEXT NOT NULL,
  balancing_section_title TEXT NOT NULL,
  current_pattern_paragraph TEXT NOT NULL,
  practical_meaning_paragraph TEXT NOT NULL,
  system_risk_paragraph TEXT NOT NULL,
  rebalance_intro TEXT NOT NULL,
  rebalance_action_1 TEXT NOT NULL,
  rebalance_action_2 TEXT NOT NULL,
  rebalance_action_3 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assessment_version_single_domain_balancing_sections_unique_version_pair
    UNIQUE (assessment_version_id, pair_key)
);

CREATE TABLE assessment_version_single_domain_pair_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  pair_key TEXT NOT NULL,
  pair_section_title TEXT NOT NULL,
  pair_headline TEXT NOT NULL,
  pair_opening_paragraph TEXT NOT NULL,
  pair_strength_paragraph TEXT NOT NULL,
  pair_tension_paragraph TEXT NOT NULL,
  pair_close_paragraph TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assessment_version_single_domain_pair_summaries_unique_version_pair
    UNIQUE (assessment_version_id, pair_key)
);

CREATE TABLE assessment_version_single_domain_application_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  signal_key TEXT NOT NULL,
  strength_statement_1 TEXT NOT NULL,
  strength_statement_2 TEXT NOT NULL,
  watchout_statement_1 TEXT NOT NULL,
  watchout_statement_2 TEXT NOT NULL,
  development_statement_1 TEXT NOT NULL,
  development_statement_2 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assessment_version_single_domain_application_statements_unique_version_signal
    UNIQUE (assessment_version_id, signal_key)
);

CREATE INDEX assessment_version_single_domain_framing_version_idx
  ON assessment_version_single_domain_framing (assessment_version_id);

CREATE INDEX assessment_version_single_domain_framing_version_domain_idx
  ON assessment_version_single_domain_framing (assessment_version_id, domain_key);

CREATE INDEX assessment_version_single_domain_hero_pairs_version_idx
  ON assessment_version_single_domain_hero_pairs (assessment_version_id);

CREATE INDEX assessment_version_single_domain_hero_pairs_version_pair_idx
  ON assessment_version_single_domain_hero_pairs (assessment_version_id, pair_key);

CREATE INDEX assessment_version_single_domain_signal_chapters_version_idx
  ON assessment_version_single_domain_signal_chapters (assessment_version_id);

CREATE INDEX assessment_version_single_domain_signal_chapters_version_signal_idx
  ON assessment_version_single_domain_signal_chapters (assessment_version_id, signal_key);

CREATE INDEX assessment_version_single_domain_balancing_sections_version_idx
  ON assessment_version_single_domain_balancing_sections (assessment_version_id);

CREATE INDEX assessment_version_single_domain_balancing_sections_version_pair_idx
  ON assessment_version_single_domain_balancing_sections (assessment_version_id, pair_key);

CREATE INDEX assessment_version_single_domain_pair_summaries_version_idx
  ON assessment_version_single_domain_pair_summaries (assessment_version_id);

CREATE INDEX assessment_version_single_domain_pair_summaries_version_pair_idx
  ON assessment_version_single_domain_pair_summaries (assessment_version_id, pair_key);

CREATE INDEX assessment_version_single_domain_application_statements_version_idx
  ON assessment_version_single_domain_application_statements (assessment_version_id);

CREATE INDEX assessment_version_single_domain_application_statements_version_signal_idx
  ON assessment_version_single_domain_application_statements (assessment_version_id, signal_key);

COMMIT;
