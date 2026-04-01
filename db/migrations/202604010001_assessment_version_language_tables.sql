BEGIN;

CREATE TABLE assessment_version_language_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  signal_key TEXT NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('summary', 'strength', 'watchout', 'development')),
  content TEXT NOT NULL CHECK (btrim(content) <> ''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assessment_version_id, signal_key, section)
);

CREATE TABLE assessment_version_language_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  signal_pair TEXT NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('summary', 'strength', 'watchout')),
  content TEXT NOT NULL CHECK (btrim(content) <> ''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assessment_version_id, signal_pair, section)
);

CREATE TABLE assessment_version_language_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  domain_key TEXT NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('summary', 'focus', 'pressure', 'environment')),
  content TEXT NOT NULL CHECK (btrim(content) <> ''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assessment_version_id, domain_key, section)
);

CREATE TABLE assessment_version_language_overview (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  pattern_key TEXT NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('summary', 'strengths', 'watchouts', 'development', 'headline')),
  content TEXT NOT NULL CHECK (btrim(content) <> ''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assessment_version_id, pattern_key, section)
);

CREATE INDEX assessment_version_language_signals_version_idx
  ON assessment_version_language_signals (assessment_version_id);

CREATE INDEX assessment_version_language_pairs_version_idx
  ON assessment_version_language_pairs (assessment_version_id);

CREATE INDEX assessment_version_language_domains_version_idx
  ON assessment_version_language_domains (assessment_version_id);

CREATE INDEX assessment_version_language_overview_version_idx
  ON assessment_version_language_overview (assessment_version_id);

COMMIT;
