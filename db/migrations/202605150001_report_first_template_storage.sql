BEGIN;

CREATE TABLE assessment_report_first_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  domain_key TEXT NOT NULL,
  pattern_key TEXT NOT NULL,
  report_key TEXT NOT NULL,
  report_contract TEXT NOT NULL,
  report_template_json JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'inactive')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  import_batch_id UUID REFERENCES assessment_import_batches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assessment_report_first_templates_domain_key_present_check
    CHECK (BTRIM(domain_key) <> ''),
  CONSTRAINT assessment_report_first_templates_pattern_key_present_check
    CHECK (BTRIM(pattern_key) <> ''),
  CONSTRAINT assessment_report_first_templates_report_key_present_check
    CHECK (BTRIM(report_key) <> ''),
  CONSTRAINT assessment_report_first_templates_report_contract_present_check
    CHECK (BTRIM(report_contract) <> ''),
  CONSTRAINT assessment_report_first_templates_content_hash_present_check
    CHECK (BTRIM(content_hash) <> ''),
  CONSTRAINT assessment_report_first_templates_pattern_key_shape_check
    CHECK (pattern_key LIKE '%\_%\_%\_%' ESCAPE '\' AND pattern_key !~ '\s')
);

CREATE UNIQUE INDEX assessment_report_first_templates_active_version_pattern_key
  ON assessment_report_first_templates (assessment_version_id, pattern_key)
  WHERE status = 'active';

CREATE INDEX assessment_report_first_templates_version_pattern_status_idx
  ON assessment_report_first_templates (assessment_version_id, pattern_key, status);

CREATE INDEX assessment_report_first_templates_version_contract_status_idx
  ON assessment_report_first_templates (assessment_version_id, report_contract, status);

CREATE INDEX assessment_report_first_templates_import_batch_idx
  ON assessment_report_first_templates (import_batch_id)
  WHERE import_batch_id IS NOT NULL;

COMMIT;
