BEGIN;

CREATE TABLE assessment_version_pair_trait_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  profile_domain_key TEXT NOT NULL,
  pair_key TEXT NOT NULL,
  trait_key TEXT NOT NULL,
  weight INTEGER NOT NULL,
  order_index INTEGER NOT NULL CHECK (order_index >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assessment_version_id, profile_domain_key, pair_key, trait_key)
);

CREATE TABLE assessment_version_hero_pattern_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  pattern_key TEXT NOT NULL,
  priority INTEGER NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('condition', 'exclusion')),
  trait_key TEXT NOT NULL,
  operator TEXT NOT NULL CHECK (operator IN ('>=', '<=', '>', '<', '===')),
  threshold_value INTEGER NOT NULL,
  order_index INTEGER NOT NULL CHECK (order_index >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assessment_version_id, pattern_key, rule_type, order_index)
);

CREATE TABLE assessment_version_hero_pattern_language (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  pattern_key TEXT NOT NULL,
  headline TEXT NOT NULL CHECK (btrim(headline) <> ''),
  subheadline TEXT,
  summary TEXT,
  narrative TEXT,
  pressure_overlay TEXT,
  environment_overlay TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assessment_version_id, pattern_key)
);

CREATE INDEX assessment_version_pair_trait_weights_version_idx
  ON assessment_version_pair_trait_weights (assessment_version_id, profile_domain_key, pair_key, order_index);

CREATE INDEX assessment_version_hero_pattern_rules_version_idx
  ON assessment_version_hero_pattern_rules (assessment_version_id, pattern_key, priority, rule_type, order_index);

CREATE INDEX assessment_version_hero_pattern_language_version_idx
  ON assessment_version_hero_pattern_language (assessment_version_id, pattern_key);

COMMIT;
