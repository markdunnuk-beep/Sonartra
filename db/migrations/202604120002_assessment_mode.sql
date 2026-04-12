BEGIN;

ALTER TABLE assessments
  ADD COLUMN mode TEXT NOT NULL DEFAULT 'multi_domain'
  CHECK (mode IN ('multi_domain', 'single_domain'));

ALTER TABLE assessment_versions
  ADD COLUMN mode TEXT NOT NULL DEFAULT 'multi_domain'
  CHECK (mode IN ('multi_domain', 'single_domain'));

UPDATE assessment_versions av
SET mode = a.mode
FROM assessments a
WHERE a.id = av.assessment_id;

CREATE INDEX assessment_versions_assessment_mode_idx
  ON assessment_versions (assessment_id, mode, lifecycle_status, created_at DESC);

COMMIT;
