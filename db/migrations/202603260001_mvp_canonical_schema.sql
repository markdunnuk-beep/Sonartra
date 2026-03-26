BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE assessment_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL CHECK (lifecycle_status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  title_override TEXT,
  description_override TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assessment_id, version)
);

CREATE UNIQUE INDEX assessment_versions_single_published_per_assessment_idx
  ON assessment_versions (assessment_id)
  WHERE lifecycle_status = 'PUBLISHED';

CREATE TABLE domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  domain_key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  domain_type TEXT NOT NULL CHECK (domain_type IN ('QUESTION_SECTION', 'SIGNAL_GROUP')),
  order_index INTEGER NOT NULL CHECK (order_index >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assessment_version_id, domain_key),
  UNIQUE (assessment_version_id, domain_type, order_index),
  UNIQUE (id, assessment_version_id)
);

CREATE TABLE signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL,
  domain_id UUID NOT NULL,
  signal_key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL CHECK (order_index >= 0),
  is_overlay BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (domain_id, assessment_version_id)
    REFERENCES domains(id, assessment_version_id)
    ON DELETE RESTRICT,
  UNIQUE (assessment_version_id, signal_key),
  UNIQUE (assessment_version_id, domain_id, order_index),
  UNIQUE (id, assessment_version_id)
);

CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL,
  domain_id UUID NOT NULL,
  question_key TEXT NOT NULL,
  prompt TEXT NOT NULL,
  order_index INTEGER NOT NULL CHECK (order_index >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (domain_id, assessment_version_id)
    REFERENCES domains(id, assessment_version_id)
    ON DELETE RESTRICT,
  UNIQUE (assessment_version_id, question_key),
  UNIQUE (assessment_version_id, order_index),
  UNIQUE (id, assessment_version_id)
);

CREATE TABLE options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_key TEXT NOT NULL,
  option_label TEXT,
  option_text TEXT NOT NULL,
  order_index INTEGER NOT NULL CHECK (order_index >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (question_id, option_key),
  UNIQUE (question_id, order_index),
  UNIQUE (question_id, id)
);

CREATE TABLE option_signal_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id UUID NOT NULL REFERENCES options(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  weight NUMERIC(12, 4) NOT NULL,
  source_weight_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (option_id, signal_id)
);

CREATE TABLE attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE RESTRICT,
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE RESTRICT,
  lifecycle_status TEXT NOT NULL CHECK (lifecycle_status IN ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'SCORED', 'RESULT_READY', 'FAILED')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (completed_at IS NULL OR completed_at >= started_at)
);

CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  selected_option_id UUID NOT NULL,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (attempt_id, question_id),
  FOREIGN KEY (question_id, selected_option_id)
    REFERENCES options(question_id, id)
    ON DELETE RESTRICT
);

CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL UNIQUE REFERENCES attempts(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE RESTRICT,
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE RESTRICT,
  pipeline_status TEXT NOT NULL CHECK (pipeline_status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
  readiness_status TEXT NOT NULL CHECK (readiness_status IN ('PROCESSING', 'READY', 'FAILED')),
  canonical_result_payload JSONB,
  failure_reason TEXT,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (readiness_status = 'READY' AND canonical_result_payload IS NOT NULL)
    OR (readiness_status IN ('PROCESSING', 'FAILED'))
  )
);

CREATE INDEX assessment_versions_lookup_idx
  ON assessment_versions (assessment_id, lifecycle_status, created_at DESC);

CREATE INDEX domains_version_order_idx
  ON domains (assessment_version_id, domain_type, order_index);

CREATE INDEX signals_version_order_idx
  ON signals (assessment_version_id, order_index);

CREATE INDEX questions_version_order_idx
  ON questions (assessment_version_id, order_index);

CREATE INDEX options_question_order_idx
  ON options (question_id, order_index);

CREATE INDEX option_signal_weights_option_idx
  ON option_signal_weights (option_id);

CREATE INDEX option_signal_weights_signal_idx
  ON option_signal_weights (signal_id);

CREATE INDEX attempts_user_latest_idx
  ON attempts (user_id, created_at DESC);

CREATE INDEX attempts_assessment_version_latest_idx
  ON attempts (assessment_id, assessment_version_id, created_at DESC);

CREATE INDEX attempts_status_idx
  ON attempts (lifecycle_status);

CREATE INDEX responses_attempt_idx
  ON responses (attempt_id);

CREATE INDEX results_readiness_created_idx
  ON results (readiness_status, created_at DESC);

CREATE INDEX results_attempt_readiness_idx
  ON results (attempt_id, readiness_status);

COMMIT;
