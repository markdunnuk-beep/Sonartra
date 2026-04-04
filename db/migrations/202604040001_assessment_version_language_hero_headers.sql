BEGIN;

CREATE TABLE assessment_version_language_hero_headers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  pair_key TEXT NOT NULL,
  headline TEXT NOT NULL CHECK (btrim(headline) <> ''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assessment_version_id, pair_key)
);

CREATE INDEX assessment_version_language_hero_headers_version_idx
  ON assessment_version_language_hero_headers (assessment_version_id);

COMMIT;
