ALTER TABLE assessment_version_single_domain_application_statements
  DROP CONSTRAINT IF EXISTS avsd_application_statements_unique_version_signal,
  DROP CONSTRAINT IF EXISTS assessment_version_single_domain_application_statements_assessment_version_id_signal_key_key;

ALTER TABLE assessment_version_single_domain_application_statements
  ADD COLUMN IF NOT EXISTS domain_key TEXT,
  ADD COLUMN IF NOT EXISTS pattern_key TEXT,
  ADD COLUMN IF NOT EXISTS pair_key TEXT,
  ADD COLUMN IF NOT EXISTS focus_area TEXT,
  ADD COLUMN IF NOT EXISTS guidance_type TEXT,
  ADD COLUMN IF NOT EXISTS driver_role TEXT,
  ADD COLUMN IF NOT EXISTS priority INTEGER,
  ADD COLUMN IF NOT EXISTS guidance_text TEXT,
  ADD COLUMN IF NOT EXISTS linked_claim_type TEXT;

ALTER TABLE assessment_version_single_domain_application_statements
  ALTER COLUMN strength_statement_1 DROP NOT NULL,
  ALTER COLUMN strength_statement_2 DROP NOT NULL,
  ALTER COLUMN watchout_statement_1 DROP NOT NULL,
  ALTER COLUMN watchout_statement_2 DROP NOT NULL,
  ALTER COLUMN development_statement_1 DROP NOT NULL,
  ALTER COLUMN development_statement_2 DROP NOT NULL;

ALTER TABLE assessment_version_single_domain_application_statements
  DROP CONSTRAINT IF EXISTS assessment_version_single_domain_application_driver_role_check,
  DROP CONSTRAINT IF EXISTS assessment_version_single_domain_application_focus_area_check,
  DROP CONSTRAINT IF EXISTS assessment_version_single_domain_application_guidance_type_check,
  DROP CONSTRAINT IF EXISTS assessment_version_single_domain_application_priority_check,
  DROP CONSTRAINT IF EXISTS assessment_version_single_domain_application_full_pattern_required_fields_check;

ALTER TABLE assessment_version_single_domain_application_statements
  ADD CONSTRAINT assessment_version_single_domain_application_full_pattern_required_fields_check
    CHECK (
      (
        domain_key IS NULL
        AND pattern_key IS NULL
        AND pair_key IS NULL
        AND focus_area IS NULL
        AND guidance_type IS NULL
        AND driver_role IS NULL
        AND priority IS NULL
        AND guidance_text IS NULL
        AND linked_claim_type IS NULL
      )
      OR (
        domain_key IS NOT NULL
        AND pattern_key IS NOT NULL
        AND pair_key IS NOT NULL
        AND focus_area IS NOT NULL
        AND guidance_type IS NOT NULL
        AND driver_role IS NOT NULL
        AND priority IS NOT NULL
        AND guidance_text IS NOT NULL
        AND linked_claim_type IS NOT NULL
      )
    ),
  ADD CONSTRAINT assessment_version_single_domain_application_driver_role_check
    CHECK (
      driver_role IS NULL
      OR driver_role IN (
        'primary_driver',
        'secondary_driver',
        'supporting_context',
        'range_limitation'
      )
    ),
  ADD CONSTRAINT assessment_version_single_domain_application_focus_area_check
    CHECK (
      focus_area IS NULL
      OR focus_area IN ('rely_on', 'notice', 'develop')
    ),
  ADD CONSTRAINT assessment_version_single_domain_application_guidance_type_check
    CHECK (
      guidance_type IS NULL
      OR guidance_type IN ('applied_strength', 'watchout', 'development_focus')
    ),
  ADD CONSTRAINT assessment_version_single_domain_application_priority_check
    CHECK (priority IS NULL OR priority > 0);

DROP INDEX IF EXISTS avsd_application_statements_version_signal_idx;
DROP INDEX IF EXISTS assessment_version_single_domain_application_full_pattern_key;
DROP INDEX IF EXISTS assessment_version_single_domain_application_pattern_lookup_idx;

CREATE UNIQUE INDEX assessment_version_single_domain_application_full_pattern_key
  ON assessment_version_single_domain_application_statements (
    assessment_version_id,
    domain_key,
    pattern_key,
    focus_area,
    guidance_type,
    driver_role
  )
  WHERE pattern_key IS NOT NULL;

CREATE INDEX assessment_version_single_domain_application_pattern_lookup_idx
  ON assessment_version_single_domain_application_statements (
    assessment_version_id,
    domain_key,
    pattern_key
  )
  WHERE pattern_key IS NOT NULL;
