BEGIN;

ALTER TABLE assessment_versions
  ADD COLUMN result_model_key TEXT
  CHECK (result_model_key IS NULL OR result_model_key IN ('ranked_pattern'));

CREATE INDEX assessment_versions_mode_result_model_idx
  ON assessment_versions (mode, result_model_key, lifecycle_status, created_at DESC);

CREATE TABLE assessment_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  source_hash TEXT,
  import_status TEXT NOT NULL CHECK (import_status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assessment_import_batches_completed_after_started_check
    CHECK (completed_at IS NULL OR completed_at >= started_at),
  CONSTRAINT assessment_import_batches_version_assessment_fk
    FOREIGN KEY (assessment_version_id, assessment_id)
    REFERENCES assessment_versions(id, assessment_id)
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX assessment_import_batches_version_source_hash_key
  ON assessment_import_batches (assessment_version_id, source_hash)
  WHERE source_hash IS NOT NULL;

CREATE INDEX assessment_import_batches_version_idx
  ON assessment_import_batches (assessment_version_id);

CREATE INDEX assessment_import_batches_assessment_idx
  ON assessment_import_batches (assessment_id);

CREATE INDEX assessment_import_batches_status_idx
  ON assessment_import_batches (import_status);

CREATE TABLE assessment_import_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id UUID NOT NULL REFERENCES assessment_import_batches(id) ON DELETE CASCADE,
  sheet_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content_hash TEXT,
  row_count INTEGER NOT NULL DEFAULT 0 CHECK (row_count >= 0),
  parsed_at TIMESTAMPTZ,
  parse_status TEXT NOT NULL CHECK (parse_status IN ('pending', 'parsed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assessment_import_files_batch_sheet_unique
    UNIQUE (import_batch_id, sheet_key)
);

CREATE INDEX assessment_import_files_batch_idx
  ON assessment_import_files (import_batch_id);

CREATE INDEX assessment_import_files_sheet_key_idx
  ON assessment_import_files (sheet_key);

CREATE TABLE assessment_import_audit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id UUID NOT NULL REFERENCES assessment_import_batches(id) ON DELETE CASCADE,
  sheet_key TEXT,
  row_number INTEGER CHECK (row_number IS NULL OR row_number > 0),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'blocking')),
  code TEXT NOT NULL,
  message TEXT NOT NULL,
  field_key TEXT,
  lookup_key TEXT,
  related_keys JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX assessment_import_audit_items_batch_idx
  ON assessment_import_audit_items (import_batch_id);

CREATE INDEX assessment_import_audit_items_severity_idx
  ON assessment_import_audit_items (severity);

CREATE INDEX assessment_import_audit_items_code_idx
  ON assessment_import_audit_items (code);

CREATE INDEX assessment_import_audit_items_sheet_key_idx
  ON assessment_import_audit_items (sheet_key);

CREATE INDEX assessment_import_audit_items_lookup_key_idx
  ON assessment_import_audit_items (lookup_key);

CREATE TABLE assessment_ranked_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  domain_key TEXT NOT NULL,
  pattern_key TEXT NOT NULL,
  rank_1_signal_key TEXT NOT NULL,
  rank_2_signal_key TEXT NOT NULL,
  rank_3_signal_key TEXT NOT NULL,
  rank_4_signal_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assessment_ranked_patterns_version_domain_pattern_unique
    UNIQUE (assessment_version_id, domain_key, pattern_key),
  CONSTRAINT assessment_ranked_patterns_version_domain_rank_tuple_unique
    UNIQUE (
      assessment_version_id,
      domain_key,
      rank_1_signal_key,
      rank_2_signal_key,
      rank_3_signal_key,
      rank_4_signal_key
    ),
  CONSTRAINT assessment_ranked_patterns_distinct_rank_keys_check
    CHECK (
      rank_1_signal_key <> rank_2_signal_key
      AND rank_1_signal_key <> rank_3_signal_key
      AND rank_1_signal_key <> rank_4_signal_key
      AND rank_2_signal_key <> rank_3_signal_key
      AND rank_2_signal_key <> rank_4_signal_key
      AND rank_3_signal_key <> rank_4_signal_key
    )
);

CREATE INDEX assessment_ranked_patterns_version_domain_idx
  ON assessment_ranked_patterns (assessment_version_id, domain_key);

CREATE INDEX assessment_ranked_patterns_version_pattern_idx
  ON assessment_ranked_patterns (assessment_version_id, pattern_key);

CREATE TABLE assessment_score_shape_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  score_shape TEXT NOT NULL CHECK (score_shape IN ('concentrated', 'paired', 'graduated', 'balanced')),
  rule_key TEXT NOT NULL,
  priority INTEGER NOT NULL CHECK (priority > 0),
  rule_config JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assessment_score_shape_rules_version_shape_rule_unique
    UNIQUE (assessment_version_id, score_shape, rule_key)
);

CREATE INDEX assessment_score_shape_rules_version_status_idx
  ON assessment_score_shape_rules (assessment_version_id, status);

CREATE INDEX assessment_score_shape_rules_version_shape_idx
  ON assessment_score_shape_rules (assessment_version_id, score_shape);

CREATE TABLE assessment_result_section_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL CHECK (
    section_key IN (
      'context',
      'orientation',
      'recognition',
      'signal_roles',
      'pattern_mechanics',
      'pattern_synthesis',
      'strengths',
      'narrowing',
      'application',
      'closing_integration'
    )
  ),
  section_order INTEGER NOT NULL CHECK (section_order > 0),
  source_sheet_key TEXT NOT NULL CHECK (
    source_sheet_key IN (
      '05_Context',
      '06_Orientation',
      '07_Recognition',
      '08_Signal_Roles',
      '09_Pattern_Mechanics',
      '10_Pattern_Synthesis',
      '11_Strengths',
      '12_Narrowing',
      '13_Application',
      '14_Closing_Integration'
    )
  ),
  runtime_category TEXT NOT NULL CHECK (runtime_category = 'runtime_result_content'),
  lookup_strategy TEXT NOT NULL,
  required_coverage JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assessment_result_section_definitions_version_section_unique
    UNIQUE (assessment_version_id, section_key),
  CONSTRAINT assessment_result_section_definitions_version_order_unique
    UNIQUE (assessment_version_id, section_order),
  CONSTRAINT assessment_result_section_definitions_id_version_section_unique
    UNIQUE (id, assessment_version_id, section_key)
);

CREATE INDEX assessment_result_section_definitions_version_sheet_idx
  ON assessment_result_section_definitions (assessment_version_id, source_sheet_key);

CREATE INDEX assessment_result_section_definitions_version_status_idx
  ON assessment_result_section_definitions (assessment_version_id, status);

CREATE TABLE assessment_result_language_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  result_section_definition_id UUID,
  section_key TEXT NOT NULL CHECK (
    section_key IN (
      'context',
      'orientation',
      'recognition',
      'signal_roles',
      'pattern_mechanics',
      'pattern_synthesis',
      'strengths',
      'narrowing',
      'application',
      'closing_integration'
    )
  ),
  lookup_key TEXT NOT NULL,
  domain_key TEXT NOT NULL,
  pattern_key TEXT,
  score_shape TEXT CHECK (score_shape IS NULL OR score_shape IN ('concentrated', 'paired', 'graduated', 'balanced')),
  signal_key TEXT,
  rank_position INTEGER CHECK (rank_position IS NULL OR rank_position BETWEEN 1 AND 4),
  item_key TEXT,
  priority INTEGER CHECK (priority IS NULL OR priority > 0),
  field_values JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assessment_result_language_rows_version_section_lookup_unique
    UNIQUE (assessment_version_id, section_key, lookup_key),
  CONSTRAINT assessment_result_language_rows_section_definition_fk
    FOREIGN KEY (result_section_definition_id, assessment_version_id, section_key)
    REFERENCES assessment_result_section_definitions(id, assessment_version_id, section_key)
    ON DELETE RESTRICT
);

CREATE INDEX assessment_result_language_rows_version_domain_idx
  ON assessment_result_language_rows (assessment_version_id, domain_key);

CREATE INDEX assessment_result_language_rows_version_section_idx
  ON assessment_result_language_rows (assessment_version_id, section_key);

CREATE INDEX assessment_result_language_rows_pattern_shape_idx
  ON assessment_result_language_rows (assessment_version_id, domain_key, pattern_key, score_shape);

CREATE INDEX assessment_result_language_rows_signal_rank_idx
  ON assessment_result_language_rows (assessment_version_id, domain_key, signal_key, rank_position);

CREATE INDEX assessment_result_language_rows_pattern_priority_idx
  ON assessment_result_language_rows (assessment_version_id, domain_key, pattern_key, priority);

CREATE TABLE assessment_report_preview_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  preview_case_key TEXT NOT NULL,
  domain_key TEXT NOT NULL,
  ranked_signal_keys JSONB NOT NULL,
  normalized_scores JSONB NOT NULL,
  expected_score_shape TEXT NOT NULL CHECK (expected_score_shape IN ('concentrated', 'paired', 'graduated', 'balanced')),
  expected_pattern_key TEXT NOT NULL,
  expected_payload_snapshot JSONB,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assessment_report_preview_cases_version_case_unique
    UNIQUE (assessment_version_id, preview_case_key)
);

CREATE INDEX assessment_report_preview_cases_version_status_idx
  ON assessment_report_preview_cases (assessment_version_id, status);

CREATE INDEX assessment_report_preview_cases_version_pattern_idx
  ON assessment_report_preview_cases (assessment_version_id, expected_pattern_key);

COMMIT;
