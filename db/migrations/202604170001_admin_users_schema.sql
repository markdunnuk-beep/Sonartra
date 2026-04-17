BEGIN;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  organisation_id UUID,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX users_email_idx
  ON users (email);

CREATE INDEX users_role_idx
  ON users (role);

CREATE INDEX users_status_idx
  ON users (status);

CREATE INDEX users_organisation_id_idx
  ON users (organisation_id);

COMMENT ON TABLE users IS
  'Canonical internal app users. Authenticated identity resolves via clerk_user_id to users.id.';

ALTER TABLE assessment_versions
  ADD CONSTRAINT assessment_versions_id_assessment_unique
  UNIQUE (id, assessment_id);

INSERT INTO users (
  clerk_user_id,
  email,
  name,
  role,
  status
)
SELECT DISTINCT
  t.user_id AS clerk_user_id,
  CONCAT('legacy+', encode(digest(t.user_id, 'sha256'), 'hex'), '@placeholder.invalid') AS email,
  NULL AS name,
  'user' AS role,
  'active' AS status
FROM attempts t
WHERE NOT EXISTS (
  SELECT 1
  FROM users u
  WHERE u.clerk_user_id = t.user_id
);

ALTER TABLE attempts
  ADD COLUMN user_id_uuid UUID;

UPDATE attempts t
SET user_id_uuid = u.id
FROM users u
WHERE u.clerk_user_id = t.user_id;

ALTER TABLE attempts
  ALTER COLUMN user_id_uuid SET NOT NULL;

DROP INDEX IF EXISTS attempts_user_latest_idx;

ALTER TABLE attempts
  ADD CONSTRAINT attempts_user_id_uuid_fk
  FOREIGN KEY (user_id_uuid)
  REFERENCES users(id)
  ON DELETE RESTRICT;

ALTER TABLE attempts
  ADD CONSTRAINT attempts_version_assessment_fk
  FOREIGN KEY (assessment_version_id, assessment_id)
  REFERENCES assessment_versions(id, assessment_id)
  ON DELETE RESTRICT;

ALTER TABLE attempts
  ADD CONSTRAINT attempts_identity_path_unique
  UNIQUE (id, user_id_uuid, assessment_id, assessment_version_id);

ALTER TABLE attempts
  DROP COLUMN user_id;

ALTER TABLE attempts
  RENAME COLUMN user_id_uuid TO user_id;

CREATE INDEX attempts_user_latest_idx
  ON attempts (user_id, created_at DESC);

CREATE TABLE user_assessment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE RESTRICT,
  assessment_version_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('not_assigned', 'assigned', 'in_progress', 'completed')),
  order_index INTEGER NOT NULL CHECK (order_index >= 0),
  assigned_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  attempt_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_assessment_assignments_version_assessment_fk
    FOREIGN KEY (assessment_version_id, assessment_id)
    REFERENCES assessment_versions(id, assessment_id)
    ON DELETE RESTRICT,
  CONSTRAINT user_assessment_assignments_attempt_path_fk
    FOREIGN KEY (attempt_id, user_id, assessment_id, assessment_version_id)
    REFERENCES attempts(id, user_id, assessment_id, assessment_version_id)
    ON DELETE RESTRICT,
  CONSTRAINT user_assessment_assignments_user_order_unique
    UNIQUE (user_id, order_index),
  CONSTRAINT user_assessment_assignments_attempt_unique
    UNIQUE (attempt_id),
  CONSTRAINT user_assessment_assignments_state_timestamps_check
    CHECK (
      (
        status = 'not_assigned'
        AND assigned_at IS NULL
        AND started_at IS NULL
        AND completed_at IS NULL
        AND attempt_id IS NULL
      )
      OR (
        status = 'assigned'
        AND assigned_at IS NOT NULL
        AND started_at IS NULL
        AND completed_at IS NULL
      )
      OR (
        status = 'in_progress'
        AND assigned_at IS NOT NULL
        AND started_at IS NOT NULL
        AND completed_at IS NULL
        AND attempt_id IS NOT NULL
      )
      OR (
        status = 'completed'
        AND assigned_at IS NOT NULL
        AND started_at IS NOT NULL
        AND completed_at IS NOT NULL
        AND attempt_id IS NOT NULL
      )
    ),
  CONSTRAINT user_assessment_assignments_time_order_check
    CHECK (
      (started_at IS NULL OR assigned_at IS NULL OR started_at >= assigned_at)
      AND (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at)
    )
);

CREATE INDEX user_assessment_assignments_user_order_idx
  ON user_assessment_assignments (user_id, order_index);

CREATE INDEX user_assessment_assignments_user_status_idx
  ON user_assessment_assignments (user_id, status);

CREATE INDEX user_assessment_assignments_attempt_idx
  ON user_assessment_assignments (attempt_id);

CREATE INDEX user_assessment_assignments_version_idx
  ON user_assessment_assignments (assessment_version_id);

COMMENT ON TABLE user_assessment_assignments IS
  'Deterministic linear assessment sequencing. Current assessment is derived from the lowest order_index where status is not completed.';

COMMENT ON COLUMN user_assessment_assignments.status IS
  'assigned -> in_progress is driven by the first persisted response on the linked attempt in the service layer; the database preserves the canonical linkage and timestamps only.';

COMMIT;
