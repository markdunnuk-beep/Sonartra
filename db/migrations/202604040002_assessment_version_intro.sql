BEGIN;

CREATE TABLE assessment_version_intro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  intro_title TEXT NOT NULL DEFAULT '',
  intro_summary TEXT NOT NULL DEFAULT '',
  intro_how_it_works TEXT NOT NULL DEFAULT '',
  estimated_time_override TEXT NULL,
  instructions TEXT NULL,
  confidentiality_note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assessment_version_intro_unique_version UNIQUE (assessment_version_id)
);

COMMIT;
