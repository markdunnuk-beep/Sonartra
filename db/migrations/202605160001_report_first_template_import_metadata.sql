BEGIN;

ALTER TABLE assessment_report_first_templates
  ADD COLUMN assessment_key TEXT,
  ADD COLUMN assessment_version TEXT,
  ADD COLUMN package_key TEXT,
  ADD COLUMN package_version TEXT,
  ADD COLUMN score_shape_policy TEXT NOT NULL DEFAULT 'pattern_level_score_shape_neutral',
  ADD COLUMN score_shape TEXT,
  ADD COLUMN supported_score_shapes JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN source_markdown_path TEXT,
  ADD COLUMN source_content_hash TEXT,
  ADD COLUMN manifest_status TEXT,
  ADD COLUMN publishable BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN ready_for_import BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE assessment_report_first_templates
  ADD CONSTRAINT assessment_report_first_templates_score_shape_policy_present_check
    CHECK (BTRIM(score_shape_policy) <> ''),
  ADD CONSTRAINT assessment_report_first_templates_supported_score_shapes_array_check
    CHECK (jsonb_typeof(supported_score_shapes) = 'array'),
  ADD CONSTRAINT assessment_report_first_templates_manifest_status_check
    CHECK (
      manifest_status IS NULL
      OR manifest_status IN ('ready_for_import', 'draft', 'placeholder', 'missing')
    );

CREATE UNIQUE INDEX assessment_report_first_templates_active_version_pattern_shape
  ON assessment_report_first_templates (
    assessment_version_id,
    pattern_key,
    score_shape_policy,
    COALESCE(score_shape, '')
  )
  WHERE status = 'active';

DROP INDEX IF EXISTS assessment_report_first_templates_active_version_pattern_key;

CREATE INDEX assessment_report_first_templates_version_package_idx
  ON assessment_report_first_templates (assessment_version_id, package_key, package_version)
  WHERE package_key IS NOT NULL;

COMMIT;
