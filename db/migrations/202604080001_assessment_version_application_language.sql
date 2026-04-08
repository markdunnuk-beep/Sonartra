CREATE TABLE assessment_version_application_thesis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  hero_pattern_key TEXT NOT NULL,
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE assessment_version_application_contribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('pair', 'signal')),
  source_key TEXT NOT NULL,
  label TEXT NOT NULL,
  narrative TEXT NOT NULL,
  best_when TEXT NOT NULL,
  watch_for TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE assessment_version_application_risk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('pair', 'signal')),
  source_key TEXT NOT NULL,
  label TEXT NOT NULL,
  narrative TEXT NOT NULL,
  impact TEXT NOT NULL,
  early_warning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE assessment_version_application_development (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('pair', 'signal')),
  source_key TEXT NOT NULL,
  label TEXT NOT NULL,
  narrative TEXT NOT NULL,
  practice TEXT NOT NULL,
  success_marker TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE assessment_version_application_action_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type = 'hero_pattern'),
  source_key TEXT NOT NULL,
  keep_doing TEXT NOT NULL,
  watch_for TEXT NOT NULL,
  practice_next TEXT NOT NULL,
  ask_others TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX assessment_version_application_thesis_version_idx
  ON assessment_version_application_thesis (assessment_version_id, hero_pattern_key);

CREATE INDEX assessment_version_application_contribution_version_idx
  ON assessment_version_application_contribution (assessment_version_id, source_type, source_key);

CREATE INDEX assessment_version_application_risk_version_idx
  ON assessment_version_application_risk (assessment_version_id, source_type, source_key);

CREATE INDEX assessment_version_application_development_version_idx
  ON assessment_version_application_development (assessment_version_id, source_type, source_key);

CREATE INDEX assessment_version_application_action_prompts_version_idx
  ON assessment_version_application_action_prompts (assessment_version_id, source_key);
