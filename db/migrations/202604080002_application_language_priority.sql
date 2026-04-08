ALTER TABLE assessment_version_application_contribution
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 1;

ALTER TABLE assessment_version_application_risk
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 1;

ALTER TABLE assessment_version_application_development
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 1;
